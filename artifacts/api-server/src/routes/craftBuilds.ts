/**
 * /api/craft-builds — per-step build state for the Craft Experience Engine.
 *
 *   GET    /api/craft-builds?craft=smoke   — latest build for the caller + craft
 *   POST   /api/craft-builds               — create a new build row
 *   PATCH  /api/craft-builds/:id           — update phase/score/choices (idempotent)
 *
 * All endpoints require auth. PATCH is safe to call on every phase
 * transition — the updatedAt stamp advances but no duplicate rows are
 * created.
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, desc }                        from "drizzle-orm";
import { db, craftBuildsTable, CRAFT_TYPES, CRAFT_PHASES } from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { z }                                    from "zod";

const router: IRouter = Router();

const craftEnum  = z.enum(CRAFT_TYPES);
const phaseEnum  = z.enum(CRAFT_PHASES);

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

const patchSchema = z.object({
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

// ── PATCH /api/craft-builds/:id ────────────────────────────────────────────────

router.patch("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId  = req.user!.id;
  const buildId = String(req.params["id"] ?? "");

  if (!/^[0-9a-f-]{36}$/i.test(buildId)) {
    res.status(400).json({ error: "Invalid build id" });
    return;
  }

  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.phase          !== undefined) updates["phase"]          = parsed.data.phase;
  if (parsed.data.styleChoice    !== undefined) updates["styleChoice"]    = parsed.data.styleChoice;
  if (parsed.data.moodChoice     !== undefined) updates["moodChoice"]     = parsed.data.moodChoice;
  if (parsed.data.profileAnswers !== undefined) updates["profileAnswers"] = parsed.data.profileAnswers;
  if (parsed.data.score          !== undefined) updates["score"]          = String(parsed.data.score);

  const [updated] = await db
    .update(craftBuildsTable)
    .set(updates)
    .where(and(
      eq(craftBuildsTable.id, buildId),
      eq(craftBuildsTable.userId, userId),
    ))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Build not found or access denied" });
    return;
  }

  res.json({ build: updated });
});

export default router;
