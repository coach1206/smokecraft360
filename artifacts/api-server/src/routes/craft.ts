/**
 * /api/craft — unified craft intelligence hub.
 *
 *   POST /api/craft/score              — score a build using the craft engine
 *   POST /api/craft/voice-feedback     — TTS voice coach line after scoring
 *   POST /api/craft/session/save       — save/update a craft session
 *   GET  /api/craft/session/:id        — load a craft session by id
 *   GET  /api/craft/leaderboard        — top scorers across all craft types
 *   GET  /api/craft/intel/quick        — trending style + top creator (lightweight)
 *   GET  /api/craft/intel/summary      — top preference + action list (owner view)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { desc, eq, sql, and, isNotNull, gte }               from "drizzle-orm";
import { z }                                                 from "zod";
import { db, craftBuildsTable, usersTable, userPreferencesTable, craftSessionStatesTable, designDraftsTable } from "@workspace/db";
import { scoreBuild }                                        from "../engine/craftEngine";
import { resolveElevenLabsKey, DEFAULT_VOICES }             from "../lib/elevenlabs";

const router: IRouter = Router();

// ── POST /api/craft/score ─────────────────────────────────────────────────────

const scoreSchema = z.object({
  strength:    z.number().finite().min(0).max(5),
  flavorMatch: z.number().finite().min(0).max(5),
  balance:     z.number().finite().min(0).max(5),
  finish:      z.number().finite().min(0).max(5),
  timeTaken:   z.number().finite().min(0),
  converted:   z.boolean().optional().default(false),
});

router.post("/score", (req: Request, res: Response) => {
  const parsed = scoreSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
    return;
  }
  res.json(scoreBuild(parsed.data));
});

// ── POST /api/craft/voice-feedback ────────────────────────────────────────────
//
// Accepts { score: 0-100, feedback?: string } and returns audio/mpeg spoken by
// the AI coach. Score drives line selection:
//   < 40 → corrective/coaching line
//   40-59 → encouraging/neutral line
//   ≥ 60  → hype / celebratory line
//
// Optional `feedback` text (e.g. the UI label shown after scoring) is prepended
// to the selected coach line for richer, contextual speech.

const LOW_COACH_LINES = [
  "Weak blend. Rethink the balance between strength and mood.",
  "This pairing misses the mark. Try a lighter profile.",
  "Your structure needs work. Consider a different approach.",
  "The combo is off. Let me help you dial it in.",
] as const;

const MID_COACH_LINES = [
  "Solid foundation. A small tweak could push this to elite.",
  "You're close. Refine the pairing to unlock the full score.",
  "Good instincts. The balance can still improve.",
  "Strong build so far. Keep refining the finish.",
] as const;

const HIGH_COACH_LINES = [
  "Outstanding craft. This blend is feature-worthy.",
  "Elite pairing. You've nailed the balance perfectly.",
  "Exceptional build. This one stands out from the competition.",
  "Top-tier blend. You're in elite territory now.",
] as const;

const voiceFeedbackSchema = z.object({
  score:    z.number().finite().min(0).max(100),
  feedback: z.string().max(120).optional(),
});

router.post("/voice-feedback", async (req: Request, res: Response) => {
  const parsed = voiceFeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }
  const { score, feedback } = parsed.data;

  const pool   = score >= 60 ? HIGH_COACH_LINES : score >= 40 ? MID_COACH_LINES : LOW_COACH_LINES;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  const text   = feedback ? `${feedback.trim()}. ${picked}` : picked;

  const apiKey = await resolveElevenLabsKey();
  if (!apiKey) {
    res.status(503).json({
      error:  "voice_not_configured",
      detail: "ElevenLabs connector is not authorized. Visit Replit integrations to connect.",
    });
    return;
  }

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(DEFAULT_VOICES.female)}`,
      {
        method:  "POST",
        headers: {
          "xi-api-key":   apiKey,
          "Content-Type": "application/json",
          "Accept":       "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
        }),
      },
    );
  } catch (err) {
    req.log.error({ err }, "elevenlabs voice-feedback request threw");
    res.status(502).json({ error: "voice_upstream_unreachable" });
    return;
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    req.log.warn({ status: upstream.status, detail: detail.slice(0, 200) }, "elevenlabs voice-feedback upstream error");
    res.status(502).json({ error: "voice_upstream_failed", status: upstream.status });
    return;
  }

  const audioBuffer = Buffer.from(await upstream.arrayBuffer());
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Length", String(audioBuffer.length));
  res.setHeader("Cache-Control", "no-store");
  res.send(audioBuffer);
});

// ── POST /api/craft/session/save ──────────────────────────────────────────────

router.post("/session/save", (_req: Request, res: Response) => {
  // Sessions are persisted via /api/craft-sessions (PATCH). This endpoint
  // exists for spec compatibility — future expansions can write extra metadata here.
  res.json({ status: "saved" });
});

// ── GET /api/craft/session/:id ────────────────────────────────────────────────

router.get("/session/:id", async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }
  const [session] = await db
    .select()
    .from(craftSessionStatesTable)
    .where(eq(craftSessionStatesTable.id, id))
    .limit(1);
  res.json({ session: session ?? null });
});

// ── GET /api/craft/leaderboard ────────────────────────────────────────────────
//
// Optional query params:
//   ?craft=smoke|brew|pour|vape   — filter to a single craft type
//   ?limit=N                      — max results (default 10, max 50)

router.get("/leaderboard", async (req: Request, res: Response) => {
  const CRAFT_TYPES_SET = new Set(["smoke", "brew", "pour", "vape"]);
  const craftParam = typeof req.query["craft"] === "string" ? req.query["craft"] : null;
  const limitParam = Math.min(50, Math.max(1, parseInt(String(req.query["limit"] ?? "10"), 10) || 10));

  const where = craftParam && CRAFT_TYPES_SET.has(craftParam)
    ? and(
        isNotNull(craftBuildsTable.score),
        eq(craftBuildsTable.craft, craftParam as "smoke" | "brew" | "pour" | "vape"),
      )
    : isNotNull(craftBuildsTable.score);

  const rows = await db
    .select({
      userId: craftBuildsTable.userId,
      name:   usersTable.name,
      score:  sql<number>`MAX(CAST(${craftBuildsTable.score} AS NUMERIC))`.as("score"),
      craft:  craftBuildsTable.craft,
    })
    .from(craftBuildsTable)
    .leftJoin(usersTable, eq(craftBuildsTable.userId, usersTable.id))
    .where(where)
    .groupBy(craftBuildsTable.userId, usersTable.name, craftBuildsTable.craft)
    .orderBy(desc(sql`MAX(CAST(${craftBuildsTable.score} AS NUMERIC))`))
    .limit(limitParam);

  res.json(
    rows.map((r, i) => ({
      rank:  i + 1,
      name:  r.name ?? "Guest",
      score: Number(Number(r.score).toFixed(2)),
      craft: r.craft,
    })),
  );
});

// ── GET /api/craft/intel/quick ────────────────────────────────────────────────

router.get("/intel/quick", async (_req: Request, res: Response) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [trendRow] = await db
    .select({
      styleChoice: craftBuildsTable.styleChoice,
      moodChoice:  craftBuildsTable.moodChoice,
      cnt:         sql<number>`COUNT(*)`.as("cnt"),
    })
    .from(craftBuildsTable)
    .where(and(
      isNotNull(craftBuildsTable.styleChoice),
      gte(craftBuildsTable.createdAt, since),
    ))
    .groupBy(craftBuildsTable.styleChoice, craftBuildsTable.moodChoice)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(1);

  const [topRow] = await db
    .select({
      name:  usersTable.name,
      score: sql<number>`MAX(CAST(${craftBuildsTable.score} AS NUMERIC))`.as("top_score"),
    })
    .from(craftBuildsTable)
    .leftJoin(usersTable, eq(craftBuildsTable.userId, usersTable.id))
    .where(isNotNull(craftBuildsTable.score))
    .groupBy(usersTable.name)
    .orderBy(desc(sql`MAX(CAST(${craftBuildsTable.score} AS NUMERIC))`))
    .limit(1);

  const style  = trendRow?.styleChoice ?? "Bold";
  const mood   = trendRow?.moodChoice  ?? "Relaxed";
  const trend  = `${capitalize(style)} + ${capitalize(mood)}`;
  const creator = topRow?.name ?? "James";

  res.json({ trend, topCreator: creator });
});

// ── GET /api/craft/intel/summary ──────────────────────────────────────────────

router.get("/intel/summary", async (_req: Request, res: Response) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Top mood from preferences last 7 days
  const [topPrefRow] = await db
    .select({
      mood: userPreferencesTable.mood,
      cnt:  sql<number>`COUNT(*)`.as("cnt"),
    })
    .from(userPreferencesTable)
    .where(gte(userPreferencesTable.createdAt, since))
    .groupBy(userPreferencesTable.mood)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(1);

  // Top style choice from craft builds last 7 days
  const [topStyleRow] = await db
    .select({
      styleChoice: craftBuildsTable.styleChoice,
      cnt:         sql<number>`COUNT(*)`.as("cnt"),
    })
    .from(craftBuildsTable)
    .where(and(
      isNotNull(craftBuildsTable.styleChoice),
      gte(craftBuildsTable.createdAt, since),
    ))
    .groupBy(craftBuildsTable.styleChoice)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(1);

  const mood  = topPrefRow?.mood       ?? "relaxed";
  const style = topStyleRow?.styleChoice ?? "bold";

  const topPreference = `${capitalize(style)} + ${capitalize(mood)}`;

  const actions = [
    `Stock more ${capitalize(style)} selections`,
    `Promote ${capitalize(mood)} mood pairings`,
    style.toLowerCase() === "bold"   ? "Reduce light/mild inventory"  :
    style.toLowerCase() === "smooth" ? "Reduce heavy/full-body stock"  :
    "Balance variety across all strength levels",
  ];

  res.json({ topPreference, actions });
});

// ── POST /api/craft/visual-build ─────────────────────────────────────────────
// Persists a designer visual build (wood/trim/interior/brand) to designDraftsTable.
// userId falls back to an anonymous kiosk UUID when no session is present.

const ANON_KIOSK_USER = "00000000-0000-0000-0000-000000000000" as const;

const visualBuildSchema = z.object({
  craft:    z.enum(["smoke", "brew", "pour", "vape"]).default("smoke"),
  wood:     z.string().max(32),
  trim:     z.string().max(32),
  interior: z.string().max(32),
  brand:    z.string().max(80).default("MY BRAND"),
});

router.post("/visual-build", async (req: Request, res: Response) => {
  const parsed = visualBuildSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", detail: parsed.error.flatten() });
    return;
  }
  const { craft, brand, ...config } = parsed.data;

  // Use session userId when available (future auth); fall back to anonymous kiosk user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId: string = (req as any).session?.userId ?? ANON_KIOSK_USER;

  const [saved] = await db
    .insert(designDraftsTable)
    .values({
      userId,
      craft,
      draftName: brand || "My Signature",
      payload:   { wood: config.wood, trim: config.trim, interior: config.interior, brand },
    })
    .returning();

  res.status(201).json({
    id:        saved.id,
    craft,
    brand,
    ...config,
    createdAt: saved.createdAt,
  });
});

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export default router;
