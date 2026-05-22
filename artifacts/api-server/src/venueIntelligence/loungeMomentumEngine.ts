/**
 * loungeMomentumEngine — lounge energy + crowd momentum tracking.
 *
 * Scores lounge momentum from event velocity, dwell time patterns,
 * and interaction density. Persists to lounge_momentum_events.
 */

import { pool }   from "@workspace/db";
import { logger } from "../lib/logger";

export async function computeLoungeMomentum(venueId: string): Promise<number> {
  const [eventsRow, dwellRow] = await Promise.all([
    pool.query(
      `SELECT COALESCE(COUNT(*),0) AS cnt
       FROM analytics_events WHERE venue_id=$1 AND created_at > now()-interval'15 minutes'`,
      [venueId],
    ).catch(() => ({ rows: [{ cnt: 0 }] })),
    pool.query(
      `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (now()-created_at))/60),0) AS avg_dwell
       FROM guest_tabs WHERE venue_id=$1 AND status='open'`,
      [venueId],
    ).catch(() => ({ rows: [{ avg_dwell: 0 }] })),
  ]);

  const events    = parseInt(String(eventsRow.rows[0]?.cnt      ?? 0), 10);
  const avgDwell  = parseFloat(String(dwellRow.rows[0]?.avg_dwell ?? 0));

  const eventScore = Math.min(1, events / 60);
  const dwellScore = avgDwell > 30 && avgDwell < 90 ? 0.8 : avgDwell >= 90 ? 0.5 : 0.3;
  const momentum   = eventScore * 0.6 + dwellScore * 0.4;

  await pool.query(
    `INSERT INTO lounge_momentum_events (venue_id, momentum_score, event_count, avg_dwell_minutes)
     VALUES ($1,$2,$3,$4)`,
    [venueId, momentum, events, avgDwell],
  ).catch(err => logger.warn({ err, venueId }, "Lounge momentum persist failed"));

  return momentum;
}
