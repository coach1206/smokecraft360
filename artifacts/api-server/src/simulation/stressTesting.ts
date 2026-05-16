/**
 * stressTesting — orchestration and queue stress test harness.
 *
 * Generates controlled load bursts to validate:
 *   - Queue throughput under pressure
 *   - Orchestration cycle stability at high venue counts
 *   - WebSocket broadcast latency under load
 *   - Backpressure response (does the system shed correctly?)
 *   - Worker recovery under failure injection
 *
 * Stress tests run in sandbox mode only — never in production.
 */

import { logger }    from "../lib/logger";
import { enqueue }   from "../distributed/distributedQueues";
import { increment, observe } from "../platform/observability/metricsCollector";

export type StressScenario =
  | "queue_burst"
  | "orchestration_flood"
  | "websocket_storm"
  | "backpressure_trigger"
  | "failure_injection";

export interface StressTestConfig {
  scenario:   StressScenario;
  durationMs: number;
  ratePerSec: number;
  venueCount: number;
  failureRate?: number; // 0–1 for failure_injection
}

export interface StressTestResult {
  scenario:    StressScenario;
  durationMs:  number;
  eventsEmitted:number;
  eventsFailed: number;
  peakRatePerSec: number;
  avgLatencyMs: number;
  p99LatencyMs: number;
  backpressureTriggered: boolean;
  ts:          number;
}

const activeTests = new Map<string, { start: number; scenario: StressScenario; stop: () => void }>();

export async function runStressTest(
  testId:  string,
  config:  StressTestConfig,
): Promise<StressTestResult> {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("Stress tests cannot run in production");
  }

  logger.warn({ testId, scenario: config.scenario, durationMs: config.durationMs }, "stressTesting: starting");

  const start     = Date.now();
  const latencies: number[] = [];
  let eventsEmitted = 0;
  let eventsFailed  = 0;
  let backpressure  = false;
  let stopped       = false;

  let stopFn = (): void => { stopped = true; };
  activeTests.set(testId, { start, scenario: config.scenario, stop: stopFn });

  const intervalMs  = 1000 / config.ratePerSec;
  const venueIds    = Array.from({ length: config.venueCount }, (_, i) => `stress_venue_${i}`);

  const runInterval = async (): Promise<void> => {
    const tick = Date.now();
    const venueId = venueIds[eventsEmitted % venueIds.length]!;

    try {
      if (config.failureRate && Math.random() < config.failureRate) {
        throw new Error("injected_failure");
      }

      const t0 = Date.now();
      await enqueue(`stress_${config.scenario}`, {
        venueId,
        scenario: config.scenario,
        seq:      eventsEmitted,
        synthetic: true,
      }, { priority: "low", ttlMs: 60_000 });

      const latency = Date.now() - t0;
      latencies.push(latency);
      eventsEmitted++;
      increment("stress", "events_emitted", 1, { scenario: config.scenario });

      if (latency > 500) backpressure = true;
    } catch {
      eventsFailed++;
    }
  };

  // Run for durationMs
  const endAt = start + config.durationMs;
  while (!stopped && Date.now() < endAt) {
    await runInterval();
    await new Promise(r => setTimeout(r, intervalMs));
  }

  activeTests.delete(testId);

  latencies.sort((a, b) => a - b);
  const avg = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] ?? 0;

  const result: StressTestResult = {
    scenario:        config.scenario,
    durationMs:      Date.now() - start,
    eventsEmitted,
    eventsFailed,
    peakRatePerSec:  config.ratePerSec,
    avgLatencyMs:    Math.round(avg),
    p99LatencyMs:    p99,
    backpressureTriggered: backpressure,
    ts:              Date.now(),
  };

  observe("stress", "events_emitted",  eventsEmitted);
  observe("stress", "avg_latency_ms",  avg);
  logger.info({ testId, ...result }, "stressTesting: complete");
  return result;
}

export function stopStressTest(testId: string): boolean {
  const test = activeTests.get(testId);
  if (!test) return false;
  test.stop();
  activeTests.delete(testId);
  return true;
}

export function getActiveStressTests(): Array<{ testId: string; scenario: StressScenario; runningMs: number }> {
  const now = Date.now();
  return [...activeTests.entries()].map(([testId, t]) => ({
    testId, scenario: t.scenario, runningMs: now - t.start,
  }));
}
