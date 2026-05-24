import { logger } from "./logger";
import { pushTelemetry } from "./eatCommandState";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

/** A device that hasn't sent any messages for this long is classified as
 *  "pocket placement" or display sleep. */
const POCKET_PLACEMENT_TIMEOUT_MS = 30_000;

/** If a device reconnects within this window after disconnecting, it's treated
 *  as a screen power toggle (display off/on gesture). */
const SCREEN_TOGGLE_WINDOW_MS = 5_000;

/** How often the idle-device sweep runs. */
const SWEEP_INTERVAL_MS = 15_000;

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type DeviceType =
  | "KIOSK"
  | "STAFF_TABLET"
  | "HANDHELD"
  | "WALL_DISPLAY"
  | "UNKNOWN";

export type LifecycleEvent =
  | "CONNECTED"
  | "DISCONNECTED"
  | "SCREEN_TOGGLE"
  | "POCKET_PLACEMENT"
  | "IDLE_TIMEOUT"
  | "MESSAGE_RECEIVED"
  | "ANNOTATED";

export interface DeviceEvent {
  event: LifecycleEvent;
  ts:    number;
  meta?: unknown;
}

export interface DeviceLifecycleRecord {
  socketId:       string;
  deviceId:       string | null;
  deviceType:     DeviceType;
  connectedAt:    number;
  lastMessageAt:  number;
  disconnectedAt: number | null;
  reconnectCount: number;
  events:         DeviceEvent[];
}

// ══════════════════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════════════════

const deviceRegistry = new Map<string, DeviceLifecycleRecord>();

const disconnectedLog: DeviceLifecycleRecord[] = [];
const MAX_DISC_LOG = 50;

/** deviceId → timestamp of last disconnect — used for screen-toggle detection. */
const lastDisconnectByDevice = new Map<string, number>();

// Server-lifetime counters
let totalScreenToggles    = 0;
let totalPocketPlacements = 0;
let totalIdleTimeouts     = 0;

// ══════════════════════════════════════════════════════════════════════════════
// LIFECYCLE HOOKS  (called from socketServer.ts)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Called immediately when a socket connects.
 * Detects if this is a screen-toggle reconnect for a known deviceId.
 */
export function registerDevice(
  socketId:   string,
  deviceId:   string | null,
  deviceType: DeviceType,
): void {
  const now = Date.now();
  let reconnectCount = 0;
  let initialEvent: LifecycleEvent = "CONNECTED";

  if (deviceId) {
    const lastDisc = lastDisconnectByDevice.get(deviceId);
    if (lastDisc !== undefined && now - lastDisc < SCREEN_TOGGLE_WINDOW_MS) {
      reconnectCount = 1;
      totalScreenToggles++;
      initialEvent = "SCREEN_TOGGLE";
      pushTelemetry({
        timestamp: now,
        system:    "DEV_DASHBOARD",
        level:     "WARN",
        message:   `Screen toggle: ${deviceId} reconnected ${now - lastDisc}ms after disconnect`,
        payload:   { deviceId, gapMs: now - lastDisc },
      });
      logger.warn(
        { deviceId, gapMs: now - lastDisc },
        "hardware lifecycle: screen power toggle detected",
      );
    }
  }

  deviceRegistry.set(socketId, {
    socketId,
    deviceId,
    deviceType,
    connectedAt:    now,
    lastMessageAt:  now,
    disconnectedAt: null,
    reconnectCount,
    events: [{ event: initialEvent, ts: now }],
  });
}

/**
 * Called when a socket sends any message — resets the idle clock.
 */
export function recordDeviceMessage(socketId: string): void {
  const record = deviceRegistry.get(socketId);
  if (!record) return;
  record.lastMessageAt = Date.now();
  // Keep event log to 50 entries per device to limit memory
  if (record.events.length < 50) {
    record.events.push({ event: "MESSAGE_RECEIVED", ts: record.lastMessageAt });
  }
}

/**
 * Called on socket disconnect.
 * Classifies whether this is a pocket-placement (long idle before drop)
 * or a normal lifecycle termination.
 */
