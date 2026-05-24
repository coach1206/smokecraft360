/**
 * COMMAND CENTER TELEMETRY STORE — Layer 2
 * Live reporting pipeline → venue Command Center
 *
 * Responsibilities:
 *  - Typed CmdEvent union (TABLE_PACING_ALERT · SESSION_UPDATE ·
 *    VOLUME_SHIFT · TIP_POOL_ALLOC · RITUAL_BROADCAST)
 *  - Event queue with push() — non-blocking, synchronous
 *  - Stream lifecycle: startStream() / stopStream()
 *    → 5-second interval flushes queue, "transmits" to Command Center
 *  - transmissionLog: last 20 batches with simulated ACK latency
 *  - autoEvents: background interval seeds realistic venue events
 */

import { create } from "zustand";

// ── Module-level interval handles ────────────────────────────────────────────

let _streamInterval:    ReturnType<typeof setInterval> | null = null;
let _autoEventInterval: ReturnType<typeof setInterval> | null = null;

// ── Domain types ─────────────────────────────────────────────────────────────

export type CmdEventType =
  | "TABLE_PACING_ALERT"
  | "SESSION_UPDATE"
  | "VOLUME_SHIFT"
  | "TIP_POOL_ALLOC"
  | "RITUAL_BROADCAST"
  | "ASSET_LOCK"
  | "STAFF_ALERT";

export type CmdEventSeverity = "INFO" | "WARN" | "CRITICAL";

interface TablePacingAlert {
  type:        "TABLE_PACING_ALERT";
  tableId:     string;
  seatedMin:   number;
  targetMin:   number;
  paceScore:   number;
  severity:    CmdEventSeverity;
}

interface SessionUpdate {
  type:        "SESSION_UPDATE";
  sessionId:   string;
  tableId:     string;
  totalCents:  number;
  itemCount:   number;
  phase:       "OPENED" | "ACTIVE" | "CLOSING" | "SETTLED";
}

interface VolumeShift {
  type:        "VOLUME_SHIFT";
  direction:   "UP" | "DOWN";
  deltaCents:  number;
  windowMin:   number;
  trigger:     string;
}

interface TipPoolAlloc {
  type:          "TIP_POOL_ALLOC";
  poolCents:     number;
  staffCount:    number;
  perStaffCents: number;
  allocatedAt:   number;
}

interface RitualBroadcast {
  type:      "RITUAL_BROADCAST";
  tableId:   string;
  cueType:   string;
  payloadId: string;
  latencyMs: number;
}

interface AssetLockEvent {
  type:       "ASSET_LOCK";
  assetId:    string;
  assetName:  string;
  zone:       string;
  newQty:     number;
}

interface StaffAlert {
  type:      "STAFF_ALERT";
  staffId:   string;
  message:   string;
  severity:  CmdEventSeverity;
}

export type CmdEventPayload =
  | TablePacingAlert
  | SessionUpdate
  | VolumeShift
  | TipPoolAlloc
  | RitualBroadcast
  | AssetLockEvent
  | StaffAlert;

export type CmdEvent = CmdEventPayload & {
  id:        string;
  venueId:   string;
  timestamp: number;
};

export interface TransmittedBatch {
  batchId:      string;
  sentAt:       number;
  eventCount:   number;
  ackLatencyMs: number;
  status:       "ACK" | "TIMEOUT" | "REJECTED";
  eventTypes:   CmdEventType[];
}

// ── Store interface ──────────────────────────────────────────────────────────

interface CmdTelemetryStore {
  eventQueue:         CmdEvent[];
  transmissionLog:    TransmittedBatch[];
  streamActive:       boolean;
  autoEventsActive:   boolean;
  totalEventsPushed:  number;
  totalBatchesSent:   number;
  lastTransmitAt:     number | null;
  cmdCenterOnline:    boolean;

