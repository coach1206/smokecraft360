/**
 * StaffTerminal — STAGE_5_OPERATIONS
 * Fully wired: venueState engine + live API integration
 *   GET  /api/products?category=cigar|alcohol  → seed telemetry
 *   PATCH /api/products/:id { qty }            → stock deduction on every item mutation
 *   POST  /api/pos/order                       → PROCESS PAYMENT submission
 *   GET   /api/pos/providers                   → live POS hub status
 *   15-min sync refreshes product inventory
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

// ── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  base: "#020202", glass: "rgba(10,10,10,0.90)", glass2: "rgba(16,16,16,0.95)",
  gold: "#D4AF37", goldDim: "rgba(212,175,55,0.14)", goldGlo: "rgba(212,175,55,0.36)",
  amber: "#E6A11D", chrome: "#2A2A2A", dark: "#0C0C0C", white: "#FFFFFF",
  cream: "#F0E8D8", muted: "rgba(195,188,178,0.55)", red: "#C0392B",
  redLo: "rgba(192,57,43,0.20)", redHi: "#E74C3C", green: "#27AE60",
  orange: "#E67E22", blue: "#5B8DEF", purple: "#A78BFA",
  sans: "'Inter','SF Pro Display',sans-serif",
  mono: "'JetBrains Mono','Courier New',monospace",
};
const BASE = import.meta.env.BASE_URL;
const IMG = (n: string) => `${BASE}images/${n}`;
const T = {
  onTouchStart: (e: React.TouchEvent) => { (e.currentTarget as HTMLElement).style.opacity = "0.75"; },
  onTouchEnd:   (e: React.TouchEvent) => { (e.currentTarget as HTMLElement).style.opacity = "1"; },
};
const panel = (x: React.CSSProperties = {}): React.CSSProperties => ({
  background: C.glass, backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
  border: `1px solid ${C.chrome}`, borderRadius: 8, overflow: "hidden", ...x,
});

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const P = {
  leaf:    "M17 8C8 10 5.9 16.17 3.82 19.43L2 22l1-1c1-1 4.87-4.23 10.9-6.65 2.1-.82 4.5-1.4 7.1-1.35C22 13 22 11 22 10c0-5.52-4.48-10-10-10C7.56 0 4 2.64 4 2.64S3 6 5 8c1.43 1.43 4 2 12 0z",
  cocktail:"M18.5 2h-13l5.5 9.5V20H8v2h8v-2h-3V11.5L18.5 2zm-9.91 2h6.82l-1.42 2.45H10.01L8.59 4z",
  house:   "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  utensils:"M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z",
  warn:    "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  thermo:  "M17 12.17V4c0-2.76-2.24-5-5-5S7 1.24 7 4v8.17C5.22 13.33 4 15.29 4 17.5 4 20.54 6.46 23 9.5 23h5c3.04 0 5.5-2.46 5.5-5.5 0-2.21-1.22-4.17-3-5.33z",
  drop:    "M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2C20 10.48 17.33 6.55 12 2z",
  list:    "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z",
  filter:  "M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z",
  wifi:    "M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 0 0-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z",
  star:    "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  receipt: "M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z",
  credit:  "M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z",
  check:   "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  sync:    "M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z",
  pos:     "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM7.5 17H6v-7h1.5v7zm3.5 0H9.5v-7H11v7zm3.5 0H13v-7h1.5v7zm2 0H17v-7h.5v7zM4 9V7h16v2H4z",
  addUser: "M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  calendar:"M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z",
  plus:    "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  close2:  "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  box:     "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
  grid:    "M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z",
  signal:  "M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 0 0-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z",
  lock:    "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
  shield:  "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z",
  map:     "M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z",
};
function Icon({ d, size = 16, color = C.muted }: { d: string; size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}><path d={d} /></svg>;
}

// ── API Types ─────────────────────────────────────────────────────────────────
interface ApiProduct {
  id: string; name: string; category: string;
  qty: number; par: number; tier: string;
  boostLevel: number; sponsored: boolean;
}
interface PosProvider {
  provider: string; displayName: string;
  capabilities: { supportsInventorySync: boolean; supportsWebhooks: boolean; supportsOrderPush: boolean; };
}
interface StaffMember {
  staffId: string; staffName: string;
  assignedSection: string | null; assignedTables: string | null;
  isActive: boolean; createdAt?: string;
}
interface PosWebhookEvent {
  id: string; provider: string; eventType: string; status: string;
  rawPayload: Record<string, unknown> | null; createdAt: string;
}
interface LocalReservation {
  id: string; guestName: string; partySize: number;
  requestedAt: string; status: "pending" | "accepted" | "fulfilled";
  productName: string | null; tableAssigned: number | null;
}
interface PurchaseOrderResult { id: string; productId: string; quantity: number; status: string; }
type PaymentState = "idle" | "processing" | "success" | "error";

// ── Product Catalog — local product registry for menu mapper ──────────────────
const PRODUCT_CATALOG = [
  { sku: "sku_rp_1992",  productId: "cigar-005", name: "Rocky Patel Vintage 1992",  category: "Cigars"  },
  { sku: "sku_p64",      productId: "cigar-002", name: "Padron 1964 Anniversary",    category: "Cigars"  },
  { sku: "sku_af_gr",    productId: "cigar-001", name: "Arturo Fuente Gran Reserva", category: "Cigars"  },
  { sku: "sku_bt_bourb", productId: "alc-001",   name: "Buffalo Trace Bourbon",      category: "Spirits" },
  { sku: "sku_mac12",    productId: "alc-004",   name: "Macallan 12yr Scotch",       category: "Spirits" },
  { sku: "sku_rm_xo",    productId: "alc-001",   name: "Remy Martin XO Cognac",      category: "Spirits" },
] as const;

const SEED_RESERVATIONS: LocalReservation[] = [
  { id: "r1", guestName: "The Richards Party",  partySize: 4, requestedAt: "Tonight 7:30 PM", status: "accepted",  productName: "Padron 1964 Reserve",  tableAssigned: null },
  { id: "r2", guestName: "Victoria M.",         partySize: 2, requestedAt: "Tonight 8:00 PM", status: "accepted",  productName: null,                    tableAssigned: null },
  { id: "r3", guestName: "The Chen Group",      partySize: 6, requestedAt: "Tonight 9:00 PM", status: "pending",   productName: "Arturo Fuente Reserve", tableAssigned: null },
  { id: "r4", guestName: "Mr. & Mrs. Harlow",   partySize: 2, requestedAt: "Tonight 9:30 PM", status: "pending",   productName: null,                    tableAssigned: null },
];

// SKU → real product ID (from GET /api/products)
const SKU_TO_PRODUCT: Record<string, string> = {
  sku_rp_1992:  "cigar-005",
  sku_bt_bourb: "alc-001",
  sku_rm_xo:    "alc-001",
  sku_p64:      "cigar-002",
  sku_mac12:    "alc-004",
  sku_af_gr:    "cigar-001",
};

// ── Live API Service ──────────────────────────────────────────────────────────
const api = {
  products: async (category: string): Promise<ApiProduct[]> => {
    try {
      const r = await fetch(`/api/products?category=${category}`);
      if (!r.ok) return [];
      return r.json();
    } catch { return []; }
  },
  patchQty: async (productId: string, qty: number): Promise<void> => {
    try {
      await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: Math.max(0, qty) }),
      });
    } catch { /* fire-and-forget */ }
  },
  submitOrder: async (payload: object): Promise<{ ok: boolean; error?: string }> => {
    try {
      const r = await fetch("/api/pos/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
  providers: async (): Promise<PosProvider[]> => {
    try {
      const r = await fetch("/api/pos/providers");
      if (!r.ok) return [];
      const j = await r.json();
      return j.providers ?? [];
    } catch { return []; }
  },
  posEvents: async (since: string): Promise<PosWebhookEvent[]> => {
    try {
      const r = await fetch(`/api/pos/events/recent?since=${encodeURIComponent(since)}`);
      if (!r.ok) return [];
      const j = await r.json();
      return j.events ?? [];
    } catch { return []; }
  },
  staffRoster: async (): Promise<StaffMember[]> => {
    try {
      const r = await fetch("/api/staff/roster");
      if (!r.ok) return [];
      const j = await r.json();
      return j.staff ?? [];
    } catch { return []; }
  },
  addStaff: async (data: { staffName: string; staffPin: string; assignedSection?: string }): Promise<StaffMember | null> => {
    try {
      const r = await fetch("/api/staff/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) return null;
      const j = await r.json();
      return j.member ?? null;
    } catch { return null; }
  },
  patchStaff: async (id: string, data: { isActive?: boolean; assignedSection?: string }): Promise<void> => {
    try {
      await fetch(`/api/staff/roster/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch { /* fire-and-forget */ }
  },
  generateOrder: async (productId: string, qty: number): Promise<PurchaseOrderResult | null> => {
    try {
      const r = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: "auto", productId, quantity: qty }),
      });
      if (!r.ok) return null;
      const j = await r.json();
      return j.order ?? null;
    } catch { return null; }
  },
  fetchZoneAssignments: async (): Promise<{ assignments: Array<{ staffId: string; staffName: string; assignedSection: string | null; assignedTables: string[] | null }> }> => {
    try {
      const r = await fetch("/api/staff/zone-assignments");
      if (!r.ok) return { assignments: [] };
      return await r.json() as { assignments: Array<{ staffId: string; staffName: string; assignedSection: string | null; assignedTables: string[] | null }> };
    } catch { return { assignments: [] }; }
  },
  reportHeartbeat: async (payload: { deviceId: string; batteryPct: number | null; networkLatencyMs: number; retryQueueDepth: number; venueId?: string }): Promise<void> => {
    try {
      await fetch("/api/devices/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch { /* non-critical */ }
  },
  reportArrEvent: async (totalCents: number, venueId?: string): Promise<void> => {
    try {
      await fetch("/api/analytics/arr-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalCents, venueId }),
      });
    } catch { /* non-critical */ }
  },
  fetchContextCoaching: async (): Promise<{ cue: string; tag: string; accent: string } | null> => {
    try {
      const r = await fetch("/api/staff/context-coaching");
      if (!r.ok) return null;
      const j = await r.json() as { suggestion: { cue: string; tag: string; accent: string } };
      return j.suggestion ?? null;
    } catch { return null; }
  },
  validatePin: async (pin: string, level: "supervisor" | "admin"): Promise<{ ok: boolean; staffName?: string }> => {
    try {
      const r = await fetch("/api/staff/validate-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, level }),
      });
      if (!r.ok) return { ok: false };
      return await r.json() as { ok: boolean; staffName?: string };
    } catch { return { ok: false }; }
  },
  saveMapping: async (eeisProdId: string, eeisName: string, posProdId: string): Promise<boolean> => {
    try {
      const r = await fetch("/api/pos/menu-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: "00000000-0000-0000-0000-000000000001",
          provider: "clover",
          eeisProdId, eeisName, posProdId, posName: eeisName,
        }),
      });
      return r.ok || r.status === 401;
    } catch { return false; }
  },
};

// ── State Types ───────────────────────────────────────────────────────────────
interface VenueItem  { id: string; name: string; qty: number; price: number; category: string; img?: string; }
interface VenueTable { id: number; guest: string; zone: string; timeStarted: string; items: VenueItem[]; reserved?: boolean; reservationGuest?: string; }
interface HumidorState { purosRemaining: number; temperature: number; humidity: number; targetHumidity: number; alertMargin: number; }
interface BarState    { activePourSessions: number; lowStockAlerts: { item: string; category: string; currentVolumePct: number }[]; }
interface KitchenState{ pendingOrders: number; readyOrders: number; }
interface VenueState {
  activeTables: Record<number, VenueTable>;
  telemetry: { humidor: HumidorState; bar: BarState; kitchen: KitchenState; };
  selectedTableId: number;
  syncIntervalMinutes: number;
  lastSyncAt: Date;
}

const ZONE_BG: Record<string, string> = {
  "VIP Section": IMG("scenes/smokecraft-card.jpg"),
  "Main Floor":  IMG("scenes/pourcraft-card.jpg"),
  "Main Lounge": IMG("scenes/bold.jpg"),
  "Outdoor":     IMG("scenes/relaxed.jpg"),
};
const zoneBg = (zone: string) => ZONE_BG[zone] ?? IMG("scenes/craft-hub.jpg");

// ── Initial State ─────────────────────────────────────────────────────────────
const INITIAL: VenueState = {
  selectedTableId: 101, syncIntervalMinutes: 15, lastSyncAt: new Date(),
  activeTables: {
    101: { id: 101, guest: "John D.", zone: "VIP Section",
      timeStarted: new Date(Date.now() - 6_120_000).toISOString(),
      items: [
        { id: "sku_rp_1992",  name: "Rocky Patel Vintage 1992", qty: 1, price: 42, category: "Cigars",  img: IMG("cigar1.png") },
        { id: "sku_bt_bourb", name: "Buffalo Trace Bourbon",     qty: 2, price: 32, category: "Spirits", img: IMG("pour/pour_whiskey.png") },
        { id: "sku_rm_xo",    name: "Remy Martin XO",           qty: 1, price: 48, category: "Spirits", img: IMG("pour/pour_aged.png") },
        { id: "sku_ap_water", name: "Acqua Panna",               qty: 2, price:  8, category: "Water" },
      ],
    },
    102: { id: 102, guest: "Maria S.", zone: "Main Floor",
      timeStarted: new Date(Date.now() - 3_420_000).toISOString(),
      items: [
        { id: "sku_p64",   name: "Padron 1964 Anniversary",  qty: 1, price: 48, category: "Cigars",  img: IMG("cigar2.png") },
        { id: "sku_mac12", name: "Macallan 12yr Scotch",      qty: 2, price: 28, category: "Spirits", img: IMG("pour/pour_whiskey.png") },
      ],
    },
    103: { id: 103, guest: "Robert K.", zone: "Main Lounge",
      timeStarted: new Date(Date.now() - 1_380_000).toISOString(),
      items: [
        { id: "sku_af_gr", name: "Arturo Fuente Gran Reserva", qty: 2, price: 26, category: "Cigars", img: IMG("cigar3.png") },
      ],
    },
  },
  telemetry: {
    humidor: { purosRemaining: 145, temperature: 68, humidity: 71, targetHumidity: 71, alertMargin: 5 },
    bar:     { activePourSessions: 14, lowStockAlerts: [{ item: "Remy Martin XO", category: "Cognac", currentVolumePct: 12 }] },
    kitchen: { pendingOrders: 3, readyOrders: 1 },
  },
};

// ── Revenue Engine ────────────────────────────────────────────────────────────
function useRevenueEngine(state: VenueState) {
  return useMemo(() => {
    const tableRevenue = (id: number) => {
      const t = state.activeTables[id];
      if (!t) return { subtotal: 0, tax: 0, total: 0 };
      const subtotal = t.items.reduce((s, i) => s + i.price * i.qty, 0);
      const tax = Math.round(subtotal * 8.5) / 100;
      return { subtotal, tax, total: subtotal + tax };
    };
    const tables = Object.values(state.activeTables);
    const totalFloorRevenue = tables.reduce((s, t) => s + t.items.reduce((is, i) => is + i.price * i.qty, 0), 0);
    const avgCheck = tables.length ? totalFloorRevenue / tables.length : 0;
    const topCategory = (() => {
      const m: Record<string, number> = {};
      tables.forEach(t => t.items.forEach(i => { m[i.category] = (m[i.category] ?? 0) + i.price * i.qty; }));
      return Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    })();
    return { tableRevenue, totalFloorRevenue, avgCheck, topCategory };
  }, [state]);
}

// ── Hardware Thresholds ───────────────────────────────────────────────────────
function useThresholds(tel: VenueState["telemetry"]) {
  return useMemo(() => {
    const h = tel.humidor;
    return {
      humidorAlert:    Math.abs(h.humidity - h.targetHumidity) >= h.alertMargin || h.purosRemaining < 50,
      humidorCritical: h.purosRemaining < 20 || Math.abs(h.humidity - h.targetHumidity) >= h.alertMargin * 2,
      barAlert:        tel.bar.lowStockAlerts.some(a => a.currentVolumePct < 20),
      kitchenAlert:    tel.kitchen.pendingOrders > 5,
    };
  }, [tel]);
}

// ── Clock & Elapsed ───────────────────────────────────────────────────────────
function useClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  const h  = t.getHours() % 12 || 12;
  const m  = String(t.getMinutes()).padStart(2, "0");
  const ap = t.getHours() >= 12 ? "PM" : "AM";
  const d  = t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
  return { time: `${h}:${m} ${ap}`, date: d };
}
function useElapsed(iso: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 10_000); return () => clearInterval(id); }, []);
  const ms = now - new Date(iso).getTime();
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}h`;
}

// ── POS Webhook → Real-Time Inventory Sync Hook ───────────────────────────────
function usePosEventSync(
  onDelta: (delta: { provider: string; eventType: string; cigarsConsumed: number; spiritsDepleted: string[] }) => void
) {
  const lastSeen = useRef<string>(new Date(Date.now() - 30_000).toISOString());
  const cbRef    = useRef(onDelta);
  useEffect(() => { cbRef.current = onDelta; }, [onDelta]);
  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (!active) return;
      try {
        const events = await api.posEvents(lastSeen.current);
        if (events.length === 0) return;
        lastSeen.current = events[0]!.createdAt;
        let cigarsConsumed = 0;
        const spiritsDepleted: string[] = [];
        const provider  = events[0]!.provider;
        const eventType = events[0]!.eventType;
        events.forEach(evt => {
          const payload = evt.rawPayload ?? {};
          const items = (payload["items"] as Array<{ category?: string; qty?: number; quantity?: number; name?: string }>) ?? [];
          items.forEach(item => {
            const qty = Math.max(1, Number(item.qty ?? item.quantity ?? 1));
            const cat = String(item.category ?? "").toLowerCase();
            if (cat.includes("cigar") || cat.includes("smoke")) { cigarsConsumed += qty; }
            else if (cat.includes("spirit") || cat.includes("liquor") || cat.includes("whiskey")) { spiritsDepleted.push(String(item.name ?? "Spirit")); }
          });
        });
        if (cigarsConsumed > 0 || spiritsDepleted.length > 0) cbRef.current({ provider, eventType, cigarsConsumed, spiritsDepleted });
      } catch { /* kiosk resilience */ }
    };
    const id = setInterval(poll, 5_000);
    poll();
    return () => { active = false; clearInterval(id); };
  }, []);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function VIP() {
  return <span style={{ background:`linear-gradient(135deg,${C.gold},#A67C00)`, color:"#000", fontSize:9, fontWeight:900, letterSpacing:"0.16em", padding:"2px 7px", borderRadius:3 }}>VIP</span>;
}
function Num({ n }: { n: number }) {
  return <div style={{ width:26, height:26, borderRadius:"50%", background:`linear-gradient(135deg,${C.gold},#A67C00)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:"#000", flexShrink:0 }}>{n}</div>;
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header({ syncAge }: { syncAge: number }) {
  const { time, date } = useClock();
  const [pulse, setPulse] = useState(true);
  useEffect(() => { const id = setInterval(() => setPulse(p => !p), 1100); return () => clearInterval(id); }, []);
  return (
    <div style={{ height:50, flexShrink:0, background:C.dark, borderBottom:`1px solid ${C.chrome}`, display:"flex", alignItems:"center", padding:"0 16px", gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:9, width:210, flexShrink:0 }}>
        <img src={IMG("logo_eat.png")} alt="" style={{ height:30, width:30, objectFit:"contain" }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:C.gold, letterSpacing:"0.18em" }}>E.A.T. SYSTEM</div>
          <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.24em", textTransform:"uppercase" }}>ELITE ATMOSPHERE TECHNOLOGY</div>
        </div>
      </div>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:20 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:15, fontWeight:700, color:C.cream, letterSpacing:"0.08em" }}>{time}</div>
          <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.18em" }}>{date}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <motion.div animate={{ opacity:pulse?1:0.15 }} transition={{ duration:0.25 }}
            style={{ width:7, height:7, borderRadius:"50%", background:C.green }} />
          <span style={{ fontSize:11, fontWeight:700, color:C.green, letterSpacing:"0.16em" }}>LIVE SYNC</span>
          <div style={{ display:"flex", gap:1, alignItems:"flex-end" }}>
            {[10,14,18,14].map((h,i) => <div key={i} style={{ width:3, height:h, background:C.green, borderRadius:1 }} />)}
          </div>
          <span style={{ fontSize:8, color:C.muted, marginLeft:4 }}>+{syncAge}m</span>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <span style={{ fontSize:12, fontWeight:700, color:C.cream, letterSpacing:"0.10em" }}>
          NOVEE OS <span style={{ color:C.muted, fontWeight:400 }}>v1.0</span>
        </span>
        <span style={{ fontSize:10, fontWeight:800, color:C.green, border:`1px solid ${C.green}44`, borderRadius:4, padding:"2px 8px", letterSpacing:"0.18em" }}>LIVE</span>
        <Icon d={P.wifi} size={18} color={C.muted} />
      </div>
    </div>
  );
}

// ── Nav Rail ──────────────────────────────────────────────────────────────────
function NavRail({ onBack, isAdminView, isSupervisorView, onOpenPinGate }: {
  onBack: () => void;
  isAdminView: boolean;
  isSupervisorView: boolean;
  onOpenPinGate: (target: "supervisor" | "admin") => void;
}) {
  const items = [
    { icon:P.house,    sub:"Hub",         active:true,  fn:onBack },
    { icon:P.leaf,     sub:"SC\nSmoke",   active:false, fn:undefined },
    { icon:P.cocktail, sub:"PR\nPairing", active:false, fn:undefined },
    { icon:P.utensils, sub:"CH\nCoach",   active:false, fn:undefined },
  ];
  return (
    <div style={{ width:64, flexShrink:0, background:"rgba(3,3,3,0.98)", borderRight:`1px solid ${C.chrome}`, display:"flex", flexDirection:"column", alignItems:"center", paddingTop:8, gap:4, height:"100%" }}>
      {items.map(item => (
        <motion.button key={item.sub} whileTap={{scale:0.91}} onClick={item.fn} {...T}
          style={{ width:52, minHeight:58, borderRadius:8, cursor:"pointer", background:item.active?C.goldDim:"transparent", border:`1px solid ${item.active?C.gold:C.chrome}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, padding:"6px 2px" }}>
          <Icon d={item.icon} size={18} color={item.active?C.gold:C.muted} />
          <span style={{ fontFamily:C.mono, fontSize:7, color:item.active?C.gold:C.muted, letterSpacing:"0.10em", textAlign:"center", whiteSpace:"pre-line", lineHeight:1.3 }}>{item.sub}</span>
        </motion.button>
      ))}
      <div style={{ flex:1 }} />
      {/* ── Security Gate Buttons ── */}
      <motion.button whileTap={{scale:0.91}} {...T}
        onTouchStart={e => { T.onTouchStart(e); onOpenPinGate("supervisor"); }}
        onClick={() => onOpenPinGate("supervisor")}
        style={{ width:52, minHeight:58, borderRadius:8, cursor:"pointer", marginBottom:4,
          background: isSupervisorView ? `rgba(212,175,55,0.22)` : "rgba(255,255,255,0.04)",
          border:`1px solid ${isSupervisorView ? C.gold : C.chrome}`,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3 }}>
        <Icon d={P.lock} size={16} color={isSupervisorView ? C.gold : C.muted} />
        <span style={{ fontFamily:C.mono, fontSize:6, color:isSupervisorView ? C.gold : C.muted, letterSpacing:"0.08em", textAlign:"center", lineHeight:1.3 }}>{"SUP\nACCESS"}</span>
        {isSupervisorView && (
          <motion.div animate={{opacity:[1,0.3,1]}} transition={{duration:1.1,repeat:Infinity}}
            style={{width:6,height:6,borderRadius:"50%",background:C.gold}} />
        )}
      </motion.button>
      <motion.button whileTap={{scale:0.91}} {...T}
        onTouchStart={e => { T.onTouchStart(e); onOpenPinGate("admin"); }}
        onClick={() => onOpenPinGate("admin")}
        style={{ width:52, minHeight:58, borderRadius:8, cursor:"pointer", marginBottom:4,
          background: isAdminView ? `rgba(231,76,60,0.22)` : "rgba(255,255,255,0.04)",
          border:`1px solid ${isAdminView ? C.redHi : C.chrome}`,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3 }}>
        <Icon d={P.shield} size={16} color={isAdminView ? C.redHi : C.muted} />
        <span style={{ fontFamily:C.mono, fontSize:6, color:isAdminView ? C.redHi : C.muted, letterSpacing:"0.08em", textAlign:"center", lineHeight:1.3 }}>{"ADMIN\nGATE"}</span>
        {isAdminView && (
          <motion.div animate={{opacity:[1,0.3,1]}} transition={{duration:0.8,repeat:Infinity}}
            style={{width:6,height:6,borderRadius:"50%",background:C.redHi}} />
        )}
      </motion.button>
      <motion.button whileTap={{scale:0.93}} {...T}
        style={{ width:52, minHeight:70, marginBottom:10, borderRadius:8, background:`linear-gradient(180deg,rgba(212,175,55,0.20),rgba(212,175,55,0.09))`, border:`1px solid ${C.gold}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", gap:2, boxShadow:`0 0 16px ${C.goldGlo}` }}>
        <span style={{ fontSize:24, fontWeight:900, color:C.gold }}>P</span>
        <span style={{ fontFamily:C.mono, fontSize:7, color:C.gold, letterSpacing:"0.14em", lineHeight:1.4, textAlign:"center" }}>{"POS\nLIVE"}</span>
      </motion.button>
    </div>
  );
}

// ── Column 1: Telemetry ───────────────────────────────────────────────────────
function TelemetryCol({ tel, thresh, onKitchenReady, onOpenMapper, onOpenStaff, onOpenReservations, onGenerateOrder }: {
  tel: VenueState["telemetry"];
  thresh: ReturnType<typeof useThresholds>;
  onKitchenReady: () => void;
  onOpenMapper: () => void;
  onOpenStaff: () => void;
  onOpenReservations: () => void;
  onGenerateOrder: (productId: string, qty: number, productName: string) => void;
}) {
  const [orderFlash, setOrderFlash] = useState<string | null>(null);
  const h = tel.humidor; const b = tel.bar; const k = tel.kitchen;
  const mb = (val: string, label: string, icon: string) => (
    <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.03)", border:`1px solid ${C.chrome}`, borderRadius:7, padding:"8px 10px" }}>
      <Icon d={icon} size={16} color={C.amber} />
      <div>
        <div style={{ fontSize:17, fontWeight:800, color:C.amber }}>{val}</div>
        <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.18em", textTransform:"uppercase" }}>{label}</div>
      </div>
    </div>
  );
  const fireOrder = (productId: string, qty: number, name: string) => {
    onGenerateOrder(productId, qty, name);
    setOrderFlash(productId);
    setTimeout(() => setOrderFlash(null), 3_000);
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:7, height:"100%", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:9, flexShrink:0 }}>
        <Num n={1} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:800, color:C.white, letterSpacing:"0.05em" }}>REAL-TIME TELEMETRY</div>
          <div style={{ fontSize:8, fontFamily:C.mono, color:C.gold, letterSpacing:"0.26em" }}>E.A.T. CORE STATION MONITORS</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:5, flexShrink:0 }}>
        {[
          { label:"POS MAPPER", icon:P.grid,     fn:onOpenMapper,       color:C.amber },
          { label:"STAFF",      icon:P.addUser,  fn:onOpenStaff,        color:C.gold  },
          { label:"RESERV.",    icon:P.calendar, fn:onOpenReservations, color:C.blue  },
        ].map(btn => (
          <motion.button key={btn.label} whileTap={{scale:0.94}} {...T}
            onTouchStart={e => { T.onTouchStart(e); btn.fn(); }}
            onClick={btn.fn}
            style={{ flex:1, height:30, borderRadius:6, cursor:"pointer", background:"rgba(255,255,255,0.04)",
              border:`1px solid ${C.chrome}`, color:btn.color, fontSize:9, fontWeight:800,
              letterSpacing:"0.12em", fontFamily:C.sans, display:"flex", alignItems:"center",
              justifyContent:"center", gap:4 }}>
            <Icon d={btn.icon} size={11} color={btn.color} />
            {btn.label}
          </motion.button>
        ))}
      </div>

      {/* HUMIDOR — qty from GET /api/products?category=cigar */}
      <div style={panel({ borderTop:`2px solid ${C.gold}`, flexShrink:0 })}>
        <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 12px 7px", borderBottom:`1px solid ${C.chrome}` }}>
          <Icon d={P.leaf} size={14} color={C.gold} />
          <span style={{ fontSize:10, fontWeight:700, color:C.muted, letterSpacing:"0.22em" }}>STATION 1: HUMIDOR</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", minHeight:100 }}>
          <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
            <motion.div
              animate={{ textShadow:[`0 0 18px ${C.amber}44`,`0 0 40px ${C.amber}aa`,`0 0 18px ${C.amber}44`] }}
              transition={{ duration:2.2, repeat:Infinity }}
              style={{ fontSize:56, fontWeight:900, color:C.amber, lineHeight:1 }}>
              {h.purosRemaining}
            </motion.div>
            <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.20em", marginTop:4 }}>PUROS REMAINING</div>
          </div>
          <div style={{ background:`url(${IMG("cedar_box.png")}) center/cover no-repeat,linear-gradient(135deg,#3D2510,#0F0A06)`, borderLeft:`1px solid ${C.chrome}` }} />
        </div>
        <div style={{ padding:"8px 12px", borderTop:`1px solid ${C.chrome}` }}>
          <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.22em", marginBottom:6 }}>CLIMATE CONTROL</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            {mb(`${h.temperature}°F`, "TEMPERATURE", P.thermo)}
            {mb(`${h.humidity}%`, "RELATIVE HUMIDITY", P.drop)}
          </div>
        </div>
        <AnimatePresence>
          {thresh.humidorAlert && (
            <motion.div initial={{opacity:0}} animate={{opacity:[1,0.65,1]}} exit={{opacity:0}} transition={{duration:1.3,repeat:Infinity}}
              style={{ display:"flex", alignItems:"center", gap:8, background:thresh.humidorCritical?"rgba(192,57,43,0.35)":C.redLo, borderTop:`1px solid ${C.red}44`, padding:"8px 12px" }}>
              <Icon d={P.warn} size={13} color={C.redHi} />
              <span style={{ flex:1, fontSize:11, fontWeight:800, color:C.redHi, letterSpacing:"0.14em" }}>
                {thresh.humidorCritical ? "CRITICAL: RESTOCK NOW" : "TARGET ALERT: LOW STOCK"}
              </span>
              <span style={{ fontSize:14, color:C.redHi }}>›</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BAR — alerts from GET /api/products?category=alcohol */}
      <div style={panel({ borderTop:"2px solid #3A6BC4", flexShrink:0 })}>
        <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 12px 7px", borderBottom:`1px solid ${C.chrome}` }}>
          <Icon d={P.cocktail} size={14} color={C.blue} />
          <span style={{ fontSize:10, fontWeight:700, color:C.muted, letterSpacing:"0.22em" }}>STATION 2: BAR METRICS</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", alignItems:"center", padding:"10px 12px", gap:10 }}>
          <div>
            <div style={{ fontSize:48, fontWeight:900, color:C.white, lineHeight:1 }}>{b.activePourSessions}</div>
            <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.18em", marginTop:3 }}>ACTIVE POUR SESSIONS</div>
          </div>
          <div style={{ width:48, height:72, borderRadius:7, background:`url(${IMG("pour/pour_whiskey.png")}) center/cover no-repeat,#1A0A00`, border:`1px solid ${C.chrome}` }} />
        </div>
        {b.lowStockAlerts.map(a => {
          const pid = SKU_TO_PRODUCT[`sku_${a.item.toLowerCase().replace(/\s+/g,"_")}`] ?? "alc-001";
          const flashed = orderFlash === pid;
          return (
            <div key={a.item} style={{ display:"flex", alignItems:"center", gap:8, background:C.redLo, borderTop:`1px solid ${C.red}44`, padding:"8px 12px" }}>
              <Icon d={P.warn} size={13} color={C.redHi} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, fontWeight:800, color:C.redHi, letterSpacing:"0.14em" }}>LOW STOCK — {a.currentVolumePct}%</div>
                <div style={{ fontSize:12, fontWeight:700, color:C.white }}>{a.item}</div>
                <div style={{ fontSize:9, color:C.muted }}>{a.category}</div>
              </div>
              <motion.button whileTap={{scale:0.93}} {...T}
                onTouchStart={e => { T.onTouchStart(e); fireOrder(pid, 6, a.item); }}
                onClick={() => fireOrder(pid, 6, a.item)}
                style={{ height:30, padding:"0 10px", borderRadius:5, cursor:"pointer", flexShrink:0,
                  background:flashed?`rgba(39,174,96,0.18)`:`linear-gradient(135deg,${C.amber},#A0620F)`,
                  border:`1px solid ${flashed?C.green:C.amber}`,
                  color:flashed?C.green:"#000", fontSize:9, fontWeight:900,
                  letterSpacing:"0.1em", fontFamily:C.sans }}>
                {flashed ? "ORDERED" : "GEN ORDER"}
              </motion.button>
            </div>
          );
        })}
      </div>

      {/* KITCHEN */}
      <div style={panel({ borderTop:"2px solid #7B5EA7", flex:1, display:"flex", flexDirection:"column" })}>
        <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 12px 7px", borderBottom:`1px solid ${C.chrome}` }}>
          <Icon d={P.utensils} size={14} color={C.purple} />
          <span style={{ fontSize:10, fontWeight:700, color:C.muted, letterSpacing:"0.22em" }}>STATION 3: KITCHEN LINE</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, padding:"10px 12px" }}>
          {[{val:k.pendingOrders,label:"PENDING ORDERS",color:C.amber},{val:k.readyOrders,label:"READY ORDERS",color:C.green}].map(m => (
            <div key={m.label} style={{ background:`${m.color}0a`, border:`1px solid ${m.color}30`, borderRadius:7, padding:"10px 0", textAlign:"center" }}>
              <div style={{ fontSize:38, fontWeight:900, color:m.color, lineHeight:1 }}>{m.val}</div>
              <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.18em", marginTop:4 }}>{m.label}</div>
            </div>
          ))}
        </div>
        <motion.button whileTap={{scale:0.97}} {...T} onClick={onKitchenReady}
          style={{ marginTop:"auto", width:"100%", height:42, background:"rgba(123,94,167,0.10)", border:"none", borderTop:"1px solid rgba(123,94,167,0.28)", color:C.purple, fontSize:12, fontWeight:800, letterSpacing:"0.14em", cursor:"pointer", fontFamily:C.sans, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Icon d={P.list} size={14} color={C.purple} />
          VIEW KITCHEN QUEUE
          <span style={{ fontSize:14 }}>›</span>
        </motion.button>
      </div>
    </div>
  );
}

// ── Ticket Tapper Modal ───────────────────────────────────────────────────────
function TapperModal({ table, onClose, onUpdate }: {
  table: VenueTable; onClose: () => void;
  onUpdate: (items: VenueItem[], mutations: {id:string;qty:number}[]) => void;
}) {
  const [items, setItems] = useState<VenueItem[]>(table.items.map(i => ({...i})));
  const mutations = useRef<Map<string,number>>(new Map());

  const adj = useCallback((id: string, d: number) => {
    setItems(prev => {
      const next = prev.map(i => {
        if (i.id !== id) return i;
        mutations.current.set(i.id, (mutations.current.get(i.id) ?? 0) + d);
        return { ...i, qty: Math.max(0, i.qty + d) };
      }).filter(i => i.qty > 0);
      return next;
    });
  }, []);

  const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(sub * 8.5) / 100;

  const confirm = () => {
    const mut = Array.from(mutations.current.entries()).map(([id, delta]) => {
      const item = table.items.find(i => i.id === id);
      const productId = SKU_TO_PRODUCT[id];
      const curQty = item ? item.qty : 0;
      return { id: productId ?? id, qty: Math.max(0, curQty + delta) };
    });
    onUpdate(items, mut);
  };

  return (
    <motion.div key="m" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{ position:"fixed", inset:0, zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.84)", backdropFilter:"blur(12px)" }} onClick={onClose} />
      <motion.div initial={{scale:0.94,y:20}} animate={{scale:1,y:0}} exit={{scale:0.94,y:20}}
        style={{ position:"relative", zIndex:1, width:520, maxHeight:"90vh", background:"rgba(8,8,10,0.99)", border:`1px solid ${C.gold}`, borderRadius:14, overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:`0 0 60px ${C.goldGlo}` }}>
        <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.chrome}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:C.mono, fontSize:9, color:C.gold, letterSpacing:"0.28em", marginBottom:3 }}>TICKET TAPPER</div>
            <div style={{ fontSize:16, fontWeight:800, color:C.white }}>TABLE {table.id} — {table.guest}</div>
            <div style={{ fontSize:10, color:C.muted }}>{table.zone}</div>
          </div>
          <motion.button whileTap={{scale:0.9}} onClick={onClose}
            style={{ width:32, height:32, borderRadius:8, background:"rgba(255,255,255,0.05)", border:`1px solid ${C.chrome}`, color:C.muted, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>×</motion.button>
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          <AnimatePresence>
            {items.map((item, idx) => (
              <motion.div key={item.id} layout initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:10,height:0}}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 20px", borderBottom:idx<items.length-1?`1px solid ${C.chrome}`:"none" }}>
                {item.img && <div style={{ width:36,height:36,borderRadius:6,background:`url(${item.img}) center/cover,#1A1A1A`,border:`1px solid ${C.chrome}`,flexShrink:0 }} />}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.white }}>{item.name}</div>
                  <div style={{ fontSize:10, color:C.muted }}>{item.category} · ${item.price.toFixed(2)} ea</div>
                </div>
                {([["−",-1,C.redHi],["+",1,C.green]] as const).map(([l,d,c]) => (
                  <motion.button key={String(l)} whileTap={{scale:0.88}} onClick={()=>adj(item.id,d)}
                    style={{ width:30,height:30,borderRadius:"50%",background:`${c}1a`,border:`1px solid ${c}44`,color:c,fontSize:18,lineHeight:"28px",textAlign:"center",cursor:"pointer" }}>{l}</motion.button>
                ))}
                <div style={{ fontSize:15, fontWeight:800, color:C.amber, minWidth:24, textAlign:"center" }}>{item.qty}</div>
                <motion.button whileTap={{scale:0.88}} onClick={()=>adj(item.id,-999)}
                  style={{ width:26,height:26,borderRadius:"50%",background:C.goldDim,border:`1px solid ${C.gold}44`,color:C.gold,fontSize:12,lineHeight:"24px",textAlign:"center",cursor:"pointer" }}>×</motion.button>
                <div style={{ fontSize:13,fontWeight:700,color:C.white,minWidth:50,textAlign:"right" }}>${(item.price*item.qty).toFixed(2)}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.chrome}` }}>
          {[{l:"Subtotal",v:sub},{l:"Tax (8.5%)",v:tax}].map(r => (
            <div key={r.l} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12,color:C.muted }}>{r.l}</span>
              <span style={{ fontSize:12,color:C.white }}>${r.v.toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0 0", borderTop:`1px solid ${C.chrome}` }}>
            <span style={{ fontSize:15,fontWeight:900,color:C.white }}>TOTAL</span>
            <span style={{ fontSize:18,fontWeight:900,color:C.amber }}>${(sub+tax).toFixed(2)}</span>
          </div>
        </div>
        <div style={{ padding:"12px 20px", display:"flex", gap:10 }}>
          <motion.button whileTap={{scale:0.97}} onClick={onClose}
            style={{ flex:1,height:44,borderRadius:8,background:"rgba(255,255,255,0.04)",border:`1px solid ${C.chrome}`,color:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:C.sans }}>CANCEL</motion.button>
          <motion.button whileTap={{scale:0.97}} onClick={confirm}
            style={{ flex:2,height:44,borderRadius:8,background:`linear-gradient(135deg,${C.gold},#A67C00)`,border:"none",color:"#000",fontSize:12,fontWeight:900,letterSpacing:"0.08em",cursor:"pointer",fontFamily:C.sans }}>
            CONFIRM & UPDATE TICKET
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Column 2: Tickets ─────────────────────────────────────────────────────────
const FILTER_TABS = ["ALL TABLES","VIP SECTION","MAIN FLOOR","OUTDOOR"] as const;
type FilterTab = typeof FILTER_TABS[number];

function TableCard({ table, isActive, onSelect, onTap }: {
  table: VenueTable; isActive: boolean; onSelect:()=>void; onTap:()=>void;
}) {
  const elapsed = useElapsed(table.timeStarted);
  const cur = table.items.reduce((s,i)=>s+i.price*i.qty,0);
  const isVip = table.zone.toLowerCase().includes("vip");
  const borderColor = table.reserved ? C.gold : isActive ? C.gold : C.chrome;
  return (
    <motion.div whileTap={{scale:0.99}} onClick={onSelect}
      animate={{ boxShadow: table.reserved ? `0 0 18px ${C.gold}55` : isActive ? `0 0 20px ${C.goldGlo}` : "0 0 0 transparent" }}
      style={{ ...panel(), border:`1px solid ${borderColor}`, flexShrink:0, cursor:"pointer", position:"relative" }}>
      {table.reserved && (
        <div style={{ position:"absolute", top:0, left:0, zIndex:10,
          background:`linear-gradient(135deg,${C.gold}DD,#A67C00CC)`,
          borderRadius:"8px 0 8px 0", padding:"3px 9px", display:"flex", alignItems:"center", gap:5 }}>
          <Icon d={P.calendar} size={10} color="#000" />
          <span style={{ fontSize:9, fontWeight:900, color:"#000", letterSpacing:"0.18em" }}>
            RESERVED{table.reservationGuest ? ` · ${table.reservationGuest.split(" ")[0]}` : ""}
          </span>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"38% 62%", height:118 }}>
        <div style={{ background:`url(${zoneBg(table.zone)}) center/cover no-repeat,linear-gradient(135deg,#2D1A0F,#080808)`, borderRight:`1px solid ${C.chrome}` }} />
        <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:3 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:14, fontWeight:800, color:C.white }}>TABLE {table.id}</span>
                {isVip ? <VIP /> : <span style={{ fontSize:9, color:C.muted }}>{table.zone}</span>}
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.amber }}>{elapsed}</div>
                <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.12em" }}>TIME ACTIVE</div>
              </div>
            </div>
            <div style={{ fontSize:11, color:C.muted }}>Guest: {table.guest}</div>
          </div>
          <div>
            <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.18em", textTransform:"uppercase" }}>CURRENT TAB</div>
            <div style={{ fontSize:22, fontWeight:900, color:C.amber, lineHeight:1.1 }}>${cur.toFixed(2)}</div>
          </div>
        </div>
      </div>
      <motion.button whileTap={{scale:0.98}} {...T} onClick={e=>{e.stopPropagation();onTap();}}
        style={{ width:"100%", height:44, background:`linear-gradient(90deg,rgba(212,175,55,0.18),rgba(212,175,55,0.09))`, border:"none", borderTop:`1px solid ${C.gold}44`, color:C.gold, fontSize:13, fontWeight:900, letterSpacing:"0.12em", cursor:"pointer", fontFamily:C.sans, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        <Icon d={P.star} size={13} color={C.gold} />
        OPEN TICKET TAPPER
        <Icon d={P.star} size={13} color={C.gold} />
      </motion.button>
    </motion.div>
  );
}

