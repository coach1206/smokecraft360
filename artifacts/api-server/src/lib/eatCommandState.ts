import { logger } from "./logger";

// ── Types ────────────────────────────────────────────────────────────────────

export interface POSItem {
  id: string;
  name: string;
  price: number;
  stockCount: number;
  category: "lounge" | "kitchen" | "cellar";
}

export interface TelemetryPacket {
  timestamp: number;
  system: "EAT_ENGINE" | "COMMAND_CENTER" | "DEV_DASHBOARD";
  level: "INFO" | "WARN" | "CRITICAL";
  message: string;
  payload?: unknown;
}

// ── In-memory asset ledger ───────────────────────────────────────────────────

export const assetInventory: POSItem[] = [
  { id: "1", name: "Arturo Fuente Opus X",        price: 45.00,  stockCount: 2, category: "lounge"  },
  { id: "2", name: "Davidoff Late Hour Churchill", price: 38.00,  stockCount: 8, category: "lounge"  },
  { id: "3", name: "Wagyu Strip Steak A5",         price: 120.00, stockCount: 0, category: "kitchen" },
  { id: "4", name: "Macallan 25 Year Pour",        price: 250.00, stockCount: 5, category: "cellar"  },
];

// ── Command Center metrics ledger ────────────────────────────────────────────

export const commandCenterMetrics = {
  activeTables:  4,
  activeRituals: 0,
  hourlyGross:   1420.00,
  systemLatency: "2ms",
};

// ── Telemetry ring buffer (100-entry cap) ────────────────────────────────────

export const developerLogBuffer: TelemetryPacket[] = [];
const MAX_LOG_BUFFER = 100;

export function pushTelemetry(packet: TelemetryPacket): void {
  developerLogBuffer.unshift(packet);
  if (developerLogBuffer.length > MAX_LOG_BUFFER) developerLogBuffer.pop();

  if (packet.level === "INFO") {
    logger.info({ system: packet.system, payload: packet.payload }, packet.message);
  } else if (packet.level === "WARN") {
    logger.warn({ system: packet.system, payload: packet.payload }, packet.message);
  } else {
    logger.error({ system: packet.system, payload: packet.payload }, packet.message);
  }
}
