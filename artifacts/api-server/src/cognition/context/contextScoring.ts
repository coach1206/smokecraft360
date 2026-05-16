/**
 * contextScoring — produces a deterministic 0–1 score per operational
 * dimension from aggregated + weighted context, then combines into a
 * composite contextual awareness score.
 *
 * Dimensions:
 *   engagement, social, revenue, operational, environmental, temporal, staff
 *
 * Output is stored in operational_awareness_scores and emitted on the
 * cognition channel for downstream consumers.
 */

import { pool }                              from "@workspace/db";
import { logger }                            from "../../lib/logger";
import { publish }                           from "../../realtime/transport/eventBus";
import { type AggregatedContext }            from "./contextAggregator";
import { blendWeightedValues }               from "./contextWeighting";

export interface ContextScore {
  venueId:       string;
  ts:            number;
  composite:     number;

  // Per-dimension
  engagement:    number;
  social:        number;
  revenue:       number;
  operational:   number;
  environmental: number;
  temporal:      number;
  staff:         number;

  // Meta
  confidence:    number;
  riskLevel:     "low" | "moderate" | "high" | "critical";
  trend:         "rising" | "stable" | "falling";
}

function clamp(v: number): number { return Math.max(0, Math.min(1, v)); }

function riskFromScore(score: number): ContextScore["riskLevel"] {
  if (score >= 0.75) return "low";
  if (score >= 0.55) return "moderate";
  if (score >= 0.35) return "high";
  return "critical";
}

export function scoreContext(ctx: AggregatedContext): ContextScore {
  const { weights } = ctx;

  const engagement    = clamp(
    ctx.engagementLevel   * 0.5 +
    ctx.interactionMomentum * 0.3 +
    ctx.behavioralMomentum  * 0.2,
  );
  const social        = clamp(
    ctx.socialEnergy      * 0.6 +
    Math.min(ctx.activeGuests / 20, 1) * 0.4,
  );
  const revenue       = clamp(
    ctx.revenueMomentum   * 0.5 +
    ctx.conversionRate    * 0.3 +
    Math.min(ctx.avgOrderValue / 50, 1) * 0.2,
  );
  const operational   = clamp(
    (1 - ctx.operationalLoad)   * 0.4 +
    (1 - ctx.inventoryPressure) * 0.3 +
    ctx.staffResponsiveness     * 0.3,
  );
  const environmental = clamp(ctx.moodScore * 0.5 + ctx.atmosphereScore * 0.5);
  const temporal      = clamp(ctx.temporalAlignment);
  const staff         = clamp(
    ctx.staffResponsiveness * 0.6 +
    Math.min(ctx.staffOnFloor / 3, 1) * 0.4,
  );

  const composite = blendWeightedValues(
    [engagement, social, revenue, operational, environmental, temporal, staff],
    [
      weights.engagementWeight,
      weights.socialWeight,
      weights.revenueWeight,
      weights.operationalWeight,
      weights.environmentalWeight,
      weights.temporalWeight,
      weights.staffWeight,
    ],
  );

  return {
    venueId:    ctx.venueId,
    ts:         ctx.capturedAt,
    composite:  clamp(composite),
    engagement, social, revenue, operational, environmental, temporal, staff,
    confidence: ctx.confidence,
    riskLevel:  riskFromScore(composite),
    trend:      "stable",
  };
}

export async function scoreAndPersist(ctx: AggregatedContext): Promise<ContextScore> {
  const score = scoreContext(ctx);
  try {
    await pool.query(
      `INSERT INTO operational_awareness_scores
         (venue_id, overall_score, staff_readiness, guest_satisfaction,
          inventory_health, social_momentum, temporal_alignment,
          environmental_fit, risk_level, active_alerts, recommendations, period)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,'[]','5m')`,
      [
        score.venueId, score.composite, score.staff,
        score.engagement, 1 - ctx.inventoryPressure,
        score.social, score.temporal, score.environmental,
        score.riskLevel,
      ],
    );
    await publish("cognition", {
      event:    "CONTEXT_SCORED",
      venueId:  score.venueId,
      composite: score.composite,
      riskLevel: score.riskLevel,
      confidence: score.confidence,
      dimensions: { engagement: score.engagement, social: score.social, revenue: score.revenue },
    });
  } catch (err) {
    logger.warn({ err, venueId: ctx.venueId }, "contextScoring: persist failed");
  }
  return score;
}
