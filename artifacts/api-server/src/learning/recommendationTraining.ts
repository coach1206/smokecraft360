/**
 * recommendationTraining — optimises recommendation weights based on
 * conversion outcomes, guest feedback, and revenue signals.
 */

import { logger } from "../lib/logger";
import { pool }   from "@workspace/db";
import { applyReward } from "./reinforcementLearning";

export interface RecommendationOutcome {
  venueId:    string;
  productId:  string;
  guestId?:   string;
  action:     "ordered" | "skipped" | "returned" | "rated_high" | "rated_low";
  revenue?:   number;
  confidence: number;
}

interface RecommendationWeights {
  taste:       number;
  margin:      number;
  stock:       number;
  reliability: number;
  premium:     number;
  recency:     number;
}

const DEFAULT_WEIGHTS: RecommendationWeights = {
  taste: 0.40, margin: 0.25, stock: 0.15, reliability: 0.10, premium: 0.07, recency: 0.03,
};

const weightCache = new Map<string, RecommendationWeights>();

export function getRecommendationWeights(venueId: string): RecommendationWeights {
  return weightCache.get(venueId) ?? { ...DEFAULT_WEIGHTS };
}

export async function processOutcome(outcome: RecommendationOutcome): Promise<void> {
  const isPositive = outcome.action === "ordered" || outcome.action === "rated_high";
  const isNegative = outcome.action === "returned" || outcome.action === "rated_low";

  const magnitude = isPositive ? Math.min(1, (outcome.revenue ?? 10) / 50)
                  : isNegative ? 0.4 : 0.0;

  if (isPositive || isNegative) {
    applyReward({
      domain:     "recommendation",
      venueId:    outcome.venueId,
      decisionId: outcome.productId,
      outcome:    isPositive ? "positive" : "negative",
      magnitude,
    });
  }

  // Persist outcome for batch analysis
  await pool.query(
    `INSERT INTO orchestration_audit_logs
       (venue_id, rule_id, action_type, trigger_event, outcome, confidence, execution_time_ms, created_by, metadata)
     VALUES ($1, NULL, 'recommendation_outcome', $2, $3, $4, 0, 'system', $5::jsonb)`,
    [
      outcome.venueId,
      `product:${outcome.productId}`,
      isPositive ? "success" : isNegative ? "failure" : "neutral",
      outcome.confidence,
      JSON.stringify(outcome),
    ],
  ).catch(err => logger.warn({ err }, "recommendationTraining: audit persist failed"));
}

export async function batchTrain(venueId: string, windowDays = 7): Promise<RecommendationWeights> {
  const { rows } = await pool.query(
    `SELECT action_type, outcome, COUNT(*) AS n, AVG(confidence) AS avg_conf
     FROM orchestration_audit_logs
     WHERE venue_id = $1 AND action_type = 'recommendation_outcome'
       AND created_at > NOW() - INTERVAL '${windowDays} days'
     GROUP BY action_type, outcome`,
    [venueId],
  );

  const successRate = (() => {
    const success = rows.find(r => r.outcome === "success");
    const total   = rows.reduce((s, r) => s + Number(r.n), 0);
    return total ? Number(success?.n ?? 0) / total : 0.5;
  })();

  const currentWeights = getRecommendationWeights(venueId);
  const adjustment     = (successRate - 0.5) * 0.1;

  const updated: RecommendationWeights = {
    ...currentWeights,
    taste:   Math.max(0.05, Math.min(0.7, currentWeights.taste + adjustment)),
    recency: Math.max(0.01, Math.min(0.3, currentWeights.recency + adjustment * 0.5)),
  };

  // Re-normalise
  const sum = Object.values(updated).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(updated) as Array<keyof RecommendationWeights>) {
    updated[k] = Math.round((updated[k] / sum) * 1000) / 1000;
  }

  weightCache.set(venueId, updated);
  logger.info({ venueId, successRate, updated }, "recommendationTraining: batch complete");
  return updated;
}
