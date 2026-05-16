/**
 * contextWeighting — assigns per-signal confidence weights based on:
 *   - Signal recency (exponential decay)
 *   - Source reliability (known data quality per source)
 *   - Venue occupancy (low guest count → lower social signal weight)
 *   - Temporal alignment (how well current hour matches historical patterns)
 */

import { type ContextSignals } from "./contextBuilder";

export interface WeightedSignals {
  engagementWeight:   number;
  socialWeight:       number;
  temporalWeight:     number;
  environmentalWeight:number;
  revenueWeight:      number;
  staffWeight:        number;
  operationalWeight:  number;
  overallConfidence:  number;
}

const DECAY_K = 0.000_008; // per ms — half-life ~86s

function timeWeight(ageMs: number): number {
  return Math.max(0.05, Math.exp(-DECAY_K * ageMs));
}

export function applyContextWeights(signals: ContextSignals): WeightedSignals {
  const tw = timeWeight(signals.signalAge);

  // Social signals degrade when venue is nearly empty
  const guestFactor = Math.min(1, signals.activeGuests / 5);

  const engagementWeight   = tw * signals.dataQuality * 0.9;
  const socialWeight       = tw * guestFactor          * 0.85;
  const temporalWeight     = signals.temporalAlignment * 0.95; // temporal doesn't decay the same way
  const environmentalWeight= tw * 0.8;
  const revenueWeight      = tw * Math.min(1, signals.conversionRate + 0.2);
  const staffWeight        = signals.staffOnFloor > 0 ? tw * 0.9 : 0.1;
  const operationalWeight  = tw * 0.95;

  const overallConfidence = (
    engagementWeight + socialWeight + temporalWeight +
    environmentalWeight + revenueWeight + staffWeight + operationalWeight
  ) / 7;

  return {
    engagementWeight,
    socialWeight,
    temporalWeight,
    environmentalWeight,
    revenueWeight,
    staffWeight,
    operationalWeight,
    overallConfidence: Math.min(1, overallConfidence),
  };
}

export function blendWeightedValues(
  values:  number[],
  weights: number[],
): number {
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (totalWeight === 0) return 0;
  return values.reduce((s, v, i) => s + v * weights[i]!, 0) / totalWeight;
}
