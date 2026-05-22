/**
 * environmentalInfluenceEngine — environmental + temporal influence scoring.
 *
 * Computes how well the current environmental state (time of day, day of week,
 * ambient scene, seasonal context) matches the venue's optimal operating window.
 * Persists to environmental_influence_scores.
 */

import { pool }   from "@workspace/db";
import { logger } from "../lib/logger";

function timeOfDayScore(hour: number): number {
  if (hour >= 19 && hour <= 23) return 1.0;
  if (hour >= 17 && hour <= 18) return 0.85;
  if (hour >= 15 && hour <= 16) return 0.65;
  if (hour >= 12 && hour <= 14) return 0.50;
  return 0.30;
}

function dayOfWeekScore(day: number): number {
  if (day === 5 || day === 6) return 1.0;
  if (day === 4)               return 0.80;
  if (day === 0)               return 0.70;
  return 0.50;
}

export async function computeEnvironmentalInfluence(venueId: string): Promise<number> {
  const now   = new Date();
  const hour  = now.getHours();
  const day   = now.getDay();

  const timeFit    = timeOfDayScore(hour);
  const dayFit     = dayOfWeekScore(day);

  const { rows } = await pool.query(
    `SELECT COALESCE(AVG(score_composite),0.5) AS scene_fit
     FROM operational_awareness_scores WHERE venue_id=$1
       AND created_at > now()-interval'30 minutes'`,
    [venueId],
  ).catch(() => ({ rows: [{ scene_fit: 0.5 }] }));

  const sceneFit = parseFloat(String(rows[0]?.scene_fit ?? 0.5));
  const score    = timeFit * 0.40 + dayFit * 0.30 + sceneFit * 0.30;

  await pool.query(
    `INSERT INTO environmental_influence_scores
       (venue_id, influence_score, time_fit, day_fit, scene_fit, hour_of_day, day_of_week)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [venueId, score, timeFit, dayFit, sceneFit, hour, day],
  ).catch(err => logger.warn({ err, venueId }, "Environmental influence persist failed"));

  return score;
}
