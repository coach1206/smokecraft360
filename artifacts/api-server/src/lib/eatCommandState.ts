import { randomUUID } from "crypto";
import { logger } from "./logger";

// ══════════════════════════════════════════════════════════════════════════════
// DOMAIN TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface POSItem {
  id: string;
  name: string;
  price: number;
  stockCount: number;
  category: "lounge" | "kitchen" | "cellar";
  locked: boolean;
}

export interface TelemetryPacket {
  id: string;
  timestamp: number;
  system: "EAT_ENGINE" | "COMMAND_CENTER" | "DEV_DASHBOARD";
  level: "INFO" | "WARN" | "CRITICAL";
  message: string;
  payload?: unknown;
}

export interface TablePacingEntry {
  tableId: string;
  status: "idle" | "seated" | "ordering" | "eating" | "settling";
  seatedAt: number | null;
  coverCount: number;
  grossCents: number;
  lastUpdated: number;
}

export interface SessionMetric {
  sessionId: string;
  venueId: string;
  tableId: string;
  startedAt: number;
  endedAt: number | null;
  grossCents: number;
  itemCount: number;
  ritualCount: number;
  status: "open" | "closed" | "voided";
}

export interface MutationRecord {
  id: string;
  timestamp: number;
  route: string;
  method: string;
  latencyMs: number;
  statusCode: number;
  payloadValid: boolean;
}

export interface WsPingRecord {
  socketId: string;
  timestamp: number;
  rttMs: number;
}

export interface ShadowQueueEntry {
  id: string;
  queuedAt: number;
  tableId: string;
  itemId: string;
  amountCents: number;
  transactionToken: string;
  status: "pending" | "flushed" | "failed";
  flushedAt: number | null;
  error: string | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// LIVE STATE STORES
// ══════════════════════════════════════════════════════════════════════════════

export const assetInventory: POSItem[] = [
  { id: "1", name: "Arturo Fuente Opus X",        price: 45.00,  stockCount: 2, category: "lounge",  locked: false },
  { id: "2", name: "Davidoff Late Hour Churchill", price: 38.00,  stockCount: 8, category: "lounge",  locked: false },
  { id: "3", name: "Wagyu Strip Steak A5",         price: 120.00, stockCount: 0, category: "kitchen", locked: true  },
  { id: "4", name: "Macallan 25 Year Pour",        price: 250.00, stockCount: 5, category: "cellar",  locked: false },
];

export const commandCenterMetrics = {
  activeTables:     4,
  activeRituals:    0,
  hourlyGross:      1420.00,
  systemLatency:    "2ms",
  sessionsOpen:     0,
  shadowQueueDepth: 0,
};

export const tablePacing = new Map<string, TablePacingEntry>([
  ["T-1", { tableId: "T-1", status: "eating",   seatedAt: Date.now() - 42 * 60_000, coverCount: 2, grossCents: 9800,  lastUpdated: Date.now() }],
  ["T-2", { tableId: "T-2", status: "ordering", seatedAt: Date.now() - 18 * 60_000, coverCount: 4, grossCents: 4500,  lastUpdated: Date.now() }],
  ["T-3", { tableId: "T-3", status: "idle",     seatedAt: null,                      coverCount: 0, grossCents: 0,     lastUpdated: Date.now() }],
  ["T-4", { tableId: "T-4", status: "settling", seatedAt: Date.now() - 70 * 60_000, coverCount: 3, grossCents: 28750, lastUpdated: Date.now() }],
]);

export const activeSessions = new Map<string, SessionMetric>();

// ══════════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC RING BUFFERS
// ══════════════════════════════════════════════════════════════════════════════

export const developerLogBuffer: TelemetryPacket[] = [];
const MAX_LOG  = 100;

export const mutationLog: MutationRecord[] = [];
const MAX_MUT  = 200;

export const wsPingLog: WsPingRecord[] = [];
const MAX_PING = 50;

export const shadowQueue: ShadowQueueEntry[] = [];

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export function pushTelemetry(packet: Omit<TelemetryPacket, "id">): void {
  const full: TelemetryPacket = { id: randomUUID(), ...packet };
  developerLogBuffer.unshift(full);
  if (developerLogBuffer.length > MAX_LOG) developerLogBuffer.pop();

  if (packet.level === "INFO") {
    logger.info({ system: packet.system, payload: packet.payload }, packet.message);
  } else if (packet.level === "WARN") {
    logger.warn({ system: packet.system, payload: packet.payload }, packet.message);
  } else {
    logger.error({ system: packet.system, payload: packet.payload }, packet.message);
  }
}

export function trackMutation(record: Omit<MutationRecord, "id">): void {
  mutationLog.unshift({ id: randomUUID(), ...record });
  if (mutationLog.length > MAX_MUT) mutationLog.pop();

  // Keep systemLatency in sync with a rolling 20-sample average
  const recent = mutationLog.slice(0, 20);
  const avg = recent.reduce((s, r) => s + r.latencyMs, 0) / recent.length;
  commandCenterMetrics.systemLatency = `${avg.toFixed(1)}ms`;
}

export function recordPing(socketId: string, rttMs: number): void {
  wsPingLog.unshift({ socketId, timestamp: Date.now(), rttMs });
  if (wsPingLog.length > MAX_PING) wsPingLog.pop();
}

/** Latency percentile stats over the last N mutation records. */
export function getMutationStats(n = 100): {
  count: number; avgMs: number; p50Ms: number; p95Ms: number; p99Ms: number; maxMs: number;
} {
  const slice = mutationLog.slice(0, n).map((r) => r.latencyMs).sort((a, b) => a - b);
  if (slice.length === 0) return { count: 0, avgMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, maxMs: 0 };
  const p = (pct: number) =>
    slice[Math.min(Math.ceil((pct / 100) * slice.length) - 1, slice.length - 1)];
  return {
    count: slice.length,
    avgMs: Number((slice.reduce((s, v) => s + v, 0) / slice.length).toFixed(2)),
    p50Ms: p(50),
    p95Ms: p(95),
    p99Ms: p(99),
    maxMs: slice[slice.length - 1],
  };
}

/** RTT percentile stats across the last N ping records. */
export function getWsPingStats(n = 50): {
  count: number; avgMs: number; p95Ms: number; maxMs: number;
} {
  const slice = wsPingLog.slice(0, n).map((r) => r.rttMs).sort((a, b) => a - b);
  if (slice.length === 0) return { count: 0, avgMs: 0, p95Ms: 0, maxMs: 0 };
  const p = (pct: number) =>
    slice[Math.min(Math.ceil((pct / 100) * slice.length) - 1, slice.length - 1)];
  return {
    count: slice.length,
    avgMs: Number((slice.reduce((s, v) => s + v, 0) / slice.length).toFixed(2)),
    p95Ms: p(95),
    maxMs: slice[slice.length - 1],
  };
}

/** Sync asset lock state with stock count. Call before any inventory read. */
export function syncAssetLocks(): void {
  for (const item of assetInventory) {
    item.locked = item.stockCount <= 0;
  }
}
