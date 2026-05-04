/**
 * /api/craft-sessions — timer + streak + save/resume state for craft builds.
 *
 *   GET    /api/craft-sessions?craft=smoke  — current active session for caller + craft
 *   POST   /api/craft-sessions              — start a new session (upserts on userId+craft)
 *   PATCH  /api/craft-sessions/:id          — auto-save: update phase/streak/timerRemaining
 *   DELETE /api/craft-sessions/:id          — abandon / clear session (owner only)
 *
 * PATCH is the hot path: called on every phase transition. It is intentionally
 * lightweight — only the fields provided are updated.
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, desc }                        from "drizzle-orm";
import { db, craftSessionStatesTable, CRAFT_TYPES, CRAFT_PHASES } from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { z }                                    from "zod";

const router: IRouter = Router();

const craftEnum = z.enum(CRAFT_TYPES);
const phaseEnum = z.enum(CRAFT_PHASES);

/** Random duration between 30–38 min (inclusive), stored at session start. */
function randomDuration(): number {
  const min = 1800;   // 30 min
  const max = 2280;   // 38 min
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const createSchema = z.object({
  craft:             craftEnum,
  buildId:           z.string().uuid().optional(),
  timerDurationSecs: z.number().int().min(1800).max(2400).optional(),
});

const patchSchema = z.object({
  phase:        phaseEnum.optional(),
  streakCount:  z.number().int().min(0).optional(),
  buildId:      z.string().uuid().optional(),
  /** Remaining milliseconds — stored implicitly via lastSavedAt; the client
   *  sends this so the server can recompute expiresAt on each save. */
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
  const { craft, buildId, timerDurationSecs } = parsed.data;
  const duration = timerDurationSecs ?? randomDuration();
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
      phase:             "intro",
      streakCount:       0,
      lastSavedAt:       now,
      expiresAt:         expires,
    })
    .returning();

  res.status(201).json({ session });
});

// ── PATCH /api/craft-sessions/:id ─────────────────────────────────────────────

router.patch("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId    = req.user!.id;
  const sessionId = String(req.params["id"] ?? "");

  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
    return;
  }

  const now = new Date();
  const updates: Record<string, unknown> = { lastSavedAt: now };

  if (parsed.data.phase       !== undefined) updates["phase"]       = parsed.data.phase;
  if (parsed.data.streakCount !== undefined) updates["streakCount"] = parsed.data.streakCount;
  if (parsed.data.buildId     !== undefined) updates["buildId"]     = parsed.data.buildId;

  // Recompute expiresAt from remaining time if provided.
  if (parsed.data.remainingMs !== undefined) {
    updates["expiresAt"] = new Date(now.getTime() + parsed.data.remainingMs);
  }

  const [updated] = await db
    .update(craftSessionStatesTable)
    .set(updates)
    .where(and(
      eq(craftSessionStatesTable.id, sessionId),
      eq(craftSessionStatesTable.userId, userId),
    ))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Session not found or access denied" });
    return;
  }

  res.json({ session: updated });
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
