/**
 * replayTrace — spans for replay and forensic reconstruction timing.
 *
 * Tracks performance of replay operations so forensic queries can be
 * optimized and bottlenecks (large event streams, slow DB) identified.
 */

import { startSpan, endSpan, addEvent, recordError, withSpan, type Span } from "../../platform/observability/tracer";
import { observe, increment } from "../../platform/observability/metricsCollector";

export interface ReplayTraceContext {
  replayId:   string;
  replayType: string;
  entityId:   string;
  traceId?:   string;
}

export async function traceReplayJob<T>(
  ctx: ReplayTraceContext,
  fn:  (span: Span) => Promise<T>,
): Promise<T> {
  return withSpan(`replay.${ctx.replayType}`, async span => {
    span.attributes["replay.id"]   = ctx.replayId;
    span.attributes["replay.type"] = ctx.replayType;
    span.attributes["entity.id"]   = ctx.entityId;
    addEvent(span, "replay_started");
    const result = await fn(span);
    addEvent(span, "replay_completed");

    if (span.endMs !== null) {
      observe("replay", "duration_ms", span.endMs - span.startMs, { type: ctx.replayType });
    }
    return result;
  }, { traceId: ctx.traceId });
}

export function traceEventLoad(replayId: string, eventCount: number, durationMs: number): void {
  observe("replay", "event_load_ms", durationMs, { replayId });
  observe("replay", "event_count",   eventCount,  { replayId });
  if (eventCount > 10_000) {
    increment("replay", "large_replays", 1);
  }
}

export function traceEventApply(replayId: string, index: number, durationMs: number): void {
  if (durationMs > 100) {
    observe("replay", "slow_event_apply_ms", durationMs, { replayId });
  }
}

export function traceReplayAnomaly(replayId: string, anomalyType: string): void {
  increment("replay", "anomalies_detected", 1, { anomalyType });
}
