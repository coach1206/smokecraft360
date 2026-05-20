/**
 * liveMetrics — real-time operational metric computation and streaming.
 *
 * Aggregates key metrics for the Command Center dashboard:
 *   - Revenue velocity (cents/minute)
 *   - Swipe throughput (swipes/minute)
 *   - Conversion rate (rolling 30m)
 *   - Staff efficiency index
 *   - Social momentum index
 *   - Inventory depletion rate
 *
 * Emitted on telemetry channel every 30 seconds.
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../transport/eventBus";

export interface LiveMetrics {
  venueId:             string;
  ts:                  number;
  windowMinutes:       number;

  // Revenue
  revenueVelocity:     number;    // cents/min
  totalRevenue:        number;    // cents in window
  avgOrderValue:       number;    // cents

  // Swipe throughput
  swipeRate:           number;    // swipes/min
  addRate:             number;    // adds/min
  skipRate:            number;    // skips/min

  // Conversion
  conversionRate:      number;    // 0–1
  conversionTrend:     "up" | "flat" | "down";

  // Operations
  staffEfficiency:     number;    // 0–1
  inventoryHealth:     number;    // 0–1

  // Social
  socialMomentum:      number;    // 0–1
  activeGroups:        number;
}

export async function computeLiveMetrics(
  venueId:       string,
  windowMinutes = 30,
): Promise<LiveMetrics> {
  try {
    const [orderRows, swipeRows, staffRows, socialRows, prevOrderRows] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total, COUNT(CASE WHEN status='confirmed' THEN 1 END) AS confirmed,
                COALESCE(SUM(CASE WHEN status='confirmed' THEN subtotal_cents END),0) AS revenue,
                COALESCE(AVG(CASE WHEN status='confirmed' THEN subtotal_cents END),0) AS avg_val
         FROM swipe_orders
         WHERE venue_id=$1 AND created_at > NOW() - ($2 || ' minutes')::interval`,
        [venueId, windowMinutes],
      ).catch(() => ({ rows: [{ total:0, confirmed:0, revenue:0, avg_val:0 }] })),

      pool.query(
        `SELECT
           SUM(CASE WHEN event_type='swipe_start' THEN 1 ELSE 0 END) AS starts,
           SUM(CASE WHEN event_type='swipe_add'   THEN 1 ELSE 0 END) AS adds,
           SUM(CASE WHEN event_type='swipe_skip'  THEN 1 ELSE 0 END) AS skips
         FROM neural_ingestion_events
         WHERE venue_id=$1 AND created_at > NOW() - ($2 || ' minutes')::interval`,
        [venueId, windowMinutes],
      ).catch(() => ({ rows: [{ starts:0, adds:0, skips:0 }] })),

      pool.query(
        `SELECT COUNT(*) AS on_floor, AVG(upsell_rate) AS avg_upsell
         FROM staff_context_profiles WHERE venue_id=$1 AND is_on_floor=TRUE`,
        [venueId],
      ).catch(() => ({ rows: [{ on_floor:0, avg_upsell:0 }] })),

      pool.query(
        `SELECT COUNT(*) AS groups, AVG(social_energy) AS avg_energy
         FROM social_engagement_state
         WHERE venue_id=$1 AND updated_at > NOW() - INTERVAL '15 minutes'`,
        [venueId],
      ).catch(() => ({ rows: [{ groups:0, avg_energy:0 }] })),

      // Previous window for trend
      pool.query(
        `SELECT COUNT(CASE WHEN status='confirmed' THEN 1 END)::float /
                NULLIF(COUNT(*),0) AS conv_rate
         FROM swipe_orders
         WHERE venue_id=$1
           AND created_at BETWEEN NOW() - ($2||' minutes')::interval * 2
                              AND NOW() - ($2||' minutes')::interval`,
        [venueId, windowMinutes],
      ).catch(() => ({ rows: [{ conv_rate: null }] })),
    ]);

    const ord  = orderRows.rows[0]  as Record<string, unknown>;
    const sw   = swipeRows.rows[0]  as Record<string, unknown>;
    const st   = staffRows.rows[0]  as Record<string, unknown>;
    const soc  = socialRows.rows[0] as Record<string, unknown>;
    const prev = prevOrderRows.rows[0] as Record<string, unknown>;

    const totalOrd   = Number(ord.total     ?? 0);
    const confirmed  = Number(ord.confirmed ?? 0);
    const revenue    = Number(ord.revenue   ?? 0);
    const avgVal     = Number(ord.avg_val   ?? 0);
    const convRate   = totalOrd > 0 ? confirmed / totalOrd : 0;
    const prevConv   = Number(prev.conv_rate ?? convRate);

    const starts     = Number(sw.starts ?? 0);
    const adds       = Number(sw.adds   ?? 0);
    const skips      = Number(sw.skips  ?? 0);

    const staffEff   = Math.min(1,
      Number(st.on_floor ?? 0) / 5 * 0.5 +
      Number(st.avg_upsell ?? 0) * 0.5,
    );

    const metrics: LiveMetrics = {
      venueId, ts: Date.now(), windowMinutes,
      revenueVelocity: Math.round(revenue / windowMinutes),
      totalRevenue:    Math.round(revenue),
      avgOrderValue:   Math.round(avgVal),
      swipeRate:       Math.round((starts / windowMinutes) * 100) / 100,
      addRate:         Math.round((adds   / windowMinutes) * 100) / 100,
      skipRate:        Math.round((skips  / windowMinutes) * 100) / 100,
      conversionRate:  Math.round(convRate * 1000) / 1000,
      conversionTrend: convRate > prevConv + 0.05 ? "up" : convRate < prevConv - 0.05 ? "down" : "flat",
      staffEfficiency: Math.round(staffEff * 1000) / 1000,
      inventoryHealth: 0.8, // placeholder — extend with actual inventory data
      socialMomentum:  Math.round(Number(soc.avg_energy ?? 0) * 1000) / 1000,
      activeGroups:    Number(soc.groups ?? 0),
    };

    await publish("telemetry", { event:"LIVE_METRICS", ...metrics });

    return metrics;
  } catch (err) {
    logger.warn({ err, venueId }, "liveMetrics: compute failed");
    return {
      venueId, ts: Date.now(), windowMinutes,
      revenueVelocity:0, totalRevenue:0, avgOrderValue:0,
      swipeRate:0, addRate:0, skipRate:0,
      conversionRate:0, conversionTrend:"flat",
      staffEfficiency:0, inventoryHealth:0,
      socialMomentum:0, activeGroups:0,
    };
  }
}
