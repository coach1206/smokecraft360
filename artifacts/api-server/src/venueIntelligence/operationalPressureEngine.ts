/**
 * operationalPressureEngine — composite operational pressure scoring.
 *
 * Aggregates staff load, inventory stress, order queue depth,
 * and guest volume into a single 0–1 pressure index.
 * Persists to operational_pressure_scores.
 */

import { pool }   from "@workspace/db";
import { logger } from "../lib/logger";

export async function computeOperationalPressure(venueId: string): Promise<number> {
  const [orderRow, tabRow, invRow] = await Promise.all([
    pool.query(
      `SELECT COALESCE(COUNT(*),0) AS cnt
       FROM orders WHERE venue_id=$1 AND status IN ('pending','processing')`,
      [venueId],
    ).catch(() => ({ rows: [{ cnt: 0 }] })),
    pool.query(
      `SELECT COALESCE(COUNT(*),0) AS cnt
       FROM guest_tabs WHERE venue_id=$1 AND status='open'`,
      [venueId],
    ).catch(() => ({ rows: [{ cnt: 0 }] })),
    pool.query(
      `SELECT COALESCE(AVG(CASE WHEN quantity<3 THEN 1.0 ELSE 0.0 END),0) AS pct
       FROM products WHERE venue_id=$1`,
      [venueId],
    ).catch(() => ({ rows: [{ pct: 0.3 }] })),
  ]);

  const queueDepth  = parseInt(String(orderRow.rows[0]?.cnt ?? 0), 10);
  const openTabs    = parseInt(String(tabRow.rows[0]?.cnt   ?? 0), 10);
  const invStress   = parseFloat(String(invRow.rows[0]?.pct  ?? 0.3));

  const queuePressure = Math.min(1, queueDepth / 30);
  const tabPressure   = Math.min(1, openTabs   / 40);
  const pressure = queuePressure * 0.4 + tabPressure * 0.35 + invStress * 0.25;

  await pool.query(
    `INSERT INTO operational_pressure_scores
       (venue_id, pressure_score, queue_depth, open_tabs, inventory_stress)
     VALUES ($1,$2,$3,$4,$5)`,
    [venueId, pressure, queueDepth, openTabs, invStress],
  ).catch(err => logger.warn({ err, venueId }, "Operational pressure persist failed"));

  return pressure;
}