  push:               (event: CmdEventPayload) => void;
  startStream:        () => void;
  stopStream:         () => void;
  startAutoEvents:    () => void;
  stopAutoEvents:     () => void;
  clearLog:           () => void;
  setCmdCenterOnline: (v: boolean) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const VENUE_ID = "venue-smokecraft-01";

function makeId(): string {
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const TABLE_IDS  = ["A1", "A2", "A3", "A4", "A5", "B5", "B7", "PL-1"];
const AUTO_CYCLE: Array<() => CmdEventPayload> = [
  (): TablePacingAlert => ({
    type:      "TABLE_PACING_ALERT",
    tableId:   TABLE_IDS[Math.floor(Math.random() * TABLE_IDS.length)],
    seatedMin: Math.floor(Math.random() * 90) + 20,
    targetMin: 75,
    paceScore: Math.floor(Math.random() * 40) + 50,
    severity:  Math.random() > 0.7 ? "WARN" : "INFO",
  }),

  (): SessionUpdate => ({
    type:       "SESSION_UPDATE",
    sessionId:  `sess-${Math.floor(Math.random() * 9000) + 1000}`,
    tableId:    TABLE_IDS[Math.floor(Math.random() * TABLE_IDS.length)],
    totalCents: Math.floor(Math.random() * 80000) + 12000,
    itemCount:  Math.floor(Math.random() * 8) + 1,
    phase:      (["OPENED", "ACTIVE", "CLOSING", "SETTLED"] as const)[Math.floor(Math.random() * 4)],
  }),

  (): VolumeShift => ({
    type:       "VOLUME_SHIFT",
    direction:  Math.random() > 0.4 ? "UP" : "DOWN",
    deltaCents: Math.floor(Math.random() * 15000) + 1000,
    windowMin:  15,
    trigger:    ["ritual_order", "walk-in_burst", "locker_open", "bar_tab"][Math.floor(Math.random() * 4)],
  }),

  (): TipPoolAlloc => {
    const pool  = Math.floor(Math.random() * 40000) + 8000;
    const staff = Math.floor(Math.random() * 3) + 2;
    return {
      type:          "TIP_POOL_ALLOC",
      poolCents:     pool,
      staffCount:    staff,
      perStaffCents: Math.floor(pool / staff),
      allocatedAt:   Date.now(),
    };
  },
];

// ── Mock "transmit to Command Center" ────────────────────────────────────────

async function mockTransmit(events: CmdEvent[]): Promise<TransmittedBatch> {
  const t0       = Date.now();
  const latency  = Math.floor(Math.random() * 80) + 18;
  await new Promise<void>((r) => setTimeout(r, latency));
  const timedOut = Math.random() < 0.04;
  return {
    batchId:      `batch-${t0}`,
    sentAt:       t0,
    eventCount:   events.length,
    ackLatencyMs: Date.now() - t0,
    status:       timedOut ? "TIMEOUT" : "ACK",
    eventTypes:   [...new Set(events.map((e) => e.type))],
  };
}

// ── Zustand store ────────────────────────────────────────────────────────────

export const useCmdTelemetryStore = create<CmdTelemetryStore>((set, get) => ({
  eventQueue:        [],
  transmissionLog:   [],
  streamActive:      false,
  autoEventsActive:  false,
  totalEventsPushed: 0,
  totalBatchesSent:  0,
  lastTransmitAt:    null,
  cmdCenterOnline:   true,

  // ── Push a typed event onto the queue ────────────────────────────────────

  push: (partial) => {
    const event: CmdEvent = {
      ...partial,
      id:        makeId(),
      venueId:   VENUE_ID,
      timestamp: Date.now(),
    } as CmdEvent;

    set((s) => ({
      eventQueue:        [...s.eventQueue, event],
      totalEventsPushed: s.totalEventsPushed + 1,
    }));
  },

  // ── Stream lifecycle ─────────────────────────────────────────────────────
  // Every 5 s: flush queue → mock transmit → append to log (cap 20)

  startStream: () => {
    if (_streamInterval) return;
    set({ streamActive: true });

    _streamInterval = setInterval(async () => {
      const { eventQueue, cmdCenterOnline } = get();
      if (eventQueue.length === 0 || !cmdCenterOnline) return;

      const batch = [...eventQueue];
      set({ eventQueue: [] });

      try {
        const result = await mockTransmit(batch);
        set((s) => ({
          transmissionLog: [result, ...s.transmissionLog].slice(0, 20),
          totalBatchesSent: s.totalBatchesSent + 1,
          lastTransmitAt:   Date.now(),
        }));
      } catch {
        // re-queue on failure
        set((s) => ({ eventQueue: [...batch, ...s.eventQueue] }));
      }
    }, 5_000);
  },

  stopStream: () => {
    if (_streamInterval) {
      clearInterval(_streamInterval);
      _streamInterval = null;
    }
    set({ streamActive: false });
  },

  // ── Auto-event seeder (background venue simulation) ──────────────────────

  startAutoEvents: () => {
    if (_autoEventInterval) return;
    set({ autoEventsActive: true });

    // seed an initial burst so the UI has data immediately
    const { push } = get();
    AUTO_CYCLE.forEach((factory) => push(factory()));

    _autoEventInterval = setInterval(() => {
      const factory = AUTO_CYCLE[Math.floor(Math.random() * AUTO_CYCLE.length)];
      get().push(factory());
    }, 7_000);
  },

  stopAutoEvents: () => {
    if (_autoEventInterval) {
      clearInterval(_autoEventInterval);
      _autoEventInterval = null;
    }
    set({ autoEventsActive: false });
  },

  clearLog: () => set({ transmissionLog: [], eventQueue: [] }),

  setCmdCenterOnline: (v) => set({ cmdCenterOnline: v }),
}));
