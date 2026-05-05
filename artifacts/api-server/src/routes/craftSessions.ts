/**
 * /api/craft-sessions — timer + streak + save/resume state for craft builds.
 *
 *   GET    /api/craft-sessions?craft=smoke  — current session for caller + craft
 *   POST   /api/craft-sessions              — start a new session
 *   PATCH  /api/craft-sessions              — idempotent upsert by (userId, craft):
 *                                             auto-save on every phase transition
 *   DELETE /api/craft-sessions/:id          — abandon / clear a session (owner only)
 *
 * PATCH is the hot path called on every phase transition. It requires no
 * row-ID knowledge from the client — it finds the existing session for
 * (userId, craft) and updates it, or inserts a fresh one if none exists.
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, desc }                        from "drizzle-orm";
import { db, craftSessionStatesTable, CRAFT_TYPES, CRAFT_PHASES } from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { z }                                    from "zod";

const router: IRouter = Router();

const craftEnum = z.enum(CRAFT_TYPES);
const phaseEnum = z.enum(CRAFT_PHASES);

/** Default session duration: 35 min = 2100 s (matches schema default). */
const DEFAULT_DURATION = 2100;

const createSchema = z.object({
  craft:             craftEnum,
  buildId:           z.string().uuid().optional(),
  phase:             phaseEnum.optional(),
  timerDurationSecs: z.number().int().min(1800).max(2400).optional(),
});

const upsertSchema = z.object({
  craft:        craftEnum,
  phase:        phaseEnum.optional(),
  streakCount:  z.number().int().min(0).optional(),
  buildId:      z.string().uuid().optional(),
  /** Style card ID chosen by the user — persisted for resume. */
  styleId:      z.string().max(64).optional(),
  /** Mood card ID chosen by the user — persisted for resume. */
  moodId:       z.string().max(64).optional(),
  /** Remaining milliseconds — used to recompute expiresAt on each save. */
  remainingMs:  z.number().int().min(0).optional(),
});

// ── GET /api/craft-sessions ────────────────────────────────────────────────────

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const craft  = req.query["craft"] as string | undefined;

  if (!craft || !CRAFT_TYPES.includes(craft as typeof CRAFT_TYPES[number])) {
    res.status(400).json({ error: "Query param 'craft' must be one of: " + CRAFT_TYPES.join(", ") });
    return;
  }

  const [session] = await db
    .select()
    .from(craftSessionStatesTable)
    .where(and(
      eq(craftSessionStatesTable.userId, userId),
      eq(craftSessionStatesTable.craft, craft as typeof CRAFT_TYPES[number]),
    ))
    .orderBy(desc(craftSessionStatesTable.createdAt))
    .limit(1);

  res.json({ session: session ?? null });
});

// ── POST /api/craft-sessions ───────────────────────────────────────────────────

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
    return;
  }

  const userId = req.user!.id;
  const { craft, buildId, timerDurationSecs, phase } = parsed.data;
  const duration = timerDurationSecs ?? DEFAULT_DURATION;
  const now      = new Date();
  const expires  = new Date(now.getTime() + duration * 1000);

  const [session] = await db
    .insert(craftSessionStatesTable)
    .values({
      userId,
      venueId:           req.user!.venueId ?? null,
      craft,
      buildId:           buildId ?? null,
      timerStartedAt:    now,
      timerDurationSecs: duration,
      phase:             (phase as typeof CRAFT_PHASES[number]) ?? "style",
      streakCount:       0,
      lastSavedAt:       now,
      expiresAt:         expires,
    })
    .returning();

  res.status(201).json({ session });
});

// ── PATCH /api/craft-sessions — idempotent upsert by (userId, craft) ───────────

router.patch("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
    return;
  }

  const userId = req.user!.id;
  const { craft, phase, streakCount, buildId, styleId, moodId, remainingMs } = parsed.data;

  const [existing] = await db
    .select({ id: craftSessionStatesTable.id })
    .from(craftSessionStatesTable)
    .where(and(
      eq(craftSessionStatesTable.userId, userId),
      eq(craftSessionStatesTable.craft, craft),
    ))
    .orderBy(desc(craftSessionStatesTable.createdAt))
    .limit(1);

  const now = new Date();
  const updates: Record<string, unknown> = { lastSavedAt: now };
  if (phase       !== undefined) updates["phase"]       = phase;
  if (streakCount !== undefined) updates["streakCount"] = streakCount;
  if (buildId     !== undefined) updates["buildId"]     = buildId;
  if (styleId     !== undefined) updates["styleId"]     = styleId;
  if (moodId      !== undefined) updates["moodId"]      = moodId;
  if (remainingMs !== undefined) updates["expiresAt"]   = new Date(now.getTime() + remainingMs);

  if (existing) {
    const [updated] = await db
      .update(craftSessionStatesTable)
      .set(updates)
      .where(eq(craftSessionStatesTable.id, existing.id))
      .returning();
    res.json({ session: updated, created: false });
  } else {
    const duration = DEFAULT_DURATION;
    const expires  = remainingMs != null
      ? new Date(now.getTime() + remainingMs)
      : new Date(now.getTime() + duration * 1000);

    const [inserted] = await db
      .insert(craftSessionStatesTable)
      .values({
        userId,
        venueId:           req.user!.venueId ?? null,
        craft,
        buildId:           buildId ?? null,
        styleId:           styleId ?? null,
        moodId:            moodId  ?? null,
        timerStartedAt:    now,
        timerDurationSecs: duration,
        phase:             (phase as typeof CRAFT_PHASES[number]) ?? "intro",
        streakCount:       streakCount ?? 0,
        lastSavedAt:       now,
        expiresAt:         expires,
      })
      .returning();
    res.status(201).json({ session: inserted, created: true });
  }
});

// ── DELETE /api/craft-sessions/:id ────────────────────────────────────────────

router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId    = req.user!.id;
  const sessionId = String(req.params["id"] ?? "");

  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const [deleted] = await db
    .delete(craftSessionStatesTable)
    .where(and(
      eq(craftSessionStatesTable.id, sessionId),
      eq(craftSessionStatesTable.userId, userId),
    ))
    .returning({ id: craftSessionStatesTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Session not found or access denied" });
    return;
  }

  res.json({ message: "Session cleared", id: deleted.id });
});

export default router;
