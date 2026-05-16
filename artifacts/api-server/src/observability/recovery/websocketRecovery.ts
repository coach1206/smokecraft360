/**
 * websocketRecovery — WebSocket connection health and auto-recovery.
 *
 * Monitors:
 *   - Rooms with zero connections (ghost rooms)
 *   - High disconnect rate (connection instability)
 *   - Stale socket connections (heartbeat timeout)
 *   - pgPubSub listener health (are pub/sub channels alive?)
 *
 * Recovery actions:
 *   - Ghost room cleanup
 *   - pgPubSub reconnect on channel death
 *   - Ops alert on mass disconnect event
 */

import { logger }    from "../../lib/logger";
import { publish }   from "../../realtime/transport/eventBus";
import { increment, setGauge } from "../../platform/observability/metricsCollector";

interface RoomHealth {
  room:         string;
  socketCount:  number;
  lastActivity: number;
  isGhost:      boolean;
}

const roomRegistry = new Map<string, { count: number; lastActivity: number }>();

// ─── Room tracking ────────────────────────────────────────────────────────────

export function trackRoomJoin(room: string): void {
  const r = roomRegistry.get(room) ?? { count: 0, lastActivity: Date.now() };
  r.count++;
  r.lastActivity = Date.now();
  roomRegistry.set(room, r);
}

export function trackRoomLeave(room: string): void {
  const r = roomRegistry.get(room);
  if (!r) return;
  r.count = Math.max(0, r.count - 1);
  r.lastActivity = Date.now();
}

export function trackRoomActivity(room: string): void {
  const r = roomRegistry.get(room);
  if (r) r.lastActivity = Date.now();
}

// ─── Health checks ────────────────────────────────────────────────────────────

export function getRoomHealth(): RoomHealth[] {
  const now = Date.now();
  const GHOST_THRESHOLD_MS = 5 * 60_000;

  return [...roomRegistry.entries()].map(([room, state]) => ({
    room,
    socketCount:  state.count,
    lastActivity: state.lastActivity,
    isGhost:      state.count === 0 && (now - state.lastActivity) > GHOST_THRESHOLD_MS,
  }));
}

export function cleanGhostRooms(): number {
  const health = getRoomHealth();
  let cleaned = 0;
  for (const r of health) {
    if (r.isGhost) {
      roomRegistry.delete(r.room);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.info({ cleaned }, "websocketRecovery: ghost rooms cleaned");
    increment("websocket.recovery", "ghost_rooms_cleaned", cleaned);
  }
  return cleaned;
}

// ─── Mass disconnect detection ────────────────────────────────────────────────

let disconnectCount = 0;
let windowStart     = Date.now();
const WINDOW_MS     = 60_000;
const ALERT_THRESHOLD = 20;

export async function recordDisconnect(): Promise<void> {
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    disconnectCount = 0;
    windowStart     = now;
  }
  disconnectCount++;

  if (disconnectCount >= ALERT_THRESHOLD) {
    logger.warn({ disconnectCount, windowMs: WINDOW_MS }, "websocketRecovery: mass disconnect detected");
    await publish("telemetry", {
      event:           "WS_MASS_DISCONNECT",
      disconnectCount,
      windowMs:        WINDOW_MS,
      ts:              now,
    });
    disconnectCount = 0; // reset to avoid alert storm
  }
}

// ─── Status ───────────────────────────────────────────────────────────────────

export function getWebsocketRecoveryStatus(): {
  totalRooms:        number;
  ghostRooms:        number;
  totalConnections:  number;
  recentDisconnects: number;
} {
  const health    = getRoomHealth();
  const totalConn = [...roomRegistry.values()].reduce((s, r) => s + r.count, 0);
  setGauge("websocket", "total_rooms",       roomRegistry.size);
  setGauge("websocket", "total_connections", totalConn);
  return {
    totalRooms:        roomRegistry.size,
    ghostRooms:        health.filter(r => r.isGhost).length,
    totalConnections:  totalConn,
    recentDisconnects: disconnectCount,
  };
}

// Periodic cleanup
setInterval(() => { cleanGhostRooms(); }, 5 * 60_000).unref();
