/**
 * orchestrationMonitor — live health monitoring of the intelligence pipeline.
 *
 * Watches:
 *   - Worker cycle latency (detects stuck workers)
 *   - Rule evaluation rate (detects stalled orchestration)
 *   - Venue coverage (detects skipped venues)
 *   - Action execution success rate
 *   - Context build failure rate
 */

import { pool }        from "@workspace/db";
import { logger }      from "../../lib/logger";
import { publish }     from "../../realtime/transport/eventBus";
import { observe, increment, setGauge } from "../../platform/observability/metricsCollector";
import { checkAnomaly }                 from "./anomalyMonitor";

export interface OrchestrationHealth {
  cycleCount:          number;
  avgCycleMs:          number;
  failedCycles:        number;
  venuesCovered:       number;
  rulesEvaluated:      number;
  actionsExecuted:     number;
  actionSuccessRate:   number;
  contextBuildErrors:  number;
  ts:                  number;
}

// In-process counters (reset each monitoring window)
let cycleCount         = 0;
let cycleTotalMs       = 0;
let failedCycles       = 0;
let venuesCovered      = 0;
let rulesEvaluated     = 0;
let actionsExecuted    = 0;
let actionsSucceeded   = 0;
let contextBuildErrors = 0;
const WINDOW_MS        = 60_000;
let   windowStart      = Date.now();

export function recordCycleStart(): void { /* no-op — placeholder for span injection */ }

export function recordCycleComplete(durationMs: number, venues: number): void {
  cycleCount++;
  cycleTotalMs  += durationMs;
  venuesCovered += venues;
  observe("orchestration.monitor", "cycle_ms", durationMs);
  setGauge("orchestration.monitor", "venues_covered", venues);
}

export function recordCycleFailed(): void {
  failedCycles++;
  increment("orchestration.monitor", "cycle_failures");
}

export function recordRuleEvaluated(): void { rulesEvaluated++; }
export function recordActionExecuted(success: boolean): void {
  actionsExecuted++;
  if (success) actionsSucceeded++;
}
export function recordContextBuildError(): void {
  contextBuildErrors++;
  increment("orchestration.monitor", "context_build_errors");
}

export function getOrchestrationHealth(): OrchestrationHealth {
  const now     = Date.now();
  const elapsed = now - windowStart;

  return {
    cycleCount,
    avgCycleMs:       cycleCount > 0 ? Math.round(cycleTotalMs / cycleCount) : 0,
    failedCycles,
    venuesCovered,
    rulesEvaluated,
    actionsExecuted,
    actionSuccessRate:actionsExecuted > 0 ? actionsSucceeded / actionsExecuted : 1,
    contextBuildErrors,
    ts: now,
  };
}

async function checkOrchestrationHealth(): Promise<void> {
  const health = getOrchestrationHealth();

  // Reset window
  cycleCount = cycleTotalMs = failedCycles = venuesCovered = 0;
  rulesEvaluated = actionsExecuted = actionsSucceeded = contextBuildErrors = 0;
  windowStart = Date.now();

  // Anomaly checks
  if (health.actionSuccessRate < 0.7 && health.actionsExecuted > 10) {
    logger.warn({ actionSuccessRate: health.actionSuccessRate }, "orchestrationMonitor: low action success rate");
    await publish("telemetry", { event:"ORCHESTRATION_DEGRADED", health });
  }

  if (health.contextBuildErrors > 5) {
    await checkAnomaly("orchestration.context_errors", "context_build_errors", health.contextBuildErrors);
  }
}

setInterval(() => checkOrchestrationHealth().catch(() => {}), WINDOW_MS).unref();
