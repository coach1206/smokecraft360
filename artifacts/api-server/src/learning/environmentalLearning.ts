/**
 * environmentalLearning — learns which environmental configurations
 * produce the best engagement and revenue outcomes per venue/time slot.
 */

import { logger } from "../lib/logger";
import { pool }   from "@workspace/db";

export interface EnvironmentalOutcome {
  venueId:     string;
  sceneId:     string;
  sceneName:   string;
  hour:        number;
  dayOfWeek:   number;
  engagementDelta: number;  // change vs baseline
  revenueDelta:    number;  // change vs baseline
  guestCount:  number;
  duration:    number;      // minutes scene was active
}

interface SceneModel {
  sceneName:      string;
  sampleCount:    number;
  avgEngagement:  number;
  avgRevenue:     number;
  bestHours:      number[];
  bestDays:       number[];
  confidence:     number;
}

const sceneModels = new Map<string, Map<string, SceneModel>>();

function venueModels(venueId: string): Map<string, SceneModel> {
  if (!sceneModels.has(venueId)) sceneModels.set(venueId, new Map());
  return sceneModels.get(venueId)!;
}

export function recordEnvironmentalOutcome(outcome: EnvironmentalOutcome): void {
  const models = venueModels(outcome.venueId);
  const existing = models.get(outcome.sceneName);

  if (!existing) {
    models.set(outcome.sceneName, {
      sceneName:     outcome.sceneName,
      sampleCount:   1,
      avgEngagement: outcome.engagementDelta,
      avgRevenue:    outcome.revenueDelta,
      bestHours:     [outcome.hour],
      bestDays:      [outcome.dayOfWeek],
      confidence:    0.1,
    });
    return;
  }

  const n = existing.sampleCount;
  existing.sampleCount++;
  existing.avgEngagement = (existing.avgEngagement * n + outcome.engagementDelta) / existing.sampleCount;
  existing.avgRevenue    = (existing.avgRevenue    * n + outcome.revenueDelta)    / existing.sampleCount;

  // Track best hours/days
  if (outcome.engagementDelta > 0 && !existing.bestHours.includes(outcome.hour)) {
    existing.bestHours.push(outcome.hour);
    if (existing.bestHours.length > 5) existing.bestHours.shift();
  }
  if (outcome.engagementDelta > 0 && !existing.bestDays.includes(outcome.dayOfWeek)) {
    existing.bestDays.push(outcome.dayOfWeek);
  }

  existing.confidence = Math.min(0.95, 0.1 + existing.sampleCount / 100);
}

export function recommendScene(
  venueId: string,
  hour:    number,
  day:     number,
): { scene: string; confidence: number; reason: string } | null {
  const models   = venueModels(venueId);
  if (models.size === 0) return null;

  let bestScene: SceneModel | null = null;
  let bestScore = -Infinity;

  for (const model of models.values()) {
    const hourBonus = model.bestHours.includes(hour) ? 0.2 : 0;
    const dayBonus  = model.bestDays.includes(day)   ? 0.1 : 0;
    const score     = model.avgEngagement * 0.6 + model.avgRevenue * 0.4 + hourBonus + dayBonus;
    if (score > bestScore) { bestScore = score; bestScene = model; }
  }

  if (!bestScene) return null;
  return {
    scene:      bestScene.sceneName,
    confidence: bestScene.confidence,
    reason:     `Avg engagement: ${bestScene.avgEngagement.toFixed(2)}, `
              + `best hours: ${bestScene.bestHours.join(",")}`,
  };
}

export async function persistModels(venueId: string): Promise<void> {
  const models = venueModels(venueId);
  for (const model of models.values()) {
    await pool.query(
      `INSERT INTO operational_snapshots (type, venue_id, data)
       VALUES ('env_scene_model', $1, $2::jsonb)
       ON CONFLICT DO NOTHING`,
      [venueId, JSON.stringify(model)],
    ).catch(() => {});
  }
  logger.info({ venueId, scenes: models.size }, "environmentalLearning: models persisted");
}
