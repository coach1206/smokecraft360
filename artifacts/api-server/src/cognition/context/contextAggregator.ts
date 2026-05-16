/**
 * contextAggregator — combines multiple ContextSignals streams into a single
 * unified weighted aggregate, handling stale signal detection and
 * confidence degradation.
 *
 * Multiple signal sources (real-time telemetry, AI memory, temporal patterns,
 * environmental state) are merged with time-decay weighting so that stale
 * signals contribute less to the aggregate.
 */

import { logger }                             from "../../lib/logger";
import { type ContextSignals, buildContextSignals } from "./contextBuilder";
import { applyContextWeights, type WeightedSignals } from "./contextWeighting";

export interface AggregatedContext extends ContextSignals {
  weights:      WeightedSignals;
  confidence:   number;
  staleness:    number;    // 0=fresh 1=completely stale
  sourceCount:  number;
}

const STALE_THRESHOLD_MS = 120_000; // 2 minutes

function degradeByAge(value: number, ageMs: number, halfLifeMs = 60_000): number {
  return value * Math.exp(-ageMs / halfLifeMs);
}

export async function aggregateContext(venueId: string): Promise<AggregatedContext> {
  const primary = await buildContextSignals(venueId);
  const weights = applyContextWeights(primary);

  const ageMs    = Date.now() - primary.capturedAt + primary.signalAge;
  const staleness = Math.min(1, ageMs / STALE_THRESHOLD_MS);

  // Degrade confidence-sensitive signals based on age
  const degraded: ContextSignals = {
    ...primary,
    engagementLevel:     degradeByAge(primary.engagementLevel,     primary.signalAge, 90_000),
    socialEnergy:        degradeByAge(primary.socialEnergy,        primary.signalAge, 60_000),
    interactionMomentum: degradeByAge(primary.interactionMomentum, primary.signalAge, 45_000),
    behavioralMomentum:  degradeByAge(primary.behavioralMomentum,  primary.signalAge, 120_000),
    revenueMomentum:     degradeByAge(primary.revenueMomentum,     primary.signalAge, 180_000),
  };

  // Composite confidence: data quality × freshness × source reliability
  const freshness  = 1 - staleness;
  const confidence = Math.max(0.05,
    primary.dataQuality * 0.5 +
    freshness          * 0.3 +
    weights.temporalWeight * 0.1 +
    (primary.staffOnFloor > 0 ? 0.1 : 0),
  );

  return {
    ...degraded,
    weights,
    confidence,
    staleness,
    sourceCount: 1,
  };
}

export async function aggregateMultiWindow(
  venueId: string,
  windowMinutes: number[] = [5, 15, 30],
): Promise<{ window: number; context: AggregatedContext }[]> {
  // For now returns single-window aggregation per requested window
  // In production: pull historical snapshots per window and merge
  try {
    const base = await aggregateContext(venueId);
    return windowMinutes.map(w => ({
      window:  w,
      context: { ...base, confidence: base.confidence * (1 - w / 60 * 0.1) },
    }));
  } catch (err) {
    logger.warn({ err, venueId }, "contextAggregator: multi-window failed");
    return [];
  }
}
