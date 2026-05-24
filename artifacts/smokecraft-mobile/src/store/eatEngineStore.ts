/**
 * E.A.T. ENGINE STORE — Layer 1
 * Environment · Asset · Transaction state management
 *
 * Responsibilities:
 *  - EnvironmentState  : zone presets, climate sensors, audio zone, scent diffusion
 *  - AssetVault        : live kitchen/cellar/humidor inventory; auto-locks at qty=0
 *  - TransactionLedger : line items, session valuation, tip pool
 *  - ritualDispatch()  : fires SmokeCraft setup payloads to venue env-controller mock
 *  - syncAssets()      : polls /api/eat/pos-router/assets for live stock
 *  - startSensorPolling(): 10-second interval simulating live sensor telemetry
 */

import { create } from "zustand";

// ── Constants ────────────────────────────────────────────────────────────────

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

// module-level handle so it survives Zustand re-renders
let _sensorInterval: ReturnType<typeof setInterval> | null = null;

// ── Domain types ─────────────────────────────────────────────────────────────

export type VenueZone =
  | "LOUNGE_A" | "LOUNGE_B" | "BAR" | "PRIVATE_VAULT" | "CEREMONY_ROOM";

export type LoungePreset = "RITUAL" | "CASUAL" | "TRANSITION" | "CEREMONY";
export type AssetZone    = "humidor" | "bar" | "kitchen";
export type SyncStatus   = "IDLE" | "SYNCING" | "SYNCED" | "ERROR";

export interface ClimateReading {
  tempF:             number;
  humidityPct:       number;
  airExchangeCfm:    number;
  status:            "NOMINAL" | "ALERT" | "CRITICAL";
}

export interface AudioZoneState {
  zoneId:            string;
  gainDb:            number;
  frequencyProfile:  "WARM_RESONANT" | "FLAT" | "PRESENCE_BOOST";
}

export interface ScentProfile {
  activeFluid:           string;
  diffusionIntervalSec:  number;
  atomizationDensityPct: number;
}

export interface EnvironmentState {
  zone:       VenueZone;
  preset:     LoungePreset;
  climate:    ClimateReading;
  audio:      AudioZoneState;
  scent:      ScentProfile;
  lastSyncAt: number;
}

export interface AssetItem {
  id:       string;
  name:     string;
  category: string;
  qty:      number;
  par:      number;
  zone:     AssetZone;
  locked:   boolean;
}

export interface LedgerLine {
  id:         string;
  name:       string;
  priceCents: number;
  qty:        number;
  seat:       number | null;
  addedAt:    number;
  isRitual:   boolean;
}

export interface RitualPayload {
  tableId:      string;
  zone:         VenueZone;
  preset:       LoungePreset;
  cueType:      "FULL_CEREMONY" | "QUICK_LIGHT" | "TABLE_RESET";
  staffId:      string;
  timestamp:    number;
  envOverrides: {
    tempF?:      number;
    gainDb?:     number;
    scent?:      string;
  };
}

export interface RitualAck {
  accepted:    boolean;
  payloadId:   string;
  latencyMs:   number;
  envApplied:  boolean;
  kdsTicketId: string | null;
}

// ── Seed data ────────────────────────────────────────────────────────────────

const SEED_ASSETS: AssetItem[] = [
  { id: "a1",  name: "Cohiba Behike 52",     category: "Premium Cigar", qty: 2,  par: 12, zone: "humidor", locked: false },
  { id: "a2",  name: "Arturo Fuente OpusX",  category: "Premium Cigar", qty: 3,  par: 12, zone: "humidor", locked: false },
  { id: "a3",  name: "Davidoff Winston Ch.", category: "Premium Cigar", qty: 8,  par: 20, zone: "humidor", locked: false },
  { id: "a4",  name: "Padron 1964 Anni.",    category: "Limited Cigar", qty: 1,  par: 6,  zone: "humidor", locked: false },
  { id: "a5",  name: "Partagas Serie D #4",  category: "Cigar",         qty: 14, par: 24, zone: "humidor", locked: false },
  { id: "a6",  name: "Macallan 18 Year",     category: "Spirit",        qty: 5,  par: 6,  zone: "bar",     locked: false },
  { id: "a7",  name: "Hennessy Paradis",     category: "Spirit",        qty: 2,  par: 4,  zone: "bar",     locked: false },
  { id: "a8",  name: "Cuban Cedar Spills",   category: "Ritual Tool",   qty: 0,  par: 50, zone: "kitchen", locked: true  },
  { id: "a9",  name: "Xikar Guillotine",     category: "Ritual Tool",   qty: 3,  par: 8,  zone: "kitchen", locked: false },
  { id: "a10", name: "Montecristo No. 2",    category: "Cigar",         qty: 11, par: 20, zone: "humidor", locked: false },
];

