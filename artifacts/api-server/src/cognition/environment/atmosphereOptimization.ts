/**
 * atmosphereOptimization — uses environmental memory to recommend and
 * apply optimal atmosphere settings, learning continuously from outcomes.
 *
 * Integrates: environmentalMemory, contextAggregator, ambientOrchestrator.
 * Publishes scene transitions to the ambient channel.
 */

import { pool }                    from "@workspace/db";
import { logger }                  from "../../lib/logger";
import { publish }                 from "../../realtime/transport/eventBus";
import { aggregateContext }        from "../context/contextAggregator";
import { getSceneEffectiveness }   from "./environmentalMemory";
import { predictOptimalEnvironment } from "../predictive/environmentalPrediction";

export interface AtmosphereOptimizationResult {
  venueId:      string;
  ts:           number;
  action:       "applied" | "recommended" | "no_change" | "skipped";
  selectedScene:string | null;
  reason:       string;
  predictedLift:number;
  confidence:   number;
}

const MIN_SCENE_DURATION_MS = 10 * 60 * 1000; // 10 min minimum before switching

const lastSwitchAt = new Map<string, number>();

export async function optimizeAtmosphere(
  venueId:    string,
  autoApply = false,
): Promise<AtmosphereOptimizationResult> {
  try {
    const [ctx, prediction, history] = await Promise.all([
      aggregateContext(venueId),
      predictOptimalEnvironment(venueId),
      getSceneEffectiveness(venueId),
    ]);

    const last   = lastSwitchAt.get(venueId) ?? 0;
    const tooSoon = Date.now() - last < MIN_SCENE_DURATION_MS;

    if (tooSoon) {
      return {
        venueId, ts: Date.now(), action: "skipped",
        selectedScene: ctx.activeSceneId, reason: "Scene switched recently — cooling down",
        predictedLift: 0, confidence: 1,
      };
    }

    const best = prediction.recommendations[0];
    if (!best || best.sceneId === ctx.activeSceneId) {
      return {
        venueId, ts: Date.now(), action: "no_change",
        selectedScene: ctx.activeSceneId,
        reason: "Current scene is optimal",
        predictedLift: 0, confidence: prediction.confidence,
      };
    }

    // Boost predicted lift with historical memory
    const memoryEntry = history.find(h => h.sceneId === best.sceneId);
    const memoryBoost = memoryEntry ? memoryEntry.engagementLift * 0.2 : 0;
    const predictedLift = Math.min(1, best.predictedEffect + memoryBoost);

    // Only auto-apply if confidence is high enough
    if (autoApply && prediction.confidence > 0.6) {
      await activateScene(venueId, best.sceneId, best.sceneName, ctx.engagementLevel);
      lastSwitchAt.set(venueId, Date.now());
      return {
        venueId, ts: Date.now(), action: "applied",
        selectedScene: best.sceneId,
        reason: prediction.rationale,
        predictedLift, confidence: prediction.confidence,
      };
    }

    return {
      venueId, ts: Date.now(), action: "recommended",
      selectedScene: best.sceneId,
      reason: prediction.rationale,
      predictedLift, confidence: prediction.confidence,
    };
  } catch (err) {
    logger.warn({ err, venueId }, "atmosphereOptimization: failed");
    return {
      venueId, ts: Date.now(), action: "skipped",
      selectedScene: null, reason: "optimization error",
      predictedLift: 0, confidence: 0,
    };
  }
}

async function activateScene(
  venueId:    string,
  sceneId:    string,
  sceneName:  string,
  moodScore:  number,
): Promise<void> {
  try {
    await pool.query(
      `UPDATE environmental_states
       SET is_active = FALSE, deactivated_at = NOW()
       WHERE venue_id = $1 AND is_active = TRUE`,
      [venueId],
    );

    await pool.query(
      `INSERT INTO environmental_states
         (venue_id, scene_id, scene_name, lighting_preset, music_tempo,
          mood_score, atmosphere_index, is_active, triggered_by, activated_at)
       VALUES ($1,$2,$3,'warm','moderate',$4,$4,TRUE,'atmosphere_optimizer',NOW())`,
      [venueId, sceneId, sceneName, moodScore],
    );

    await publish("ambient", {
      event: "SCENE_ACTIVATED", venueId, sceneId, sceneName,
      triggeredBy: "atmosphere_optimizer",
    });

    logger.info({ venueId, sceneId, sceneName }, "atmosphereOptimization: scene activated");
  } catch (err) {
    logger.warn({ err, venueId }, "atmosphereOptimization: activateScene failed");
  }
}
