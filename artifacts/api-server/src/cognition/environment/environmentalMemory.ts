/**
 * environmentalMemory — records (scene × operational conditions → outcome)
 * pairs, enabling the system to learn which environmental configurations
 * produce optimal lounge behavior over time.
 *
 * This is a major long-term moat: each venue builds its own unique
 * environmental intelligence from real operational outcomes.
 *
 * Persists to: environmental_states (effectiveness_score on deactivation)
 * Publishes to: ambient channel
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";

export interface EnvironmentalRecord {
  sceneId:          string;
  sceneName:        string;
  startEngagement:  number;
  endEngagement:    number;
  startSocial:      number;
  endSocial:        number;
  guestCount:       number;
  revenueDelta:     number;   // cents earned during scene
  durationMinutes:  number;
  craftMix:         Record<string, number>;
  effectivenessScore:number;  // computed outcome
}

export interface SceneEffectiveness {
  sceneId:           string;
  sceneName:         string;
  avgEffectiveness:  number;
  engagementLift:    number;
  socialLift:        number;
  revenueLift:       number;
  sampleCount:       number;
  confidence:        number;
  bestConditions:    BestCondition[];
}

export interface BestCondition {
  hourOfDay:         number;
  dayOfWeek:         number;
  avgGuests:         number;
  effectiveness:     number;
}

function computeEffectiveness(r: EnvironmentalRecord): number {
  const engagementLift = r.endEngagement - r.startEngagement;
  const socialLift     = r.endSocial     - r.startSocial;
  const revNorm        = Math.min(1, r.revenueDelta / 10000);
  const durationBonus  = Math.min(0.1, r.durationMinutes / 60 * 0.05);

  return Math.max(0, Math.min(1,
    engagementLift * 0.4 +
    socialLift     * 0.3 +
    revNorm        * 0.2 +
    durationBonus  + 0.5, // baseline 0.5 to avoid always-negative
  ));
}

export async function recordSceneOutcome(
  venueId: string,
  record:  EnvironmentalRecord,
): Promise<void> {
  const score = computeEffectiveness(record);
  try {
    await pool.query(
      `UPDATE environmental_states
       SET effectiveness_score = $2,
           deactivated_at      = NOW(),
           is_active           = FALSE,
           metadata            = metadata || $3
       WHERE venue_id = $1
         AND scene_id  = $4
         AND is_active = TRUE`,
      [
        venueId, score,
        JSON.stringify({
          engagementLift: record.endEngagement - record.startEngagement,
          socialLift:     record.endSocial     - record.startSocial,
          revenueDelta:   record.revenueDelta,
          craftMix:       record.craftMix,
          durationMinutes:record.durationMinutes,
        }),
        record.sceneId,
      ],
    );

    logger.info({ venueId, sceneId: record.sceneId, score }, "environmentalMemory: scene outcome recorded");

    await publish("ambient", {
      event: "SCENE_OUTCOME_RECORDED",
      venueId, sceneId: record.sceneId, score,
    });
  } catch (err) {
    logger.warn({ err, venueId }, "environmentalMemory: record failed");
  }
}

export async function getSceneEffectiveness(
  venueId: string,
): Promise<SceneEffectiveness[]> {
  try {
    const { rows } = await pool.query(
      `SELECT
         scene_id,
         scene_name,
         AVG(effectiveness_score)                        AS avg_eff,
         AVG((metadata->>'engagementLift')::float)       AS avg_eng_lift,
         AVG((metadata->>'socialLift')::float)           AS avg_soc_lift,
         AVG((metadata->>'revenueDelta')::float)         AS avg_rev_delta,
         COUNT(*)                                        AS sample_count
       FROM environmental_states
       WHERE venue_id = $1
         AND effectiveness_score IS NOT NULL
         AND deactivated_at IS NOT NULL
       GROUP BY scene_id, scene_name
       ORDER BY avg_eff DESC`,
      [venueId],
    );

    return rows.map((r: Record<string, unknown>) => ({
      sceneId:          String(r.scene_id),
      sceneName:        String(r.scene_name),
      avgEffectiveness: Number(r.avg_eff ?? 0),
      engagementLift:   Number(r.avg_eng_lift ?? 0),
      socialLift:       Number(r.avg_soc_lift ?? 0),
      revenueLift:      Number(r.avg_rev_delta ?? 0),
      sampleCount:      Number(r.sample_count),
      confidence:       Math.min(1, Number(r.sample_count) / 20),
      bestConditions:   [],
    }));
  } catch (err) {
    logger.warn({ err, venueId }, "environmentalMemory: getSceneEffectiveness failed");
    return [];
  }
}
