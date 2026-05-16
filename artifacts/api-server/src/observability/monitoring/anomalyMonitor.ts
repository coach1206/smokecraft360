/**
 * anomalyMonitor — statistical anomaly detection across metrics streams.
 *
 * Uses z-score (rolling mean + stddev) to detect anomalies in:
 *   - Event ingestion rate (sudden spikes or drops)
 *   - Payment error rate (sudden increase)
 *   - Queue depth (unexpected growth)
 *   - Awareness score (sudden degradation)
 *   - WebSocket disconnect rate (connection instability)
 *
 * Anomalies are published to the event bus for ops alerts.
 */

import { publish }    from "../../realtime/transport/eventBus";
import { logger }     from "../../lib/logger";
import { increment }  from "../../platform/observability/metricsCollector";

export type AnomalySeverity = "low" | "medium" | "high" | "critical";

export interface AnomalyEvent {
  stream:    string;
  label:     string;
  value:     number;
  expected:  number;
  zScore:    number;
  severity:  AnomalySeverity;
  ts:        number;
}

interface RollingStats {
  window:  number[];
  maxSize: number;
}

const statsMap = new Map<string, RollingStats>();
const recentAnomalies: AnomalyEvent[] = [];
const MAX_ANOMALY_HISTORY = 100;

function getStats(stream: string, windowSize = 30): RollingStats {
  let s = statsMap.get(stream);
  if (!s) { s = { window: [], maxSize: windowSize }; statsMap.set(stream, s); }
  return s;
}

function addSample(stream: string, value: number, windowSize = 30): void {
  const s = getStats(stream, windowSize);
  s.window.push(value);
  if (s.window.length > s.maxSize) s.window.shift();
}

function computeZScore(stream: string): { mean: number; stddev: number; z: number } {
  const s = getStats(stream);
  if (s.window.length < 5) return { mean: 0, stddev: 0, z: 0 };
  const n      = s.window.length;
  const last   = s.window[n - 1] ?? 0;
  const prev   = s.window.slice(0, n - 1);
  const mean   = prev.reduce((a, b) => a + b, 0) / prev.length;
  const stddev = Math.sqrt(prev.reduce((a, b) => a + (b - mean) ** 2, 0) / prev.length);
  const z      = stddev > 0 ? (last - mean) / stddev : 0;
  return { mean, stddev, z };
}

function classifySeverity(absZ: number): AnomalySeverity | null {
  if (absZ >= 4.0) return "critical";
  if (absZ >= 3.0) return "high";
  if (absZ >= 2.5) return "medium";
  if (absZ >= 2.0) return "low";
  return null;
}

export async function checkAnomaly(
  stream:    string,
  label:     string,
  value:     number,
  windowSize = 30,
): Promise<AnomalyEvent | null> {
  addSample(stream, value, windowSize);
  const { mean, z } = computeZScore(stream);
  const absZ        = Math.abs(z);
  const severity    = classifySeverity(absZ);

  if (severity) {
    const anomaly: AnomalyEvent = { stream, label, value, expected: mean, zScore: z, severity, ts: Date.now() };

    recentAnomalies.push(anomaly);
    if (recentAnomalies.length > MAX_ANOMALY_HISTORY) recentAnomalies.shift();

    increment("anomalies", "detected", 1, { stream, severity });
    logger.warn({ stream, label, value, expected: mean, zScore: z.toFixed(2), severity }, "anomalyMonitor: anomaly detected");

    await publish("telemetry", {
      event: "ANOMALY_DETECTED",
      stream, label, value, expected: mean, zScore: z, severity, ts: Date.now(),
    });

    return anomaly;
  }

  return null;
}

export function getRecentAnomalies(stream?: string, limit = 20): AnomalyEvent[] {
  const filtered = stream
    ? recentAnomalies.filter(a => a.stream === stream)
    : recentAnomalies;
  return filtered.slice(-limit);
}

export function clearAnomalyHistory(stream?: string): void {
  if (stream) {
    const i = recentAnomalies.length;
    for (let j = i - 1; j >= 0; j--) {
      if (recentAnomalies[j]?.stream === stream) recentAnomalies.splice(j, 1);
    }
  } else {
    recentAnomalies.length = 0;
  }
}
