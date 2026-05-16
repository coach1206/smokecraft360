/**
 * environmentalPrediction — recommends optimal environmental state given
 * predicted engagement trajectory and current operational context.
 *
 * Consumes: engagement forecast, environmental memory, context aggregator.
 * Output: ranked scene recommendations with predicted effectiveness scores.
 */

import { pool }              from "@workspace/db";
import { logger }            from "../../lib/logger";
import { aggregateContext }  from "../context/contextAggregator";

export interface EnvironmentalRecommendation {
  venueId:          string;
  ts:               number;
  currentScene:     string | null;
  recommendations:  SceneRecommendation[];
  urgency:          "routine" | "suggested" | "recommended" | "urgent";
  rationale:        string;
  confidence:       number;
}

export interface SceneRecommendation {
  sceneId:           string;
  sceneName:         string;
  predictedEffect:   number;     // 0–1 predicted engagement lift
  historicalEffect:  number;     // from environmental memory
  craftAlignment:    string[];   // which crafts this scene benefits
  confidence:        number;
  reason:            string;
}

const SCENE_PROFILES: Record<string, {
  name: string; crafts: string[]; baseEffect: number;
  conditions: (ctx: { engagementLevel: number; socialEnergy: number; vipCount: number; hourOfDay: number }) => number;
}> = {
  premium_lounge: {
    name: "Premium Lounge",
    crafts: ["smoke","pour"],
    baseEffect: 0.15,
    conditions: c => (c.vipCount > 0 ? 0.3 : 0) + (c.engagementLevel > 0.5 ? 0.1 : 0),
  },
  social_lounge: {
    name: "Social Lounge",
    crafts: ["brew","pour"],
    baseEffect: 0.12,
    conditions: c => c.socialEnergy * 0.3,
  },
  energize: {
    name: "Energize",
    crafts: ["vape","brew"],
    baseEffect: 0.10,
    conditions: c => c.engagementLevel < 0.4 ? 0.2 : 0,
  },
  intimate: {
    name: "Intimate",
    crafts: ["smoke","pour"],
    baseEffect: 0.08,
    conditions: c => (c.socialEnergy < 0.3 ? 0.15 : 0) + (c.hourOfDay > 20 ? 0.1 : 0),
  },
  standard: {
    name: "Standard",
    crafts: ["smoke","pour","brew","vape"],
    baseEffect: 0.03,
    conditions: _ => 0,
  },
};

export async function predictOptimalEnvironment(
  venueId: string,
): Promise<EnvironmentalRecommendation> {
  try {
    const ctx = await aggregateContext(venueId);

    // Pull historical effectiveness from environmental_states
    const { rows } = await pool.query(
      `SELECT scene_id, AVG(COALESCE(effectiveness_score,0)) AS avg_eff, COUNT(*) AS uses
       FROM environmental_states
       WHERE venue_id = $1 AND deactivated_at IS NOT NULL
       GROUP BY scene_id`,
      [venueId],
    ).catch(() => ({ rows: [] }));

    const histEff = new Map<string, number>(
      rows.map((r: Record<string, unknown>) => [
        String(r.scene_id), Number(r.avg_eff),
      ]),
    );

    const condCtx = {
      engagementLevel: ctx.engagementLevel,
      socialEnergy: ctx.socialEnergy,
      vipCount: ctx.vipCount,
      hourOfDay: ctx.hourOfDay,
    };

    const recommendations: SceneRecommendation[] = Object.entries(SCENE_PROFILES)
      .map(([sceneId, profile]) => {
        const condEffect = profile.conditions(condCtx);
        const histEffect = histEff.get(sceneId) ?? profile.baseEffect;
        const predicted  = Math.min(1, profile.baseEffect + condEffect + histEffect * 0.5);
        return {
          sceneId,
          sceneName:        profile.name,
          predictedEffect:  Math.round(predicted * 1000) / 1000,
          historicalEffect: Math.round(histEffect * 1000) / 1000,
          craftAlignment:   profile.crafts,
          confidence:       ctx.confidence * (histEff.has(sceneId) ? 0.9 : 0.6),
          reason:           condEffect > 0.1
            ? `Conditions strongly match ${profile.name} profile`
            : `Standard rotation option`,
        };
      })
      .sort((a, b) => b.predictedEffect - a.predictedEffect);

    const best      = recommendations[0];
    const current   = ctx.activeSceneId;
    const isAlready = best?.sceneId === current;

    const urgency: EnvironmentalRecommendation["urgency"] =
      isAlready           ? "routine" :
      best && best.predictedEffect > 0.2 ? "urgent" :
      best && best.predictedEffect > 0.1 ? "recommended" : "suggested";

    const rationale = isAlready
      ? "Current scene is already optimal"
      : `${best?.sceneName ?? "Standard"} expected to lift engagement by ${Math.round((best?.predictedEffect ?? 0) * 100)}%`;

    return {
      venueId, ts: Date.now(),
      currentScene: current,
      recommendations,
      urgency,
      rationale,
      confidence: ctx.confidence,
    };
  } catch (err) {
    logger.warn({ err, venueId }, "environmentalPrediction: failed");
    return {
      venueId, ts: Date.now(), currentScene: null,
      recommendations: [], urgency: "routine",
      rationale: "Insufficient data", confidence: 0.1,
    };
  }
}
