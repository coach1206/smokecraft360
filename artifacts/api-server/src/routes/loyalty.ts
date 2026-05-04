/**
 * Loyalty routes
 *
 * GET  /api/loyalty              — current user's points balance + visit streak + available rewards + recent redemptions
 * POST /api/loyalty/award        — award points (taste_challenge, build_your_own, craft_complete, design_save, return_visit, streak_milestone)
 * POST /api/loyalty/redeem       — redeem points for a reward
 * GET  /api/loyalty/redemptions  — admin: all redemptions for a venue
 * PATCH /api/loyalty/redemptions/:id — admin: update redemption status
 */

import { Router, type IRouter, type Response } from "express";
import { eq, desc, and, sql }                   from "drizzle-orm";
import {
  db,
  userLoyaltyPointsTable,
  rewardsTable,
  redemptionsTable,
  userProgressionTable,
  userVenueVisitsTable,
}                                               from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import { z }                                    from "zod";
import { logAudit }                             from "../lib/audit";
import { VISIT_MILESTONES }                     from "../services/loyaltyService";

const router: IRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getBalance(userId: string) {
  const [row] = await db
    .select()
    .from(userLoyaltyPointsTable)
    .where(eq(userLoyaltyPointsTable.userId, userId))
    .limit(1);
  const total    = row?.totalPoints    ?? 0;
  const redeemed = row?.pointsRedeemed ?? 0;
  return { totalPoints: total, pointsRedeemed: redeemed, pointsBalance: total - redeemed };
}

async function getUserLevelIndex(userId: string): Promise<number> {
  const TIERS = [
    { index: 0, minOrders: 0,  minXp: 0   },
    { index: 1, minOrders: 5,  minXp: 50  },
    { index: 2, minOrders: 15, minXp: 150 },
    { index: 3, minOrders: 30, minXp: 350 },
    { index: 4, minOrders: 60, minXp: 700 },
  ];
  const [prog] = await db
    .select({ xp: userProgressionTable.xp, totalVerifiedOrders: userProgressionTable.totalVerifiedOrders })
    .from(userProgressionTable)
    .where(eq(userProgressionTable.userId, userId))
    .limit(1);
  if (!prog) return 0;
  let tier = 0;
  for (const t of TIERS) {
    if (prog.totalVerifiedOrders >= t.minOrders && prog.xp >= t.minXp) tier = t.index;
  }
  return tier;
}

// ── GET /api/loyalty ───────────────────────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId  = req.user!.id;
    const venueId = req.user!.venueId ?? null;

    const [balance, levelIndex] = await Promise.all([
      getBalance(userId),
      getUserLevelIndex(userId),
    ]);

    // Available rewards the user can unlock (level met + active)
    const available = await db
      .select()
      .from(rewardsTable)
      .where(
        and(
          eq(rewardsTable.active, true),
          sql`${rewardsTable.levelRequired} <= ${levelIndex}`,
        ),
      )
      .orderBy(rewardsTable.pointsCost);

    // Recent redemptions
    const recentRedemptions = await db
      .select()
      .from(redemptionsTable)
      .where(eq(redemptionsTable.userId, userId))
      .orderBy(desc(redemptionsTable.createdAt))
      .limit(10);

    // Visit streak info (scoped to home venue if set)
    let visitInfo: {
      visitCount: number;
      firstVisitAt: Date | null;
      lastVisitAt:  Date | null;
      isReturnUser: boolean;
      nextMilestone: number | null;
      nextMilestoneBonus: number | null;
    } = {
      visitCount: 0, firstVisitAt: null, lastVisitAt: null,
      isReturnUser: false, nextMilestone: null, nextMilestoneBonus: null,
    };

    if (venueId) {
      const [visit] = await db
        .select()
        .from(userVenueVisitsTable)
        .where(
          and(
            eq(userVenueVisitsTable.userId, userId),
            eq(userVenueVisitsTable.venueId, venueId),
          ),
        )
        .limit(1);

      if (visit) {
        const vc = visit.visitCount;
        const milestoneThresholds = Object.keys(VISIT_MILESTONES).map(Number).sort((a, b) => a - b);
        const next = milestoneThresholds.find(t => t > vc) ?? null;
        visitInfo = {
          visitCount:         vc,
          firstVisitAt:       visit.firstVisitAt,
          lastVisitAt:        visit.lastVisitAt,
          isReturnUser:       vc > 1,
          nextMilestone:      next,
          nextMilestoneBonus: next !== null ? (VISIT_MILESTONES[next] ?? null) : null,
        };
      }
    }

    res.json({
      ...balance,
      levelIndex,
      visitInfo,
      available,
      recentRedemptions,
    });
  },
);

