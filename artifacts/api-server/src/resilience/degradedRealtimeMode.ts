/**
 * degradedRealtimeMode — controlled fallback when realtime systems are overloaded.
 *
 * Degradation levels:
 *   FULL:       All realtime features active
 *   THROTTLED:  Non-critical events deferred; WS emit rate limited
 *   ESSENTIAL:  Only critical ops events (alerts, payments) emitted
 *   OFFLINE:    No realtime events; clients poll REST endpoints
 *
 * Transitions are triggered by:
 *   - Queue pressure level (queuePressure.ts)
 *   - WebSocket error rate (websocketRecovery.ts)
 *   - Manual admin override
 *
 * All services check isDegradedRealtime() before emitting non-critical events.
 */

import { logger }   from "../lib/logger";
import { publish }  from "../realtime/transport/eventBus";
import { setGauge } from "../platform/observability/metricsCollector";

export type RealtimeMode = "full" | "throttled" | "essential" | "offline";

interface ModeState {
  mode:        RealtimeMode;
  since:       number;
  reason:      string;
  autoRestore: boolean;
}

const MODE_LEVELS: Record<RealtimeMode, number> = { full:0, throttled:1, essential:2, offline:3 };

let currentState: ModeState = {
  mode:        "full",
  since:       Date.now(),
  reason:      "startup",
  autoRestore: false,
};

let restoreTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Mode management ──────────────────────────────────────────────────────────

export async function setRealtimeMode(
  mode:        RealtimeMode,
  reason:      string,
  autoRestoreMs?: number,
): Promise<void> {
  const prev = currentState.mode;
  if (mode === prev) return;

  currentState = { mode, since: Date.now(), reason, autoRestore: !!autoRestoreMs };

  const level = MODE_LEVELS[mode];
  setGauge("realtime", "degradation_level", level);

  logger.warn({ from: prev, to: mode, reason }, "degradedRealtimeMode: mode changed");

  await publish("orchestration", {
    event:  "REALTIME_MODE_CHANGED",
    from:   prev,
    to:     mode,
    reason,
    ts:     Date.now(),
  });

  if (autoRestoreMs) {
    if (restoreTimer) clearTimeout(restoreTimer);
    restoreTimer = setTimeout(async () => {
      await setRealtimeMode("full", "auto_restore_timeout");
    }, autoRestoreMs);
    restoreTimer.unref();
  }
}

export function getRealtimeMode(): ModeState {
  return { ...currentState };
}

export function isFullRealtime():     boolean { return currentState.mode === "full"; }
export function isThrottled():        boolean { return ["throttled","essential","offline"].includes(currentState.mode); }
export function isEssentialOnly():    boolean { return ["essential","offline"].includes(currentState.mode); }
export function isOffline():          boolean { return currentState.mode === "offline"; }

export function shouldEmitEvent(priority: "critical" | "high" | "normal" | "low"): boolean {
  const mode = currentState.mode;
  if (mode === "full")      return true;
  if (mode === "throttled") return priority !== "low";
  if (mode === "essential") return priority === "critical" || priority === "high";
  return false; // offline — no events
}

// ─── Auto-transition from queue pressure ─────────────────────────────────────

export async function applyPressureLevel(level: "normal"|"elevated"|"high"|"critical"): Promise<void> {
  const target: Record<string, RealtimeMode> = {
    normal:   "full",
    elevated: "throttled",
    high:     "throttled",
    critical: "essential",
  };
  const desired = target[level] ?? "full";
  const current = MODE_LEVELS[currentState.mode];
  const proposed = MODE_LEVELS[desired];

  if (proposed > current) {
    await setRealtimeMode(desired, `queue_pressure_${level}`);
  } else if (proposed < current && currentState.autoRestore) {
    await setRealtimeMode(desired, `queue_pressure_reduced_${level}`);
  }
}
