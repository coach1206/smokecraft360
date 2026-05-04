/**
 * Rewards admin routes
 *
 * GET    /api/rewards         — list all rewards (admin) or active rewards (any auth)
 * POST   /api/rewards         — create a reward (manager+)
 * PATCH  /api/rewards/:id     — update a reward (manager+)
 * DELETE /api/rewards/:id     — deactivate a reward (manager+)
 */

import { Router, type IRouter, type Response } from "express";
import { eq, desc, or, isNull }                 from "drizzle-orm";
import {
  db,
  rewardsTable,
  REWARD_TYPES,
}                                               from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import { z }                                    from "zod";
import { logAudit }                             from "../lib/audit";

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
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user!.venueId;

    let rows;
    if (req.user!.role === "super_admin") {
      rows = await db
        .select()
        .from(rewardsTable)
        .orderBy(desc(rewardsTable.createdAt));
    } else {
      rows = await db
        .select()
        .from(rewardsTable)
        .where(
          or(
            eq(rewardsTable.venueId, venueId ?? ""),
            isNull(rewardsTable.venueId),
          ),
        )
        .orderBy(desc(rewardsTable.createdAt));
    }
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

    await logAudit(req, {
      action: "reward.created",
      entityType: "reward",
      entityId: reward.id,
      after: { name: reward.name, type: reward.type, pointsCost: reward.pointsCost } as unknown as Record<string, unknown>,
    });

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

    await logAudit(req, {
      action: "reward.updated",
      entityType: "reward",
      entityId: updated.id,
      after: parse.data as unknown as Record<string, unknown>,
    });

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

    await logAudit(req, {
      action: "reward.deactivated",
      entityType: "reward",
      entityId: updated.id,
      before: { active: true } as unknown as Record<string, unknown>,
      after: { active: false } as unknown as Record<string, unknown>,
    });

    res.json({ message: "Reward deactivated", reward: updated });
  },
);

export default router;
