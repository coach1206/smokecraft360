/**
 * Rewards admin routes
 *
 * GET    /api/rewards         — list all rewards (admin) or active rewards (any auth)
 * POST   /api/rewards         — create a reward (manager+)
 * PATCH  /api/rewards/:id     — update a reward (manager+)
 * DELETE /api/rewards/:id     — deactivate a reward (manager+)
 */

import { Router, type IRouter, type Response } from "express";
import { eq, desc }                             from "drizzle-orm";
import {
  db,
  rewardsTable,
  REWARD_TYPES,
}                                               from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import { z }                                    from "zod";

const router: IRouter = Router();

const rewardSchema = z.object({
  name:          z.string().min(2).max(80),
  description:   z.string().max(300).optional(),
  type:          z.enum(REWARD_TYPES),
  pointsCost:    z.number().int().min(1).max(100_000),
  levelRequired: z.number().int().min(0).max(4).default(0),
  active:        z.boolean().default(true),
  venueId:       z.string().uuid().optional(),
});

// ── GET /api/rewards ──────────────────────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  async (_req: AuthRequest, res: Response) => {
    const rows = await db
      .select()
      .from(rewardsTable)
      .orderBy(desc(rewardsTable.createdAt));
    res.json(rows);
  },
);

// ── POST /api/rewards ─────────────────────────────────────────────────────────

router.post(
  "/",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const parse = rewardSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid reward data", issues: parse.error.issues });
      return;
    }
    const [reward] = await db
      .insert(rewardsTable)
      .values(parse.data)
      .returning();
    res.status(201).json(reward);
  },
);

// ── PATCH /api/rewards/:id ────────────────────────────────────────────────────

router.patch(
  "/:id",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const parse = rewardSchema.partial().safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }
    const [updated] = await db
      .update(rewardsTable)
      .set({ ...parse.data, updatedAt: new Date() })
      .where(eq(rewardsTable.id, String(req.params.id ?? "")))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Reward not found" });
      return;
    }
    res.json(updated);
  },
);

// ── DELETE /api/rewards/:id (soft delete = deactivate) ────────────────────────

router.delete(
  "/:id",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const [updated] = await db
      .update(rewardsTable)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(rewardsTable.id, String(req.params.id ?? "")))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Reward not found" });
      return;
    }
    res.json({ message: "Reward deactivated", reward: updated });
  },
);

export default router;
