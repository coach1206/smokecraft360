/**
 * temporalPatternEngine — time-aware behavioral learning.
 *
 * Learns hour-of-day, day-of-week patterns from real order/engagement data.
 * Stores confidence-weighted features in temporal_behavior_patterns.
 * Used by orchestrationEngine and adaptiveOptimizer for proactive decisions.
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";

export interface TemporalSignal {
  hourOfDay:     number;
  dayOfWeek:     number;
  avgEngagement: number;
  avgRevenue:    number;
  avgGuestCount: number;
  peakCraft:     string | null;
  conversionRate:number;
  confidence:    number;
}

export async function learnTemporalPatterns(venueId: string): Promise<TemporalSignal[]> {
  try {
    // Aggregate from orchestration_events (our new table) + swipe_orders
    const { rows } = await pool.query(
      `SELECT
         EXTRACT(HOUR FROM so.created_at)::INT       AS hour_of_day,
         EXTRACT(DOW  FROM so.created_at)::INT       AS day_of_week,
         COUNT(DISTINCT so.id)                        AS order_count,
         AVG(so.total_amount)                         AS avg_revenue,
         COUNT(DISTINCT so.session_id)                AS session_count,
         MODE() WITHIN GROUP (ORDER BY oi.craft_type) AS peak_craft,
         SUM(CASE WHEN so.status = 'confirmed' THEN 1 ELSE 0 END)::FLOAT
           / NULLIF(COUNT(so.id),0)                  AS conversion_rate
       FROM swipe_orders so
       LEFT JOIN swipe_order_items oi ON oi.swipe_order_id = so.id
       WHERE so.venue_id = $1
         AND so.created_at > NOW() - INTERVAL '30 days'
       GROUP BY 1, 2
       ORDER BY 1, 2`,
      [venueId],
    );

    return rows.map((r: {
      hour_of_day: number; day_of_week: number;
      order_count: number; avg_revenue: string | number;
      session_count: number; peak_craft: string | null;
      conversion_rate: string | number;
    }) => ({
      hourOfDay:     r.hour_of_day,
      dayOfWeek:     r.day_of_week,
      avgEngagement: Math.min(Number(r.session_count) / 10, 1),
      avgRevenue:    Number(r.avg_revenue) || 0,
      avgGuestCount: Number(r.session_count),
      peakCraft:     r.peak_craft,
      conversionRate:Number(r.conversion_rate) || 0,
      confidence:    Math.min(Number(r.order_count) / 20, 1),
    }));
  } catch (err) {
    logger.warn({ err, venueId }, "temporalPatternEngine: learn failed");
    return [];
  }
}

export async function persistTemporalPatterns(
  venueId:  string,
  patterns: TemporalSignal[],
): Promise<void> {
  for (const p of patterns) {
    try {
      await pool.query(
        `INSERT INTO temporal_behavior_patterns
           (venue_id, pattern_type, hour_of_day, day_of_week,
            avg_engagement, avg_revenue, avg_guest_count, peak_craft,
            conversion_rate, confidence, sample_count, updated_at)
         VALUES ($1,'hourly',$2,$3,$4,$5,$6,$7,$8,$9,1,NOW())
         ON CONFLICT (venue_id, pattern_type, hour_of_day, day_of_week)
         DO UPDATE SET
           avg_engagement = (temporal_behavior_patterns.avg_engagement * temporal_behavior_patterns.sample_count + EXCLUDED.avg_engagement) / (temporal_behavior_patterns.sample_count + 1),
           avg_revenue    = (temporal_behavior_patterns.avg_revenue    * temporal_behavior_patterns.sample_count + EXCLUDED.avg_revenue)    / (temporal_behavior_patterns.sample_count + 1),
           conversion_rate= (temporal_behavior_patterns.conversion_rate* temporal_behavior_patterns.sample_count + EXCLUDED.conversion_rate)/ (temporal_behavior_patterns.sample_count + 1),
           peak_craft     = EXCLUDED.peak_craft,
           confidence     = GREATEST(temporal_behavior_patterns.confidence, EXCLUDED.confidence),
           sample_count   = temporal_behavior_patterns.sample_count + 1,
           updated_at     = NOW()`,
        [
          venueId, p.hourOfDay, p.dayOfWeek, p.avgEngagement,
          p.avgRevenue, p.avgGuestCount, p.peakCraft,
          p.conversionRate, p.confidence,
        ],
      );
    } catch { /* non-critical */ }
  }
}

export async function getCurrentTemporalAlignment(venueId: string): Promise<number> {
  const now  = new Date();
  const hour = now.getHours();
  const dow  = now.getDay();

  try {
    const { rows } = await pool.query(
      `SELECT avg_engagement, conversion_rate, confidence
       FROM temporal_behavior_patterns
       WHERE venue_id = $1
         AND pattern_type = 'hourly'
         AND hour_of_day = $2
         AND day_of_week = $3`,
      [venueId, hour, dow],
    );
    if (!rows.length) return 0.5;
    const r = rows[0] as { avg_engagement: number; conversion_rate: number; confidence: number };
    return (Number(r.avg_engagement) * 0.5 + Number(r.conversion_rate) * 0.3 + Number(r.confidence) * 0.2);
  } catch { return 0.5; }
}

export async function runTemporalLearningCycle(venueId: string): Promise<void> {
  const patterns = await learnTemporalPatterns(venueId);
  await persistTemporalPatterns(venueId, patterns);

  const alignment = await getCurrentTemporalAlignment(venueId);
  await publish("temporal", {
    event:     "TEMPORAL_PATTERNS_UPDATED",
    venueId,
    alignment,
    patternCount: patterns.length,
    hour:      new Date().getHours(),
    dow:       new Date().getDay(),
  });
}
