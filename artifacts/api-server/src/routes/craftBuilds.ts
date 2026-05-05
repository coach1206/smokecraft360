/**
 * /api/craft-builds — per-step build state for the Craft Experience Engine.
 *
 *   GET    /api/craft-builds?craft=smoke   — latest build for caller + craft
 *   POST   /api/craft-builds               — create a new build row
 *   PATCH  /api/craft-builds               — idempotent upsert by (userId, craft)
 *
 * PATCH is the hot path called on every phase transition. It finds the most
 * recent build for (userId, craft) and updates it; if none exists, it
 * inserts one. No row-ID knowledge required by the client.
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, desc }                        from "drizzle-orm";
import { db, craftBuildsTable, CRAFT_TYPES, CRAFT_PHASES } from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { z }                                    from "zod";
import { syncActiveTournamentScores }           from "../lib/tournamentSync";

const router: IRouter = Router();

const craftEnum = z.enum(CRAFT_TYPES);
const phaseEnum = z.enum(CRAFT_PHASES);

const createSchema = z.object({
  craft:          craftEnum,
  venueId:        z.string().uuid().optional(),
  sessionId:      z.string().uuid().optional(),
  phase:          phaseEnum.optional(),
  styleChoice:    z.string().max(120).optional(),
  moodChoice:     z.string().max(120).optional(),
  profileAnswers: z.record(z.unknown()).optional(),
  score:          z.number().finite().min(0).max(10).optional(),
});

const upsertSchema = z.object({
  craft:          craftEnum,
  phase:          phaseEnum.optional(),
  styleChoice:    z.string().max(120).optional(),
  moodChoice:     z.string().max(120).optional(),
  profileAnswers: z.record(z.unknown()).optional(),
  score:          z.number().finite().min(0).max(10).optional(),
});

// ── GET /api/craft-builds ──────────────────────────────────────────────────────

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const craft  = req.query["craft"] as string | undefined;

  if (!craft || !CRAFT_TYPES.includes(craft as typeof CRAFT_TYPES[number])) {
    res.status(400).json({ error: "Query param 'craft' must be one of: " + CRAFT_TYPES.join(", ") });
    return;
  }

  const [build] = await db
    .select()
    .from(craftBuildsTable)
    .where(and(
      eq(craftBuildsTable.userId, userId),
      eq(craftBuildsTable.craft, craft as typeof CRAFT_TYPES[number]),
    ))
    .orderBy(desc(craftBuildsTable.updatedAt))
    .limit(1);

  res.json({ build: build ?? null });
});

// ── POST /api/craft-builds ─────────────────────────────────────────────────────

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
    return;
  }

  const userId = req.user!.id;
  const { craft, venueId, sessionId, phase, styleChoice, moodChoice, profileAnswers, score } = parsed.data;

  const [build] = await db
    .insert(craftBuildsTable)
    .values({
      userId,
      venueId:        venueId   ?? req.user!.venueId ?? null,
      sessionId:      sessionId ?? null,
      craft,
      phase:          phase          ?? "intro",
      styleChoice:    styleChoice    ?? null,
      moodChoice:     moodChoice     ?? null,
      profileAnswers: profileAnswers ?? {},
      score:          score != null ? String(score) : null,
    })
    .returning();

  res.status(201).json({ build });
});

// ── PATCH /api/craft-builds — idempotent upsert by (userId, craft) ─────────────

router.patch("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
    return;
  }

  const userId = req.user!.id;
  const { craft, phase, styleChoice, moodChoice, profileAnswers, score } = parsed.data;

  // Find the most recent build for this user + craft.
  const [existing] = await db
    .select({ id: craftBuildsTable.id })
    .from(craftBuildsTable)
    .where(and(
      eq(craftBuildsTable.userId, userId),
      eq(craftBuildsTable.craft, craft),
    ))
    .orderBy(desc(craftBuildsTable.updatedAt))
    .limit(1);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (phase          !== undefined) updates["phase"]          = phase;
  if (styleChoice    !== undefined) updates["styleChoice"]    = styleChoice;
  if (moodChoice     !== undefined) updates["moodChoice"]     = moodChoice;
  if (profileAnswers !== undefined) updates["profileAnswers"] = profileAnswers;
  if (score          !== undefined) updates["score"]          = String(score);

  if (existing) {
    // Update in place.
    const [updated] = await db
      .update(craftBuildsTable)
      .set(updates)
      .where(eq(craftBuildsTable.id, existing.id))
      .returning();

    // Auto-propagate score to any active tournament entries for this user+craft.
    // Fire-and-forget — must not delay the response.
    if (score !== undefined) {
      void syncActiveTournamentScores(userId, craft);
    }

    res.json({ build: updated, created: false });
  } else {
    // Insert new row — treat this as the first save.
    const [inserted] = await db
      .insert(craftBuildsTable)
      .values({
        userId,
        venueId:        req.user!.venueId ?? null,
        craft,
        phase:          (phase as typeof CRAFT_PHASES[number]) ?? "intro",
        styleChoice:    styleChoice    ?? null,
        moodChoice:     moodChoice     ?? null,
        profileAnswers: profileAnswers ?? {},
        score:          score != null ? String(score) : null,
      })
      .returning();

    // Auto-propagate score on first-save too
    if (score !== undefined) {
      void syncActiveTournamentScores(userId, craft);
    }

    res.status(201).json({ build: inserted, created: true });
  }
});

export default router;
