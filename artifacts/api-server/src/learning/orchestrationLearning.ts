/**
 * orchestrationLearning — learns from orchestration rule outcomes to
 * refine trigger thresholds and action priorities over time.
 */

import { logger } from "../lib/logger";
import { pool }   from "@workspace/db";
import { applyReward } from "./reinforcementLearning";

export interface OrchestrationOutcome {
  venueId:    string;
  ruleId:     string;
  ruleName:   string;
  trigger:    string;
  actions:    string[];
  outcome:    "success" | "partial" | "failure" | "vetoed";
  deltaScore: number;  // change in awareness/engagement score
  durationMs: number;
}

interface RulePerformance {
  ruleId:         string;
  ruleName:       string;
  totalFired:     number;
  successCount:   number;
  avgDeltaScore:  number;
  avgDurationMs:  number;
  lastOutcome:    string;
  adjustedPriority: number;
}

const rulePerformance = new Map<string, RulePerformance>();

function getOrInitPerf(ruleId: string, ruleName: string): RulePerformance {
  if (!rulePerformance.has(ruleId)) {
    rulePerformance.set(ruleId, {
      ruleId, ruleName, totalFired: 0, successCount: 0,
      avgDeltaScore: 0, avgDurationMs: 0, lastOutcome: "unknown",
      adjustedPriority: 5,
    });
  }
  return rulePerformance.get(ruleId)!;
}

export async function recordOrchestrationOutcome(outcome: OrchestrationOutcome): Promise<void> {
  const perf = getOrInitPerf(outcome.ruleId, outcome.ruleName);

  // Rolling average update
  const n                 = perf.totalFired;
  perf.totalFired++;
  if (outcome.outcome === "success") perf.successCount++;
  perf.avgDeltaScore  = (perf.avgDeltaScore * n + outcome.deltaScore) / perf.totalFired;
  perf.avgDurationMs  = (perf.avgDurationMs  * n + outcome.durationMs) / perf.totalFired;
  perf.lastOutcome    = outcome.outcome;

  // Adjust priority based on consistent success/failure
  const successRate = perf.successCount / perf.totalFired;
  if (perf.totalFired >= 5) {
    perf.adjustedPriority = Math.max(1, Math.min(10, Math.round(successRate * 10)));
  }

  // Apply to RL engine
  applyReward({
    domain:     "orchestration",
    venueId:    outcome.venueId,
    decisionId: outcome.ruleId,
    outcome:    outcome.outcome === "success" ? "positive"
              : outcome.outcome === "failure" ? "negative" : "neutral",
    magnitude:  Math.min(1, Math.abs(outcome.deltaScore)),
    context:    { ruleName: outcome.ruleName, trigger: outcome.trigger },
  });

  // Update rule priority in DB based on learning
  if (perf.totalFired % 10 === 0) {
    await pool.query(
      `UPDATE orchestration_rules SET priority = $1 WHERE id::text = $2`,
      [perf.adjustedPriority, outcome.ruleId],
    ).catch(() => {});
  }

  logger.debug({ ruleId: outcome.ruleId, successRate, adjustedPriority: perf.adjustedPriority },
    "orchestrationLearning: outcome recorded");
}

export function getRulePerformance(ruleId?: string): RulePerformance | RulePerformance[] {
  if (ruleId) return rulePerformance.get(ruleId) ?? null as unknown as RulePerformance;
  return [...rulePerformance.values()].sort((a, b) => b.totalFired - a.totalFired);
}

export async function bootstrapFromHistory(venueId: string): Promise<void> {
  const { rows } = await pool.query(
    `SELECT rule_id, action_type, outcome, COUNT(*) AS n, AVG(execution_time_ms) AS avg_ms
     FROM orchestration_audit_logs
     WHERE venue_id = $1 AND rule_id IS NOT NULL
     GROUP BY rule_id, action_type, outcome`,
    [venueId],
  );

  for (const row of rows) {
    if (!row.rule_id) continue;
    const perf = getOrInitPerf(row.rule_id as string, row.action_type as string);
    perf.totalFired    += Number(row.n);
    if (row.outcome === "success") perf.successCount += Number(row.n);
    perf.avgDurationMs  = Number(row.avg_ms ?? 0);
  }

  logger.info({ venueId, rulesLoaded: rulePerformance.size }, "orchestrationLearning: bootstrap complete");
}
