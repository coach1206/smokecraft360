/**
 * /api/design-drafts — Pre-gameplay design playground persistence.
 *
 *   GET    /api/design-drafts?craft=smoke   — most recent 3 drafts for caller + craft
 *   POST   /api/design-drafts               — create a new draft
 *   PATCH  /api/design-drafts               — idempotent upsert by (userId, craft):
 *                                             updates the most recent draft or inserts one
 *   DELETE /api/design-drafts/:id           — remove a specific draft (owner only)
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, desc }                        from "drizzle-orm";
import { db, designDraftsTable, CRAFT_TYPES }   from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { z }                                    from "zod";

const router: IRouter = Router();

const craftEnum = z.enum(CRAFT_TYPES);

const createSchema = z.object({
  craft:        craftEnum,
  draftName:    z.string().max(120).optional(),
  payload:      z.record(z.unknown()),
  lockedFields: z.array(z.string()).optional(),
});

const upsertSchema = z.object({
  craft:        craftEnum,
  draftName:    z.string().max(120).optional(),
  payload:      z.record(z.unknown()).optional(),
  lockedFields: z.array(z.string()).optional(),
});

// ── GET /api/design-drafts ─────────────────────────────────────────────────────

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const craft  = req.query["craft"] as string | undefined;

  if (!craft || !CRAFT_TYPES.includes(craft as typeof CRAFT_TYPES[number])) {
    res.status(400).json({ error: "Query param 'craft' must be one of: " + CRAFT_TYPES.join(", ") });
    return;
  }

  const drafts = await db
    .select()
    .from(designDraftsTable)
    .where(and(
      eq(designDraftsTable.userId, userId),
      eq(designDraftsTable.craft, craft as typeof CRAFT_TYPES[number]),
    ))
    .orderBy(desc(designDraftsTable.updatedAt))
    .limit(3);

  res.json({ drafts });
});

// ── POST /api/design-drafts ────────────────────────────────────────────────────

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
    return;
  }

  const userId = req.user!.id;
  const { craft, draftName, payload, lockedFields } = parsed.data;

  const [draft] = await db
    .insert(designDraftsTable)
    .values({
      userId,
      venueId:      req.user!.venueId ?? null,
      craft,
      draftName:    draftName    ?? "My Draft",
      payload,
      lockedFields: lockedFields ?? [],
    })
    .returning();

  res.status(201).json({ draft });
});

// ── PATCH /api/design-drafts — idempotent upsert by (userId, craft) ────────────

router.patch("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
    return;
  }

  const userId = req.user!.id;
  const { craft, draftName, payload, lockedFields } = parsed.data;

  // Find the most recent draft for this user + craft.
  const [existing] = await db
    .select({ id: designDraftsTable.id })
    .from(designDraftsTable)
    .where(and(
      eq(designDraftsTable.userId, userId),
      eq(designDraftsTable.craft, craft),
    ))
    .orderBy(desc(designDraftsTable.updatedAt))
    .limit(1);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (draftName    !== undefined) updates["draftName"]    = draftName;
  if (payload      !== undefined) updates["payload"]      = payload;
  if (lockedFields !== undefined) updates["lockedFields"] = lockedFields;

  if (existing) {
    const [updated] = await db
      .update(designDraftsTable)
      .set(updates)
      .where(eq(designDraftsTable.id, existing.id))
      .returning();
    res.json({ draft: updated, created: false });
  } else {
    const [inserted] = await db
      .insert(designDraftsTable)
      .values({
        userId,
        venueId:      req.user!.venueId ?? null,
        craft,
        draftName:    draftName    ?? "My Draft",
        payload:      payload      ?? {},
        lockedFields: lockedFields ?? [],
      })
      .returning();
    res.status(201).json({ draft: inserted, created: true });
  }
});

// ── DELETE /api/design-drafts/:id ──────────────────────────────────────────────

router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId  = req.user!.id;
  const draftId = String(req.params["id"] ?? "");

  if (!/^[0-9a-f-]{36}$/i.test(draftId)) {
    res.status(400).json({ error: "Invalid draft id" });
    return;
  }

  const [deleted] = await db
    .delete(designDraftsTable)
    .where(and(
      eq(designDraftsTable.id, draftId),
      eq(designDraftsTable.userId, userId),
    ))
    .returning({ id: designDraftsTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Draft not found or access denied" });
    return;
  }

  res.json({ message: "Draft deleted", id: deleted.id });
});

export default router;
