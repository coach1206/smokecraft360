/**
 * DEVELOPER DASHBOARD EVENT BUS — Layer 3
 * Background telemetry stream → Developer Dashboard diagnostics
 *
 * Responsibilities:
 *  - Fine-grained BusEvent log (capped at 120 entries)
 *  - log()          : append any system event with category + marker
 *  - trackMutation(): snapshot before/after state diffs
 *  - WS handshake simulation with realistic state machine
 *  - Shadow Mode: AES-256-GCM encryption latency measurement
 *  - Offline queue sync payload snapshots
 *  - Execution marker timestamps (BOOT, INIT, FLUSH, etc.)
 *  - startDiagnosticLoop(): 3-second background health sweep
 */

import { create } from "zustand";

// ── Module-level handles ─────────────────────────────────────────────────────

let _diagnosticInterval: ReturnType<typeof setInterval> | null = null;
let _wsHeartbeatInterval: ReturnType<typeof setInterval> | null = null;

// ── Domain types ─────────────────────────────────────────────────────────────

export type BusCategory =
  | "MUTATION"
  | "WS_HANDSHAKE"
  | "SHADOW_ENCRYPT"
  | "OFFLINE_SYNC"
  | "EXEC_MARKER"
  | "SENSOR"
  | "AUTH"
  | "SYSTEM";

export type WsStatus =
  | "DISCONNECTED"
  | "CONNECTING"
  | "HANDSHAKE_IN_PROGRESS"
  | "CONNECTED"
  | "RECONNECTING"
  | "HANDSHAKE_FAILED";

export type ShadowEncryptResult = "OK" | "DEGRADED" | "FAILED";

export interface BusEvent {
  id:          string;
  timestamp:   number;
  category:    BusCategory;
  marker:      string;
  payload:     Record<string, unknown>;
  latencyMs?:  number;
  severity:    "DEBUG" | "INFO" | "WARN" | "ERROR";
}

export interface WsHandshakeRecord {
  attemptId:      string;
  startedAt:      number;
  completedAt:    number | null;
  latencyMs:      number | null;
  status:         WsStatus;
  serverEndpoint: string;
  tlsVersion:     "1.2" | "1.3" | null;
  sessionToken:   string | null;
}

export interface ShadowLatencyRecord {
  operationId:  string;
  timestamp:    number;
  algorithm:    "AES-256-GCM";
  payloadBytes: number;
  encryptMs:    number;
  decryptMs:    number;
  result:       ShadowEncryptResult;
}

export interface OfflineQueueSnapshot {
  snapshotId:    string;
  capturedAt:    number;
  pendingCount:  number;
  oldestItemAge: number;
  totalBytes:    number;
  items:         Array<{ type: string; timestamp: number; sizeBytes: number }>;
}

export interface StateMutationDiff {
  mutationId: string;
  timestamp:  number;
  action:     string;
  storeName:  string;
  delta:      Record<string, { before: unknown; after: unknown }>;
  durationMs: number;
}

// ── Store interface ──────────────────────────────────────────────────────────

interface DevBusStore {
  events:               BusEvent[];
  wsStatus:             WsStatus;
  wsHandshakeHistory:   WsHandshakeRecord[];
  shadowLatencies:      ShadowLatencyRecord[];
  offlineSnapshots:     OfflineQueueSnapshot[];
  mutationDiffs:        StateMutationDiff[];
  diagnosticLoopActive: boolean;
  shadowModeActive:     boolean;
  totalEventsLogged:    number;
  systemUpMs:           number;

