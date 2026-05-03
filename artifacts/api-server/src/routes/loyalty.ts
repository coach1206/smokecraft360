/**
 * Loyalty routes
 *
 * GET  /api/loyalty              — current user's points balance + available rewards + recent redemptions
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
}                                               from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import { z }                                    from "zod";

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
    const userId   = req.user!.id;
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

    res.json({
      ...balance,
      levelIndex,
      available,
      recentRedemptions,
    });
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
    // The previous flow did SELECT balance → check → UPDATE +cost, which
    // allows two parallel redeems with balance==cost to BOTH pass the
    // check and BOTH deduct (overdraft). The fix is a single conditional
    // UPDATE that only succeeds when the balance is still >= cost at the
    // moment the row is locked, mirroring the atomic-claim pattern used
    // on the offline-queue race. Same row of points_redeemed is the
    // single point of mutual exclusion.
    //
    // Step 1: ensure a balance row exists (idempotent insert with 0/0).
    await db.execute(sql`
      INSERT INTO user_loyalty_points (user_id, total_points, points_redeemed)
      VALUES (${userId}::uuid, 0, 0)
      ON CONFLICT (user_id) DO NOTHING
    `);
    // Step 2: conditional debit — only succeeds if balance still >= cost.
    const debit = await db.execute(sql`
      UPDATE user_loyalty_points
         SET points_redeemed = points_redeemed + ${reward.pointsCost},
             updated_at      = now()
       WHERE user_id = ${userId}::uuid
         AND (total_points - points_redeemed) >= ${reward.pointsCost}
       RETURNING total_points, points_redeemed
    `) as { rows: Array<{ total_points: number; points_redeemed: number }> };

    if (!debit.rows || debit.rows.length === 0) {
      // Race lost OR genuinely insufficient. Re-fetch the truth for the
      // user-facing error so they see why.
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

    // Record redemption
    const [redemption] = await db
      .insert(redemptionsTable)
      .values({
        userId,
        rewardId:    reward.id,
        rewardName:  reward.name,
        pointsSpent: reward.pointsCost,
        status:      "pending",
      })
      .returning();

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
  async (_req: AuthRequest, res: Response) => {
    const rows = await db
      .select()
      .from(redemptionsTable)
      .orderBy(desc(redemptionsTable.createdAt))
      .limit(100);
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
    const [updated] = await db
      .update(redemptionsTable)
      .set({ ...parse.data, updatedAt: new Date() })
      .where(eq(redemptionsTable.id, String(req.params.id ?? "")))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Redemption not found" });
      return;
    }
    res.json(updated);
  },
);

export default router;
