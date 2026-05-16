/**
 * reinforcementLearning — reward/penalty loop for all autonomous decisions.
 *
 * Every outcome (guest action, conversion, complaint, upsell) feeds a reward
 * signal back to the weight vectors for the relevant domain.
 */

import { logger } from "../lib/logger";
import { pool }   from "@workspace/db";

export type RLDomain = "recommendation" | "orchestration" | "ambient" | "staffing";

export interface RewardSignal {
  domain:     RLDomain;
  venueId:    string;
  decisionId: string;
  outcome:    "positive" | "neutral" | "negative";
  magnitude:  number; // 0–1
  context?:   Record<string, unknown>;
}

export interface WeightVector {
  domain:  RLDomain;
  weights: Record<string, number>;
  version: number;
  updatedAt: number;
}

// In-memory weight store — persisted to DB periodically
const weightStore = new Map<string, WeightVector>();

const LEARNING_RATE  = 0.05;
const DISCOUNT_GAMMA = 0.95;

function storeKey(domain: RLDomain, venueId: string): string {
  return `${domain}:${venueId}`;
}

export function getWeights(domain: RLDomain, venueId: string): WeightVector {
  const key = storeKey(domain, venueId);
  if (!weightStore.has(key)) {
    weightStore.set(key, {
      domain, weights: defaultWeights(domain), version: 0, updatedAt: Date.now(),
    });
  }
  return weightStore.get(key)!;
}

function defaultWeights(domain: RLDomain): Record<string, number> {
  switch (domain) {
    case "recommendation": return { taste: 0.4, margin: 0.25, stock: 0.15, reliability: 0.1, premium: 0.1 };
    case "orchestration":  return { confidence: 0.5, urgency: 0.3, impact: 0.2 };
    case "ambient":        return { moodFit: 0.4, timeMatch: 0.35, socialFit: 0.25 };
    case "staffing":       return { readiness: 0.5, coverage: 0.3, expertise: 0.2 };
  }
}

export function applyReward(signal: RewardSignal): WeightVector {
  const wv      = getWeights(signal.domain, signal.venueId);
  const reward  = signal.outcome === "positive" ? signal.magnitude
                : signal.outcome === "negative" ? -signal.magnitude : 0;
  const delta   = LEARNING_RATE * reward * DISCOUNT_GAMMA;

  // Distribute delta across all weights proportionally
  const keys    = Object.keys(wv.weights);
  for (const k of keys) {
    wv.weights[k] = Math.max(0.01, Math.min(0.99, wv.weights[k] + delta / keys.length));
  }

  // Re-normalise to sum = 1
  const sum = Object.values(wv.weights).reduce((a, b) => a + b, 0);
  for (const k of keys) wv.weights[k] = Math.round((wv.weights[k] / sum) * 1000) / 1000;

  wv.version++;
  wv.updatedAt = Date.now();

  logger.debug({
    domain: signal.domain, venueId: signal.venueId,
    outcome: signal.outcome, magnitude: signal.magnitude,
    newWeights: wv.weights,
  }, "RL weight update");

  return wv;
}

export async function persistWeights(): Promise<void> {
  for (const [, wv] of weightStore) {
    try {
      await pool.query(
        `INSERT INTO orchestration_rules (venue_id, rule_name, rule_type, conditions, actions, priority, enabled, created_by)
         VALUES (NULL, $1, 'rl_weights', $2::jsonb, '{}'::jsonb, 0, true, 'system')
         ON CONFLICT (rule_name) DO UPDATE SET conditions = EXCLUDED.conditions`,
        [`rl:${wv.domain}`, JSON.stringify(wv)],
      ).catch(() => {}); // table may not have rule_name unique — best effort
    } catch { /* non-fatal */ }
  }
}

export async function recordRewardSignal(signal: RewardSignal): Promise<WeightVector> {
  const wv = applyReward(signal);

  await pool.query(
    `INSERT INTO orchestration_audit_logs
       (venue_id, rule_id, action_type, trigger_event, outcome, confidence, execution_time_ms, created_by, metadata)
     VALUES ($1, NULL, 'rl_reward', $2, $3, $4, 0, 'system', $5::jsonb)`,
    [
      signal.venueId,
      `rl:${signal.domain}:${signal.decisionId}`,
      signal.outcome,
      wv.version / 100,
      JSON.stringify({ signal, weights: wv.weights }),
    ],
  ).catch(err => logger.warn({ err }, "RL: audit log insert failed (non-fatal)"));

  return wv;
}
