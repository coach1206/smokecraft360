/**
 * offlineInference — lightweight deterministic inference fallback
 * that runs locally when the cloud AI stack is unreachable.
 *
 * Uses pre-loaded heuristic rule tables rather than live model calls.
 */

import { logger } from "../lib/logger";

export interface InferenceRequest {
  venueId:   string;
  guestId?:  string;
  context:   {
    hour:       number;
    dayOfWeek:  number;
    moodScore:  number;
    atmosphere: number;
    craftType?: string;
  };
  task: "recommend" | "ambientScene" | "engagementScore" | "nextAction";
}

export interface InferenceResult {
  task:       string;
  output:     Record<string, unknown>;
  confidence: number;
  source:     "edge" | "cloud";
  latencyMs:  number;
}

// ── Heuristic rule tables ──────────────────────────────────────────────────────

function recommendByContext(ctx: InferenceRequest["context"]): Record<string, unknown> {
  const { hour, atmosphere, craftType } = ctx;
  const isEvening = hour >= 18;
  const isLate    = hour >= 22;

  if (craftType === "smoke") {
    return {
      category: isLate ? "premium-maduro" : isEvening ? "medium-full" : "mild",
      strength: isLate ? "full" : "medium",
      reason:   "time-of-day heuristic",
    };
  }
  if (craftType === "pour") {
    return {
      category:    isLate ? "aged-whiskey" : isEvening ? "cocktail" : "light-spirits",
      temperature: atmosphere > 0.7 ? "neat" : "on-rocks",
      reason:      "atmosphere heuristic",
    };
  }
  return { category: "house-specialty", reason: "default fallback" };
}

function inferAmbientScene(ctx: InferenceRequest["context"]): Record<string, unknown> {
  const { hour, moodScore, atmosphere } = ctx;
  if (hour >= 22)        return { scene: "INTIMATE",      moodBoost: 0.1 };
  if (atmosphere > 0.75) return { scene: "PREMIUM LOUNGE", moodBoost: 0.15 };
  if (moodScore < 0.4)   return { scene: "ENERGIZE",       moodBoost: 0.2 };
  if (hour < 17)         return { scene: "STANDARD",        moodBoost: 0.0 };
  return { scene: "SOCIAL LOUNGE", moodBoost: 0.05 };
}

function computeEngagementScore(ctx: InferenceRequest["context"]): Record<string, unknown> {
  const { hour, moodScore, atmosphere } = ctx;
  const timeWeight = hour >= 19 && hour <= 23 ? 1.0 : hour >= 17 ? 0.7 : 0.4;
  const score      = Math.min(1, (moodScore * 0.5 + atmosphere * 0.3 + timeWeight * 0.2));
  return { score: Math.round(score * 100) / 100, components: { moodScore, atmosphere, timeWeight } };
}

function nextAction(ctx: InferenceRequest["context"]): Record<string, unknown> {
  const { moodScore, atmosphere } = ctx;
  if (moodScore < 0.3)   return { action: "staff_checkin",    urgency: "high" };
  if (atmosphere < 0.4)  return { action: "ambient_adjust",   urgency: "medium" };
  if (atmosphere > 0.85) return { action: "monitor_capacity", urgency: "low" };
  return { action: "maintain", urgency: "none" };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function runOfflineInference(req: InferenceRequest): InferenceResult {
  const start = Date.now();
  let output: Record<string, unknown>;

  switch (req.task) {
    case "recommend":       output = recommendByContext(req.context); break;
    case "ambientScene":    output = inferAmbientScene(req.context);  break;
    case "engagementScore": output = computeEngagementScore(req.context); break;
    case "nextAction":      output = nextAction(req.context);          break;
    default:                output = { error: "unknown task" };
  }

  const result: InferenceResult = {
    task:       req.task,
    output,
    confidence: 0.55, // fixed lower-confidence for heuristic results
    source:     "edge",
    latencyMs:  Date.now() - start,
  };

  logger.debug({ venueId: req.venueId, task: req.task, latencyMs: result.latencyMs }, "offlineInference: result");
  return result;
}

let ready = false;

export function initOfflineInference(): void {
  // Warm-up — nothing to preload for heuristic engine but hook here
  // for future embedding model preloading.
  ready = true;
  logger.info("offlineInference: heuristic engine ready");
}

export function isInferenceReady(): boolean {
  return ready;
}
