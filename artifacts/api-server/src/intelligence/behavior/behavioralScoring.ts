/**
 * behavioralScoring — scores behavioral patterns for recommendation weighting
 * and session-level intelligence.
 *
 * Produces per-guest behavioral confidence scores used to:
 *   - Weight recommendation ranking
 *   - Trigger VIP escalation logic
 *   - Feed adaptive optimization
 *   - Contribute to operational awareness scores
 */

import { pool }                      from "@workspace/db";
import { logger }                    from "../../lib/logger";
import { buildPreferenceVector }     from "./preferenceEvolution";
import { type GuestState }           from "../../cognition/state/guestStateEngine";

export interface BehavioralScore {
  guestId:           string;
  venueId:           string;
  ts:                number;

  // Component scores (0–1)
  engagementScore:   number;
  loyaltyScore:      number;
  explorationScore:  number;
  conversionScore:   number;
  socialScore:       number;

  // Composite
  composite:         number;
  behavioralTier:    "casual" | "regular" | "enthusiast" | "advocate" | "vip";
  recommendationWeight:number;   // multiplier for recommendation ranking 0.5–2.0
  confidence:        number;
}

const TIER_THRESHOLDS = {
  vip:        0.85,
  advocate:   0.70,
  enthusiast: 0.55,
  regular:    0.35,
} as const;

function tierFromScore(score: number): BehavioralScore["behavioralTier"] {
  if (score >= TIER_THRESHOLDS.vip)        return "vip";
  if (score >= TIER_THRESHOLDS.advocate)   return "advocate";
  if (score >= TIER_THRESHOLDS.enthusiast) return "enthusiast";
  if (score >= TIER_THRESHOLDS.regular)    return "regular";
  return "casual";
}

export async function scoreBehavior(
  guestId:    string,
  venueId:    string,
  liveState?: GuestState,
): Promise<BehavioralScore> {
  try {
    const prefs = await buildPreferenceVector(guestId, venueId);

    // Pull loyalty data
    const { rows: loyaltyRows } = await pool.query(
      `SELECT points_balance, lifetime_points, tier
       FROM loyalty_points
       WHERE user_id = $1
       LIMIT 1`,
      [guestId],
    ).catch(() => ({ rows: [] }));

    const loyalty    = (loyaltyRows[0] as Record<string, unknown> | undefined);
    const lifetimePts = Number(loyalty?.lifetime_points ?? 0);
    const loyaltyScore = Math.min(1, lifetimePts / 5000);

    const engagementScore = liveState?.engagementScore ?? prefs.acceptanceRate;
    const explorationScore= prefs.craftDrift;
    const conversionScore = prefs.acceptanceRate;

    // Social score from shared orders
    const { rows: socialRows } = await pool.query(
      `SELECT COUNT(*) AS shared
       FROM swipe_orders s
       JOIN swipe_order_items oi ON oi.order_id = s.id
       WHERE s.user_id = $1 AND s.status = 'confirmed'
         AND s.created_at > NOW() - INTERVAL '30 days'`,
      [guestId],
    ).catch(() => ({ rows: [{ shared: 0 }] }));
    const socialScore = Math.min(1, Number((socialRows[0] as Record<string, unknown>)?.shared ?? 0) / 10);

    const composite = (
      engagementScore   * 0.3 +
      loyaltyScore      * 0.25 +
      conversionScore   * 0.2 +
      explorationScore  * 0.15 +
      socialScore       * 0.1
    );

    const tier = tierFromScore(composite);
    const recWeight = {
      casual: 0.7, regular: 1.0, enthusiast: 1.2, advocate: 1.5, vip: 2.0,
    }[tier];

    const score: BehavioralScore = {
      guestId, venueId, ts: Date.now(),
      engagementScore: Math.round(engagementScore  * 1000) / 1000,
      loyaltyScore:    Math.round(loyaltyScore     * 1000) / 1000,
      explorationScore:Math.round(explorationScore * 1000) / 1000,
      conversionScore: Math.round(conversionScore  * 1000) / 1000,
      socialScore:     Math.round(socialScore      * 1000) / 1000,
      composite:       Math.round(composite        * 1000) / 1000,
      behavioralTier:  tier,
      recommendationWeight: recWeight,
      confidence:      prefs.confidence,
    };

    // Persist as memory
    await pool.query(
      `INSERT INTO ai_behavior_memory
         (venue_id, entity_id, entity_type, memory_type, value, confidence, last_occurrence, metadata)
       VALUES ($1,$2,'guest','behavioral_score',$3,$4,NOW(),$5)
       ON CONFLICT (venue_id, entity_id, memory_type) DO UPDATE SET
         value = EXCLUDED.value, confidence = EXCLUDED.confidence,
         last_occurrence = NOW(), metadata = EXCLUDED.metadata`,
      [
        venueId, guestId, composite, score.confidence,
        JSON.stringify({ tier, recWeight, components: { engagementScore, loyaltyScore, conversionScore } }),
      ],
    );

    return score;
  } catch (err) {
    logger.warn({ err, guestId, venueId }, "behavioralScoring: failed");
    return {
      guestId, venueId, ts: Date.now(),
      engagementScore:0, loyaltyScore:0, explorationScore:0, conversionScore:0, socialScore:0,
      composite:0, behavioralTier:"casual", recommendationWeight:0.7, confidence:0,
    };
  }
}