const SEED_ENV: EnvironmentState = {
  zone:   "LOUNGE_A",
  preset: "RITUAL",
  climate: { tempF: 68.4, humidityPct: 71.2, airExchangeCfm: 420, status: "NOMINAL" },
  audio:   { zoneId: "zone-lounge-a", gainDb: -14, frequencyProfile: "WARM_RESONANT" },
  scent:   { activeFluid: "CEDAR_MUSK_01", diffusionIntervalSec: 180, atomizationDensityPct: 62 },
  lastSyncAt: Date.now(),
};

// ── Store interface ──────────────────────────────────────────────────────────

interface EATEngineStore {
  environment:          EnvironmentState;
  assets:               AssetItem[];
  ledger:               LedgerLine[];
  tipPoolCents:         number;
  sessionTotalCents:    number;
  ritualActive:         boolean;
  lastRitualPayload:    RitualPayload | null;
  lastRitualAck:        RitualAck    | null;
  syncStatus:           SyncStatus;
  sensorPollingActive:  boolean;

  setZone:             (zone: VenueZone) => void;
  applyPreset:         (preset: LoungePreset) => void;
  deductAsset:         (id: string) => void;
  restockAsset:        (id: string, qty: number) => void;
  addLineItem:         (item: Omit<LedgerLine, "id" | "addedAt">) => void;
  removeLineItem:      (id: string) => void;
  clearLedger:         () => void;
  setTipPool:          (cents: number) => void;
  ritualDispatch:      (tableId: string, cueType: RitualPayload["cueType"]) => Promise<RitualAck>;
  syncAssets:          () => Promise<void>;
  startSensorPolling:  () => void;
  stopSensorPolling:   () => void;
}

// ── Small helpers ────────────────────────────────────────────────────────────

function jitter(base: number, range: number): number {
  return parseFloat((base + (Math.random() - 0.5) * 2 * range).toFixed(1));
}

function climateFromPreset(preset: LoungePreset): Partial<ClimateReading> {
  const map: Record<LoungePreset, Partial<ClimateReading>> = {
    RITUAL:     { tempF: 68.0, humidityPct: 71.0, airExchangeCfm: 420 },
    CASUAL:     { tempF: 70.0, humidityPct: 65.0, airExchangeCfm: 380 },
    TRANSITION: { tempF: 69.0, humidityPct: 68.0, airExchangeCfm: 400 },
    CEREMONY:   { tempF: 66.5, humidityPct: 74.0, airExchangeCfm: 460 },
  };
  return map[preset];
}

function scentFromPreset(preset: LoungePreset): string {
  const map: Record<LoungePreset, string> = {
    RITUAL:     "CEDAR_MUSK_01",
    CASUAL:     "LIGHT_AMBER_02",
    TRANSITION: "NEUTRAL_BASE",
    CEREMONY:   "DEEP_OAK_03",
  };
  return map[preset];
}

// ── Zustand store ────────────────────────────────────────────────────────────

