/**
 * websocketTrace — spans for WebSocket event propagation timing.
 *
 * Tracks end-to-end latency from event emission → room broadcast → client ack.
 * Helps identify slow Socket.IO rooms or high-latency venue connections.
 */

import { startSpan, endSpan, addEvent, withSpan, type Span } from "../../platform/observability/tracer";
import { observe, increment } from "../../platform/observability/metricsCollector";

export interface WsTraceContext {
  eventName: string;
  room:      string;
  venueId?:  string;
  traceId?:  string;
}

export function startWsEmitSpan(ctx: WsTraceContext): Span {
  return startSpan(`ws.emit.${ctx.eventName}`, {
    traceId:    ctx.traceId,
    attributes: {
      "ws.event":  ctx.eventName,
      "ws.room":   ctx.room,
      "venue.id":  ctx.venueId ?? "",
    },
    service: "websocket",
  });
}

export function endWsEmitSpan(span: Span, recipientCount: number): void {
  span.attributes["ws.recipients"] = recipientCount;
  addEvent(span, "broadcast_complete", { recipientCount });
  endSpan(span, "ok");

  if (span.endMs !== null) {
    const ms = span.endMs - span.startMs;
    observe("websocket", "emit_latency_ms", ms, { event: String(span.attributes["ws.event"] ?? "") });
    if (ms > 500) {
      increment("websocket", "slow_broadcasts", 1);
    }
  }
}

export async function traceWsEventPropagation<T>(
  ctx: WsTraceContext,
  fn:  (span: Span) => Promise<T>,
): Promise<T> {
  return withSpan(`ws.propagate.${ctx.eventName}`, async span => {
    span.attributes["ws.room"]   = ctx.room;
    span.attributes["venue.id"]  = ctx.venueId ?? "";
    return fn(span);
  }, { traceId: ctx.traceId });
}

export function recordWsLatency(eventName: string, room: string, ms: number): void {
  observe("websocket", "propagation_ms", ms, { event: eventName, room });
}
