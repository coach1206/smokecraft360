/**
 * trafficPrediction — predicts guest arrival/departure patterns for the
 * next N minutes using temporal behavior patterns + current social state.
 *
 * Output: arrival/departure curves + operational strain forecast.
 */

import { pool }             from "@workspace/db";
import { logger }           from "../../lib/logger";
import { aggregateContext } from "../context/contextAggregator";

export interface TrafficForecast {
  venueId:       string;
  ts:            number;
  currentGuests: number;
  points:        TrafficPoint[];
  peakGuests:    number;
  peakAt:        number;      // minutes from now
  strainLevel:   "low" | "moderate" | "high" | "critical";
  strainMinutes: number;      // minutes of predicted high-strain
  confidence:    number;
}

export interface TrafficPoint {
  minutesOut:   number;
  expectedGuests:number;
  arrivals:     number;
  departures:   number;
  strainScore:  number;
}

export async function forecastTraffic(
  venueId:      string,
  horizonMin =  60,
): Promise<TrafficForecast> {
  try {
    const ctx = await aggregateContext(venueId);

    const { rows } = await pool.query(
      `SELECT hour_of_day, avg_guest_count, avg_engagement, confidence
       FROM temporal_behavior_patterns
       WHERE venue_id = $1
         AND pattern_type = 'hourly'
         AND day_of_week  = $2
       ORDER BY hour_of_day`,
      [venueId, ctx.dayOfWeek],
    ).catch(() => ({ rows: [] }));

    const guestByHour = new Map<number, number>(
      rows.map((r: Record<string, unknown>) => [
        Number(r.hour_of_day),
        Number(r.avg_guest_count),
      ]),
    );

    const intervalMin = 10;
    const points: TrafficPoint[] = [];
    let currentGuests = ctx.activeGuests;

    for (let min = intervalMin; min <= horizonMin; min += intervalMin) {
      const hourAt  = (ctx.hourOfDay + Math.floor(min / 60)) % 24;
      const target  = guestByHour.get(hourAt) ?? currentGuests;
      const delta   = (target - currentGuests) * (intervalMin / 60);
      const arrivals   = Math.max(0,  delta);
      const departures = Math.max(0, -delta);
      currentGuests    = Math.max(0, currentGuests + delta);

      const CAPACITY    = 50;
      const strainScore = Math.min(1, currentGuests / CAPACITY + ctx.operationalLoad * 0.3);

      points.push({
        minutesOut:    min,
        expectedGuests:Math.round(currentGuests),
        arrivals:      Math.round(arrivals),
        departures:    Math.round(departures),
        strainScore:   Math.round(strainScore * 1000) / 1000,
      });
    }

    const peak      = [...points].sort((a, b) => b.expectedGuests - a.expectedGuests)[0];
    const highStrain= points.filter(p => p.strainScore > 0.7);
    const maxStrain = Math.max(...points.map(p => p.strainScore), 0);

    const strainLevel: TrafficForecast["strainLevel"] =
      maxStrain > 0.9 ? "critical" :
      maxStrain > 0.7 ? "high"     :
      maxStrain > 0.4 ? "moderate" : "low";

    return {
      venueId, ts: Date.now(),
      currentGuests: ctx.activeGuests,
      points,
      peakGuests: peak?.expectedGuests ?? ctx.activeGuests,
      peakAt:     peak?.minutesOut     ?? 0,
      strainLevel,
      strainMinutes: highStrain.length * intervalMin,
      confidence: ctx.confidence * (rows.length > 0 ? 0.9 : 0.4),
    };
  } catch (err) {
    logger.warn({ err, venueId }, "trafficPrediction: failed");
    return {
      venueId, ts: Date.now(), currentGuests: 0, points: [],
      peakGuests: 0, peakAt: 0, strainLevel: "low",
      strainMinutes: 0, confidence: 0.1,
    };
  }
}
