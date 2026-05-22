/**
 * revenueMomentumEngine — revenue momentum + upsell velocity tracking.
 *
 * Tracks energy shifts, spending acceleration, pairing velocity,
 * environmental influence, crowd momentum. Outputs:
 *   venueMomentumScore, revenuePressureScore, engagementVelocityScore
 * Persists to venue_revenue_momentum.
 */

import { pool }   from "@workspace/db";
import { logger } from "../lib/logger";

export interface RevenueMomentumReport {
  venueId:                 string;
  venueMomentumScore:      number;
  revenuePressureScore:    number;
  engagementVelocityScore: number;
  trend:                   "accelerating" | "stable" | "decelerating";
  revenueWindow:           "PRIME" | "BUILDING" | "FLAT" | "DECLINING";
}

async function fetchRevenueSignals(venueId: string) {
  const [recent, prior, pairings] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS rev
       FROM orders WHERE venue_id=$1 AND created_at > now()-interval'15 minutes'`,
      [venueId],
    ).catch(() => ({ rows: [{ rev: 0 }] })),
    pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS rev
       FROM orders WHERE venue_id=$1
         AND created_at BETWEEN now()-interval'30 minutes' AND now()-interval'15 minutes'`,
      [venueId],
    ).catch(() => ({ rows: [{ rev: 0 }] })),
    pool.query(
      `SELECT COALESCE(COUNT(*),0) AS cnt
       FROM swipe_order_items WHERE created_at > now()-interval'15 minutes'`,
    ).catch(() => ({ rows: [{ cnt: 0 }] })),
  ]);

  return {
    recentRev:    parseFloat(String(recent.rows[0]?.rev  ?? 0)),
    priorRev:     parseFloat(String(prior.rows[0]?.rev   ?? 0)),
    pairingCount: parseInt(String(pairings.rows[0]?.cnt  ?? 0), 10),
  };
}

export async function computeRevenueMomentum(venueId: string): Promise<number> {
  const report = await computeRevenueMomentumReport(venueId);
  return report.venueMomentumScore;
}

export async function computeRevenueMomentumReport(venueId: string): Promise<RevenueMomentumReport> {
  const { recentRev, priorRev, pairingCount } = await fetchRevenueSignals(venueId);

  const momentumRatio = priorRev > 0 ? recentRev / priorRev : (recentRev > 0 ? 1.2 : 0.5);
  const venueMomentum = Math.min(1, momentumRatio * 0.5);
  const revPressure   = Math.min(1, recentRev / 500);
  const engVelocity   = Math.min(1, pairingCount / 20);

  const trend: RevenueMomentumReport["trend"] =
    momentumRatio > 1.15 ? "accelerating" :
    momentumRatio < 0.85 ? "decelerating" : "stable";

  const revenueWindow: RevenueMomentumReport["revenueWindow"] =
    venueMomentum > 0.70 && engVelocity > 0.50 ? "PRIME"     :
    venueMomentum > 0.40                        ? "BUILDING"  :
    trend === "decelerating"                    ? "DECLINING" : "FLAT";

  await pool.query(
    `INSERT INTO venue_revenue_momentum
       (venue_id, venue_momentum_score, revenue_pressure_score, engagement_velocity_score, trend, revenue_window)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [venueId, venueMomentum, revPressure, engVelocity, trend, revenueWindow],
  ).catch(err => logger.warn({ err, venueId }, "Revenue momentum persist failed"));

  return {
    venueId,
    venueMomentumScore:      venueMomentum,
    revenuePressureScore:    revPressure,
    engagementVelocityScore: engVelocity,
    trend,
    revenueWindow,
  };
}
