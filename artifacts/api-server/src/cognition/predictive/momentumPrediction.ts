/**
 * momentumPrediction — projects engagement momentum direction and velocity
 * using current context + temporal patterns + behavioral momentum.
 *
 * Output: momentum vector (direction + magnitude + confidence)
 * Used by: engagementForecasting, orchestrationEngine, adaptiveOptimizer
 */

import { pool }                   from "@workspace/db";
import { logger }                 from "../../lib/logger";
import { aggregateContext }       from "../context/contextAggregator";
import { publish }                from "../../realtime/transport/eventBus";

export interface MomentumVector {
  venueId:    string;
  ts:         number;
  direction:  "accelerating" | "stable" | "decelerating" | "stalled";
  magnitude:  number;      // 0–1: how strong the momentum is
  velocity:   number;      // signed: positive = growing, negative = shrinking
  confidence: number;
  horizon:    number;      // minutes until next expected state shift
  peakExpected:number;     // 0–1: predicted peak engagement in horizon window
}

export async function predictMomentum(venueId: string): Promise<MomentumVector> {
  try {
    const ctx = await aggregateContext(venueId);

    // Pull last 3 context score snapshots for velocity calculation
    const { rows } = await pool.query(
      `SELECT overall_score, created_at
       FROM operational_awareness_scores
       WHERE venue_id = $1
       ORDER BY created_at DESC LIMIT 4`,
      [venueId],
    ).catch(() => ({ rows: [] }));

    // Calculate instantaneous velocity from score delta
    let velocity = 0;
    if (rows.length >= 2) {
      const newest = rows[0] as { overall_score: number; created_at: string };
      const oldest = rows[rows.length - 1] as { overall_score: number; created_at: string };
      const dtMs   = new Date(newest.created_at).getTime() - new Date(oldest.created_at).getTime();
      const dScore = Number(newest.overall_score) - Number(oldest.overall_score);
      velocity = dtMs > 0 ? (dScore / dtMs) * 60_000 : 0; // per minute
    } else {
      // Fall back to behavioral momentum proxy
      velocity = ctx.behavioralMomentum * 0.1 - 0.05;
    }

    const magnitude = Math.min(1, Math.abs(velocity) * 10 + ctx.engagementLevel * 0.3);

    const direction: MomentumVector["direction"] =
      velocity > 0.02  ? "accelerating" :
      velocity < -0.02 ? "decelerating" :
      ctx.engagementLevel > 0.05 ? "stable" : "stalled";

    // Temporal alignment improves confidence
    const confidence = Math.min(0.95, ctx.confidence * 0.7 + ctx.temporalAlignment * 0.3);

    // Horizon: estimate minutes until shift (lower engagement → shorter horizon)
    const horizon = direction === "accelerating"
      ? Math.round(20 + ctx.temporalAlignment * 20)
      : direction === "decelerating"
      ? Math.round(10 + ctx.socialEnergy * 10)
      : 15;

    const peakExpected = Math.min(1,
      ctx.engagementLevel + (direction === "accelerating" ? magnitude * 0.3 : 0),
    );

    const vector: MomentumVector = {
      venueId, ts: Date.now(),
      direction, magnitude, velocity, confidence, horizon, peakExpected,
    };

    await publish("cognition", {
      event: "MOMENTUM_PREDICTION", venueId,
      direction, magnitude: Math.round(magnitude * 100), horizon,
    });

    return vector;
  } catch (err) {
    logger.warn({ err, venueId }, "momentumPrediction: failed");
    return {
      venueId, ts: Date.now(),
      direction: "stable", magnitude: 0, velocity: 0,
      confidence: 0.1, horizon: 15, peakExpected: 0.3,
    };
  }
}
