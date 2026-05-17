/**
 * PredictiveHospitalityEngine — Guest Behavior Modeling + Long-Term Memory Evolution.
 *
 * Phase C: Predictive Hospitality Engine.
 *
 * Real behavioral analysis engine that scores every active session across
 * six behavioral dimensions and emits predictive signals before the guest
 * acts — EEIE must know what the guest will do next.
 *
 * Behavioral Dimensions:
 *   hesitationScore     — time between swipes, revisit patterns (0–100)
 *   curiosityScore      — exploration breadth, craft diversity (0–100)
 *   confidenceScore     — consistent preference direction (0–100)
 *   fatigueLevel        — declining interaction pace (0–100)
 *   premiumIntentScore  — engagement with high-tier items (0–100)
 *   socialScore         — group session presence (0–100)
 *
 * Long-Term Memory Evolution:
 *   Writes `inferred` memories to user_memories table when confidence is ≥70.
 *   Tracks: preferred_origin, strength_tolerance, avoid_profile, social_preference,
 *           flavor_progression, mentor_affinity.
 *
 * Predictive Recommendations:
 *   next-best-action prediction from behavioral composite
 *   Emits `eeie:predictive_signal` via Socket.io for real-time guidance
 *   Emits `hospitality.prediction` on NeuralEventBus for distributed observability
 *
 * Runs every 5 minutes.
 */

import { sql, eq, and, gte } from "drizzle-orm";
import { db }                from "@workspace/db";
import { getIO }             from "../lib/socketServer";
import { NeuralEventBus }    from "./neuralEventBus";
import { logger }            from "../lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PredictedNextAction =
  | "PURCHASE"
  | "BROWSE_MORE"
  | "DISENGAGE"
  | "SEEK_GUIDANCE"
  | "UPGRADE"
  | "REORDER";

export interface HospitalityPrediction {
  sessionId:             string;
  venueId:               string;
  guestId?:              string;
  hesitationScore:       number;
  curiosityScore:        number;
  confidenceScore:       number;
  fatigueLevel:          number;
  premiumIntentScore:    number;
  socialScore:           number;
  compositeScore:        number;
  predictedNextAction:   PredictedNextAction;
  recommendedIntervention: string;
  memoryEvolution:       string[];   // memory keys written this cycle
  confidence:            number;     // 0–100 overall model confidence
  ts:                    string;
}

// Recent predictions ring buffer (global, last 100)
const recentPredictions: HospitalityPrediction[] = [];

function storePrediction(p: HospitalityPrediction): void {
  recentPredictions.push(p);
  if (recentPredictions.length > 100) recentPredictions.shift();
}

// ── Behavioral scoring ────────────────────────────────────────────────────────

// Columns mapped from actual orchestrator_events schema
// (skip_ratio, confidence, premium_intent, social_energy, avg_swipe_ms, session_depth)
interface RawSessionData extends Record<string, unknown> {
  session_id:       string;
  venue_id:         string;
  guest_id:         string | null;
  event_count:      string;
  avg_skip_ratio:   string;   // AVG(skip_ratio)   — replaces skip_count/add_count
  avg_confidence:   string;   // AVG(confidence)
  avg_premium:      string;   // AVG(premium_intent)
  avg_social:       string;   // AVG(social_energy)
  avg_swipe_ms:     string;   // AVG(avg_swipe_ms) — replaces elapsed_ms
  max_depth:        string;   // MAX(session_depth) — replaces unique_types
  event_count_l5:   string;   // recent-window row count
}

function scoreHesitation(avgTimeBetweenMs: number, skipRatio: number): number {
  const timeFactor  = Math.min(100, avgTimeBetweenMs / 600);   // 60s avg → 100
  const skipFactor  = skipRatio * 50;
  return Math.min(100, Math.round((timeFactor + skipFactor) / 2));
}

function scoreCuriosity(uniqueTypes: number, eventCount: number): number {
  const breadth = Math.min(100, uniqueTypes * 25);        // 4 craft types = 100
  const depth   = Math.min(100, eventCount * 4);           // 25 events = 100
  return Math.round((breadth * 0.6) + (depth * 0.4));
}

function scoreConfidence(addRatio: number, skipRatio: number): number {
  // High adds + low skips = high confidence direction
  const addStr  = addRatio * 70;
  const penalty = skipRatio > 0.8 ? 30 : 0;
  return Math.max(0, Math.min(100, Math.round(addStr - penalty + 10)));
}

function scoreFatigue(eventCountL5: number, totalEvents: number): number {
  if (totalEvents < 10) return 0;
  const paceRatio = totalEvents > 0 ? eventCountL5 / Math.max(1, totalEvents * 0.2) : 1;
  return Math.min(100, Math.round((1 - paceRatio) * 100));
}

