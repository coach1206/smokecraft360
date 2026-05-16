/**
 * engagementForecasting — produces N-minute engagement level forecasts
 * using momentum vectors, temporal patterns, and social energy.
 *
 * Forecast method: weighted linear extrapolation + temporal baseline
 * anchoring to reduce runaway predictions.
 */

import { pool }              from "@workspace/db";
import { logger }            from "../../lib/logger";
import { aggregateContext }  from "../context/contextAggregator";
import { predictMomentum }   from "./momentumPrediction";

export interface EngagementForecast {
  venueId:      string;
  generatedAt:  number;
  horizonMin:   number;
  points:       ForecastPoint[];
  peak:         ForecastPoint;
  trough:       ForecastPoint;
  confidence:   number;
  recommendation: string;
}

export interface ForecastPoint {
  minutesOut:  number;
  engagement:  number;
  socialEnergy:number;
  confidence:  number;
}

const DECAY_RATE = 0.012; // per minute — forecast degrades over time

export async function forecastEngagement(
  venueId:   string,
  horizonMin = 30,
): Promise<EngagementForecast> {
  try {
    const [ctx, momentum] = await Promise.all([
      aggregateContext(venueId),
      predictMomentum(venueId),
    ]);

    // Pull temporal baseline for the next N hours
    const futureHours = Array.from({ length: Math.ceil(horizonMin / 60) + 1 }, (_, i) =>
      (ctx.hourOfDay + i) % 24,
    );
    const { rows: temporal } = await pool.query(
      `SELECT hour_of_day, avg_engagement, confidence
       FROM temporal_behavior_patterns
       WHERE venue_id = $1
         AND hour_of_day = ANY($2)
         AND day_of_week = $3
         AND pattern_type = 'hourly'`,
      [venueId, futureHours, ctx.dayOfWeek],
    ).catch(() => ({ rows: [] }));

    const baselineByHour = new Map<number, number>(
      temporal.map((r: Record<string, unknown>) => [
        Number(r.hour_of_day),
        Number(r.avg_engagement) * Number(r.confidence),
      ]),
    );

    // Generate forecast points at 5-minute intervals
    const intervalMin = 5;
    const points: ForecastPoint[] = [];
    let currentEngagement = ctx.engagementLevel;
    let currentSocial     = ctx.socialEnergy;

    for (let min = intervalMin; min <= horizonMin; min += intervalMin) {
      const hourAt    = (ctx.hourOfDay + Math.floor(min / 60)) % 24;
      const baseline  = baselineByHour.get(hourAt) ?? ctx.temporalAlignment * 0.5;
      const pointConf = momentum.confidence * Math.exp(-DECAY_RATE * min);

      // Momentum-driven extrapolation anchored toward temporal baseline
      const extrapolated = currentEngagement + momentum.velocity * intervalMin;
      const anchoring     = 0.3; // pull toward baseline to prevent runaway
      currentEngagement   = Math.max(0, Math.min(1,
        extrapolated * (1 - anchoring) + baseline * anchoring,
      ));
      currentSocial = Math.max(0, Math.min(1,
        currentSocial + (currentEngagement - currentSocial) * 0.15,
      ));

      points.push({
        minutesOut:   min,
        engagement:   Math.round(currentEngagement * 1000) / 1000,
        socialEnergy: Math.round(currentSocial     * 1000) / 1000,
        confidence:   Math.round(pointConf         * 1000) / 1000,
      });
    }

    const peak   = [...points].sort((a, b) => b.engagement - a.engagement)[0]!;
    const trough = [...points].sort((a, b) => a.engagement - b.engagement)[0]!;

    const recommendation = peak.engagement > ctx.engagementLevel + 0.1
      ? "Prime engagement window approaching — prepare premium recommendations"
      : trough.engagement < ctx.engagementLevel - 0.15
      ? "Engagement dip predicted — consider ambient scene shift"
      : "Engagement stable — maintain current orchestration";

    return {
      venueId,
      generatedAt: Date.now(),
      horizonMin,
      points,
      peak,
      trough,
      confidence: momentum.confidence,
      recommendation,
    };
  } catch (err) {
    logger.warn({ err, venueId }, "engagementForecasting: failed");
    return {
      venueId, generatedAt: Date.now(), horizonMin,
      points: [], peak: { minutesOut:0, engagement:0, socialEnergy:0, confidence:0 },
      trough: { minutesOut:0, engagement:0, socialEnergy:0, confidence:0 },
      confidence: 0.1, recommendation: "Insufficient data for forecast",
    };
  }
}
