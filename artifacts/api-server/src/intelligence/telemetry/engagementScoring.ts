/**
 * engagementScoring — real-time per-session and per-venue engagement scores.
 *
 * Scores combine swipe velocity, add-rate, retention, interaction depth,
 * social boost, and VIP multipliers into a 0-1 engagement score.
 * Publishes live scores to the telemetry channel.
 */

import { pool } from "@workspace/db";
import { pgPubSub } from "../../realtime/pgPubSub";
import { logger } from "../../lib/logger";
import { updateVenueContext } from "../orchestration/orchestrationEngine";

export interface EngagementInput {
  guestId?:         string;
  sessionId?:       string;
  venueId:          string;
  swipeCount:       number;
  addCount:         number;
  sessionDurationMs:number;
  interactionDepth: number;
  isVip?:           boolean;
  socialBoost?:     number;
}

export interface EngagementScore {
  score:           number;
  swipeVelocity:   number;
  addRate:         number;
  retentionScore:  number;
  trendDirection:  "rising" | "stable" | "declining";
  components:      Record<string, number>;
}

export async function computeEngagementScore(input: EngagementInput): Promise<EngagementScore> {
  const durationSec   = input.sessionDurationMs / 1000;
  const swipeVelocity = durationSec > 0 ? Math.min(input.swipeCount / (durationSec / 60), 1) : 0;
  const addRate       = input.swipeCount > 0 ? input.addCount / input.swipeCount : 0;
  const retentionScore= Math.min(durationSec / 600, 1); // 10-min benchmark
  const vipMultiplier = input.isVip ? 1.3 : 1.0;
  const socialBoost   = Math.min(input.socialBoost ?? 0, 0.2);
  const depthScore    = Math.min(input.interactionDepth / 20, 1);

  const raw =
    swipeVelocity  * 0.25 +
    addRate        * 0.25 +
    retentionScore * 0.20 +
    depthScore     * 0.20 +
    socialBoost    * 0.10;

  const score = Math.min(1, raw * vipMultiplier);

  // Determine trend from recent history
  const trend = await computeTrend(input.venueId, score);

  const result: EngagementScore = {
    score,
    swipeVelocity,
    addRate,
    retentionScore,
    trendDirection: trend,
    components: {
      swipeVelocity,
      addRate,
      retentionScore,
      depthScore,
      socialBoost,
      vipMultiplier,
    },
  };

  // Persist
  try {
    await pool.query(
      `INSERT INTO engagement_score_history
         (venue_id, guest_id, session_id, score, score_components,
          swipe_velocity, add_rate, retention_score, interaction_depth,
          social_boost, vip_multiplier, trend_direction, period)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'session')`,
      [
        input.venueId,
        input.guestId ?? null,
        input.sessionId ?? null,
        score,
        JSON.stringify(result.components),
        swipeVelocity, addRate, retentionScore,
        input.interactionDepth,
        input.socialBoost ?? 0,
        vipMultiplier,
        trend,
      ],
    );
  } catch { /* non-critical */ }

  // Update venue context
  await updateVenueContext(input.venueId, { engagementLevel: score });

  // Publish
  await pgPubSub.publish("telemetry", {
    event:    "ENGAGEMENT_SCORED",
    venueId:  input.venueId,
    guestId:  input.guestId,
    score,
    trend,
    components: result.components,
  });

  return result;
}

async function computeTrend(venueId: string, currentScore: number): Promise<"rising" | "stable" | "declining"> {
  try {
    const { rows } = await pool.query<{ avg_score: string }>(
      `SELECT AVG(score) as avg_score FROM engagement_score_history
       WHERE venue_id = $1 AND created_at > NOW() - INTERVAL '15 minutes'`,
      [venueId],
    );
    const avg = parseFloat(rows[0]?.avg_score ?? "0.5");
    if (currentScore > avg + 0.1) return "rising";
    if (currentScore < avg - 0.1) return "declining";
    return "stable";
  } catch {
    return "stable";
  }
}

export async function getVenueEngagementSummary(venueId: string): Promise<{
  current:  number;
  avg15m:   number;
  avg1h:    number;
  trend:    string;
  vipBoost: number;
}> {
  try {
    const { rows } = await pool.query<{
      current: string; avg15m: string; avg1h: string; vip_avg: string;
    }>(
      `SELECT
         MAX(score) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes')  as current,
         AVG(score) FILTER (WHERE created_at > NOW() - INTERVAL '15 minutes') as avg15m,
         AVG(score) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')     as avg1h,
         AVG(score) FILTER (WHERE vip_multiplier > 1)                         as vip_avg
       FROM engagement_score_history WHERE venue_id = $1`,
      [venueId],
    );
    const r = rows[0];
    const current = parseFloat(r?.current ?? "0");
    const avg15m  = parseFloat(r?.avg15m  ?? "0");
    const avg1h   = parseFloat(r?.avg1h   ?? "0");
    const trend   = current > avg15m + 0.05 ? "rising" : current < avg15m - 0.05 ? "declining" : "stable";
    return { current, avg15m, avg1h, trend, vipBoost: parseFloat(r?.vip_avg ?? "0") };
  } catch {
    return { current: 0, avg15m: 0, avg1h: 0, trend: "stable", vipBoost: 0 };
  }
}
