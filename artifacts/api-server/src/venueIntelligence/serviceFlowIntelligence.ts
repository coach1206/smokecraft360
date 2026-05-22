/**
 * serviceFlowIntelligence — service pacing + flow analysis.
 *
 * Measures order-to-fulfillment velocity, identifies bottlenecks,
 * tracks kitchen pacing, detects service stalls.
 * Persists to service_flow_events.
 */

import { pool }   from "@workspace/db";
import { logger } from "../lib/logger";

export interface ServiceFlowReport {
  avgFulfillmentMin:  number;
  bottleneck:         "NONE" | "BAR" | "KITCHEN" | "FLOOR";
  pacingScore:        number;
  stallCount:         number;
  flowSignal:         string;
}

export async function analyseServiceFlow(venueId: string): Promise<ServiceFlowReport> {
  const [fulfillRow, stallRow] = await Promise.all([
    pool.query(
      `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at-created_at))/60),0) AS avg_min
       FROM orders WHERE venue_id=$1 AND status='completed'
         AND created_at > now()-interval'1 hour'`,
      [venueId],
    ).catch(() => ({ rows: [{ avg_min: 0 }] })),
    pool.query(
      `SELECT COALESCE(COUNT(*),0) AS cnt
       FROM orders WHERE venue_id=$1 AND status='pending'
         AND created_at < now()-interval'15 minutes'`,
      [venueId],
    ).catch(() => ({ rows: [{ cnt: 0 }] })),
  ]);

  const avgMin    = parseFloat(String(fulfillRow.rows[0]?.avg_min ?? 0));
  const stalls    = parseInt(String(stallRow.rows[0]?.cnt         ?? 0), 10);

  const pacingScore = avgMin === 0 ? 0.7 : Math.max(0, 1 - (avgMin / 20));
  const bottleneck: ServiceFlowReport["bottleneck"] =
    stalls > 5  ? "KITCHEN" :
    stalls > 2  ? "BAR"     :
    avgMin > 12 ? "FLOOR"   : "NONE";

  const flowSignal =
    bottleneck === "KITCHEN" ? "Kitchen bottleneck — premium cigar conversions slowing" :
    bottleneck === "BAR"     ? "Bar queue building — deploy additional bartender" :
    bottleneck === "FLOOR"   ? "Floor service lagging — dispatch server" :
    "Service flow nominal";

  await pool.query(
    `INSERT INTO service_flow_events (venue_id, avg_fulfillment_min, bottleneck, pacing_score, stall_count, flow_signal)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [venueId, avgMin, bottleneck, pacingScore, stalls, flowSignal],
  ).catch(err => logger.warn({ err, venueId }, "Service flow persist failed"));

  return { avgFulfillmentMin: avgMin, bottleneck, pacingScore, stallCount: stalls, flowSignal };
}
