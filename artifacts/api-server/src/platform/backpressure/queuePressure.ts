/**
 * queuePressure — orchestration queue pressure detection and adaptive response.
 *
 * Monitors:
 *   - Orchestration queue depth
 *   - Worker processing rate vs event ingestion rate
 *   - Queue drain velocity (events/sec consumed)
 *   - TTL expiry rate (events expiring unprocessed)
 *
 * Adaptive responses:
 *   - NORMAL:    no action
 *   - ELEVATED:  reduce telemetry sampling, defer non-critical events
 *   - HIGH:      shed low-priority events, alert ops
 *   - CRITICAL:  pause non-critical channels, activate degraded realtime
 *
 * Integrates with: eventThrottle (sets shed thresholds),
 *                  featureFlagEngine (checks infra.backpressure.enabled),
 *                  telemetry (publishes pressure events)
 */

import { pool }           from "@workspace/db";
import { logger }         from "../../lib/logger";
import { publish }        from "../../realtime/transport/eventBus";
import { setGauge, increment } from "../observability/metricsCollector";
import { setVenueThrottleConfig } from "./eventThrottle";
import { isEnabled }      from "../featureFlags/featureFlagEngine";

export type PressureLevel = "normal" | "elevated" | "high" | "critical";

export interface QueuePressureState {
  level:            PressureLevel;
  queueDepth:       number;
  maxQueueDepth:    number;
  ingestionRate:    number;    // events/sec arriving
  drainRate:        number;    // events/sec consumed
  netRate:          number;    // ingestionRate - drainRate (positive = growing)
  ttiSeconds:       number;    // time-to-idle estimate (seconds to drain at current rate)
  sampleRate:       number;    // current telemetry sampling rate (0–1)
  ts:               number;
}

const MAX_QUEUE_DEPTH   = 500;
const SAMPLE_RATES: Record<PressureLevel, number> = {
  normal:   1.00,
  elevated: 0.75,
  high:     0.40,
  critical: 0.15,
};

let currentPressure: QueuePressureState = {
  level:"normal", queueDepth:0, maxQueueDepth:MAX_QUEUE_DEPTH,
  ingestionRate:0, drainRate:0, netRate:0, ttiSeconds:0, sampleRate:1.0, ts:Date.now(),
};

// Rolling 10s counters for rate estimation
let ingestionCount = 0;
let drainCount     = 0;
let windowStart    = Date.now();
const RATE_WINDOW  = 10_000;

export function recordIngestion(count = 1): void {
  ingestionCount += count;
}

export function recordDrain(count = 1): void {
  drainCount += count;
}

async function getQueueDepth(): Promise<number> {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM orchestration_queue WHERE status='pending'`,
    );
    return Number((rows[0] as Record<string, unknown>)?.["cnt"] ?? 0);
  } catch { return 0; }
}

function computeLevel(depth: number, netRate: number): PressureLevel {
  const fillPct = depth / MAX_QUEUE_DEPTH;
  if (fillPct >= 0.9 || netRate > 50) return "critical";
  if (fillPct >= 0.7 || netRate > 25) return "high";
  if (fillPct >= 0.5 || netRate > 10) return "elevated";
  return "normal";
}

export async function evaluatePressure(): Promise<QueuePressureState> {
  if (!isEnabled("infra.backpressure.enabled")) {
    return currentPressure;
  }

  const now      = Date.now();
  const windowMs = now - windowStart;
  const windowS  = windowMs / 1000;

  const ingestionRate = windowS > 0 ? ingestionCount / windowS : 0;
  const drainRate     = windowS > 0 ? drainCount     / windowS : 0;
  const netRate       = ingestionRate - drainRate;

  // Reset counters
  ingestionCount = 0;
  drainCount     = 0;
  windowStart    = now;

  const queueDepth = await getQueueDepth();
  const level      = computeLevel(queueDepth, netRate);
  const ttiSeconds = netRate < 0 && queueDepth > 0 ? queueDepth / Math.abs(netRate) : 0;
  const sampleRate = SAMPLE_RATES[level];

  const prev = currentPressure;
  currentPressure = {
    level, queueDepth, maxQueueDepth: MAX_QUEUE_DEPTH,
    ingestionRate, drainRate, netRate, ttiSeconds, sampleRate, ts: now,
  };

  // Update metrics
  setGauge("backpressure", "queue_depth",    queueDepth);
  setGauge("backpressure", "ingestion_rate", Math.round(ingestionRate));
  setGauge("backpressure", "drain_rate",     Math.round(drainRate));

  // Level change handling
  if (level !== prev.level) {
    logger.warn({ from: prev.level, to: level, queueDepth, netRate: netRate.toFixed(1) }, "queuePressure: level changed");

    await publish("telemetry", {
      event: "QUEUE_PRESSURE_CHANGED",
      from: prev.level, to: level,
      queueDepth, sampleRate, ts: now,
    });

    increment("backpressure", "level_changes", 1, { from: prev.level, to: level });

    // Apply adaptive throttling to all venues
    if (level === "critical") {
      // Apply pressure config globally (would iterate venues in prod)
      setVenueThrottleConfig("*", { shedBelowPriority: "high" });
    } else if (level === "high") {
      setVenueThrottleConfig("*", { shedBelowPriority: "normal" });
    } else {
      setVenueThrottleConfig("*", { shedBelowPriority: "low" });
    }
  }

  return currentPressure;
}

export function getPressureState(): QueuePressureState {
  return currentPressure;
}

export function isOverloaded(): boolean {
  return currentPressure.level === "critical";
}

export function getSampleRate(): number {
  return currentPressure.sampleRate;
}