// ── POST /api/loyalty/award ──────────────────────────────────────────────────

const AWARD_RULES: Record<string, { max: number; cooldownMs: number }> = {
  taste_challenge:  { max: 15,  cooldownMs:  30_000 },
  build_your_own:   { max: 20,  cooldownMs:  60_000 },
  craft_complete:   { max: 30,  cooldownMs: 120_000 },
  design_save:      { max: 10,  cooldownMs:  60_000 },
  return_visit:     { max: 25,  cooldownMs: 3_600_000 },
  streak_milestone: { max: 500, cooldownMs: 86_400_000 },
};

const AWARD_REASONS = [
  "taste_challenge",
  "build_your_own",
  "craft_complete",
  "design_save",
  "return_visit",
  "streak_milestone",
] as const;

const awardSchema = z.object({
  points: z.number().int().min(1).max(500),
  reason: z.enum(AWARD_REASONS),
});

const awardCooldowns = new Map<string, number>();

router.post(
  "/award",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const parse = awardSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "points (1-500) and valid reason required" });
      return;
    }
    const userId = req.user!.id;
    const { reason } = parse.data;
    const rule = AWARD_RULES[reason];
    const points = Math.min(parse.data.points, rule.max);

    const cooldownKey = `${userId}:${reason}`;
    const lastAwarded = awardCooldowns.get(cooldownKey) ?? 0;
    if (Date.now() - lastAwarded < rule.cooldownMs) {
      res.status(429).json({ error: "Too many award requests, try again shortly" });
      return;
    }
    awardCooldowns.set(cooldownKey, Date.now());

    await db.execute(sql`
      INSERT INTO user_loyalty_points (user_id, total_points, points_redeemed)
      VALUES (${userId}::uuid, ${points}, 0)
      ON CONFLICT (user_id)
      DO UPDATE SET
        total_points = user_loyalty_points.total_points + ${points},
        updated_at   = now()
    `);

    req.log.info({ userId, points, reason }, "loyalty points awarded");

    await logAudit(req as any, {
      action: "loyalty.points_awarded",
      entityType: "user_loyalty_points",
      entityId: userId,
      after: { points, reason } as unknown as Record<string, unknown>,
    });

    res.json({ awarded: points, reason });
  },
);

// ── POST /api/loyalty/redeem ───────────────────────────────────────────────────

const redeemSchema = z.object({ rewardId: z.string().uuid() });