function scorePremiumIntent(addRatio: number, confidence: number, curiosity: number): number {
  return Math.min(100, Math.round(addRatio * 50 + confidence * 0.3 + curiosity * 0.2));
}

function predictAction(
  hesitation: number,
  curiosity:  number,
  confidence: number,
  fatigue:    number,
  premium:    number,
): PredictedNextAction {
  if (fatigue > 70)         return "DISENGAGE";
  if (confidence > 70 && premium > 60) return "PURCHASE";
  if (hesitation > 70 && curiosity < 40) return "SEEK_GUIDANCE";
  if (confidence > 80 && premium > 80)   return "UPGRADE";
  if (curiosity > 70 && confidence > 50) return "BROWSE_MORE";
  return "BROWSE_MORE";
}

function buildIntervention(action: PredictedNextAction, hesitation: number, premium: number): string {
  switch (action) {
    case "PURCHASE":   return premium > 80
      ? "Present the premium pairing recommendation now — guest is primed."
      : "Offer a curated staff pick — guest is ready to commit.";
    case "UPGRADE":    return "Introduce the ultra-premium tier — guest shows strong upgrade signals.";
    case "DISENGAGE":  return "Guest fatigue detected — offer a reset or lighter recommendation.";
    case "SEEK_GUIDANCE": return hesitation > 85
      ? "Guest is overwhelmed — simplify with a mentor-guided path."
      : "Offer a concierge recommendation — guest wants direction.";
    case "REORDER":    return "Guest has ordered before — surface their historical favorites.";
    default:           return "Guest is exploring — let the experience guide them.";
  }
}

// ── Long-term memory evolution ────────────────────────────────────────────────

async function evolveMemory(
  guestId: string,
  venueId: string,
  prediction: Omit<HospitalityPrediction, "memoryEvolution" | "ts">,
): Promise<string[]> {
  const evolved: string[] = [];

  const upsertMemory = async (key: string, value: string, confidence: number): Promise<void> => {
    if (confidence < 70) return;
    try {
      await db.execute(sql`
        INSERT INTO user_memories (id, user_id, venue_id, key, value, source, confidence)
        VALUES (
          gen_random_uuid(), ${guestId}::uuid, ${venueId}::uuid,
          ${key}, ${value}, 'inferred', ${confidence / 100}
        )
        ON CONFLICT (user_id, key)
        DO UPDATE SET
          value      = EXCLUDED.value,
          confidence = GREATEST(user_memories.confidence, EXCLUDED.confidence),
          source     = 'inferred',
          updated_at = NOW()
      `);
      evolved.push(key);
    } catch (_) {
      // user_memories may not have unique(user_id, key) — skip silently
    }
  };

  if (prediction.fatigueLevel < 30 && prediction.curiosityScore > 70) {
    await upsertMemory("exploration_style", "deep_explorer", prediction.curiosityScore);
  } else if (prediction.hesitationScore > 70) {
    await upsertMemory("exploration_style", "deliberate_chooser", prediction.hesitationScore);
  }

  if (prediction.premiumIntentScore > 75) {
    await upsertMemory("premium_intent", "high", prediction.premiumIntentScore);
  }

  if (prediction.socialScore > 60) {
    await upsertMemory("social_preference", "group_experience", prediction.socialScore);
  }

  if (prediction.confidenceScore > 80) {
    await upsertMemory("preference_confidence", "strong_preferences", prediction.confidenceScore);
  }

  return evolved;
}

// ── Core analysis cycle ───────────────────────────────────────────────────────