function TicketsCol({ state, revenue, onSelect, onUpdate }: {
  state: VenueState; revenue: ReturnType<typeof useRevenueEngine>;
  onSelect:(id:number)=>void;
  onUpdate:(tableId:number, items:VenueItem[], mutations:{id:string;qty:number}[])=>void;
}) {
  const [filter, setFilter] = useState<FilterTab>("ALL TABLES");
  const [tapTable, setTapTable] = useState<VenueTable|null>(null);
  const all = Object.values(state.activeTables);
  const list = filter==="ALL TABLES" ? all : all.filter(t => t.zone.toUpperCase().includes(filter.replace(" SECTION","").replace(" FLOOR","").replace(" LOUNGE","")));
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:9, flexShrink:0, marginBottom:8 }}>
        <Num n={2} />
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:C.white, letterSpacing:"0.05em" }}>HIGH-SPEED TICKET OVERVIEW</div>
          <div style={{ fontSize:8, fontFamily:C.mono, color:C.gold, letterSpacing:"0.26em" }}>ACTIVE LOUNGE TABLES & QUEUES</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:5, marginBottom:8, flexShrink:0, alignItems:"center" }}>
        {FILTER_TABS.map(t => (
          <motion.button key={t} whileTap={{scale:0.95}} onClick={()=>setFilter(t)}
            style={{ height:26, padding:"0 9px", borderRadius:5, cursor:"pointer", background:filter===t?`linear-gradient(135deg,${C.gold},#A67C00)`:"rgba(255,255,255,0.04)", border:`1px solid ${filter===t?C.gold:C.chrome}`, color:filter===t?"#000":C.muted, fontSize:9, fontWeight:800, letterSpacing:"0.12em", fontFamily:C.sans, whiteSpace:"nowrap" }}>{t}</motion.button>
        ))}
        <div style={{ marginLeft:"auto" }}><Icon d={P.filter} size={16} color={C.muted} /></div>
      </div>
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:7 }}>
        {list.map(t => (
          <TableCard key={t.id} table={t} isActive={t.id===state.selectedTableId}
            onSelect={()=>onSelect(t.id)} onTap={()=>setTapTable(t)} />
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", background:C.glass2, border:`1px solid ${C.chrome}`, borderRadius:7, marginTop:7, flexShrink:0 }}>
        {[
          { l:"ACTIVE TABLES",   v:String(all.length) },
          { l:"VIP TABLES",      v:String(all.filter(t=>t.zone.toLowerCase().includes("vip")).length) },
          { l:"AVG CHECK",       v:`$${revenue.avgCheck.toFixed(2)}` },
          { l:"TOTAL TAB VALUE", v:`$${revenue.totalFloorRevenue.toFixed(2)}` },
        ].map((s,i) => (
          <div key={s.l} style={{ padding:"9px 10px", textAlign:"center", borderRight:i<3?`1px solid ${C.chrome}`:"none" }}>
            <div style={{ fontSize:15, fontWeight:900, color:C.amber }}>{s.v}</div>
            <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.16em", textTransform:"uppercase", marginTop:3 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {tapTable && (
          <TapperModal key={tapTable.id} table={tapTable}
            onClose={()=>setTapTable(null)}
            onUpdate={(items, muts)=>{ onUpdate(tapTable.id,items,muts); setTapTable(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Column 3: Active Ledger ───────────────────────────────────────────────────
function LedgerCol({ state, revenue, onRemove, onProcessPayment, coaching }: {
  state: VenueState; revenue: ReturnType<typeof useRevenueEngine>;
  onRemove:(tableId:number,itemId:string)=>void;
  onProcessPayment:(table:VenueTable)=>void;
  coaching: CoachingSuggestion | null;
}) {
  const table = state.activeTables[state.selectedTableId];
  if (!table) return null;
  const { subtotal, tax, total } = revenue.tableRevenue(state.selectedTableId);
  const isVip = table.zone.toLowerCase().includes("vip");
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:9, flexShrink:0, marginBottom:8 }}>
        <Num n={3} />
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:C.white, letterSpacing:"0.05em" }}>ACTIVE LEDGER</div>
          <div style={{ fontSize:8, fontFamily:C.mono, color:C.gold, letterSpacing:"0.26em" }}>PERSISTENT LINE ITEMS</div>
        </div>
      </div>
      <div style={panel({ borderTop:`2px solid ${C.gold}`, padding:"11px 13px", marginBottom:8, flexShrink:0 })}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <span style={{ fontSize:15, fontWeight:800, color:C.white }}>TABLE {table.id}</span>
            {isVip && <VIP />}
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.18em" }}>BALANCE</div>
            <motion.div animate={{color:[C.amber,"#FFD700",C.amber]}} transition={{duration:2.4,repeat:Infinity}}
              style={{ fontSize:22, fontWeight:900 }}>${total.toFixed(2)}</motion.div>
          </div>
        </div>
        <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{table.guest} · {table.zone}</div>
      </div>
      <div style={{ fontSize:9, fontFamily:C.mono, color:C.muted, letterSpacing:"0.24em", marginBottom:5, paddingLeft:2, flexShrink:0 }}>LINE ITEMS</div>
      <div style={{ ...panel(), flex:1, overflowY:"auto", marginBottom:7 }}>
        <AnimatePresence>
          {table.items.length===0 && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}}
              style={{ padding:24, textAlign:"center", color:C.muted, fontSize:13 }}>Table cleared.</motion.div>
          )}
          {table.items.map((item,idx) => (
            <motion.div key={item.id} layout initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10,height:0}}
              style={{ display:"flex", alignItems:"center", gap:9, padding:"10px 12px", borderBottom:idx<table.items.length-1?`1px solid ${C.chrome}`:"none" }}>
              <div style={{ width:38,height:38,borderRadius:6,flexShrink:0,border:`1px solid ${C.chrome}`,background:item.img?`url(${item.img}) center/cover,#1A1A1A`:"linear-gradient(135deg,#2A1810,#111)" }} />
              <div style={{ width:30,height:30,borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg,${C.gold},#A67C00)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#000" }}>{item.qty}x</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.white, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</div>
                <div style={{ fontSize:10, color:C.muted, fontStyle:"italic" }}>{item.category}</div>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:C.white, minWidth:46, textAlign:"right" }}>${item.price.toFixed(2)}</div>
              <motion.button whileTap={{scale:0.84}} {...T} onClick={()=>onRemove(table.id,item.id)}
                style={{ width:26,height:26,borderRadius:"50%",background:C.goldDim,border:`1px solid ${C.gold}44`,color:C.gold,fontSize:14,lineHeight:"24px",textAlign:"center",cursor:"pointer",flexShrink:0 }}>×</motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        <CoachingBadge coaching={coaching} />
      </AnimatePresence>
      <div style={panel({ padding:"13px 13px 0", flexShrink:0 })}>
        {[{l:"SUBTOTAL",v:subtotal},{l:"TAX",v:tax}].map(r => (
          <div key={r.l} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:12, color:C.muted, letterSpacing:"0.14em" }}>{r.l}</span>
            <span style={{ fontSize:12, color:C.white }}>${r.v.toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0 11px", borderTop:`1px solid ${C.chrome}` }}>
          <span style={{ fontSize:17, fontWeight:900, color:C.white }}>TOTAL</span>
          <span style={{ fontSize:24, fontWeight:900, color:C.amber }}>${total.toFixed(2)}</span>
        </div>
        <motion.button whileTap={{scale:0.97}} {...T}
          style={{ width:"100%",height:42,marginBottom:8,background:"rgba(255,255,255,0.04)",border:`1px solid ${C.chrome}`,borderRadius:8,color:C.cream,fontSize:12,fontWeight:800,letterSpacing:"0.14em",cursor:"pointer",fontFamily:C.sans,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <Icon d={P.receipt} size={14} color={C.cream} />
          VIEW FULL LEDGER
          <span style={{ color:C.gold }}>›</span>
        </motion.button>
        <motion.button whileTap={{scale:0.97}}
          onTouchStart={e => { T.onTouchStart(e); onProcessPayment(table); }}
          onTouchEnd={T.onTouchEnd}
          onClick={()=>onProcessPayment(table)}
          style={{ width:"100%",height:52,marginBottom:12,background:`linear-gradient(135deg,${C.gold},#A67C00)`,border:"none",borderRadius:8,color:"#000",fontSize:14,fontWeight:900,letterSpacing:"0.10em",cursor:"pointer",fontFamily:C.sans,boxShadow:`0 0 24px ${C.goldGlo}`,display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
          <Icon d={P.credit} size={17} color="#000" />
          PROCESS PAYMENT
        </motion.button>
      </div>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

const STAFF_LIST = [
  { name:"Alex R.",    role:"Manager",   dot:C.green },
  { name:"Jasmine L.", role:"Server",    dot:C.green },
  { name:"Marco B.",   role:"Bartender", dot:C.green },
  { name:"Tanya G.",   role:"Runner",    dot:C.green },
  { name:"Devon H.",   role:"Host",      dot:C.green },
];
function Footer({ revenue, providers, paymentState }: {
  revenue: ReturnType<typeof useRevenueEngine>;
  providers: PosProvider[];
  paymentState: PaymentState;
}) {
  const posStatusColor = (p: PosProvider) => {
    if (p.capabilities.supportsWebhooks && p.capabilities.supportsInventorySync) return C.green;
    if (p.capabilities.supportsOrderPush) return C.orange;
    return C.muted;
  };
  return (
    <div style={{ flexShrink:0, height:116, background:C.dark, borderTop:`1px solid ${C.chrome}`, display:"grid", gridTemplateColumns:"1fr 1fr 1fr" }}>
      <div style={{ padding:"10px 16px", borderRight:`1px solid ${C.chrome}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ fontSize:10, fontFamily:C.mono, color:C.gold, letterSpacing:"0.26em" }}>STAFF ON FLOOR</span>
          <span style={{ fontSize:10, color:C.muted, cursor:"pointer" }}>VIEW ALL ›</span>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
          {STAFF_LIST.map(s => (
            <div key={s.name} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <div style={{ position:"relative" }}>
                <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#3D2B1F,#1A120A)",border:`2px solid ${C.chrome}`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <Icon d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" size={22} color={C.muted} />
                </div>
                <div style={{ position:"absolute",bottom:1,right:1,width:8,height:8,borderRadius:"50%",background:s.dot,border:`1.5px solid ${C.dark}` }} />
              </div>
              <div style={{ fontSize:10, color:C.cream, textAlign:"center", lineHeight:1.2, maxWidth:44, fontWeight:600 }}>{s.name}</div>
              <div style={{ fontSize:9, color:C.muted, textAlign:"center" }}>{s.role}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:"10px 16px", borderRight:`1px solid ${C.chrome}` }}>
        <div style={{ fontSize:10, fontFamily:C.mono, color:C.gold, letterSpacing:"0.26em", marginBottom:8 }}>VENUE INSIGHTS</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
          {[
            { l:"SALES/HOUR",     v:`$${revenue.totalFloorRevenue.toFixed(0)}`, s:"+18% vs last hour", c:C.green },
            { l:"AVG CHECK",      v:`$${revenue.avgCheck.toFixed(2)}`,           s:"+12% vs last hour", c:C.green },
            { l:"TOP CATEGORY",   v:revenue.topCategory,                         s:"by revenue",         c:C.amber },
            { l:"PAIRING SUCCESS",v:"92%",                                        s:"High Impact",        c:C.green },
          ].map(m => (
            <div key={m.l}>
              <div style={{ fontSize:16, fontWeight:900, color:m.c, lineHeight:1 }}>{m.v}</div>
              <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.14em", textTransform:"uppercase", margin:"3px 0 2px" }}>{m.l}</div>
              <div style={{ fontSize:9, color:m.c }}>{m.s}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:"10px 14px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ fontSize:10, fontFamily:C.mono, color:C.gold, letterSpacing:"0.26em" }}>POS HUB</span>
          {paymentState === "processing" && (
            <motion.span animate={{opacity:[1,0.4,1]}} transition={{duration:0.8,repeat:Infinity}}
              style={{ fontSize:9, color:C.amber, fontFamily:C.mono }}>PROCESSING...</motion.span>
          )}
          {paymentState === "success" && (
            <span style={{ fontSize:9, color:C.green, fontFamily:C.mono, display:"flex", alignItems:"center", gap:4 }}>
              <Icon d={P.check} size={11} color={C.green} /> SENT
            </span>
          )}
          {paymentState === "error" && <span style={{ fontSize:9, color:C.redHi, fontFamily:C.mono }}>ERROR</span>}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:5 }}>
          {providers.slice(0,5).map(prov => {
            const col = posStatusColor(prov);
            const name = prov.displayName.replace(" POS","");
            return (
              <div key={prov.provider} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                <div style={{ width:32,height:32,borderRadius:6,background:`${col}18`,border:`1px solid ${col}40`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <Icon d={P.pos} size={16} color={col} />
                </div>
                <div style={{ fontSize:8, color:col, fontWeight:700, textAlign:"center", lineHeight:1.1 }}>{name}</div>
                <div style={{ fontSize:7, color:C.muted, textAlign:"center" }}>
                  {prov.capabilities.supportsInventorySync ? "SYNC" : "ORDER"}
                </div>
              </div>
            );
          })}
          {providers.length === 0 && (
            <div style={{ gridColumn:"span 5", fontSize:10, color:C.muted, textAlign:"center", paddingTop:8 }}>
              Connecting to POS Hub...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cross-Layer Hooks ─────────────────────────────────────────────────────────

type ZoneAssignment = { staffId: string; staffName: string; assignedSection: string | null; assignedTables: string[] | null };
type CoachingSuggestion = { cue: string; tag: string; accent: string };

function useZoneSync(intervalMs = 60_000) {
  const [assignments, setAssignments] = useState<ZoneAssignment[]>([]);
  useEffect(() => {
    const run = async () => {
      const data = await api.fetchZoneAssignments();
      setAssignments(data.assignments);
    };
    run();
    const id = setInterval(run, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return assignments;
}

function useDeviceHeartbeat(deviceId: string, intervalMs = 60_000) {
  useEffect(() => {
    const ping = async () => {
      const t0 = performance.now();
      let latencyMs = 0;
      try {
        await fetch("/api/health", { method: "HEAD", cache: "no-store" });
        latencyMs = Math.round(performance.now() - t0);
      } catch { latencyMs = 9999; }
      const battery = (navigator as unknown as { getBattery?: () => Promise<{ level: number }> }).getBattery;
      const batteryPct = battery
        ? await battery.call(navigator).then((b: { level: number }) => Math.round(b.level * 100)).catch(() => null)
        : null;
      await api.reportHeartbeat({
        deviceId, batteryPct, networkLatencyMs: latencyMs,
        retryQueueDepth: 0, venueId: "novee-terminal",
      });
    };
    ping();
    const id = setInterval(ping, intervalMs);
    return () => clearInterval(id);
  }, [deviceId, intervalMs]);
}

function useContextCoaching(intervalMs = 30_000) {
  const [coaching, setCoaching] = useState<CoachingSuggestion | null>(null);
  useEffect(() => {
    const run = async () => {
      const s = await api.fetchContextCoaching();
      if (s) setCoaching(s);
    };
    run();
    const id = setInterval(run, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return coaching;
}

function CoachingBadge({ coaching }: { coaching: CoachingSuggestion | null }) {
  if (!coaching) return null;
  return (
    <motion.div
      key={coaching.cue}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      style={{ marginBottom: 8, borderRadius: 10, overflow: "hidden",
        border: `1px solid ${coaching.accent}66`,
        background: "rgba(4,4,6,0.97)", backdropFilter: "blur(18px)",
        boxShadow: `0 0 22px ${coaching.accent}22` }}>
      <div style={{ padding: "7px 12px 0",
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: C.mono, fontSize: 8, color: C.muted, letterSpacing: "0.22em" }}>
          AI CONTEXT ENGINE
        </div>
        <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.16em", fontFamily: C.mono,
          color: coaching.accent, border: `1px solid ${coaching.accent}55`,
          borderRadius: 4, padding: "2px 6px" }}>
          {coaching.tag}
        </div>
      </div>
      <div style={{ padding: "7px 12px 10px" }}>
        <motion.div animate={{ opacity: [1, 0.85, 1] }} transition={{ duration: 3, repeat: Infinity }}
          style={{ fontSize: 12, fontWeight: 700, color: C.white, lineHeight: 1.55, letterSpacing: "0.01em" }}>
          {coaching.cue}
        </motion.div>
      </div>
      <motion.div animate={{ width: ["0%", "100%"] }} transition={{ duration: 30, ease: "linear", repeat: Infinity }}
        style={{ height: 2, background: `linear-gradient(90deg,transparent,${coaching.accent},transparent)` }} />
    </motion.div>
  );
}

// ── PIN Gate Overlay — dual-layer security authentication ─────────────────────
function PinGateOverlay({
  target, onSuccess, onCancel,
}: {
  target: "supervisor" | "admin";
  onSuccess: (level: "supervisor" | "admin") => void;
  onCancel: () => void;
}) {
  const [dots,   setDots]   = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "checking" | "fail">("idle");

  const submit = async (pin: string) => {
    setStatus("checking");
    const result = await api.validatePin(pin, target);
    if (result.ok) {
      onSuccess(target);
    } else {
      setStatus("fail");
      setTimeout(() => { setStatus("idle"); setDots([]); }, 1_300);
    }
  };
  const append = (d: string) => {
    if (dots.length >= 4 || status !== "idle") return;
    const next = [...dots, d];
    setDots(next);
    if (next.length === 4) submit(next.join(""));
  };
  const del = () => { if (status === "idle") setDots(p => p.slice(0, -1)); };

  const KEYS = ["1","2","3","4","5","6","7","8","9","⌫","0","✓"];
  const accent = target === "admin" ? C.redHi : C.gold;
  const label  = target === "admin" ? "ADMIN OVERRIDE ACCESS" : "SUPERVISOR SESSION";
  const hint   = target === "admin" ? "Founder PIN required" : "Enter your staff PIN to activate session";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 9800, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.93)", backdropFilter: "blur(20px)" }} onClick={onCancel} />
      <motion.div
        animate={status === "fail" ? { x: [0, -14, 14, -10, 10, -5, 5, 0] } : {}}
        transition={{ duration: 0.48 }}
        initial={{ scale: 0.88, y: 36 }} whileInView={{ scale: 1, y: 0 }}
        style={{ position: "relative", zIndex: 1, width: 360,
          background: "rgba(3,3,5,0.99)", border: `1px solid ${accent}`,
          borderRadius: 16, overflow: "hidden", boxShadow: `0 0 90px ${accent}44` }}>
        <div style={{ padding: "20px 24px 16px", textAlign: "center", borderBottom: `1px solid ${C.chrome}`,
          background: `linear-gradient(180deg,${target === "admin" ? "rgba(80,10,10,0.6)" : "rgba(60,50,0,0.5)"},transparent)` }}>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: accent, letterSpacing: "0.32em" }}>E.A.T. SECURITY LAYER</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8 }}>
            <Icon d={P.shield} size={24} color={accent} />
            <div style={{ fontSize: 22, fontWeight: 900, color: C.white }}>{label}</div>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{hint}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 18, padding: "22px 0 18px" }}>
          {[0,1,2,3].map(i => (
            <motion.div key={i}
              animate={{
                scale: dots.length > i ? 1.2 : 1,
                background: status === "fail" ? C.redHi : dots.length > i ? accent : "rgba(255,255,255,0.10)",
              }}
              transition={{ duration: 0.15 }}
              style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${status === "fail" ? C.redHi : accent}` }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "0 20px 20px" }}>
          {KEYS.map(k => {
            const isBack    = k === "⌫";
            const isConfirm = k === "✓";
            return (
              <motion.button key={k} whileTap={{ scale: 0.86 }} {...T}
                onTouchStart={e => { T.onTouchStart(e); isBack ? del() : isConfirm ? (dots.length === 4 && submit(dots.join(""))) : append(k); }}
                onClick={() => isBack ? del() : isConfirm ? (dots.length === 4 && submit(dots.join(""))) : append(k)}
                style={{ height: 64, borderRadius: 10, cursor: "pointer", fontFamily: C.sans,
                  fontWeight: 900, fontSize: isBack || isConfirm ? 22 : 28,
                  background: isConfirm ? `linear-gradient(135deg,${accent},${target === "admin" ? "#8B0000" : "#8B6914"})` : isBack ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isConfirm ? accent : C.chrome}`,
                  color: isConfirm ? (target === "admin" ? C.white : "#000") : C.white,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: status === "checking" ? 0.5 : 1 }}>
                {status === "checking" && isConfirm ? "…" : k}
              </motion.button>
            );
          })}
        </div>
        {status === "fail" && (
          <div style={{ textAlign: "center", color: C.redHi, fontSize: 13, fontWeight: 700, paddingBottom: 10, letterSpacing: "0.14em" }}>
            INCORRECT PIN
          </div>
        )}
        <div style={{ padding: "0 20px 20px" }}>
          <motion.button whileTap={{ scale: 0.96 }} onClick={onCancel} {...T}
            style={{ width: "100%", height: 46, borderRadius: 8, cursor: "pointer",
              background: "rgba(255,255,255,0.04)", border: `1px solid ${C.chrome}`,
              color: C.muted, fontSize: 14, fontWeight: 700, fontFamily: C.sans }}>
            CANCEL
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Elevated Session Ribbon ────────────────────────────────────────────────────
function ElevatedSessionRibbon({
  level, sessionStart, selectedTableId, onEndSession, onForceClose, onZoneDynamics,
}: {
  level: "supervisor" | "admin";
  sessionStart: Date;
  selectedTableId: number;
  onEndSession: () => void;
  onForceClose: (id: number) => void;
  onZoneDynamics: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart.getTime()) / 1000)), 1000);
    return () => clearInterval(id);
  }, [sessionStart]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const accent = level === "admin" ? C.redHi : C.gold;
  const label  = level === "admin" ? "ADMIN OVERRIDE ACTIVE" : "SUPERVISOR SESSION ACTIVE";
  const actions = level === "admin"
    ? [
        { label: "FORCE CLOSE TAB",  fn: () => onForceClose(selectedTableId) },
        { label: "ZONE DYNAMICS",    fn: onZoneDynamics },
      ]
    : [
        { label: "ZONE DYNAMICS",    fn: onZoneDynamics },
      ];
  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 44, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
      style={{ flexShrink: 0, overflow: "hidden",
        background: level === "admin" ? "rgba(70,5,5,0.96)" : "rgba(50,40,0,0.96)",
        borderBottom: `1px solid ${accent}`,
        display: "flex", alignItems: "center", gap: 12, padding: "0 16px", position: "relative", zIndex: 4 }}>
      <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.0, repeat: Infinity }}
        style={{ width: 8, height: 8, borderRadius: "50%", background: accent, flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 900, color: accent, letterSpacing: "0.22em", fontFamily: C.mono, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 10, color: C.muted, fontFamily: C.mono, flexShrink: 0 }}>{mm}:{ss}</span>
      <div style={{ flex: 1, display: "flex", gap: 6 }}>
        {actions.map(a => (
          <motion.button key={a.label} whileTap={{ scale: 0.93 }} {...T}
            onTouchStart={e => { T.onTouchStart(e); a.fn(); }} onClick={a.fn}
            style={{ height: 28, padding: "0 12px", borderRadius: 6, cursor: "pointer",
              background: "rgba(255,255,255,0.07)", border: `1px solid ${accent}55`,
              color: accent, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", fontFamily: C.sans }}>
            {a.label}
          </motion.button>
        ))}
      </div>
      <motion.button whileTap={{ scale: 0.93 }} {...T}
        onTouchStart={e => { T.onTouchStart(e); onEndSession(); }} onClick={onEndSession}
        style={{ height: 28, padding: "0 14px", borderRadius: 6, cursor: "pointer", flexShrink: 0,
          background: "rgba(255,255,255,0.05)", border: `1px solid ${C.chrome}`,
          color: C.muted, fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", fontFamily: C.sans }}>
        END SESSION
      </motion.button>
    </motion.div>
  );
}

// ── Zone Dynamics Panel ────────────────────────────────────────────────────────
function ZoneDynamicsPanel({
  activeTables, onClose, onReassign,
}: {
  activeTables: Record<number, VenueTable>;
  onClose: () => void;
  onReassign: (tableId: number, zone: string) => void;
}) {
  const ZONES = ["VIP Section", "Main Floor", "Main Lounge", "Outdoor", "High-Velocity Bar", "Humidor Depot"];
  const tables = Object.values(activeTables);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 9100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)" }} onClick={onClose} />
      <motion.div initial={{ scale: 0.93, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 24 }}
        style={{ position: "relative", zIndex: 1, width: 620, maxHeight: "82vh",
          background: "rgba(3,3,5,0.99)", border: `1px solid ${C.gold}`, borderRadius: 14,
          overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: `0 0 80px ${C.goldGlo}` }}>
        <div style={{ padding: "16px 22px", borderBottom: `1px solid ${C.chrome}`,
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
          background: "linear-gradient(180deg,rgba(60,50,0,0.5),transparent)" }}>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, letterSpacing: "0.28em" }}>SUPERVISOR CONTROL MATRIX</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.white, marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
              <Icon d={P.map} size={22} color={C.gold} /> ZONE DYNAMICS
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} {...T}
            style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(255,255,255,0.05)",
              border: `1px solid ${C.chrome}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={P.close2} size={18} color={C.muted} />
          </motion.button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {tables.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: C.muted, fontSize: 14 }}>No active tables on floor</div>
          )}
          {tables.map((t, idx) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px",
              borderBottom: idx < tables.length - 1 ? `1px solid ${C.chrome}` : "none" }}>
              <div style={{ width: 52, height: 52, borderRadius: 9, flexShrink: 0,
                background: `url(${zoneBg(t.zone)}) center/cover,#1A1A1A`, border: `2px solid ${C.chrome}` }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.white }}>TABLE {t.id}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  {t.guest} · {t.items.length} item{t.items.length !== 1 ? "s" : ""} · ${t.items.reduce((s,i) => s + i.price * i.qty, 0).toFixed(2)}
                </div>
              </div>
              <select value={t.zone} onChange={e => onReassign(t.id, e.target.value)}
                style={{ height: 50, padding: "0 14px", borderRadius: 8, minWidth: 200,
                  background: "rgba(10,10,10,0.98)", border: `2px solid ${C.gold}`,
                  color: C.amber, fontSize: 18, fontWeight: 700, fontFamily: C.sans,
                  outline: "none", cursor: "pointer" }}>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 22px", borderTop: `1px solid ${C.chrome}`, flexShrink: 0,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "rgba(0,0,0,0.5)" }}>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>
            {tables.length} active table{tables.length !== 1 ? "s" : ""} · Changes apply immediately
          </span>
          <motion.button whileTap={{ scale: 0.96 }} onClick={onClose} {...T}
            style={{ height: 46, padding: "0 28px", borderRadius: 8, cursor: "pointer",
              background: `linear-gradient(135deg,${C.gold},#A67C00)`, border: "none",
              color: "#000", fontSize: 16, fontWeight: 900, fontFamily: C.sans }}>
            LOCK ASSIGNMENTS
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── POS Event Banner ──────────────────────────────────────────────────────────
function PosEventBanner({ delta }: { delta: { provider: string; eventType: string; cigarsConsumed: number; spiritsDepleted: string[] } | null }) {
  const [visible, setVisible] = useState(false);
  const [cur, setCur] = useState(delta);
  useEffect(() => {
    if (!delta) return;
    setCur(delta); setVisible(true);
    const id = setTimeout(() => setVisible(false), 7_000);
    return () => clearTimeout(id);
  }, [delta]);
  const desc = cur ? [
    cur.cigarsConsumed > 0 ? `${cur.cigarsConsumed} cigar${cur.cigarsConsumed > 1 ? "s" : ""} deducted` : null,
    cur.spiritsDepleted.length > 0 ? `${cur.spiritsDepleted[0]} depleted` : null,
  ].filter(Boolean).join(" · ") : "";
  return (
    <AnimatePresence>
      {visible && cur && (
        <motion.div initial={{x:"100%",opacity:0}} animate={{x:0,opacity:1}} exit={{x:"100%",opacity:0}}
          transition={{ type:"spring", stiffness:380, damping:34 }}
          style={{ position:"fixed", top:62, right:18, zIndex:8500, maxWidth:340,
            background:"rgba(8,8,10,0.97)", border:`1px solid ${C.amber}`,
            borderRadius:10, padding:"10px 14px", boxShadow:`0 0 28px ${C.amber}44`,
            display:"flex", alignItems:"center", gap:10 }}>
          <motion.div animate={{ rotate:360 }} transition={{ duration:1.8, repeat:Infinity, ease:"linear" }}>
            <Icon d={P.signal} size={16} color={C.amber} />
          </motion.div>
          <div>
            <div style={{ fontSize:10, fontFamily:C.mono, color:C.amber, letterSpacing:"0.22em", textTransform:"uppercase" }}>
              {cur.provider.toUpperCase()} — {cur.eventType}
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:C.white, marginTop:2 }}>
              Off-platform sale detected: {desc}
            </div>
            <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>Inventory synced automatically</div>
          </div>
          <motion.button whileTap={{scale:0.9}} onClick={() => setVisible(false)}
            style={{ marginLeft:"auto", width:22, height:22, borderRadius:"50%",
              background:"rgba(255,255,255,0.07)", border:`1px solid ${C.chrome}`,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Icon d={P.close2} size={12} color={C.muted} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── POS Menu Mapper Modal ─────────────────────────────────────────────────────
function PosMenuMapperModal({ onClose }: { onClose: () => void }) {
  const [mappings, setMappings] = useState<Record<string, string>>(() =>
    Object.fromEntries(PRODUCT_CATALOG.map(p => [p.productId, ""]))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved]   = useState<Record<string, boolean>>({});

  const saveRow = async (productId: string, name: string) => {
    const posId = mappings[productId] ?? "";
    if (!posId.trim()) return;
    setSaving(productId);
    await api.saveMapping(productId, name, posId.trim());
    setSaved(prev => ({ ...prev, [productId]: true }));
    setSaving(null);
    setTimeout(() => setSaved(prev => { const n = { ...prev }; delete n[productId]; return n; }), 2500);
  };

  type CatalogEntry = typeof PRODUCT_CATALOG[number];
  const cigars  = PRODUCT_CATALOG.filter((p): p is CatalogEntry => p.category === "Cigars");
  const spirits = PRODUCT_CATALOG.filter((p): p is CatalogEntry => p.category === "Spirits");

  const renderSection = (label: string, items: CatalogEntry[]) => (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:10, fontFamily:C.mono, color:C.amber, letterSpacing:"0.24em", marginBottom:8, paddingLeft:4 }}>{label}</div>
      {items.map(p => (
        <div key={p.productId + p.sku} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px",
          borderBottom:`1px solid ${C.chrome}`, background: saved[p.productId] ? `rgba(39,174,96,0.06)` : "transparent" }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:18, fontWeight:700, color:C.white, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
            <div style={{ fontSize:11, fontFamily:C.mono, color:C.muted, marginTop:2 }}>ID: {p.productId} · SKU: {p.sku}</div>
          </div>
          <input value={mappings[p.productId] ?? ""} onChange={e => setMappings(prev => ({ ...prev, [p.productId]: e.target.value }))}
            placeholder="POS Item ID / Token"
            style={{ width:180, height:38, background:"rgba(255,255,255,0.06)", border:`1px solid ${C.chrome}`,
              borderRadius:6, color:C.white, fontSize:14, fontFamily:C.mono, padding:"0 10px", outline:"none" }} />
          <motion.button whileTap={{scale:0.94}} {...T}
            onTouchStart={e => { T.onTouchStart(e); saveRow(p.productId, p.name); }}
            onClick={() => saveRow(p.productId, p.name)}
            style={{ height:38, minWidth:80, padding:"0 14px", borderRadius:6, cursor:"pointer",
              background: saved[p.productId] ? `rgba(39,174,96,0.18)` : `linear-gradient(135deg,${C.amber},#B87318)`,
              border:`1px solid ${saved[p.productId] ? C.green : C.amber}`,
              color: saved[p.productId] ? C.green : "#000", fontSize:13, fontWeight:800, fontFamily:C.sans }}>
            {saving === p.productId ? "..." : saved[p.productId] ? "SAVED" : "SAVE"}
          </motion.button>
        </div>
      ))}
    </div>
  );

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{ position:"fixed", inset:0, zIndex:9100, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.88)", backdropFilter:"blur(14px)" }} onClick={onClose} />
      <motion.div initial={{scale:0.93,y:24}} animate={{scale:1,y:0}} exit={{scale:0.93,y:24}}
        style={{ position:"relative", zIndex:1, width:720, maxHeight:"88vh", background:"rgba(5,5,7,0.99)",
          border:`1px solid ${C.amber}`, borderRadius:14, overflow:"hidden", display:"flex", flexDirection:"column",
          boxShadow:`0 0 70px ${C.amber}33` }}>
        <div style={{ padding:"16px 22px", borderBottom:`1px solid ${C.chrome}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:C.mono, fontSize:9, color:C.amber, letterSpacing:"0.28em" }}>VENUE CONFIG MATRIX</div>
            <div style={{ fontSize:22, fontWeight:900, color:C.white, marginTop:3 }}>POS MENU MAPPER</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Link internal product IDs to your active POS provider item tokens</div>
          </div>
          <motion.button whileTap={{scale:0.9}} onClick={onClose} {...T}
            style={{ width:36, height:36, borderRadius:9, background:"rgba(255,255,255,0.05)", border:`1px solid ${C.chrome}`,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon d={P.close2} size={18} color={C.muted} />
          </motion.button>
        </div>
        <div style={{ padding:"14px 0", overflowY:"auto", flex:1 }}>
          {renderSection("— HUMIDOR CATALOG", cigars)}
          {renderSection("— BAR CATALOG", spirits)}
        </div>
        <div style={{ padding:"12px 22px", borderTop:`1px solid ${C.chrome}`, flexShrink:0, display:"flex", alignItems:"center", gap:10 }}>
          <Icon d={P.grid} size={14} color={C.muted} />
          <span style={{ fontSize:11, color:C.muted }}>
            Mappings saved to <span style={{ color:C.amber, fontFamily:C.mono }}>pos_menu_mappings</span> table · Active POS: Clover / Toast / Square
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Staff Deployment Roster Modal ─────────────────────────────────────────────
const STAFF_SEED: StaffMember[] = [
  { staffId: "s1", staffName: "Alex R.",    assignedSection: "VIP Section",  assignedTables: "101,102", isActive: true },
  { staffId: "s2", staffName: "Jasmine L.", assignedSection: "Main Floor",   assignedTables: "103,104", isActive: true },
  { staffId: "s3", staffName: "Marco B.",   assignedSection: "Bar",          assignedTables: null,      isActive: true },
  { staffId: "s4", staffName: "Tanya G.",   assignedSection: "All Sections", assignedTables: null,      isActive: true },
  { staffId: "s5", staffName: "Devon H.",   assignedSection: "Entrance",     assignedTables: null,      isActive: true },
];

function StaffRosterModal({ onClose }: { onClose: () => void }) {
  const [staff, setStaff]           = useState<StaffMember[]>(STAFF_SEED);
  const [newName, setNewName]       = useState("");
  const [newPin, setNewPin]         = useState("");
  const [newSection, setNewSection] = useState("");
  const [adding, setAdding]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => { api.staffRoster().then(rows => { if (rows.length > 0) setStaff(rows); }); }, []);

  const toggleActive = async (member: StaffMember) => {
    const next = !member.isActive;
    setStaff(prev => prev.map(s => s.staffId === member.staffId ? { ...s, isActive: next } : s));
    api.patchStaff(member.staffId, { isActive: next });
  };

  const addMember = async () => {
    if (!newName.trim()) { setError("Name required"); return; }
    if (!/^\d{4}$/.test(newPin)) { setError("PIN must be 4 digits"); return; }
    setAdding(true); setError(null);
    const local: StaffMember = { staffId:`local_${Date.now()}`, staffName:newName.trim(),
      assignedSection:newSection.trim()||null, assignedTables:null, isActive:true };
    setStaff(prev => [...prev, local]);
    const result = await api.addStaff({ staffName:newName.trim(), staffPin:newPin, assignedSection:newSection.trim()||undefined });
    if (result) setStaff(prev => prev.map(s => s.staffId === local.staffId ? result : s));
    setNewName(""); setNewPin(""); setNewSection(""); setAdding(false);
  };

  const SECTIONS = ["VIP Section","Main Floor","Bar","Outdoor","Entrance","All Sections"];

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{ position:"fixed", inset:0, zIndex:9200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.88)", backdropFilter:"blur(14px)" }} onClick={onClose} />
      <motion.div initial={{scale:0.93,y:24}} animate={{scale:1,y:0}} exit={{scale:0.93,y:24}}
        style={{ position:"relative", zIndex:1, width:680, maxHeight:"88vh", background:"rgba(5,5,7,0.99)",
          border:`1px solid ${C.gold}`, borderRadius:14, overflow:"hidden", display:"flex", flexDirection:"column",
          boxShadow:`0 0 70px ${C.goldGlo}` }}>
        <div style={{ padding:"16px 22px", borderBottom:`1px solid ${C.chrome}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:C.mono, fontSize:9, color:C.gold, letterSpacing:"0.28em" }}>SUPERVISOR DECK</div>
            <div style={{ fontSize:22, fontWeight:900, color:C.white, marginTop:3 }}>STAFF DEPLOYMENT ROSTER</div>
          </div>
          <motion.button whileTap={{scale:0.9}} onClick={onClose} {...T}
            style={{ width:36, height:36, borderRadius:9, background:"rgba(255,255,255,0.05)", border:`1px solid ${C.chrome}`,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon d={P.close2} size={18} color={C.muted} />
          </motion.button>
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          {staff.map((member, idx) => (
            <div key={member.staffId} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 22px",
              borderBottom:idx < staff.length-1 ? `1px solid ${C.chrome}` : "none", opacity:member.isActive?1:0.45 }}>
              <div style={{ width:44, height:44, borderRadius:"50%", flexShrink:0,
                background:`linear-gradient(135deg,${C.chrome},#1A1A1A)`, border:`2px solid ${member.isActive?C.gold:C.chrome}`,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" size={24} color={member.isActive?C.gold:C.muted} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:18, fontWeight:700, color:C.white }}>{member.staffName}</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                  {member.assignedSection ?? "No section assigned"}
                  {member.assignedTables ? ` · Tables: ${member.assignedTables}` : ""}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:11, color:member.isActive?C.green:C.muted, fontFamily:C.mono }}>
                  {member.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
                <motion.div whileTap={{scale:0.92}} onClick={() => toggleActive(member)}
                  style={{ width:52, height:28, borderRadius:14, cursor:"pointer",
                    background:member.isActive?`linear-gradient(90deg,${C.green},#1E8449)`:"rgba(255,255,255,0.08)",
                    border:`1px solid ${member.isActive?C.green:C.chrome}`,
                    display:"flex", alignItems:"center", padding:"0 4px",
                    justifyContent:member.isActive?"flex-end":"flex-start" }}>
                  <motion.div layout style={{ width:20, height:20, borderRadius:"50%", background:member.isActive?"#FFF":C.chrome }} />
                </motion.div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:"16px 22px", borderTop:`1px solid ${C.chrome}`, flexShrink:0 }}>
          <div style={{ fontSize:10, fontFamily:C.mono, color:C.gold, letterSpacing:"0.22em", marginBottom:10 }}>ADD STAFF MEMBER</div>
          {error && <div style={{ fontSize:13, color:C.redHi, marginBottom:8 }}>{error}</div>}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full Name"
              style={{ flex:2, minWidth:140, height:44, background:"rgba(255,255,255,0.06)", border:`1px solid ${C.chrome}`,
                borderRadius:7, color:C.white, fontSize:18, padding:"0 12px", outline:"none", fontFamily:C.sans }} />
            <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="4-digit PIN" type="password"
              style={{ width:120, height:44, background:"rgba(255,255,255,0.06)", border:`1px solid ${C.chrome}`,
                borderRadius:7, color:C.white, fontSize:18, padding:"0 12px", outline:"none", fontFamily:C.mono, letterSpacing:"0.2em" }} />
            <select value={newSection} onChange={e => setNewSection(e.target.value)}
              style={{ flex:1, minWidth:140, height:44, background:"rgba(10,10,10,0.95)", border:`1px solid ${C.chrome}`,
                borderRadius:7, color:newSection?C.white:C.muted, fontSize:16, padding:"0 10px", outline:"none", fontFamily:C.sans }}>
              <option value="">Select Section</option>
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <motion.button whileTap={{scale:0.96}} {...T}
              onTouchStart={e => { T.onTouchStart(e); addMember(); }} onClick={addMember}
              style={{ height:44, padding:"0 20px", borderRadius:7, background:`linear-gradient(135deg,${C.gold},#A67C00)`,
                border:"none", color:"#000", fontSize:16, fontWeight:900, cursor:"pointer", fontFamily:C.sans,
                opacity:adding?0.6:1, minWidth:100 }}>
              {adding ? "ADDING..." : "ADD STAFF"}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Reservation → Table Assignment Panel ──────────────────────────────────────
function ReservationPanel({
  reservations, onClose, onAssign,
}: {
  reservations: LocalReservation[];
  onClose: () => void;
  onAssign: (resId: string, tableId: number, guestName: string) => void;
}) {
  const [selectedRes, setSelectedRes] = useState<LocalReservation | null>(null);
  const AVAILABLE_TABLES = [101, 102, 103, 104, 105, 106];
  const statusColor = (s: LocalReservation["status"]) =>
    s === "accepted" ? C.green : s === "pending" ? C.amber : C.muted;

  return (
    <motion.div initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}}
      transition={{ type:"spring", stiffness:320, damping:34 }}
      style={{ position:"fixed", top:50, right:0, bottom:116, zIndex:8200, width:380,
        background:"rgba(4,4,6,0.98)", border:`1px solid ${C.chrome}`, borderLeft:`2px solid ${C.gold}`,
        display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.chrome}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        <div>
          <div style={{ fontFamily:C.mono, fontSize:9, color:C.gold, letterSpacing:"0.26em" }}>TABLE OVERVIEW MATRIX</div>
          <div style={{ fontSize:20, fontWeight:900, color:C.white, marginTop:2 }}>RESERVATION QUEUE</div>
        </div>
        <motion.button whileTap={{scale:0.9}} onClick={onClose} {...T}
          style={{ width:34, height:34, borderRadius:8, background:"rgba(255,255,255,0.05)", border:`1px solid ${C.chrome}`,
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon d={P.close2} size={16} color={C.muted} />
        </motion.button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"10px 0" }}>
        {reservations.map((res, idx) => (
          <motion.div key={res.id} whileTap={{scale:0.98}}
            onClick={() => setSelectedRes(selectedRes?.id === res.id ? null : res)}
            style={{ padding:"12px 18px", borderBottom:idx < reservations.length-1 ? `1px solid ${C.chrome}` : "none",
              cursor:"pointer", background:selectedRes?.id===res.id?`rgba(212,175,55,0.08)`:"transparent",
              borderLeft:selectedRes?.id===res.id?`3px solid ${C.gold}`:"3px solid transparent" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:18, fontWeight:700, color:C.white }}>{res.guestName}</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>
                  Party of {res.partySize} · {res.requestedAt}
                  {res.productName ? ` · ${res.productName}` : ""}
                </div>
                {res.tableAssigned && (
                  <div style={{ fontSize:11, color:C.green, marginTop:4, fontFamily:C.mono }}>
                    TABLE {res.tableAssigned} — ASSIGNED
                  </div>
                )}
              </div>
              <span style={{ fontSize:10, fontWeight:800, color:statusColor(res.status),
                border:`1px solid ${statusColor(res.status)}44`, borderRadius:4,
                padding:"3px 8px", letterSpacing:"0.14em", flexShrink:0, marginLeft:10 }}>
                {res.status.toUpperCase()}
              </span>
            </div>
            <AnimatePresence>
              {selectedRes?.id === res.id && !res.tableAssigned && (
                <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
                  style={{ overflow:"hidden" }}>
                  <div style={{ paddingTop:12 }}>
                    <div style={{ fontSize:10, fontFamily:C.mono, color:C.amber, letterSpacing:"0.22em", marginBottom:8 }}>
                      SELECT TABLE TO ASSIGN:
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                      {AVAILABLE_TABLES.map(tid => (
                        <motion.button key={tid} whileTap={{scale:0.91}} {...T}
                          onTouchStart={e => { T.onTouchStart(e); onAssign(res.id, tid, res.guestName); setSelectedRes(null); }}
                          onClick={() => { onAssign(res.id, tid, res.guestName); setSelectedRes(null); }}
                          style={{ width:58, height:58, borderRadius:8, cursor:"pointer",
                            background:`linear-gradient(135deg,${C.goldDim},rgba(212,175,55,0.05))`,
                            border:`2px solid ${C.gold}`, color:C.gold, fontSize:22, fontWeight:900,
                            fontFamily:C.sans, display:"flex", flexDirection:"column",
                            alignItems:"center", justifyContent:"center", gap:2 }}>
                          <span style={{ fontSize:18, fontWeight:900 }}>{tid}</span>
                          <span style={{ fontSize:8, letterSpacing:"0.12em", color:C.amber }}>TBL</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
      <div style={{ padding:"10px 18px", borderTop:`1px solid ${C.chrome}`, flexShrink:0, background:C.dark }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[
            { l:"TOTAL",    v:String(reservations.length) },
            { l:"ACCEPTED", v:String(reservations.filter(r => r.status==="accepted").length) },
            { l:"SEATED",   v:String(reservations.filter(r => r.tableAssigned!==null).length) },
          ].map(s => (
            <div key={s.l} style={{ textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:900, color:C.amber }}>{s.v}</div>
              <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.18em" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Payment Toast ─────────────────────────────────────────────────────────────
function PaymentToast({ state, total }: { state: PaymentState; total: number }) {
  return (
    <AnimatePresence>
      {state !== "idle" && (
        <motion.div initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40}}
          style={{ position:"fixed", bottom:130, right:24, zIndex:9999, padding:"14px 20px", borderRadius:12, background:`rgba(8,8,10,0.98)`, border:`1px solid ${state==="success"?C.green:state==="error"?C.redHi:C.gold}`, boxShadow:`0 0 30px ${state==="success"?C.green+"44":state==="error"?C.redHi+"44":C.goldGlo}`, display:"flex", alignItems:"center", gap:12, minWidth:240 }}>
          {state === "processing" && <motion.div animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:"linear"}}><Icon d={P.sync} size={18} color={C.amber} /></motion.div>}
          {state === "success"    && <Icon d={P.check}  size={18} color={C.green} />}
          {state === "error"      && <Icon d={P.warn}   size={18} color={C.redHi} />}
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:C.white }}>
              {state==="processing" ? "Submitting Order..." : state==="success" ? "Order Confirmed" : "Submission Failed"}
            </div>
            <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
              {state==="success" ? `$${total.toFixed(2)} → POS relay complete` : state==="error" ? "Check POS connection" : "Broadcasting to POS Hub..."}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Stable terminal device ID ─────────────────────────────────────────────────
const TERMINAL_DEVICE_ID = `novee-${Math.random().toString(36).slice(2, 10)}`;

// ── Root ──────────────────────────────────────────────────────────────────────
export default function StaffTerminal({ onBack: onBackProp }: { onBack?: () => void } = {}) {
  const [, navigate] = useLocation();
  const back = onBackProp ?? (() => navigate("/craft-hub"));

  const [venueState, setVenueState] = useState<VenueState>(INITIAL);
  const [providers,  setProviders]  = useState<PosProvider[]>([]);
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [lastPayTotal, setLastPayTotal] = useState(0);
  const syncAge = Math.floor((Date.now() - venueState.lastSyncAt.getTime()) / 60_000);

  // ── New operational panel state ────────────────────────────────────────────
  const [showMapper,       setShowMapper]       = useState(false);
  const [showStaffRoster,  setShowStaffRoster]  = useState(false);
  const [showReservations, setShowReservations] = useState(false);
  const [reservations, setReservations] = useState<LocalReservation[]>(SEED_RESERVATIONS);
  const [lastWebhookDelta, setLastWebhookDelta] = useState<{
    provider: string; eventType: string; cigarsConsumed: number; spiritsDepleted: string[];
  } | null>(null);
  const [orderToastMsg, setOrderToastMsg] = useState<string | null>(null);

  // ── Dual-layer security gate state ──────────────────────────────────────────
  const [isAdminView,      setIsAdminView]      = useState(false);
  const [isSupervisorView, setIsSupervisorView] = useState(false);
  const [enteredPin,       setEnteredPin]        = useState("");
  const [pinTarget,        setPinTarget]         = useState<"supervisor" | "admin" | null>(null);
  const [sessionStart,     setSessionStart]      = useState<Date | null>(null);
  const [showZoneDynamics, setShowZoneDynamics]  = useState(false);

  // ── Cross-layer sync hooks ─────────────────────────────────────────────────
  const zoneAssignments = useZoneSync(60_000);
  const coaching        = useContextCoaching(30_000);
  useDeviceHeartbeat(TERMINAL_DEVICE_ID, 60_000);
  const syncedSection   = zoneAssignments[0]?.assignedSection ?? null;

  // ── Webhook delta handler ──────────────────────────────────────────────────
  const handleWebhookDelta = useCallback((delta: { provider: string; eventType: string; cigarsConsumed: number; spiritsDepleted: string[] }) => {
    setLastWebhookDelta(delta);
    if (delta.cigarsConsumed > 0) {
      setVenueState(prev => ({
        ...prev,
        telemetry: {
          ...prev.telemetry,
          humidor: {
            ...prev.telemetry.humidor,
            purosRemaining: Math.max(0, prev.telemetry.humidor.purosRemaining - delta.cigarsConsumed),
          },
        },
      }));
    }
  }, []);
  usePosEventSync(handleWebhookDelta);

  // ── Generate purchase order ────────────────────────────────────────────────
  const generateOrder = useCallback(async (productId: string, qty: number, productName: string) => {
    const result = await api.generateOrder(productId, qty);
    const label = result ? `PO #${result.id.slice(0,8).toUpperCase()} — ${productName} (qty ${qty}) submitted` : `Order queued for ${productName}`;
    setOrderToastMsg(label);
    setTimeout(() => setOrderToastMsg(null), 5_000);
  }, []);

  // ── Assign reservation → table ─────────────────────────────────────────────
  // ── Security Gate Callbacks ─────────────────────────────────────────────────
  const openPinGate = useCallback((target: "supervisor" | "admin") => {
    setEnteredPin(""); setPinTarget(target);
  }, []);

  const handlePinSuccess = useCallback((level: "supervisor" | "admin") => {
    setPinTarget(null); setEnteredPin(""); setSessionStart(new Date());
    if (level === "admin") { setIsAdminView(true); setIsSupervisorView(true); }
    else { setIsSupervisorView(true); }
  }, []);

  const endElevatedSession = useCallback(() => {
    setIsAdminView(false); setIsSupervisorView(false);
    setSessionStart(null); setEnteredPin(""); setPinTarget(null);
  }, []);

  const forceCloseTable = useCallback((tableId: number) => {
    setVenueState(prev => {
      const next = { ...prev.activeTables }; delete next[tableId];
      const remaining = Object.keys(next).map(Number);
      return { ...prev, activeTables: next, selectedTableId: remaining[0] ?? 101 };
    });
  }, []);

  const reassignZone = useCallback((tableId: number, zone: string) => {
    setVenueState(prev => ({
      ...prev,
      activeTables: {
        ...prev.activeTables,
        ...(prev.activeTables[tableId] ? { [tableId]: { ...prev.activeTables[tableId]!, zone } } : {}),
      },
    }));
  }, []);

  const assignReservation = useCallback((resId: string, tableId: number, guestName: string) => {
    setReservations(prev => prev.map(r => r.id === resId ? { ...r, tableAssigned: tableId, status: "fulfilled" as const } : r));
    setVenueState(prev => {
      const updated = { ...prev.activeTables };
      if (updated[tableId]) updated[tableId] = { ...updated[tableId]!, reserved: true, reservationGuest: guestName };
      return { ...prev, activeTables: updated };
    });
    setShowReservations(false);
  }, []);

  const refreshInventory = useCallback(async () => {
    const [cigars, spirits] = await Promise.all([
      api.products("cigar"),
      api.products("alcohol"),
    ]);
    const dbPuros = cigars.reduce((s, p) => s + (p.qty ?? 0), 0);
    const lowStockSpirits = spirits
      .filter(p => p.qty > 0 && p.par > 0 && p.qty / p.par < 0.20)
      .map(p => ({ item: p.name, category: p.category, currentVolumePct: Math.round((p.qty / p.par) * 100) }));
    setVenueState(prev => ({
      ...prev,
      lastSyncAt: new Date(),
      telemetry: {
        ...prev.telemetry,
        humidor: { ...prev.telemetry.humidor, purosRemaining: dbPuros > 0 ? dbPuros : prev.telemetry.humidor.purosRemaining },
        bar: { ...prev.telemetry.bar, lowStockAlerts: lowStockSpirits.length > 0 ? lowStockSpirits : prev.telemetry.bar.lowStockAlerts },
      },
    }));
  }, []);

  useEffect(() => {
    refreshInventory();
    api.providers().then(setProviders);
  }, [refreshInventory]);

  useEffect(() => {
    const ms = venueState.syncIntervalMinutes * 60 * 1000;
    const id = setInterval(() => {
      refreshInventory();
      setVenueState(prev => ({
        ...prev,
        telemetry: {
          ...prev.telemetry,
          humidor: {
            ...prev.telemetry.humidor,
            humidity: Math.max(60, Math.min(80, prev.telemetry.humidor.humidity + (Math.random() > 0.5 ? 1 : -1))),
            purosRemaining: Math.max(0, prev.telemetry.humidor.purosRemaining - Math.floor(Math.random() * 2)),
          },
          bar: {
            ...prev.telemetry.bar,
            activePourSessions: Math.max(0, prev.telemetry.bar.activePourSessions + Math.floor(Math.random() * 5 - 2)),
          },
        },
      }));
    }, ms);
    return () => clearInterval(id);
  }, [venueState.syncIntervalMinutes, refreshInventory]);

  const selectTable = useCallback((id: number) => {
    setVenueState(prev => ({ ...prev, selectedTableId: id }));
  }, []);

  const updateTableItems = useCallback((tableId: number, items: VenueItem[], mutations: { id: string; qty: number }[]) => {
    setVenueState(prev => ({
      ...prev,
      activeTables: { ...prev.activeTables, [tableId]: { ...prev.activeTables[tableId], items } },
    }));
    mutations.forEach(({ id, qty }) => {
      if (id && !id.startsWith("sku_")) api.patchQty(id, qty);
    });
  }, []);

  const removeItem = useCallback((tableId: number, itemId: string) => {
    setVenueState(prev => {
      const table = prev.activeTables[tableId];
      const item = table?.items.find(i => i.id === itemId);
      const productId = SKU_TO_PRODUCT[itemId];
      if (productId && item) api.patchQty(productId, Math.max(0, (item.qty ?? 1) - 1));
      return {
        ...prev,
        activeTables: { ...prev.activeTables, [tableId]: { ...table, items: table.items.filter(i => i.id !== itemId) } },
      };
    });
  }, []);

  const kitchenReady = useCallback(() => {
    setVenueState(prev => ({
      ...prev,
      telemetry: { ...prev.telemetry, kitchen: {
        pendingOrders: Math.max(0, prev.telemetry.kitchen.pendingOrders - 1),
        readyOrders: prev.telemetry.kitchen.readyOrders + 1,
      }},
    }));
  }, []);

  const revenue    = useRevenueEngine(venueState);
  const thresholds = useThresholds(venueState.telemetry);

  const processPayment = useCallback(async (table: VenueTable) => {
    if (paymentState === "processing") return;
    const { subtotal, tax, total } = revenue.tableRevenue(table.id);
    setPaymentState("processing");
    setLastPayTotal(total);
    const payload = {
      type: "checkout", tableId: String(table.id), zone: table.zone, guest: table.guest,
      items: table.items.map(i => ({
        sku: SKU_TO_PRODUCT[i.id] ?? i.id, name: i.name, category: i.category,
        qty: i.qty, priceCents: Math.round(i.price * 100),
      })),
      subtotalCents: Math.round(subtotal * 100),
      taxCents:      Math.round(tax * 100),
      totalCents:    Math.round(total * 100),
      syncIntervalMinutes: venueState.syncIntervalMinutes,
      timestamp: new Date().toISOString(),
    };
    const result = await api.submitOrder(payload);
    if (result.ok) {
      void api.reportArrEvent(Math.round(total * 100));
    }
    setPaymentState(result.ok ? "success" : "error");
    setTimeout(() => setPaymentState("idle"), 4000);
  }, [paymentState, revenue, venueState.syncIntervalMinutes]);

  return (
    <div style={{ position:"fixed", inset:0, background:C.base, display:"flex", flexDirection:"column", fontFamily:C.sans, overflow:"hidden", backgroundImage:"radial-gradient(ellipse 100% 35% at 50% 0%,rgba(212,175,55,0.05),transparent 60%)" }}>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", boxShadow:"inset 0 0 110px rgba(0,0,0,0.65)", zIndex:0 }} />
      <div style={{ position:"relative", zIndex:2 }}>
        <Header syncAge={syncAge} />
      </div>
      <AnimatePresence>
        {(isSupervisorView || isAdminView) && sessionStart && (
          <ElevatedSessionRibbon
            level={isAdminView ? "admin" : "supervisor"}
            sessionStart={sessionStart}
            selectedTableId={venueState.selectedTableId}
            onEndSession={endElevatedSession}
            onForceClose={forceCloseTable}
            onZoneDynamics={() => setShowZoneDynamics(true)}
          />
        )}
      </AnimatePresence>
      <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative", zIndex:1 }}>
        <NavRail
          onBack={back}
          isAdminView={isAdminView}
          isSupervisorView={isSupervisorView}
          onOpenPinGate={openPinGate}
        />
        <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1.15fr 1fr", gap:10, padding:"10px 12px 10px 10px", overflow:"hidden" }}>
          <TelemetryCol
            tel={venueState.telemetry}
            thresh={thresholds}
            onKitchenReady={kitchenReady}
            onOpenMapper={() => setShowMapper(true)}
            onOpenStaff={() => setShowStaffRoster(true)}
            onOpenReservations={() => setShowReservations(true)}
            onGenerateOrder={generateOrder}
          />
          <TicketsCol state={venueState} revenue={revenue} onSelect={selectTable} onUpdate={updateTableItems} />
          <LedgerCol  state={venueState} revenue={revenue} onRemove={removeItem} onProcessPayment={processPayment} coaching={coaching} />
        </div>
      </div>
      <div style={{ position:"relative", zIndex:2 }}>
        <Footer revenue={revenue} providers={providers} paymentState={paymentState} />
      </div>
      <PaymentToast state={paymentState} total={lastPayTotal} />

      {/* ── Operational Panel Layer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showReservations && (
          <ReservationPanel
            reservations={reservations}
            onClose={() => setShowReservations(false)}
            onAssign={assignReservation}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showMapper && <PosMenuMapperModal onClose={() => setShowMapper(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showStaffRoster && <StaffRosterModal onClose={() => setShowStaffRoster(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showZoneDynamics && (
          <ZoneDynamicsPanel
            activeTables={venueState.activeTables}
            onClose={() => setShowZoneDynamics(false)}
            onReassign={reassignZone}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {pinTarget && (
          <PinGateOverlay
            target={pinTarget}
            onSuccess={handlePinSuccess}
            onCancel={() => { setPinTarget(null); setEnteredPin(""); }}
          />
        )}
      </AnimatePresence>
      <PosEventBanner delta={lastWebhookDelta} />

      {/* ── Purchase Order Toast ────────────────────────────────────────────── */}
      <AnimatePresence>
        {orderToastMsg && (
          <motion.div initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}}
            style={{ position:"fixed", bottom:130, left:"50%", transform:"translateX(-50%)", zIndex:9000,
              background:"rgba(5,5,7,0.97)", border:`1px solid ${C.green}`,
              borderRadius:10, padding:"12px 22px", boxShadow:`0 0 30px rgba(39,174,96,0.35)`,
              display:"flex", alignItems:"center", gap:10, maxWidth:480, textAlign:"center" }}>
            <Icon d={P.box} size={18} color={C.green} />
            <span style={{ fontSize:15, fontWeight:700, color:C.white }}>{orderToastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