router.post(
  "/redeem",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const parse = redeemSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "rewardId (UUID) is required" });
      return;
    }
    const userId  = req.user!.id;
    const { rewardId } = parse.data;

    // Fetch reward
    const [reward] = await db
      .select()
      .from(rewardsTable)
      .where(and(eq(rewardsTable.id, rewardId), eq(rewardsTable.active, true)))
      .limit(1);
    if (!reward) {
      res.status(404).json({ error: "Reward not found or inactive" });
      return;
    }

    // Check level
    const levelIndex = await getUserLevelIndex(userId);
    if (levelIndex < reward.levelRequired) {
      res.status(403).json({ error: "Your tier is not high enough for this reward" });
      return;
    }

    // ── Atomic balance debit (race-safe). ──────────────────────────────────
    await db.execute(sql`
      INSERT INTO user_loyalty_points (user_id, total_points, points_redeemed)
      VALUES (${userId}::uuid, 0, 0)
      ON CONFLICT (user_id) DO NOTHING
    `);
    const debit = await db.execute(sql`
      UPDATE user_loyalty_points
         SET points_redeemed = points_redeemed + ${reward.pointsCost},
             updated_at      = now()
       WHERE user_id = ${userId}::uuid
         AND (total_points - points_redeemed) >= ${reward.pointsCost}
       RETURNING total_points, points_redeemed
    `) as { rows: Array<{ total_points: number; points_redeemed: number }> };

    if (!debit.rows || debit.rows.length === 0) {
      const truth = await getBalance(userId);
      res.status(402).json({
        error:         "Insufficient points",
        pointsBalance: truth.pointsBalance,
        pointsNeeded:  reward.pointsCost,
      });
      return;
    }
    const newTotalRedeemed = Number(debit.rows[0]!.points_redeemed);
    const newTotal         = Number(debit.rows[0]!.total_points);

    // Record redemption (with venue scoping)
    const [redemption] = await db
      .insert(redemptionsTable)
      .values({
        userId,
        rewardId:    reward.id,
        rewardName:  reward.name,
        pointsSpent: reward.pointsCost,
        venueId:     reward.venueId ?? null,
        status:      "pending",
      })
      .returning();

    await logAudit(req as any, {
      action: "loyalty.reward_redeemed",
      entityType: "redemption",
      entityId: redemption.id,
      after: { rewardId: reward.id, rewardName: reward.name, pointsSpent: reward.pointsCost } as unknown as Record<string, unknown>,
    });

    res.json({
      message:    "Reward redeemed — pending staff fulfilment",
      redemption,
      newBalance: newTotal - newTotalRedeemed,
    });
  },
);

// ── GET /api/loyalty/redemptions (admin) ──────────────────────────────────────

router.get(
  "/redemptions",
  requireAuth,
  requireRole("staff", "manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user!.venueId;

    let rows;
    if (req.user!.role === "super_admin") {
      rows = await db
        .select()
        .from(redemptionsTable)
        .orderBy(desc(redemptionsTable.createdAt))
        .limit(100);
    } else {
      if (!venueId) {
        res.status(403).json({ error: "No venue context" });
        return;
      }
      rows = await db
        .select()
        .from(redemptionsTable)
        .where(eq(redemptionsTable.venueId, venueId))
        .orderBy(desc(redemptionsTable.createdAt))
        .limit(100);
    }
    res.json(rows);
  },
);

// ── PATCH /api/loyalty/redemptions/:id (admin) ────────────────────────────────

const updateRedemptionSchema = z.object({
  status: z.enum(["pending", "fulfilled", "cancelled"]),
  notes:  z.string().max(300).optional(),
});

router.patch(
  "/redemptions/:id",
  requireAuth,
  requireRole("staff", "manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const parse = updateRedemptionSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }

    const redemptionId = String(req.params.id ?? "");
    const [existing] = await db
      .select({ venueId: redemptionsTable.venueId })
      .from(redemptionsTable)
      .where(eq(redemptionsTable.id, redemptionId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Redemption not found" });
      return;
    }

    if (req.user!.role !== "super_admin" && existing.venueId && req.user!.venueId !== existing.venueId) {
      res.status(403).json({ error: "Redemption belongs to a different venue" });
      return;
    }

    const [updated] = await db
      .update(redemptionsTable)
      .set({ ...parse.data, updatedAt: new Date() })
      .where(eq(redemptionsTable.id, redemptionId))
      .returning();

    await logAudit(req as any, {
      action: "redemption.status_updated",
      entityType: "redemption",
      entityId: redemptionId,
      after: parse.data as unknown as Record<string, unknown>,
    });

    res.json(updated);
  },
);

export default router;