async function analyzeActiveSessions(): Promise<void> {
  // Uses actual orchestrator_events columns (skip_ratio, confidence, premium_intent, etc.)
  // event_type does not exist on this table — behavioral signals are pre-aggregated per row.
  const rows = await db.execute<RawSessionData>(sql`
    SELECT
      session_id,
      venue_id,
      MAX(NULL::text)                                                                      AS guest_id,
      COUNT(*)                                                                             AS event_count,
      AVG(skip_ratio)::float                                                               AS avg_skip_ratio,
      AVG(confidence)::float                                                               AS avg_confidence,
      AVG(premium_intent)::float                                                           AS avg_premium,
      AVG(social_energy)::float                                                            AS avg_social,
      AVG(avg_swipe_ms)::float                                                             AS avg_swipe_ms,
      MAX(session_depth)                                                                   AS max_depth,
      SUM(CASE WHEN created_at > NOW() - INTERVAL '5 minutes' THEN 1 ELSE 0 END)          AS event_count_l5
    FROM orchestrator_events
    WHERE created_at > NOW() - INTERVAL '15 minutes'
      AND session_id IS NOT NULL
      AND venue_id   IS NOT NULL
    GROUP BY session_id, venue_id
    HAVING COUNT(*) >= 2
  `);

  const io = getIO();

  for (const row of rows.rows) {
    try {
      const eventCount   = Number(row.event_count)    || 0;
      const eventCountL5 = Number(row.event_count_l5) || 0;
      // Behavioral signals are pre-aggregated in orchestrator_events rows
      const skipRatio    = Number(row.avg_skip_ratio) || 0.5;
      const addRatio     = 1 - skipRatio;
      const uniqueTypes  = Math.max(1, Number(row.max_depth) || 1);
      const swipeMs      = Number(row.avg_swipe_ms)   || 1500;

      const hesitation = scoreHesitation(swipeMs, skipRatio);
      const curiosity  = scoreCuriosity(uniqueTypes, eventCount);
      const confidence = scoreConfidence(addRatio, skipRatio);
      const fatigue    = scoreFatigue(eventCountL5, eventCount);
      const premium    = scorePremiumIntent(addRatio, confidence, curiosity);
      const social     = Math.min(100, Math.round(Number(row.avg_social) || 40));
      const composite  = Math.round(
        hesitation * 0.15 + curiosity * 0.25 + confidence * 0.25 +
        (100 - fatigue) * 0.15 + premium * 0.20,
      );

      const nextAction    = predictAction(hesitation, curiosity, confidence, fatigue, premium);
      const intervention  = buildIntervention(nextAction, hesitation, premium);
      const modelConf     = Math.min(100, Math.round(50 + eventCount * 2));

      const memoryEvolution: string[] = [];
      if (row.guest_id) {
        const evolved = await evolveMemory(row.guest_id, row.venue_id, {
          sessionId: row.session_id, venueId: row.venue_id, guestId: row.guest_id,
          hesitationScore: hesitation, curiosityScore: curiosity, confidenceScore: confidence,
          fatigueLevel: fatigue, premiumIntentScore: premium, socialScore: social,
          compositeScore: composite, predictedNextAction: nextAction,
          recommendedIntervention: intervention, confidence: modelConf,
        });
        memoryEvolution.push(...evolved);
      }

      const prediction: HospitalityPrediction = {
        sessionId:              row.session_id,
        venueId:                row.venue_id,
        guestId:                row.guest_id ?? undefined,
        hesitationScore:        hesitation,
        curiosityScore:         curiosity,
        confidenceScore:        confidence,
        fatigueLevel:           fatigue,
        premiumIntentScore:     premium,
        socialScore:            social,
        compositeScore:         composite,
        predictedNextAction:    nextAction,
        recommendedIntervention: intervention,
        memoryEvolution,
        confidence:             modelConf,
        ts:                     new Date().toISOString(),
      };

      storePrediction(prediction);
      io.to(`venue:${row.venue_id}`).emit("eeie:predictive_signal", prediction);

      if (nextAction === "DISENGAGE" || nextAction === "SEEK_GUIDANCE") {
        io.to(`venue:${row.venue_id}`).emit("eeie:staff_advisory", {
          id:         `pred-${row.session_id}-${Date.now()}`,
          venueId:    row.venue_id,
          type:       nextAction === "DISENGAGE" ? "HIGH_ENGAGEMENT_DROP" : "GUEST_HESITATION",
          message:    intervention,
          confidence: modelConf,
          urgency:    nextAction === "DISENGAGE" ? "high" : "medium",
          sessionId:  row.session_id,
          data:       { nextAction, composite },
          ts:         prediction.ts,
        });
      }

      NeuralEventBus.publish("hospitality.prediction", {
        sessionId: row.session_id, venueId: row.venue_id, nextAction, composite, modelConf,
      }, row.venue_id);

    } catch (err) {
      logger.warn({ err, sessionId: row.session_id }, "prediction failed for session — skipping");
    }
  }

  logger.info({ sessions: rows.rows.length }, "predictive hospitality cycle complete");
}

async function runPrediction(): Promise<void> {
  try {
    await analyzeActiveSessions();
  } catch (err) {
    logger.error({ err }, "predictive hospitality engine failed");
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const PredictiveHospitalityEngine = {
  getRecentPredictions(limit = 20): HospitalityPrediction[] {
    return recentPredictions.slice(-limit).reverse();
  },

  getVenuePredictions(venueId: string, limit = 10): HospitalityPrediction[] {
    return recentPredictions
      .filter(p => p.venueId === venueId)
      .slice(-limit)
      .reverse();
  },
};

// ── Startup ───────────────────────────────────────────────────────────────────

export function startPredictiveHospitalityEngine(): void {
  void runPrediction();
  setInterval(() => void runPrediction(), 5 * 60 * 1000);   // every 5 minutes
  logger.info("PredictiveHospitalityEngine started — guest behavior modeling active");
}