export function unregisterDevice(socketId: string, reason: string): void {
  const record = deviceRegistry.get(socketId);
  if (!record) return;

  const now    = Date.now();
  const idleMs = now - record.lastMessageAt;
  record.disconnectedAt = now;

  let lifecycleEvent: LifecycleEvent = "DISCONNECTED";

  if (idleMs >= POCKET_PLACEMENT_TIMEOUT_MS) {
    lifecycleEvent = "POCKET_PLACEMENT";
    totalPocketPlacements++;
    pushTelemetry({
      timestamp: now,
      system:    "DEV_DASHBOARD",
      level:     "WARN",
      message:   `Pocket placement/sleep: socket ${socketId} was idle ${Math.round(idleMs / 1_000)}s before drop`,
      payload:   { socketId, deviceId: record.deviceId, deviceType: record.deviceType, idleMs, reason },
    });
    logger.warn(
      { socketId, deviceId: record.deviceId, deviceType: record.deviceType, idleMs, reason },
      "hardware lifecycle: pocket placement / display sleep timeout",
    );
  }

  record.events.push({ event: lifecycleEvent, ts: now, meta: { reason, idleMs } });

  if (record.deviceId) {
    lastDisconnectByDevice.set(record.deviceId, now);
  }

  deviceRegistry.delete(socketId);
  disconnectedLog.unshift(record);
  if (disconnectedLog.length > MAX_DISC_LOG) disconnectedLog.pop();
}

/**
 * Called when a client emits DEVICE_ANNOUNCE to identify its device type.
 * Allows unknown sockets to be properly classified after the handshake.
 */
export function annotateDevice(
  socketId:   string,
  deviceId:   string,
  deviceType: DeviceType,
): void {
  const record = deviceRegistry.get(socketId);
  if (!record) return;
  record.deviceId   = deviceId;
  record.deviceType = deviceType;
  record.events.push({ event: "ANNOTATED", ts: Date.now(), meta: { deviceId, deviceType } });
}

// ══════════════════════════════════════════════════════════════════════════════
// PERIODIC IDLE SWEEP
// ══════════════════════════════════════════════════════════════════════════════

function sweepIdleDevices(): void {
  const now    = Date.now();
  const cutoff = now - POCKET_PLACEMENT_TIMEOUT_MS;

  for (const [socketId, record] of deviceRegistry) {
    if (record.lastMessageAt < cutoff) {
      totalIdleTimeouts++;
      const idleMs = now - record.lastMessageAt;
      pushTelemetry({
        timestamp: now,
        system:    "DEV_DASHBOARD",
        level:     "WARN",
        message:   `Idle device: socket ${socketId} silent for ${Math.round(idleMs / 1_000)}s`,
        payload:   { socketId, deviceId: record.deviceId, deviceType: record.deviceType, idleMs },
      });
      record.events.push({ event: "IDLE_TIMEOUT", ts: now, meta: { idleMs } });
    }
  }
}

setInterval(sweepIdleDevices, SWEEP_INTERVAL_MS);

// ══════════════════════════════════════════════════════════════════════════════
// TELEMETRY SNAPSHOT
// ══════════════════════════════════════════════════════════════════════════════

export function getHardwareSnapshot() {
  const active = [...deviceRegistry.values()].map(({ events: _e, ...rest }) => ({
    ...rest,
    idleSec: Math.round((Date.now() - rest.lastMessageAt) / 1_000),
  }));

  return {
    activeCount:          deviceRegistry.size,
    screenToggleCount:    totalScreenToggles,
    pocketPlacementCount: totalPocketPlacements,
    idleTimeoutCount:     totalIdleTimeouts,
    activeDevices:        active,
    recentDisconnects:    disconnectedLog.slice(0, 20),
    thresholds: {
      pocketPlacementMs:  POCKET_PLACEMENT_TIMEOUT_MS,
      screenToggleWindowMs: SCREEN_TOGGLE_WINDOW_MS,
      sweepIntervalMs:    SWEEP_INTERVAL_MS,
    },
  };
}