  log:                  (category: BusCategory, marker: string, payload?: Record<string, unknown>, latencyMs?: number) => void;
  trackMutation:        (storeName: string, action: string, delta: StateMutationDiff["delta"]) => void;
  simulateWsHandshake:  () => Promise<WsHandshakeRecord>;
  measureShadowLatency: (payloadBytes: number) => Promise<ShadowLatencyRecord>;
  snapshotOfflineQueue: (items: Array<{ type: string; timestamp: number; sizeBytes: number }>) => void;
  setShadowMode:        (active: boolean) => void;
  startDiagnosticLoop:  () => void;
  stopDiagnosticLoop:   () => void;
  clearEvents:          () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const BOOT_AT = Date.now();

function busId(): string {
  return `bus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// Simulate AES-256-GCM encrypt+decrypt timing (deterministic mock)
function mockEncryptLatency(bytes: number): { enc: number; dec: number } {
  const base = 4 + bytes / 8000;               // baseline grows with payload
  const noise = (Math.random() - 0.5) * 2;
  const enc   = Math.max(1, parseFloat((base + noise).toFixed(2)));
  const dec   = Math.max(1, parseFloat((enc * 0.82 + Math.random() * 0.5).toFixed(2)));
  return { enc, dec };
}

const WS_ENDPOINT = "/api/ws/eat-pos-telemetry";

// System health markers emitted by the diagnostic loop
const HEALTH_MARKERS: Array<{ marker: string; category: BusCategory }> = [
  { marker: "HEAP_SWEEP",             category: "SYSTEM"      },
  { marker: "SENSOR_POLL_TICK",       category: "SENSOR"      },
  { marker: "LEDGER_INTEGRITY_CHECK", category: "EXEC_MARKER" },
  { marker: "CMD_QUEUE_DEPTH_SAMPLE", category: "EXEC_MARKER" },
  { marker: "WS_KEEPALIVE_PING",      category: "WS_HANDSHAKE"},
  { marker: "ASSET_LOCK_SCAN",        category: "MUTATION"    },
  { marker: "SHADOW_QUEUE_AUDIT",     category: "OFFLINE_SYNC"},
  { marker: "TIP_POOL_RECALC",        category: "EXEC_MARKER" },
];

// ── Zustand store ────────────────────────────────────────────────────────────

export const useDevBusStore = create<DevBusStore>((set, get) => ({
  events:               [],
  wsStatus:             "DISCONNECTED",
  wsHandshakeHistory:   [],
  shadowLatencies:      [],
  offlineSnapshots:     [],
  mutationDiffs:        [],
  diagnosticLoopActive: false,
  shadowModeActive:     false,
  totalEventsLogged:    0,
  systemUpMs:           0,

  // ── Core logger ──────────────────────────────────────────────────────────

  log: (category, marker, payload = {}, latencyMs) => {
    const event: BusEvent = {
      id:         busId(),
      timestamp:  Date.now(),
      category,
      marker,
      payload,
      latencyMs,
      severity: category === "SYSTEM" || category === "EXEC_MARKER"
        ? "DEBUG"
        : latencyMs && latencyMs > 200 ? "WARN" : "INFO",
    };
    set((s) => ({
      events:            [event, ...s.events].slice(0, 120),
      totalEventsLogged: s.totalEventsLogged + 1,
    }));
  },

  // ── State mutation tracker ───────────────────────────────────────────────

  trackMutation: (storeName, action, delta) => {
    const diff: StateMutationDiff = {
      mutationId: busId(),
      timestamp:  Date.now(),
      action,
      storeName,
      delta,
      durationMs: Math.floor(Math.random() * 4) + 1,
    };
    set((s) => ({
      mutationDiffs: [diff, ...s.mutationDiffs].slice(0, 50),
    }));
    get().log("MUTATION", `${storeName}::${action}`, { delta }, diff.durationMs);
  },

  // ── WebSocket handshake simulation ───────────────────────────────────────
  // State machine: DISCONNECTED → CONNECTING → HANDSHAKE_IN_PROGRESS → CONNECTED
  // with ~8% failure rate landing on HANDSHAKE_FAILED then RECONNECTING

  simulateWsHandshake: async () => {
    const t0        = Date.now();
    const attemptId = busId();

    set({ wsStatus: "CONNECTING" });
    get().log("WS_HANDSHAKE", "WS_CONNECT_INIT", { endpoint: WS_ENDPOINT, attemptId });

    await new Promise<void>((r) => setTimeout(r, 80 + Math.random() * 60));
    set({ wsStatus: "HANDSHAKE_IN_PROGRESS" });
    get().log("WS_HANDSHAKE", "TLS_UPGRADE_START", { tlsTarget: "1.3" });

    await new Promise<void>((r) => setTimeout(r, 40 + Math.random() * 40));

    const failed = Math.random() < 0.08;
    const record: WsHandshakeRecord = {
      attemptId,
      startedAt:      t0,
      completedAt:    failed ? null : Date.now(),
      latencyMs:      failed ? null : Date.now() - t0,
      status:         failed ? "HANDSHAKE_FAILED" : "CONNECTED",
      serverEndpoint: WS_ENDPOINT,
      tlsVersion:     failed ? null : "1.3",
      sessionToken:   failed ? null : `wst-${Math.random().toString(36).slice(2, 14)}`,
    };

    if (failed) {
      set({ wsStatus: "HANDSHAKE_FAILED" });
      get().log("WS_HANDSHAKE", "HANDSHAKE_FAILED", { attemptId, reason: "TLS_NEGOTIATION_TIMEOUT" });
      await new Promise<void>((r) => setTimeout(r, 1200));
      set({ wsStatus: "RECONNECTING" });
      get().log("WS_HANDSHAKE", "RECONNECT_SCHEDULED", { delayMs: 3000 });
    } else {
      set({ wsStatus: "CONNECTED" });
      get().log("WS_HANDSHAKE", "WS_CONNECTED", {
        latencyMs:    record.latencyMs,
        tlsVersion:   record.tlsVersion,
        sessionToken: record.sessionToken?.slice(0, 8) + "…",
      }, record.latencyMs ?? undefined);
    }

    set((s) => ({
      wsHandshakeHistory: [record, ...s.wsHandshakeHistory].slice(0, 20),
    }));
    return record;
  },

  // ── Shadow Mode encryption latency measurement ───────────────────────────
  // Simulates AES-256-GCM encrypt+decrypt of a payment token at given byte size

  measureShadowLatency: async (payloadBytes) => {
    const t0 = Date.now();
    get().log("SHADOW_ENCRYPT", "SHADOW_ENCRYPT_START", { payloadBytes, algorithm: "AES-256-GCM" });

    const { enc, dec } = mockEncryptLatency(payloadBytes);
    await new Promise<void>((r) => setTimeout(r, Math.ceil(enc + dec)));

    const degraded = enc > 18 || dec > 15;
    const result: ShadowEncryptResult = degraded ? "DEGRADED" : "OK";

    const record: ShadowLatencyRecord = {
      operationId:  busId(),
      timestamp:    t0,
      algorithm:    "AES-256-GCM",
      payloadBytes,
      encryptMs:    enc,
      decryptMs:    dec,
      result,
    };

    set((s) => ({
      shadowLatencies: [record, ...s.shadowLatencies].slice(0, 30),
    }));
    get().log(
      "SHADOW_ENCRYPT",
      degraded ? "SHADOW_ENCRYPT_DEGRADED" : "SHADOW_ENCRYPT_OK",
      { encryptMs: enc, decryptMs: dec, result },
      enc + dec,
    );
    return record;
  },

  // ── Offline queue snapshot ───────────────────────────────────────────────

  snapshotOfflineQueue: (items) => {
    const snap: OfflineQueueSnapshot = {
      snapshotId:    busId(),
      capturedAt:    Date.now(),
      pendingCount:  items.length,
      oldestItemAge: items.length
        ? Date.now() - Math.min(...items.map((i) => i.timestamp))
        : 0,
      totalBytes:    items.reduce((a, i) => a + i.sizeBytes, 0),
      items,
    };
    set((s) => ({
      offlineSnapshots: [snap, ...s.offlineSnapshots].slice(0, 10),
    }));
    get().log("OFFLINE_SYNC", "QUEUE_SNAPSHOT", {
      pendingCount: snap.pendingCount,
      totalBytes:   snap.totalBytes,
    });
  },

  setShadowMode: (active) => {
    set({ shadowModeActive: active });
    get().log("SHADOW_ENCRYPT", active ? "SHADOW_MODE_ENABLED" : "SHADOW_MODE_DISABLED", {});
  },

  // ── Background diagnostic loop (3-second sweep) ──────────────────────────

  startDiagnosticLoop: () => {
    if (_diagnosticInterval) return;
    set({ diagnosticLoopActive: true });

    get().log("EXEC_MARKER", "DIAGNOSTIC_LOOP_START", { bootAt: BOOT_AT });

    // initial WS handshake
    get().simulateWsHandshake();

    // WS keepalive every 25 s
    _wsHeartbeatInterval = setInterval(() => {
      const { wsStatus } = get();
      if (wsStatus === "DISCONNECTED" || wsStatus === "HANDSHAKE_FAILED") {
        get().simulateWsHandshake();
      } else {
        get().log("WS_HANDSHAKE", "WS_KEEPALIVE_PING", {
          wsStatus,
          upMs: Date.now() - BOOT_AT,
        });
      }
    }, 25_000);

    let markerIdx = 0;
    _diagnosticInterval = setInterval(() => {
      const upMs = Date.now() - BOOT_AT;
      set({ systemUpMs: upMs });

      const { marker, category } = HEALTH_MARKERS[markerIdx % HEALTH_MARKERS.length];
      markerIdx++;

      const payload: Record<string, unknown> = {
        upMs,
        tickIndex: markerIdx,
      };

      if (category === "SENSOR") {
        payload.sensorDriftMv = parseFloat((Math.random() * 2.4).toFixed(3));
      } else if (category === "EXEC_MARKER") {
        payload.heapUsedKb  = Math.floor(Math.random() * 400) + 80;
        payload.gcPressure  = Math.random() < 0.1 ? "HIGH" : "LOW";
      } else if (category === "OFFLINE_SYNC") {
        payload.queueDepth = Math.floor(Math.random() * 5);
      }

      get().log(category, marker, payload);
    }, 3_000);
  },

  stopDiagnosticLoop: () => {
    if (_diagnosticInterval) {
      clearInterval(_diagnosticInterval);
      _diagnosticInterval = null;
    }
    if (_wsHeartbeatInterval) {
      clearInterval(_wsHeartbeatInterval);
      _wsHeartbeatInterval = null;
    }
    set({ diagnosticLoopActive: false });
    get().log("EXEC_MARKER", "DIAGNOSTIC_LOOP_STOP", {});
  },

  clearEvents: () => set({ events: [], mutationDiffs: [], totalEventsLogged: 0 }),
}));
