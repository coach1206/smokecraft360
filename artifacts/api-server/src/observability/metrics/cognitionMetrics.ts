/**
 * cognitionMetrics — intelligence and AI pipeline performance metrics.
 *
 * Instruments:
 *   - Awareness score distribution per venue (histogram)
 *   - Recommendation latency (p50/p95/p99)
 *   - Orchestration rule fire rate
 *   - AI memory operation latency
 *   - Digital twin sync lag
 *   - Context build duration
 */

import { observe, increment, setGauge } from "../../platform/observability/metricsCollector";

// ─── Awareness ────────────────────────────────────────────────────────────────

export function recordAwarenessScore(venueId: string, score: number, risk: string): void {
  observe("cognition.awareness", "score", score, { venueId });
  increment("cognition.awareness", `risk_${risk}`, 1, { venueId });
  setGauge("cognition.awareness", "current_score", score, { venueId });
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export function recordRecommendationLatency(ms: number, craftType: string, count: number): void {
  observe("cognition.recommendations", "latency_ms", ms, { craft: craftType });
  observe("cognition.recommendations", "result_count", count, { craft: craftType });
  increment("cognition.recommendations", "requests", 1, { craft: craftType });
}

export function recordRecommendationAccepted(craftType: string): void {
  increment("cognition.recommendations", "accepted", 1, { craft: craftType });
}

// ─── Orchestration ────────────────────────────────────────────────────────────

export function recordRuleFired(ruleId: string, venueId: string, outcome: string): void {
  increment("cognition.rules", "fired", 1, { rule: ruleId });
  increment("cognition.rules", `outcome_${outcome}`, 1, { rule: ruleId });
}

export function recordOrchestrationCycle(venueId: string, durationMs: number, rulesFired: number): void {
  observe("cognition.orchestration", "cycle_ms", durationMs, { venueId });
  observe("cognition.orchestration", "rules_fired", rulesFired, { venueId });
}

// ─── AI Memory ────────────────────────────────────────────────────────────────

export function recordMemoryOperation(op: "read" | "write" | "evict", durationMs: number): void {
  observe("cognition.memory", "op_ms", durationMs, { op });
  increment("cognition.memory", `ops_${op}`, 1);
}

// ─── Digital Twin ─────────────────────────────────────────────────────────────

export function recordTwinSync(venueId: string, durationMs: number, lagMs: number): void {
  observe("cognition.twin", "sync_ms",  durationMs, { venueId });
  observe("cognition.twin", "sync_lag", lagMs,       { venueId });
}

// ─── Context ──────────────────────────────────────────────────────────────────

export function recordContextBuild(venueId: string, durationMs: number, signals: number): void {
  observe("cognition.context", "build_ms", durationMs, { venueId });
  observe("cognition.context", "signals",  signals,    { venueId });
}
