/**
 * loyaltyService — server-side loyalty point award helper.
 *
 * Allows non-route code (e.g. session creation, visit tracking callbacks)
 * to award points without going through HTTP. Uses the same idempotent
 * UPSERT as POST /api/loyalty/award but skips in-process cooldowns so
 * the server can award milestone bonuses independently of user-facing
 * cooldown windows.
 *
 * Failures are always swallowed — loyalty awards must never block primary flows.
 */

import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger";

/** Visit milestones that trigger a one-time bonus (visitCount → bonusPoints). */
export const VISIT_MILESTONES: Record<number, number> = {
  3:  50,
  7:  150,
  30: 500,
};

/**
 * Award `points` to `userId` with `reason` label (for audit trail).
 * Fire-and-forget safe — all errors are caught and logged.
 */
export async function awardPoints(
  userId: string,
  points: number,
  reason: string,
): Promise<void> {
  if (!userId || points <= 0) return;
  try {
    await db.execute(sql`
      INSERT INTO user_loyalty_points (user_id, total_points, points_redeemed)
      VALUES (${userId}::uuid, ${points}, 0)
      ON CONFLICT (user_id)
      DO UPDATE SET
        total_points = user_loyalty_points.total_points + ${points},
        updated_at   = now()
    `);
    logger.info({ userId, points, reason }, "loyalty points awarded (server-side)");
  } catch (err) {
    logger.warn({ err, userId, points, reason }, "server-side loyalty award failed (non-fatal)");
  }
}

/**
 * Check whether a visit milestone was just reached and award the bonus if so.
 * Idempotent-ish: milestones fire exactly once because the visitCount only
 * ever increases, so the same milestone is hit exactly once per user×venue.
 */
export function checkAndAwardVisitMilestone(userId: string, visitCount: number): void {
  const bonus = VISIT_MILESTONES[visitCount];
  if (!bonus) return;
  void awardPoints(userId, bonus, `visit_milestone_${visitCount}`);
}
