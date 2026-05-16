/**
 * workerRecovery — monitors background worker health and auto-recovers.
 *
 * Tracks:
 *   - Last heartbeat per worker
 *   - Consecutive failure count
 *   - Worker cycle duration (detects stuck workers)
 *   - Error rate over rolling window
 *
 * Recovery actions:
 *   - WARN:    log + alert telemetry (elevated error rate)
 *   - RESTART: attempt in-process restart (stuck/dead worker)
 *   - ISOLATE: disable worker temporarily + alert ops (repeated failures)
 *
 * Workers must call workerRegistry.heartbeat(name) on each cycle.
 * Watchdog runs every 30s and checks all registered workers.
 */

import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";
import { increment, setGauge } from "../observability/metricsCollector";

export type WorkerState = "healthy" | "degraded" | "stuck" | "dead" | "isolated";

export interface WorkerRegistration {
  name:            string;
  expectedCycleMs: number;     // expected max time between heartbeats
  restartFn?:      () => Promise<void>;  // optional in-process restart
}

export interface WorkerHealth {
  name:             string;
  state:            WorkerState;
  lastHeartbeat:    number;
  lastCycleDuration:number | null;
  consecutiveFails: number;
  errorCount:       number;
  cycleCount:       number;
  avgCycleDuration: number;
  isIsolated:       boolean;
}

interface WorkerEntry {
  reg:              WorkerRegistration;
  health:           WorkerHealth;
  cycleDurations:   number[];   // rolling last 10
  restartAttempts:  number;
}

const workers = new Map<string, WorkerEntry>();

const ISOLATE_AFTER_RESTARTS = 3;
const MAX_RESTARTS_PER_HOUR  = 5;
const restartHistory: Record<string, number[]> = {};

// ─── Registration ─────────────────────────────────────────────────────────────

export function registerWorker(reg: WorkerRegistration): void {
  workers.set(reg.name, {
    reg,
    health: {
      name:              reg.name,
      state:             "healthy",
      lastHeartbeat:     Date.now(),
      lastCycleDuration: null,
      consecutiveFails:  0,
      errorCount:        0,
      cycleCount:        0,
      avgCycleDuration:  0,
      isIsolated:        false,
    },
    cycleDurations:  [],
    restartAttempts: 0,
  });
  logger.info({ name: reg.name, expectedCycleMs: reg.expectedCycleMs }, "workerRecovery: worker registered");
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

export function heartbeat(name: string, cycleDurationMs?: number): void {
  const entry = workers.get(name);
  if (!entry) return;

  const now = Date.now();
  entry.health.lastHeartbeat = now;
  entry.health.cycleCount++;

  if (cycleDurationMs !== undefined) {
    entry.health.lastCycleDuration = cycleDurationMs;
    entry.cycleDurations.push(cycleDurationMs);
    if (entry.cycleDurations.length > 10) entry.cycleDurations.shift();
    const avg = entry.cycleDurations.reduce((s, d) => s + d, 0) / entry.cycleDurations.length;
    entry.health.avgCycleDuration = Math.round(avg);
  }

  if (entry.health.state !== "isolated") {
    entry.health.state            = "healthy";
    entry.health.consecutiveFails = 0;
  }

  setGauge("workers", "last_heartbeat_age_ms", 0, { worker: name });
}

export function recordWorkerError(name: string, err?: unknown): void {
  const entry = workers.get(name);
  if (!entry) return;
  entry.health.errorCount++;
  entry.health.consecutiveFails++;
  increment("workers", "errors", 1, { worker: name });
  logger.warn({ name, err: String(err) }, "workerRecovery: worker error recorded");
}

// ─── Watchdog ─────────────────────────────────────────────────────────────────

export async function runWatchdog(): Promise<void> {
  const now = Date.now();

  for (const [name, entry] of workers.entries()) {
    const ageMs    = now - entry.health.lastHeartbeat;
    const expected = entry.reg.expectedCycleMs;

    setGauge("workers", "last_heartbeat_age_ms", ageMs, { worker: name });

    if (entry.health.isIsolated) continue;

    // Classify state
    let newState: WorkerState;
    if (ageMs > expected * 5) {
      newState = "dead";
    } else if (ageMs > expected * 2) {
      newState = "stuck";
    } else if (entry.health.consecutiveFails >= 3) {
      newState = "degraded";
    } else {
      newState = "healthy";
    }

    if (newState !== entry.health.state) {
      logger.warn({ name, from: entry.health.state, to: newState, ageMs }, "workerRecovery: state change");
      entry.health.state = newState;

      await publish("telemetry", {
        event: "WORKER_STATE_CHANGED", workerName: name,
        from: entry.health.state, to: newState, ageMs,
      });
    }

    // Attempt restart for stuck/dead workers
    if ((newState === "stuck" || newState === "dead") && entry.reg.restartFn) {
      await attemptRestart(name, entry);
    }
  }
}

async function attemptRestart(name: string, entry: WorkerEntry): Promise<void> {
  // Rate-limit restarts
  const now = Date.now();
  const history = restartHistory[name] ?? [];
  const recentRestarts = history.filter(ts => now - ts < 3_600_000); // last hour

  if (recentRestarts.length >= MAX_RESTARTS_PER_HOUR) {
    logger.error({ name, recentRestarts: recentRestarts.length }, "workerRecovery: max restarts exceeded — isolating");
    entry.health.isIsolated = true;
    entry.health.state      = "isolated";
    await publish("orchestration", { event: "WORKER_ISOLATED", workerName: name, recentRestarts: recentRestarts.length });
    return;
  }

  try {
    logger.warn({ name }, "workerRecovery: attempting restart");
    await entry.reg.restartFn!();
    restartHistory[name] = [...recentRestarts, now];
    entry.restartAttempts++;
    increment("workers", "restarts", 1, { worker: name });
    logger.info({ name }, "workerRecovery: restart succeeded");
  } catch (err) {
    logger.error({ err, name }, "workerRecovery: restart failed");
    increment("workers", "restart_failures", 1, { worker: name });
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function getAllWorkerHealth(): WorkerHealth[] {
  return [...workers.values()].map(e => ({ ...e.health }));
}

export function getWorkerHealth(name: string): WorkerHealth | null {
  return workers.get(name)?.health ?? null;
}

export function getUnhealthyWorkers(): WorkerHealth[] {
  return getAllWorkerHealth().filter(h => h.state !== "healthy");
}
