/**
 * orchestrationTrace — spans specific to orchestration cycle timing.
 *
 * Pre-named span factories for consistent trace naming across the
 * intelligence pipeline. All spans use the base tracer under the hood.
 */

import { startSpan, endSpan, addEvent, recordError, withSpan, type Span } from "../../platform/observability/tracer";
import { observe } from "../../platform/observability/metricsCollector";

export interface OrchestrationSpanOpts {
  venueId:  string;
  traceId?: string;
  parentId?:string;
}

export function startOrchestrationSpan(name: string, opts: OrchestrationSpanOpts): Span {
  return startSpan(`orchestration.${name}`, {
    traceId:    opts.traceId,
    parentId:   opts.parentId,
    attributes: { "venue.id": opts.venueId, "orchestration.layer": "eeis" },
    service:    "orchestration",
  });
}

export async function traceVenueCycle<T>(
  venueId: string,
  fn:      (span: Span) => Promise<T>,
  traceId?: string,
): Promise<T> {
  return withSpan("orchestration.venue_cycle", async (span) => {
    span.attributes["venue.id"] = venueId;
    const result = await fn(span);
    if (span.endMs !== null) {
      observe("orchestration", "venue_cycle_ms", span.endMs - span.startMs, { venueId });
    }
    return result;
  }, { traceId });
}

export async function traceAwarenessCycle<T>(
  venueId: string,
  fn:      (span: Span) => Promise<T>,
  parentId?: string,
): Promise<T> {
  return withSpan("orchestration.awareness", async span => {
    span.attributes["venue.id"] = venueId;
    return fn(span);
  }, { parentId });
}

export async function traceRuleEvaluation<T>(
  venueId: string,
  ruleKey: string,
  fn:      () => Promise<T>,
  parentId?: string,
): Promise<T> {
  return withSpan("orchestration.rule_eval", async span => {
    span.attributes["venue.id"]   = venueId;
    span.attributes["rule.key"]   = ruleKey;
    addEvent(span, "rule_eval_start", { ruleKey });
    const result = await fn();
    addEvent(span, "rule_eval_end", { ruleKey });
    return result;
  }, { parentId });
}

export async function traceActionExecution<T>(
  venueId:    string,
  actionType: string,
  fn:         () => Promise<T>,
  parentId?:  string,
): Promise<T> {
  return withSpan("orchestration.action_exec", async span => {
    span.attributes["venue.id"]      = venueId;
    span.attributes["action.type"]   = actionType;
    return fn();
  }, { parentId });
}
