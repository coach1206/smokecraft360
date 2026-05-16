/**
 * metricsCollector — in-process metrics aggregation (OTel-inspired).
 *
 * Instruments:
 *   - Counter:   monotonic incrementing values (requests, errors, events)
 *   - Gauge:     point-in-time values (queue depth, active connections)
 *   - Histogram: latency distributions (p50/p95/p99)
 *
 * All metrics are labeled by {domain, name, labels[]}.
 * Metrics flush to DB every 60s and are available via /api/platform/metrics.
 * Zero external dependency — no Prometheus, no StatsD required.
 */

export type MetricType = "counter" | "gauge" | "histogram";

interface CounterState  { value: number }
interface GaugeState    { value: number }
interface HistogramState { samples: number[]; max: number }

type MetricState = CounterState | GaugeState | HistogramState;

interface MetricEntry {
  type:   MetricType;
  domain: string;
  name:   string;
  labels: Record<string, string>;
  state:  MetricState;
}

const registry = new Map<string, MetricEntry>();

function metricKey(domain: string, name: string, labels: Record<string, string>): string {
  const labelStr = Object.entries(labels).sort().map(([k,v]) => `${k}=${v}`).join(",");
  return `${domain}.${name}{${labelStr}}`;
}

// ─── Counter ──────────────────────────────────────────────────────────────────

export function increment(
  domain:  string,
  name:    string,
  by     = 1,
  labels : Record<string, string> = {},
): void {
  const key   = metricKey(domain, name, labels);
  const entry = registry.get(key);
  if (entry && entry.type === "counter") {
    (entry.state as CounterState).value += by;
  } else {
    registry.set(key, { type:"counter", domain, name, labels, state:{ value: by } });
  }
}

export function getCounter(domain: string, name: string, labels: Record<string, string> = {}): number {
  const entry = registry.get(metricKey(domain, name, labels));
  return entry?.type === "counter" ? (entry.state as CounterState).value : 0;
}

// ─── Gauge ────────────────────────────────────────────────────────────────────

export function setGauge(
  domain: string,
  name:   string,
  value:  number,
  labels: Record<string, string> = {},
): void {
  const key = metricKey(domain, name, labels);
  registry.set(key, { type:"gauge", domain, name, labels, state:{ value } });
}

export function adjustGauge(
  domain: string,
  name:   string,
  by:     number,
  labels: Record<string, string> = {},
): void {
  const key   = metricKey(domain, name, labels);
  const entry = registry.get(key);
  const cur   = entry?.type === "gauge" ? (entry.state as GaugeState).value : 0;
  registry.set(key, { type:"gauge", domain, name, labels, state:{ value: cur + by } });
}

export function getGauge(domain: string, name: string, labels: Record<string, string> = {}): number {
  const entry = registry.get(metricKey(domain, name, labels));
  return entry?.type === "gauge" ? (entry.state as GaugeState).value : 0;
}

// ─── Histogram ────────────────────────────────────────────────────────────────

const MAX_SAMPLES = 1_000;

export function observe(
  domain: string,
  name:   string,
  value:  number,
  labels: Record<string, string> = {},
): void {
  const key   = metricKey(domain, name, labels);
  const entry = registry.get(key);
  if (entry?.type === "histogram") {
    const h = entry.state as HistogramState;
    if (h.samples.length >= MAX_SAMPLES) h.samples.splice(0, MAX_SAMPLES / 10);
    h.samples.push(value);
    h.max = Math.max(h.max, value);
  } else {
    registry.set(key, { type:"histogram", domain, name, labels, state:{ samples:[value], max:value } });
  }
}

export function getHistogram(
  domain: string,
  name:   string,
  labels: Record<string, string> = {},
): { p50: number; p95: number; p99: number; avg: number; max: number; count: number } {
  const entry = registry.get(metricKey(domain, name, labels));
  if (!entry || entry.type !== "histogram") return { p50:0, p95:0, p99:0, avg:0, max:0, count:0 };
  const h   = entry.state as HistogramState;
  const sorted = [...h.samples].sort((a,b) => a - b);
  function pct(p: number): number { return sorted[Math.ceil(p * sorted.length) - 1] ?? 0; }
  return {
    p50: pct(0.5), p95: pct(0.95), p99: pct(0.99),
    avg: sorted.reduce((s,v) => s+v, 0) / sorted.length,
    max: h.max, count: sorted.length,
  };
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

export interface MetricSnapshot {
  key:    string;
  type:   MetricType;
  domain: string;
  name:   string;
  labels: Record<string, string>;
  value:  number | { p50:number; p95:number; p99:number; avg:number; max:number; count:number };
  ts:     number;
}

export function snapshot(domain?: string): MetricSnapshot[] {
  const now = Date.now();
  const out: MetricSnapshot[] = [];

  for (const [key, entry] of registry.entries()) {
    if (domain && entry.domain !== domain) continue;
    let value: MetricSnapshot["value"];
    if (entry.type === "counter") value = (entry.state as CounterState).value;
    else if (entry.type === "gauge") value = (entry.state as GaugeState).value;
    else value = getHistogram(entry.domain, entry.name, entry.labels);
    out.push({ key, type:entry.type, domain:entry.domain, name:entry.name, labels:entry.labels, value, ts:now });
  }
  return out;
}

// ─── Pre-wired platform metrics ───────────────────────────────────────────────

export const metrics = {
  // Requests
  httpRequest: (method: string, route: string, status: number, durationMs: number) => {
    increment("http", "requests_total", 1, { method, route, status: String(status) });
    observe("http", "request_duration_ms", durationMs, { method, route });
    if (status >= 500) increment("http", "errors_total", 1, { method, route });
  },
  // Orchestration
  queueDepth:     (depth: number)         => setGauge("orchestration", "queue_depth", depth),
  eventPublished: (channel: string)       => increment("realtime", "events_published", 1, { channel }),
  eventDelivered: (channel: string)       => increment("realtime", "events_delivered", 1, { channel }),
  workerCycle:    (worker: string, ms: number) => observe("workers", "cycle_duration_ms", ms, { worker }),
  // POS
  posCall: (provider: string, op: string, ms: number, ok: boolean) => {
    observe("pos", "call_duration_ms", ms, { provider, op });
    increment("pos", ok ? "calls_success" : "calls_error", 1, { provider, op });
  },
  // AI
  aiInference: (model: string, ms: number) => observe("ai", "inference_duration_ms", ms, { model }),
  // Websocket
  wsConnect:    (venueId: string) => adjustGauge("realtime", "ws_connections", 1, { venueId }),
  wsDisconnect: (venueId: string) => adjustGauge("realtime", "ws_connections", -1, { venueId }),
};
