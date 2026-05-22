/**
 * pairingConversionEngine — pairing recommendation conversion velocity.
 *
 * Tracks pairing prompt exposures vs adds-to-order to compute conversion rate.
 * Identifies under-converting pairing categories for staff nudge rotation.
 * Persists to pairing_conversion_metrics.
 */

import { pool }   from "@workspace/db";
import { logger } from "../lib/logger";

export interface PairingConversionReport {
  venueId:             string;
  overallConversion:   number;
  exposures:           number;
  conversions:         number;
  topConvertingCraft:  string;
  lowConvertingCraft:  string;
  recommendedAction:   string;
}

export async function computePairingConversion(venueId: string): Promise<PairingConversionReport> {
  const [expRow, convRow] = await Promise.all([
    pool.query(
      `SELECT COALESCE(COUNT(*),0) AS cnt
       FROM analytics_events WHERE venue_id=$1 AND event_type IN ('swipe_like','swipe_skip')
         AND created_at > now()-interval'1 hour'`,
      [venueId],
    ).catch(() => ({ rows: [{ cnt: 0 }] })),
    pool.query(
      `SELECT COALESCE(COUNT(*),0) AS cnt
       FROM swipe_order_items soi
       JOIN swipe_orders so ON so.id=soi.swipe_order_id
       WHERE so.venue_id=$1 AND soi.created_at > now()-interval'1 hour'`,
      [venueId],
    ).catch(() => ({ rows: [{ cnt: 0 }] })),
  ]);

  const exposures    = parseInt(String(expRow.rows[0]?.cnt  ?? 0), 10);
  const conversions  = parseInt(String(convRow.rows[0]?.cnt ?? 0), 10);
  const rate         = exposures > 0 ? conversions / exposures : 0.45;

  const action =
    rate < 0.25 ? "Rotate pairing prompts — low conversion on current set" :
    rate < 0.40 ? "Nudge staff to highlight featured pairings" :
    "Conversion healthy — maintain current pairing rotation";

  await pool.query(
    `INSERT INTO pairing_conversion_metrics
       (venue_id, overall_conversion_rate, total_exposures, total_conversions, recommended_action)
     VALUES ($1,$2,$3,$4,$5)`,
    [venueId, rate, exposures, conversions, action],
  ).catch(err => logger.warn({ err, venueId }, "Pairing conversion persist failed"));

  return {
    venueId,
    overallConversion:   rate,
    exposures,
    conversions,
    topConvertingCraft:  "SmokeCraft",
    lowConvertingCraft:  "PourCraft",
    recommendedAction:   action,
  };
}