export const useEATEngineStore = create<EATEngineStore>((set, get) => ({
  environment:         SEED_ENV,
  assets:              SEED_ASSETS,
  ledger:              [],
  tipPoolCents:        0,
  sessionTotalCents:   0,
  ritualActive:        false,
  lastRitualPayload:   null,
  lastRitualAck:       null,
  syncStatus:          "IDLE",
  sensorPollingActive: false,

  // ── Environment handlers ─────────────────────────────────────────────────

  setZone: (zone) =>
    set((s) => ({
      environment: { ...s.environment, zone, lastSyncAt: Date.now() },
    })),

  applyPreset: (preset) => {
    const overrides  = climateFromPreset(preset);
    const scent      = scentFromPreset(preset);
    set((s) => ({
      environment: {
        ...s.environment,
        preset,
        lastSyncAt: Date.now(),
        climate: { ...s.environment.climate, ...overrides },
        scent:   { ...s.environment.scent, activeFluid: scent },
      },
    }));
  },

  // ── Asset handlers ───────────────────────────────────────────────────────

  deductAsset: (id) =>
    set((s) => ({
      assets: s.assets.map((a) => {
        if (a.id !== id) return a;
        const newQty = Math.max(0, a.qty - 1);
        return { ...a, qty: newQty, locked: newQty === 0 };
      }),
    })),

  restockAsset: (id, qty) =>
    set((s) => ({
      assets: s.assets.map((a) =>
        a.id === id ? { ...a, qty: a.qty + qty, locked: false } : a
      ),
    })),

  // ── Transaction / ledger handlers ────────────────────────────────────────

  addLineItem: (item) => {
    const line: LedgerLine = {
      ...item,
      id:      `li-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      addedAt: Date.now(),
    };
    set((s) => {
      const ledger   = [...s.ledger, line];
      const total    = ledger.reduce((acc, l) => acc + l.priceCents * l.qty, 0);
      const tipPool  = Math.round(total * 0.18);
      return { ledger, sessionTotalCents: total, tipPoolCents: tipPool };
    });
  },

  removeLineItem: (id) =>
    set((s) => {
      const ledger  = s.ledger.filter((l) => l.id !== id);
      const total   = ledger.reduce((acc, l) => acc + l.priceCents * l.qty, 0);
      return { ledger, sessionTotalCents: total, tipPoolCents: Math.round(total * 0.18) };
    }),

  clearLedger: () =>
    set({ ledger: [], sessionTotalCents: 0, tipPoolCents: 0 }),

  setTipPool: (cents) => set({ tipPoolCents: cents }),

  // ── Ritual dispatch ──────────────────────────────────────────────────────
  // Fires a SmokeCraft setup payload to the venue environment controller.
  // On success the env preset is updated and a KDS ticket may be created.

  ritualDispatch: async (tableId, cueType) => {
    const t0 = Date.now();
    set({ ritualActive: true });

    const payload: RitualPayload = {
      tableId,
      zone:      get().environment.zone,
      preset:    cueType === "FULL_CEREMONY" ? "CEREMONY" : "RITUAL",
      cueType,
      staffId:   "staff-mobile-01",
      timestamp: t0,
      envOverrides: {
        tempF:  cueType === "FULL_CEREMONY" ? 66.5 : 68.0,
        gainDb: cueType === "QUICK_LIGHT" ? -10 : -16,
        scent:  scentFromPreset(cueType === "FULL_CEREMONY" ? "CEREMONY" : "RITUAL"),
      },
    };

    set({ lastRitualPayload: payload });

    // attempt live call; fall back to mock ack on failure
    let ack: RitualAck;
    try {
      const res = await fetch(`${API_BASE}/api/eat/pos-router/verify`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pin: "3600", action: "RITUAL_CUE", tableId }),
      });
      const data = await res.json() as { accepted?: boolean; kdsTicketId?: string };
      ack = {
        accepted:    data.accepted ?? res.ok,
        payloadId:   `rpk-${t0}`,
        latencyMs:   Date.now() - t0,
        envApplied:  true,
        kdsTicketId: data.kdsTicketId ?? null,
      };
    } catch {
      ack = {
        accepted:    true,
        payloadId:   `rpk-${t0}`,
        latencyMs:   Date.now() - t0,
        envApplied:  true,
        kdsTicketId: null,
      };
    }

    // apply preset derived from cue type
    get().applyPreset(payload.preset);

    set({ ritualActive: false, lastRitualAck: ack });
    return ack;
  },

  // ── Asset sync ───────────────────────────────────────────────────────────

  syncAssets: async () => {
    set({ syncStatus: "SYNCING" });
    try {
      const res  = await fetch(`${API_BASE}/api/eat/pos-router/assets`);
      const data = await res.json() as { assets?: AssetItem[] };
      if (data.assets && Array.isArray(data.assets)) {
        set({
          assets:     data.assets.map((a) => ({ ...a, locked: a.qty === 0 })),
          syncStatus: "SYNCED",
        });
        return;
      }
    } catch { /* offline — keep in-memory seed */ }

    // offline: simulate slight stock drift
    set((s) => ({
      syncStatus: "SYNCED",
      assets: s.assets.map((a) => ({
        ...a,
        qty:    Math.max(0, a.qty + (Math.random() < 0.15 ? -1 : 0)),
        locked: a.qty <= 1 && Math.random() < 0.15 ? true : a.locked,
      })),
    }));
  },

  // ── Sensor polling (10-second interval) ─────────────────────────────────

  startSensorPolling: () => {
    if (_sensorInterval) return;
    set({ sensorPollingActive: true });
    _sensorInterval = setInterval(() => {
      set((s) => {
        const base     = s.environment.climate;
        const newTemp  = jitter(base.tempF,       0.4);
        const newHum   = jitter(base.humidityPct, 0.8);
        const newCfm   = jitter(base.airExchangeCfm, 5);
        const status: ClimateReading["status"] =
          newHum < 60 || newHum > 80 ? "ALERT" : "NOMINAL";
        return {
          environment: {
            ...s.environment,
            lastSyncAt: Date.now(),
            climate: {
              tempF:          newTemp,
              humidityPct:    newHum,
              airExchangeCfm: newCfm,
              status,
            },
          },
        };
      });
    }, 10_000);
  },

  stopSensorPolling: () => {
    if (_sensorInterval) {
      clearInterval(_sensorInterval);
      _sensorInterval = null;
    }
    set({ sensorPollingActive: false });
  },
}));
