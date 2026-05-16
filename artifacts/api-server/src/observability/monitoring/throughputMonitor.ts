/**
 * throughputMonitor — real-time event and request throughput measurement.
 *
 * Maintains per-stream sliding windows (1s, 10s, 60s) for:
 *   - Events published per second
 *   - HTTP requests per second
 *   - WebSocket messages per second
 *   - POS API calls per second
 *
 * Publishes throughput snapshots on demand and detects throughput anomalies.
 */

import { setGauge } from "../../platform/observability/metricsCollector";
import { checkAnomaly } from "./anomalyMonitor";

interface Bucket {
  ts:    number;
  count: number;
}

interface StreamState {
  buckets:    Bucket[];  // one per second
  totalCount: number;
}

const streams = new Map<string, StreamState>();
const WINDOW_60S = 60;

function ensureStream(name: string): StreamState {
  let s = streams.get(name);
  if (!s) { s = { buckets: [], totalCount: 0 }; streams.set(name, s); }
  return s;
}

export function recordEvent(stream: string, count = 1): void {
  const s   = ensureStream(stream);
  const now = Math.floor(Date.now() / 1000);

  const last = s.buckets[s.buckets.length - 1];
  if (last && last.ts === now) {
    last.count += count;
  } else {
    s.buckets.push({ ts: now, count });
    if (s.buckets.length > WINDOW_60S) s.buckets.shift();
  }
  s.totalCount += count;
}

export function getThroughput(stream: string): {
  per1s: number; per10s: number; per60s: number; total: number;
} {
  const s   = ensureStream(stream);
  const now = Math.floor(Date.now() / 1000);

  const sum = (windowS: number) => s.buckets
    .filter(b => b.ts >= now - windowS)
    .reduce((acc, b) => acc + b.count, 0);

  return {
    per1s:  sum(1),
    per10s: Math.round(sum(10) / 10),
    per60s: Math.round(sum(60) / 60),
    total:  s.totalCount,
  };
}

export function getAllThroughputs(): Record<string, ReturnType<typeof getThroughput>> {
  const result: Record<string, ReturnType<typeof getThroughput>> = {};
  for (const name of streams.keys()) {
    result[name] = getThroughput(name);
  }
  return result;
}

// Known streams to auto-publish as gauges
const WATCHED = ["events.published", "http.requests", "ws.messages", "pos.calls", "telemetry.swipe"];

async function publishThroughputGauges(): Promise<void> {
  for (const s of WATCHED) {
    const t = getThroughput(s);
    setGauge("throughput", `${s}.per10s`, t.per10s);
    setGauge("throughput", `${s}.per60s`, t.per60s);

    await checkAnomaly(`throughput.${s}`, s, t.per10s).catch(() => {});
  }
}

setInterval(() => { publishThroughputGauges().catch(() => {}); }, 10_000).unref();
