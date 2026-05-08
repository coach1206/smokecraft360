/**
 * ChaosAnalyticsService — Phase 0: Neural Substrate.
 *
 * Computes the "un-managed" baseline for each venue by analyzing
 * raw neural ingestion events captured in shadow mode.
 *
 * The baseline represents what hospitality looks like WITHOUT AXIOM.
 * The delta between baseline and live metrics = the AXIOM lift.
 *
 * Run periodically (e.g. nightly) or triggered manually.
 */

import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { getIO } from "../lib/socketServer";

export interface ChaosBaseline {
  venueId:                  string;
  windowDays:               number;
  avgSessionDurationMs:     number;
  avgInteractionsPerSession: number;
  avgHesitationMs:          number;
  conversionRate:           number;
  abandonmentRate:          number;
  avgDwellMs:               number;
  rawEventCount:            number;
  axiomLiftConversion:      number | null;
  axiomLiftEngagement:      number | null;
  axiomLiftRetention:       number | null;
}

export class ChaosAnalyticsService {

  static async computeBaseline(venueId: string, windowDays = 7): Promise<ChaosBaseline> {
    const { rows: raw } = await pool.query<{
      avg_dwell_ms:    number | null;
      avg_hesitation:  number | null;
      total_events:    string;
      session_count:   string;
    }>(`
      SELECT
        AVG(dwell_ms)       AS avg_dwell_ms,
        AVG(hesitation_ms)  AS avg_hesitation,
        COUNT(*)            AS total_events,
        COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL) AS session_count
      FROM neural_ingestion_events
      WHERE venue_id      = $1
        AND ingestion_phase = 'shadow'
        AND created_at    > NOW() - ($2 || ' days')::interval
    `, [venueId, windowDays]);

    const r        = raw[0]!;
    const sessions = Math.max(1, parseInt(r.session_count ?? "1", 10));
    const total    = parseInt(r.total_events ?? "0", 10);

    const avgDwellMs    = r.avg_dwell_ms    ?? 0;
    const avgHesitation = r.avg_hesitation  ?? 0;
    const interPerSess  = total / sessions;

    const conversionRate  = Math.min(0.95, Math.max(0, 0.15 + (interPerSess / 50) * 0.2));
    const abandonmentRate = 1 - conversionRate;

    const prevBaseline = await ChaosAnalyticsService.getLatestBaseline(venueId);

    let axiomLiftConversion:  number | null = null;
    let axiomLiftEngagement:  number | null = null;
    let axiomLiftRetention:   number | null = null;

    if (prevBaseline) {
      const { rows: live } = await pool.query<{
        live_conversion: number | null;
        live_engagement: number | null;
      }>(`
        SELECT
          AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) AS live_conversion,
          COUNT(*)::real / GREATEST(COUNT(DISTINCT id), 1)           AS live_engagement
        FROM guest_sessions
        WHERE created_at > NOW() - ($1 || ' days')::interval
      `, [windowDays]);

      const lv = live[0];
      if (lv?.live_conversion != null) {
        axiomLiftConversion = ((lv.live_conversion - conversionRate) / Math.max(conversionRate, 0.01)) * 100;
      }
      if (lv?.live_engagement != null) {
        axiomLiftEngagement = ((lv.live_engagement - interPerSess) / Math.max(interPerSess, 1)) * 100;
      }
    }

    const baseline: ChaosBaseline = {
      venueId,
      windowDays,
      avgSessionDurationMs:      avgDwellMs * 3,
      avgInteractionsPerSession: interPerSess,
      avgHesitationMs:           avgHesitation,
      conversionRate,
      abandonmentRate,
      avgDwellMs,
      rawEventCount:             total,
      axiomLiftConversion,
      axiomLiftEngagement,
      axiomLiftRetention,
    };

    await ChaosAnalyticsService.persist(baseline);

    getIO().to(`venue:${venueId}`).emit("neural:baseline_updated", {
      venueId,
      conversionRate,
      rawEventCount: total,
      ts: new Date().toISOString(),
    });

    logger.info({ venueId, windowDays, rawEventCount: total, conversionRate }, "chaos baseline computed");

    return baseline;
  }

  static async getLatestBaseline(venueId: string): Promise<ChaosBaseline | null> {
    const { rows } = await pool.query<{
      venue_id: string; window_days: number;
      avg_session_duration_ms: number | null; avg_interactions_per_session: number | null;
      avg_hesitation_ms: number | null; conversion_rate: number | null;
      abandonment_rate: number | null; avg_dwell_ms: number | null;
      raw_event_count: number; axiom_lift_conversion: number | null;
      axiom_lift_engagement: number | null; axiom_lift_retention: number | null;
    }>(`
      SELECT * FROM chaos_analytics_baselines
      WHERE venue_id = $1
      ORDER BY computed_at DESC
      LIMIT 1
    `, [venueId]);

    if (!rows[0]) return null;
    const r = rows[0];
    return {
      venueId:                   r.venue_id,
      windowDays:                r.window_days,
      avgSessionDurationMs:      r.avg_session_duration_ms     ?? 0,
      avgInteractionsPerSession: r.avg_interactions_per_session ?? 0,
      avgHesitationMs:           r.avg_hesitation_ms            ?? 0,
      conversionRate:            r.conversion_rate              ?? 0,
      abandonmentRate:           r.abandonment_rate             ?? 0,
      avgDwellMs:                r.avg_dwell_ms                 ?? 0,
      rawEventCount:             r.raw_event_count,
      axiomLiftConversion:       r.axiom_lift_conversion,
      axiomLiftEngagement:       r.axiom_lift_engagement,
      axiomLiftRetention:        r.axiom_lift_retention,
    };
  }

  static async getAllBaselines(venueId: string, limit = 30) {
    const { rows } = await pool.query(`
      SELECT * FROM chaos_analytics_baselines
      WHERE venue_id = $1
      ORDER BY computed_at DESC
      LIMIT $2
    `, [venueId, limit]);
    return rows;
  }

  private static async persist(b: ChaosBaseline): Promise<void> {
    await pool.query(`
      INSERT INTO chaos_analytics_baselines
        (venue_id, window_days, avg_session_duration_ms, avg_interactions_per_session,
         avg_hesitation_ms, conversion_rate, abandonment_rate, avg_dwell_ms,
         raw_event_count, axiom_lift_conversion, axiom_lift_engagement, axiom_lift_retention,
         period_start, period_end)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
              NOW() - ($13 || ' days')::interval, NOW())
    `, [
      b.venueId, b.windowDays, b.avgSessionDurationMs, b.avgInteractionsPerSession,
      b.avgHesitationMs, b.conversionRate, b.abandonmentRate, b.avgDwellMs,
      b.rawEventCount, b.axiomLiftConversion, b.axiomLiftEngagement, b.axiomLiftRetention,
      b.windowDays,
    ]);
  }
}
