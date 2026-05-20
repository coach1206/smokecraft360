/**
 * PredictiveIntentWorker — Background Intelligence Engine.
 *
 * Analyzes GuestBehaviorLogs every 30 seconds to compute the next
 * "Premium Conversion Moment" for each active session.
 *
 * Flow per tick:
 *   1. Query neural_ingestion_events for sessions active in last 10 minutes
 *   2. Group by session_id
 *   3. Run IntentProbabilityEngine.predict() per session
 *   4. Store result in VenueStateEngine
 *   5. Execute nudge if confidence ≥ 65 (worker threshold > API threshold of 55)
 *   6. Emit intent.prediction on NeuralEventBus
 *
 * Throttle: each session is predicted at most once per 90 seconds
 * (prevents nudge storm on high-traffic venues).
 */

import { pool }                       from "@workspace/db";
import { logger }                     from "../lib/logger";
import { IntentProbabilityEngine }    from "../services/intentProbabilityEngine";
import { PredictiveNudgeService }     from "../services/predictiveNudgeService";
import { VenueStateEngine }           from "../services/venueStateEngine";
import { NeuralEventBus }             from "../services/neuralEventBus";

const INTERVAL_MS    = 30_000;
const COOLDOWN_MS    = 90_000;
const MIN_CONFIDENCE = 65;

const lastPredicted = new Map<string, number>(); // sessionId → last prediction timestamp

interface SessionRow {
  session_id: string;
  venue_id:   string | null;
  craft_type: string | null;
  event_count: string;
}

async function tick(): Promise<void> {
  let activeSessions: SessionRow[] = [];

  try {
    const { rows } = await pool.query<SessionRow>(`
      SELECT session_id, venue_id, NULL::text AS craft_type, COUNT(*) AS event_count
      FROM neural_ingestion_events
      WHERE created_at > NOW() - INTERVAL '10 minutes'
        AND session_id IS NOT NULL
      GROUP BY session_id, venue_id
      HAVING COUNT(*) >= 3
      LIMIT 50
    `);
    activeSessions = rows;
  } catch (err) {
    logger.warn({ err }, "predictiveIntentWorker: DB query failed — skipping tick");
    return;
  }

  const now = Date.now();

  for (const row of activeSessions) {
    const { session_id, venue_id, craft_type } = row;

    const lastTs = lastPredicted.get(session_id) ?? 0;
    if (now - lastTs < COOLDOWN_MS) continue;

    try {
      const mood = venue_id ? VenueStateEngine.get<{ mood: string; intensity: number }>(venue_id, "mood") : null;

      const prediction = await IntentProbabilityEngine.predict({
        sessionId:  session_id,
        venueId:    venue_id ?? undefined,
        craftType:  craft_type ?? undefined,
        moodShift:  mood ?? undefined,
      });

      lastPredicted.set(session_id, now);

      if (venue_id) {
        VenueStateEngine.setIntent(venue_id, prediction);
      }

      NeuralEventBus.publish("intent.prediction", { sessionId: session_id, prediction }, venue_id ?? undefined);

      if (prediction.confidence >= MIN_CONFIDENCE) {
        await PredictiveNudgeService.execute(prediction, {
          venueId:   venue_id ?? undefined,
          sessionId: session_id,
        });
        NeuralEventBus.publish("intent.nudge_executed", { sessionId: session_id, nudgeType: prediction.nudgeType }, venue_id ?? undefined);
      }

    } catch (err) {
      logger.warn({ err, sessionId: session_id }, "predictiveIntentWorker: prediction failed");
    }
  }

  if (activeSessions.length > 0) {
    logger.info({ sessions: activeSessions.length }, "predictiveIntentWorker tick complete");
  }
}

export function startPredictiveIntentWorker(): void {
  logger.info({ intervalMs: INTERVAL_MS, minConfidence: MIN_CONFIDENCE }, "PredictiveIntentWorker started");
  setInterval(() => { tick().catch(() => {}); }, INTERVAL_MS);
}
