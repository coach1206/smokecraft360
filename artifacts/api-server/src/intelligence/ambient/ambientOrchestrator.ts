/**
 * ambientOrchestrator — autonomous environmental response system.
 *
 * Listens to orchestration decisions and translates them into
 * lighting / sound / scene transitions. Tracks scene history and
 * computes effectiveness over time.
 */

import { pool } from "@workspace/db";
import { pgPubSub } from "../../realtime/pgPubSub";
import { logger } from "../../lib/logger";

export interface AmbientScene {
  sceneId:   string;
  name:      string;
  craftType?: string;
  lighting:  { level: number; color: string; warmth: number };
  sound:     { level: number; genre: string; tempo: "slow" | "medium" | "energetic" };
  moodScore: number;
  intensity: number;
}

const SCENE_LIBRARY: Record<string, AmbientScene> = {
  "premium-lounge": {
    sceneId: "premium-lounge", name: "Premium Lounge",
    lighting: { level: 0.4, color: "warm-amber", warmth: 0.85 },
    sound:    { level: 0.35, genre: "jazz", tempo: "slow" },
    moodScore: 0.9, intensity: 0.85,
  },
  "social-lounge": {
    sceneId: "social-lounge", name: "Social Lounge",
    lighting: { level: 0.6, color: "golden", warmth: 0.7 },
    sound:    { level: 0.55, genre: "lounge", tempo: "medium" },
    moodScore: 0.75, intensity: 0.7,
  },
  "energize": {
    sceneId: "energize", name: "Energize",
    lighting: { level: 0.75, color: "bright-amber", warmth: 0.5 },
    sound:    { level: 0.65, genre: "upbeat", tempo: "energetic" },
    moodScore: 0.65, intensity: 0.75,
  },
  "intimate": {
    sceneId: "intimate", name: "Intimate",
    lighting: { level: 0.25, color: "deep-amber", warmth: 0.95 },
    sound:    { level: 0.25, genre: "classical", tempo: "slow" },
    moodScore: 0.85, intensity: 0.5,
  },
  "standard": {
    sceneId: "standard", name: "Standard",
    lighting: { level: 0.6, color: "neutral-warm", warmth: 0.65 },
    sound:    { level: 0.45, genre: "ambient", tempo: "medium" },
    moodScore: 0.5, intensity: 0.5,
  },
};

