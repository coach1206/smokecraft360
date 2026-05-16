/**
 * tracer — lightweight OpenTelemetry-style distributed tracing.
 *
 * NOT a full OTel SDK (no external collector dependency).
 * Provides span/trace semantics with:
 *   - Trace context propagation via W3C traceparent headers
 *   - Span hierarchy (parent → child)
 *   - Timing, attributes, events, status
 *   - In-process span buffer → async flush to DB
 *   - Zero-overhead sampling (configurable rate)
 *
 * Integration points:
 *   - Express middleware auto-creates root spans
 *   - Services call tracer.startSpan() for child spans
 *   - Intelligence workers wrap long cycles in spans
 */

import { randomBytes }  from "node:crypto";
import { pool }         from "@workspace/db";
import { logger }       from "../../lib/logger";
import { getFlagValue } from "../featureFlags/featureFlagEngine";

export type SpanStatus = "ok" | "error" | "unset";

export interface SpanAttributes {
  [key: string]: string | number | boolean | undefined;
}

export interface Span {
  traceId:   string;
  spanId:    string;
  parentId:  string | null;
  name:      string;
  service:   string;
  startMs:   number;
  endMs:     number | null;
  status:    SpanStatus;
  attributes:SpanAttributes;
  events:    SpanEvent[];
}

interface SpanEvent {
  name:       string;
  ts:         number;
  attributes: SpanAttributes;
}

const FLUSH_INTERVAL_MS = 5_000;
const BUFFER_MAX        = 1_000;
const SERVICE_NAME      = "eeis-api";

const spanBuffer: Span[] = [];

// ─── ID generation ────────────────────────────────────────────────────────────

function genTraceId(): string {
  return randomBytes(16).toString("hex");
}
function genSpanId(): string {
  return randomBytes(8).toString("hex");
}

// ─── Span API ─────────────────────────────────────────────────────────────────

export function startSpan(
  name:       string,
  opts: {
    traceId?:    string;
    parentId?:   string;
    attributes?: SpanAttributes;
    service?:    string;
  } = {},
): Span {
  return {
    traceId:    opts.traceId ?? genTraceId(),
    spanId:     genSpanId(),
    parentId:   opts.parentId ?? null,
    name,
    service:    opts.service ?? SERVICE_NAME,
    startMs:    Date.now(),
    endMs:      null,
    status:     "unset",
    attributes: opts.attributes ?? {},
    events:     [],
  };
}

export function endSpan(span: Span, status: SpanStatus = "ok"): void {
  span.endMs  = Date.now();
  span.status = status;

  const samplingRate = getFlagValue("telemetry.sampling_rate") as number ?? 1.0;
  if (Math.random() > samplingRate) return;

  spanBuffer.push(span);
  if (spanBuffer.length >= BUFFER_MAX) {
    flushSpans().catch(() => {});
  }
}

export function addEvent(span: Span, name: string, attributes: SpanAttributes = {}): void {
  span.events.push({ name, ts: Date.now(), attributes });
}

export function setAttributes(span: Span, attrs: SpanAttributes): void {
  Object.assign(span.attributes, attrs);
}

export function recordError(span: Span, err: unknown): void {
  span.status = "error";
  const message = err instanceof Error ? err.message : String(err);
  setAttributes(span, { "error.message": message });
  addEvent(span, "error", { message });
}

/** Run a function inside a span, auto-ending it */
export async function withSpan<T>(
  name:    string,
  fn:      (span: Span) => Promise<T>,
  opts:    { traceId?: string; parentId?: string; attributes?: SpanAttributes } = {},
): Promise<T> {
  const span = startSpan(name, opts);
  try {
    const result = await fn(span);
    endSpan(span, "ok");
    return result;
  } catch (err) {
    recordError(span, err);
    endSpan(span, "error");
    throw err;
  }
}

// ─── Trace context propagation ────────────────────────────────────────────────

export function parseTraceparent(header: string | undefined): { traceId: string; spanId: string } | null {
  if (!header) return null;
  const parts = header.split("-");
  if (parts.length < 3) return null;
  return { traceId: parts[1] ?? genTraceId(), spanId: parts[2] ?? genSpanId() };
}

export function buildTraceparent(span: Span): string {
  return `00-${span.traceId}-${span.spanId}-01`;
}

// ─── Flush ────────────────────────────────────────────────────────────────────

async function flushSpans(): Promise<void> {
  if (spanBuffer.length === 0) return;
  const batch = spanBuffer.splice(0, spanBuffer.length);

  try {
    await pool.query(
      `INSERT INTO trace_spans
         (trace_id, span_id, parent_id, name, service, start_ms, end_ms, duration_ms, status, attributes, events, created_at)
       SELECT
         d.trace_id, d.span_id, d.parent_id, d.name, d.service,
         d.start_ms, d.end_ms,
         COALESCE(d.end_ms - d.start_ms, 0) AS duration_ms,
         d.status, d.attributes::jsonb, d.events::jsonb, NOW()
       FROM jsonb_to_recordset($1::jsonb) AS d(
         trace_id text, span_id text, parent_id text, name text, service text,
         start_ms bigint, end_ms bigint, status text, attributes jsonb, events jsonb
       )`,
      [JSON.stringify(batch.map(s => ({
        trace_id:   s.traceId,
        span_id:    s.spanId,
        parent_id:  s.parentId,
        name:       s.name,
        service:    s.service,
        start_ms:   s.startMs,
        end_ms:     s.endMs,
        status:     s.status,
        attributes: JSON.stringify(s.attributes),
        events:     JSON.stringify(s.events),
      })))],
    );
  } catch (err) {
    logger.warn({ err, count: batch.length }, "tracer: span flush failed");
  }
}

export async function getTrace(traceId: string): Promise<Span[]> {
  const { rows } = await pool.query(
    `SELECT * FROM trace_spans WHERE trace_id=$1 ORDER BY start_ms ASC`,
    [traceId],
  ).catch(() => ({ rows: [] }));
  return (rows as Record<string, unknown>[]).map(r => ({
    traceId:    String(r["trace_id"]),
    spanId:     String(r["span_id"]),
    parentId:   r["parent_id"] ? String(r["parent_id"]) : null,
    name:       String(r["name"]),
    service:    String(r["service"]),
    startMs:    Number(r["start_ms"]),
    endMs:      r["end_ms"] ? Number(r["end_ms"]) : null,
    status:     r["status"] as SpanStatus,
    attributes: (r["attributes"] ?? {}) as SpanAttributes,
    events:     (r["events"] ?? []) as SpanEvent[],
  }));
}

// Background flush
setInterval(() => { flushSpans().catch(() => {}); }, FLUSH_INTERVAL_MS).unref();
