/**
 * aiMemoryEngine — behavioral AI memory that learns from every guest interaction.
 *
 * Processes raw events into affinity vectors, evolves preference profiles over time,
 * and surfaces VIP detection signals. Writes to ai_behavior_memory and
 * guest_preference_profiles; publishes updates to the intelligence channel.
 */

import { pool } from "@workspace/db";
import { pgPubSub } from "../../realtime/pgPubSub";
import { logger } from "../../lib/logger";

export interface BehaviorEvent {
  guestId:   string;
  venueId:   string;
  sessionId?: string;
  eventType: "swipe_add" | "swipe_skip" | "purchase" | "upsell_accept" | "upsell_decline" |
             "session_start" | "session_end" | "product_view" | "pairing_click";
  craftType?: string;
  productId?: string;
  tags?:      string[];
  context?:   Record<string, unknown>;
}

interface GuestProfile {
  guestId:         string;
  venueId:         string;
  craftAffinities: Record<string, number>;
  flavorAffinities:Record<string, number>;
  premiumAffinity: number;
  socialScore:     number;
  adventureScore:  number;
  conversionRate:  number;
  sessionCount:    number;
  isVip:           boolean;
  confidence:      number;
}

const AFFINITY_WEIGHTS: Record<string, number> = {
  purchase:       3.0,
  swipe_add:      1.5,
  upsell_accept:  2.5,
  pairing_click:  1.2,
  product_view:   0.5,
  swipe_skip:    -0.5,
  upsell_decline:-1.0,
};

const VIP_THRESHOLD = 8.5;
const DECAY_FACTOR  = 0.97;
const MEMORY_TTL_S  = 86400 * 30;

export async function ingestBehaviorEvent(event: BehaviorEvent): Promise<void> {
  const weight  = AFFINITY_WEIGHTS[event.eventType] ?? 0;
  const tags    = event.tags ?? [];
  const isPositive = weight > 0;

  // Persist to ai_behavior_memory
  try {
    await pool.query(
      `INSERT INTO ai_behavior_memory
         (venue_id, guest_id, craft_type, event_type, product_id,
          affinity_delta, confidence, decay_factor, tags, context, session_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        event.venueId,
        event.guestId,
        event.craftType ?? "unknown",
        event.eventType,
        event.productId ?? null,
        weight,
        isPositive ? 0.7 : 0.5,
        DECAY_FACTOR,
        JSON.stringify(tags),
        JSON.stringify(event.context ?? {}),
        event.sessionId ?? null,
      ],
    );
  } catch (err) {
    logger.warn({ err }, "aiMemoryEngine: failed to persist behavior event");
    return;
  }

  // Evolve the guest preference profile
  await evolveProfile(event.guestId, event.venueId, event, weight);

  // Publish update
  await pgPubSub.publish("intelligence", {
    event:     "BEHAVIOR_INGESTED",
    venueId:   event.venueId,
    guestId:   event.guestId,
    eventType: event.eventType,
    craftType: event.craftType,
    weight,
  });
}

async function evolveProfile(
  guestId: string,
  venueId: string,
  event:   BehaviorEvent,
  weight:  number,
): Promise<void> {
  try {
    // Upsert profile with incremental affinity updates
    const craftKey = event.craftType ?? "unknown";
    const craftDelta = weight * 0.1;

    await pool.query(
      `INSERT INTO guest_preference_profiles
         (venue_id, guest_id, craft_affinities, premium_affinity, session_count,
          total_interactions, confidence, last_evolved)
       VALUES ($1, $2,
         jsonb_build_object($3::text, $4::float),
         $5::float, 1, 1, 0.3, NOW())
       ON CONFLICT (venue_id, guest_id) DO UPDATE SET
         craft_affinities = jsonb_set(
           COALESCE(guest_preference_profiles.craft_affinities, '{}'),
           ARRAY[$3::text],
           to_jsonb(COALESCE(
             (guest_preference_profiles.craft_affinities->>$3)::float, 0
           ) + $4::float)
         ),
         premium_affinity = LEAST(1.0, GREATEST(0.0,
           guest_preference_profiles.premium_affinity +
           CASE WHEN $6 = 'purchase' OR $6 = 'upsell_accept' THEN 0.05 ELSE 0 END
         )),
         total_interactions = guest_preference_profiles.total_interactions + 1,
         confidence = LEAST(1.0,
           guest_preference_profiles.confidence + 0.01
         ),
         last_evolved = NOW(),
         updated_at = NOW()`,
      [venueId, guestId, craftKey, craftDelta, craftDelta * 0.5, event.eventType],
    );

    // VIP detection: check if this guest crosses the threshold
    await detectVip(guestId, venueId);
  } catch (err) {
    logger.warn({ err }, "aiMemoryEngine: profile evolution failed");
  }
}

async function detectVip(guestId: string, venueId: string): Promise<void> {
  try {
    const { rows } = await pool.query<{
      premium_affinity: string;
      session_count:    string;
      conversion_rate:  string;
      is_vip:           boolean;
    }>(
      `SELECT premium_affinity, session_count, conversion_rate, is_vip
       FROM guest_preference_profiles
       WHERE guest_id = $1 AND venue_id = $2`,
      [guestId, venueId],
    );
    if (!rows[0]) return;

    const row = rows[0];
    const vipScore = (
      parseFloat(row.premium_affinity) * 4 +
      Math.min(parseFloat(row.session_count) / 5, 2) +
      parseFloat(row.conversion_rate) * 3
    );

    if (vipScore >= VIP_THRESHOLD && !row.is_vip) {
      await pool.query(
        `UPDATE guest_preference_profiles
         SET is_vip = true, vip_detected_at = NOW(), updated_at = NOW()
         WHERE guest_id = $1 AND venue_id = $2`,
        [guestId, venueId],
      );
      await pgPubSub.publish("intelligence", {
        event:    "VIP_DETECTED",
        venueId,
        guestId,
        vipScore,
      });
      logger.info({ guestId, venueId, vipScore }, "aiMemoryEngine: VIP detected");
    }
  } catch (err) {
    logger.warn({ err }, "aiMemoryEngine: VIP detection failed");
  }
}

export async function getGuestProfile(
  guestId: string,
  venueId: string,
): Promise<GuestProfile | null> {
  try {
    const { rows } = await pool.query<GuestProfile>(
      `SELECT guest_id, venue_id, craft_affinities, flavor_affinities,
              premium_affinity, social_score, adventure_score,
              conversion_rate, session_count, is_vip, confidence
       FROM guest_preference_profiles
       WHERE guest_id = $1 AND venue_id = $2`,
      [guestId, venueId],
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function decayMemory(): Promise<void> {
  try {
    await pool.query(
      `DELETE FROM ai_behavior_memory
       WHERE created_at < NOW() - INTERVAL '${MEMORY_TTL_S} seconds'`,
    );
    logger.info("aiMemoryEngine: memory decay pass complete");
  } catch (err) {
    logger.warn({ err }, "aiMemoryEngine: decay failed");
  }
}
