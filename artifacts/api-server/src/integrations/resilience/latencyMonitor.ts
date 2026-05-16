/**
 * latencyMonitor — measures and tracks POS adapter call latency.
 *
 * Tracks:
 *   - Per-call latency (p50/p95/p99)
 *   - Rolling 5-min window averages
 *   - Latency trend (improving / degrading / stable)
 *   - Slow-call detection (>2s = degraded, >5s = critical)
 *
 * Feeds: providerFailover (trigger on sustained high latency)
 *        Context Engine (for operational awareness scoring)
 *        POS telemetry stream
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";

export type LatencyTier = "fast" | "normal" | "slow" | "critical";

export interface LatencySample {
  provider:      string;
  venueId:       string;
  operation:     string;
  durationMs:    number;
  success:       boolean;
  ts:            number;
}

export interface LatencyStats {
  provider:    string;
  venueId:     string;
  operation:   string;
  windowMs:    number;
  sampleCount: number;
  p50:         number;
  p95:         number;
  p99:         number;
  avg:         number;
  maxMs:       number;
  errorRate:   number;    // 0–1
  tier:        LatencyTier;
  trend:       "improving" | "degrading" | "stable";
}

const SLOW_THRESHOLD_MS     = 2_000;
const CRITICAL_THRESHOLD_MS = 5_000;
const WINDOW_MS             = 5 * 60 * 1_000;   // 5 min rolling
const MAX_SAMPLES           = 500;               // per provider+operation

// In-process ring buffer: provider:op → samples[]
const sampleBuffers = new Map<string, LatencySample[]>();

function bufKey(provider: string, venueId: string, operation: string): string {
  return `${provider}:${venueId}:${operation}`;
}

export async function recordLatency(sample: LatencySample): Promise<void> {
  const key = bufKey(sample.provider, sample.venueId, sample.operation);
  const buf  = sampleBuffers.get(key) ?? [];

  buf.push(sample);
  // Evict old samples beyond window
  const cutoff = Date.now() - WINDOW_MS;
  const pruned = buf.filter(s => s.ts >= cutoff);
  if (pruned.length > MAX_SAMPLES) pruned.splice(0, pruned.length - MAX_SAMPLES);
  sampleBuffers.set(key, pruned);

  // Async persist to DB (fire-and-forget)
  pool.query(
    `INSERT INTO pos_latency_samples
       (provider, venue_id, operation, duration_ms, success, sampled_at)
     VALUES ($1,$2,$3,$4,$5,NOW())`,
    [sample.provider, sample.venueId, sample.operation, sample.durationMs, sample.success],
  ).catch(() => {});

  // Alert on critical latency
  if (sample.durationMs >= CRITICAL_THRESHOLD_MS) {
    await publish("telemetry", {
      event: "POS_LATENCY_CRITICAL",
      provider: sample.provider, venueId: sample.venueId,
      operation: sample.operation, durationMs: sample.durationMs,
    });
    logger.warn({ ...sample }, "latencyMonitor: critical latency detected");
  }
}

export function computeStats(
  provider:  string,
  venueId:   string,
  operation: string,
): LatencyStats | null {
  const key  = bufKey(provider, venueId, operation);
  const buf  = sampleBuffers.get(key);
  if (!buf || buf.length === 0) return null;

  const cutoff = Date.now() - WINDOW_MS;
  const window = buf.filter(s => s.ts >= cutoff);
  if (window.length === 0) return null;

  const durations = window.map(s => s.durationMs).sort((a, b) => a - b);
  const errors    = window.filter(s => !s.success).length;
  const avg       = durations.reduce((s, d) => s + d, 0) / durations.length;

  function pct(p: number): number {
    const idx = Math.ceil(p * durations.length) - 1;
    return durations[Math.max(0, idx)] ?? 0;
  }

  const p50 = pct(0.50), p95 = pct(0.95), p99 = pct(0.99);
  const max  = durations[durations.length - 1] ?? 0;

  const tier: LatencyTier =
    p95 >= CRITICAL_THRESHOLD_MS ? "critical" :
    p95 >= SLOW_THRESHOLD_MS     ? "slow"     :
    p95 >= 500                   ? "normal"   : "fast";

  // Trend: compare first vs second half
  const mid    = Math.floor(window.length / 2);
  const first  = window.slice(0, mid).reduce((s, w) => s + w.durationMs, 0) / (mid || 1);
  const second = window.slice(mid)  .reduce((s, w) => s + w.durationMs, 0) / ((window.length - mid) || 1);
  const trend: LatencyStats["trend"] =
    second < first * 0.9 ? "improving" :
    second > first * 1.1 ? "degrading" : "stable";

  return { provider, venueId, operation, windowMs: WINDOW_MS, sampleCount: window.length, p50, p95, p99, avg: Math.round(avg), maxMs: max, errorRate: errors / window.length, tier, trend };
}

export function getAllStats(venueId: string): LatencyStats[] {
  const out: LatencyStats[] = [];
  for (const [key] of sampleBuffers.entries()) {
    const [provider, kVenueId, operation] = key.split(":");
    if (kVenueId !== venueId) continue;
    const s = computeStats(provider!, venueId, operation!);
    if (s) out.push(s);
  }
  return out;
}

/** Wrap any async POS call with latency tracking */
export async function tracked<T>(
  provider:  string,
  venueId:   string,
  operation: string,
  fn:        () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  let success = false;
  try {
    const result = await fn();
    success = true;
    return result;
  } finally {
    await recordLatency({ provider, venueId, operation, durationMs: Date.now() - start, success, ts: Date.now() });
  }
}