export async function activateScene(
  venueId:     string,
  sceneId:     string,
  triggeredBy: string,
  decisionId?: string,
  override?:   Partial<AmbientScene>,
): Promise<AmbientScene | null> {
  const scene = SCENE_LIBRARY[sceneId];
  if (!scene) {
    logger.warn({ venueId, sceneId }, "ambientOrchestrator: unknown scene");
    return null;
  }
  const applied = override ? { ...scene, ...override } : scene;

  // Persist to scene history
  try {
    await pool.query(
      `INSERT INTO ambient_scene_history
         (venue_id, scene_id, scene_name, craft_type, lighting_profile,
          sound_profile, mood_score, triggered_by, decision_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        venueId, applied.sceneId, applied.name, applied.craftType ?? null,
        JSON.stringify(applied.lighting), JSON.stringify(applied.sound),
        applied.moodScore, triggeredBy, decisionId ?? null,
      ],
    );
  } catch (err) {
    logger.warn({ err }, "ambientOrchestrator: failed to persist scene history");
  }

  // Update venue context
  try {
    await pool.query(
      `UPDATE venue_context_state
       SET ambient_scene = $1, mood_score = $2, updated_at = NOW()
       WHERE venue_id = $3`,
      [applied.sceneId, applied.moodScore, venueId],
    );
  } catch { /* non-critical */ }

  // Update environmental context
  try {
    await pool.query(
      `INSERT INTO environmental_context
         (venue_id, scene_id, scene_name, lighting_level, lighting_color,
          sound_level, sound_genre, atmosphere_score, mood_label, is_optimal)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
       ON CONFLICT (venue_id) DO UPDATE SET
         scene_id = EXCLUDED.scene_id, scene_name = EXCLUDED.scene_name,
         lighting_level = EXCLUDED.lighting_level, lighting_color = EXCLUDED.lighting_color,
         sound_level = EXCLUDED.sound_level, sound_genre = EXCLUDED.sound_genre,
         atmosphere_score = EXCLUDED.atmosphere_score, mood_label = EXCLUDED.mood_label,
         is_optimal = true, optimized_at = NOW(), updated_at = NOW()`,
      [
        venueId, applied.sceneId, applied.name,
        applied.lighting.level, applied.lighting.color,
        applied.sound.level, applied.sound.genre,
        applied.moodScore, applied.name.toLowerCase(),
      ],
    );
  } catch { /* non-critical */ }

  // Broadcast via pub/sub → Socket.IO
  await pgPubSub.publish("ambient", {
    event:       "SCENE_ACTIVATED",
    venueId,
    sceneId:     applied.sceneId,
    sceneName:   applied.name,
    lighting:    applied.lighting,
    sound:       applied.sound,
    moodScore:   applied.moodScore,
    intensity:   applied.intensity,
    triggeredBy,
  });

  logger.info({ venueId, sceneId: applied.sceneId, triggeredBy }, "ambientOrchestrator: scene activated");
  return applied;
}

export async function applyAction(
  venueId:    string,
  actionType: string,
  payload:    Record<string, unknown>,
  decisionId?: string,
): Promise<void> {
  switch (actionType) {
    case "ACTIVATE_AMBIENT_SCENE":
      await activateScene(
        venueId,
        (payload["sceneId"] as string) ?? "standard",
        "orchestration",
        decisionId,
      );
      break;

    case "BOOST_RECOMMENDATIONS":
      await pgPubSub.publish("intelligence", {
        event:     "RECOMMENDATION_BOOST",
        venueId,
        category:  payload["category"],
        boost:     payload["boost"],
        decisionId,
      });
      break;

    case "NOTIFY_STAFF":
      await pgPubSub.publish("orchestration", {
        event:     "STAFF_NOTIFICATION",
        venueId,
        message:   payload["message"],
        urgency:   payload["urgency"] ?? "normal",
        decisionId,
      });
      break;

    case "INCREASE_UPSELL_PRESSURE":
      await pgPubSub.publish("intelligence", {
        event:      "UPSELL_PRESSURE_ADJUSTED",
        venueId,
        delta:      payload["delta"],
        maxPressure:payload["maxPressure"],
        decisionId,
      });
      break;

    case "REWEIGHT_RECOMMENDATIONS":
      await pgPubSub.publish("intelligence", {
        event:    "RECOMMENDATION_REWEIGHT",
        venueId,
        strategy: payload["strategy"],
        decisionId,
      });
      break;

    case "ALERT_OPERATIONS":
      await pgPubSub.publish("orchestration", {
        event:     "OPS_ALERT",
        venueId,
        message:   payload["message"],
        severity:  "warning",
        decisionId,
      });
      break;

    default:
      logger.info({ venueId, actionType }, "ambientOrchestrator: unhandled action type — forwarding");
      await pgPubSub.publish("orchestration", {
        event:      "UNHANDLED_ACTION",
        venueId,
        actionType,
        payload,
        decisionId,
      });
  }
}

export function getSceneLibrary(): AmbientScene[] {
  return Object.values(SCENE_LIBRARY);
}

export async function getEffectivenessMap(venueId: string): Promise<Record<string, number>> {
  try {
    const { rows } = await pool.query<{ scene_id: string; effectiveness_score: string }>(
      `SELECT scene_id, AVG(effectiveness_score) as effectiveness_score
       FROM environmental_effectiveness
       WHERE venue_id = $1
       GROUP BY scene_id`,
      [venueId],
    );
    return Object.fromEntries(rows.map((r) => [r.scene_id, parseFloat(r.effectiveness_score)]));
  } catch {
    return {};
  }
}
