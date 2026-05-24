import React, {
  useReducer, useState, useRef, useEffect, useCallback,
} from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  bg:       "#010101",
  s1:       "#111111",
  s2:       "#1A1A1A",
  s3:       "#242424",
  border:   "#2E2E2E",
  gold:     "#C9922A",
  goldLt:   "#D4AF37",
  text:     "#F0EDE8",
  muted:    "#5E5A57",
  green:    "#27AE60",
  red:      "#C0392B",
  amber:    "#E67E22",
} as const;

const sty = {
  fill:  { background: D.bg, minHeight: "100vh", color: D.text, fontFamily: "'Inter', sans-serif" },
  card:  { background: D.s2, border: `1px solid ${D.border}`, borderRadius: 12 },
  cardG: { background: D.s2, border: `1px solid ${D.gold}44`, borderRadius: 12 },
  tag:   (c: string) => ({ background: c + "22", color: c, border: `1px solid ${c}44`,
            borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: 1 }),
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────
type TableStatus = "AVAILABLE" | "OCCUPIED" | "VIP" | "RITUAL" | "RESERVED";
type KDSStatus   = "PENDING" | "PREPARING" | "READY" | "HELD" | "DELIVERED";
type LoungeMode  = "RITUAL" | "CASUAL" | "TRANSITION";
type Velocity    = "HIGH" | "MEDIUM" | "LOW";

interface FloorTable {
  id: string; zone: "lounge" | "bar" | "locker";
  status: TableStatus; label: string;
  guest?: string; tabTotal?: number;
  lockerItems?: string[]; preferredCut?: string;
}
interface EATAsset {
  id: string; name: string; category: string;
  qty: number; par: number;
  zone: "humidor" | "bar" | "kitchen";
}
interface KDSTicket {
  id: string; ticketNum: number; tableId: string;
  items: string[]; status: KDSStatus;
  etaMin: number; holdReason?: "ritual"; startedAt: number;
}
interface ShadowPayment {
  id: string; tabId: string; amountCents: number;
  token: string; queuedAt: string; synced: boolean;
}
interface CheckItem { id: string; name: string; priceCents: number; seat: number | null; }
interface ShiftMetrics {
  tipsCents: number; salesCents: number; tablesServed: number;
  avgTabCents: number; tipPoolCents: number; pacingScore: number;
}
interface EATState {
  env: { velocity: Velocity; loungeMode: LoungeMode };
  assets: EATAsset[];
  kds: KDSTicket[];
  shadow: { queue: ShadowPayment[]; offline: boolean };
  floor: FloorTable[];
  selectedTable: string | null;
  ritualTable: string | null;
  checkItems: CheckItem[];
  shift: ShiftMetrics;
}
type EATAction =
  | { type: "SET_VELOCITY"; v: Velocity }
  | { type: "SET_LOUNGE"; m: LoungeMode }
  | { type: "DEDUCT"; id: string }
  | { type: "ADVANCE_KDS"; id: string }
  | { type: "HOLD_KDS"; id: string }
  | { type: "QUEUE_SHADOW"; p: ShadowPayment }
  | { type: "FLUSH_SHADOW" }
  | { type: "SET_OFFLINE"; v: boolean }
  | { type: "SELECT_TABLE"; id: string | null }
  | { type: "SET_RITUAL"; id: string | null }
  | { type: "ASSIGN_SEAT"; itemId: string; seat: number | null }
  | { type: "SET_TABLE_STATUS"; tableId: string; status: TableStatus };

// ── Seed data ─────────────────────────────────────────────────────────────────
const KDS_ORDER: KDSStatus[] = ["PENDING", "PREPARING", "READY", "DELIVERED"];
function nextKDS(s: KDSStatus): KDSStatus {
  const i = KDS_ORDER.indexOf(s);
  return s === "HELD" ? "PREPARING" : KDS_ORDER[Math.min(i + 1, KDS_ORDER.length - 1)];
}

const SEED_FLOOR: FloorTable[] = [
  { id: "A1", zone: "lounge", status: "RITUAL",   label: "A1", guest: "Marcus R.",    tabTotal: 780,  lockerItems: ["Cohiba Behike 52", "Partagas Series D"], preferredCut: "Guillotine" },
  { id: "A2", zone: "lounge", status: "OCCUPIED",  label: "A2", guest: "Thornton, J.", tabTotal: 340 },
  { id: "A3", zone: "lounge", status: "AVAILABLE", label: "A3" },
  { id: "A4", zone: "lounge", status: "VIP",       label: "A4", guest: "Aldridge, C.", tabTotal: 1640, lockerItems: ["Davidoff Winston Churchill", "Arturo Fuente OpusX"], preferredCut: "V-Cut" },
  { id: "A5", zone: "lounge", status: "OCCUPIED",  label: "A5", guest: "Hartley, D.",  tabTotal: 210 },
  { id: "A6", zone: "lounge", status: "RESERVED",  label: "A6", guest: "Pending 9PM" },
  { id: "B1", zone: "bar", status: "OCCUPIED",  label: "B1", guest: "Walters" },
  { id: "B2", zone: "bar", status: "OCCUPIED",  label: "B2", guest: "Chen, L." },
  { id: "B3", zone: "bar", status: "AVAILABLE", label: "B3" },
  { id: "B4", zone: "bar", status: "AVAILABLE", label: "B4" },
  { id: "B5", zone: "bar", status: "OCCUPIED",  label: "B5", guest: "Preston, M." },
  { id: "B6", zone: "bar", status: "AVAILABLE", label: "B6" },
  { id: "B7", zone: "bar", status: "OCCUPIED",  label: "B7", guest: "Nakamura" },
  { id: "B8", zone: "bar", status: "AVAILABLE", label: "B8" },
  { id: "PL1", zone: "locker", status: "VIP",       label: "PL-1", guest: "Aldridge, C.", lockerItems: ["Davidoff Anniversario", "Cohiba Siglo VI"] },
  { id: "PL2", zone: "locker", status: "OCCUPIED",  label: "PL-2", guest: "Rothmore, E." },
  { id: "PL3", zone: "locker", status: "AVAILABLE", label: "PL-3" },
  { id: "PL4", zone: "locker", status: "RESERVED",  label: "PL-4", guest: "Incoming 10PM" },
];

const SEED_ASSETS: EATAsset[] = [
  { id: "a1", name: "Cohiba Behike 52",       category: "Premium Cigar",  qty: 2,  par: 12, zone: "humidor" },
  { id: "a2", name: "Arturo Fuente OpusX",    category: "Premium Cigar",  qty: 3,  par: 12, zone: "humidor" },
  { id: "a3", name: "Davidoff Winston Ch.",   category: "Premium Cigar",  qty: 8,  par: 20, zone: "humidor" },
  { id: "a4", name: "Padron 1964 Anni.",      category: "Limited Cigar",  qty: 1,  par: 6,  zone: "humidor" },
  { id: "a5", name: "Partagas Serie D No.4",  category: "Cigar",          qty: 14, par: 24, zone: "humidor" },
  { id: "a6", name: "Macallan 18 Year",       category: "Spirit",         qty: 5,  par: 6,  zone: "bar" },
  { id: "a7", name: "Hennessy Paradis",       category: "Spirit",         qty: 2,  par: 4,  zone: "bar" },
  { id: "a8", name: "Cuban Cedar Spills",     category: "Ritual Tool",    qty: 0,  par: 50, zone: "kitchen" },
  { id: "a9", name: "Xikar Guillotine Cut.",  category: "Ritual Tool",    qty: 3,  par: 8,  zone: "kitchen" },
  { id: "a10", name: "Montecristo No. 2",     category: "Cigar",          qty: 11, par: 20, zone: "humidor" },
];

const now = Date.now();
const SEED_KDS: KDSTicket[] = [
  { id: "k1", ticketNum: 1, tableId: "A2", items: ["Cohiba Robusto", "Charcuterie Board"], status: "PREPARING", etaMin: 8,  startedAt: now - 7 * 60000 },
  { id: "k2", ticketNum: 2, tableId: "A1", items: ["Cedar Ritual Setup", "Savor Pairing"], status: "HELD",      etaMin: 0,  startedAt: now - 3 * 60000, holdReason: "ritual" },
  { id: "k3", ticketNum: 3, tableId: "B5", items: ["Whisky Flight", "Truffle Chips"],      status: "READY",     etaMin: 2,  startedAt: now - 14 * 60000 },
  { id: "k4", ticketNum: 4, tableId: "A4", items: ["Davidoff Reserve Set", "Tasting Menu"], status: "PENDING", etaMin: 15, startedAt: now - 1 * 60000 },
];

const SEED_CHECK: CheckItem[] = [
  { id: "ci1", name: "Cohiba Behike 52",   priceCents: 8500, seat: null },
  { id: "ci2", name: "Macallan 18",        priceCents: 6500, seat: null },
  { id: "ci3", name: "Charcuterie Board",  priceCents: 3800, seat: null },
  { id: "ci4", name: "Cedar Ritual Setup", priceCents: 1500, seat: null },
  { id: "ci5", name: "Savor Pairing",      priceCents: 2200, seat: null },
];

const INITIAL: EATState = {
  env:    { velocity: "HIGH", loungeMode: "RITUAL" },
  assets: SEED_ASSETS,
  kds:    SEED_KDS,
  shadow: { queue: [], offline: false },
  floor:  SEED_FLOOR,
  selectedTable: null,
  ritualTable:   null,
  checkItems:    SEED_CHECK,
  shift:  { tipsCents: 34700, salesCents: 284000, tablesServed: 14, avgTabCents: 20286, tipPoolCents: 8675, pacingScore: 91 },
};

// ── Reducer ────────────────────────────────────────────────────────────────────
function eatReducer(state: EATState, action: EATAction): EATState {
  switch (action.type) {
    case "SET_VELOCITY":    return { ...state, env: { ...state.env, velocity: action.v } };
    case "SET_LOUNGE":      return { ...state, env: { ...state.env, loungeMode: action.m } };
    case "DEDUCT":
      return { ...state, assets: state.assets.map(a => a.id === action.id ? { ...a, qty: Math.max(0, a.qty - 1) } : a) };
    case "ADVANCE_KDS":
      return { ...state, kds: state.kds.map(t => t.id === action.id ? { ...t, status: nextKDS(t.status), holdReason: undefined } : t) };
    case "HOLD_KDS":
      return { ...state, kds: state.kds.map(t => t.id === action.id ? { ...t, status: "HELD", holdReason: "ritual" } : t) };
    case "QUEUE_SHADOW":
      return { ...state, shadow: { ...state.shadow, queue: [...state.shadow.queue, action.p] } };
    case "FLUSH_SHADOW":
      return { ...state, shadow: { ...state.shadow, queue: state.shadow.queue.map(p => ({ ...p, synced: true })) } };
    case "SET_OFFLINE":     return { ...state, shadow: { ...state.shadow, offline: action.v } };
    case "SELECT_TABLE":    return { ...state, selectedTable: action.id };
    case "SET_RITUAL":      return { ...state, ritualTable: action.id };
    case "ASSIGN_SEAT":
      return { ...state, checkItems: state.checkItems.map(i => i.id === action.itemId ? { ...i, seat: action.seat } : i) };
    case "SET_TABLE_STATUS":
      return { ...state, floor: state.floor.map(t => t.id === action.tableId ? { ...t, status: action.status } : t) };
    default: return state;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<TableStatus, string> = {
  AVAILABLE: D.green, OCCUPIED: D.gold, VIP: D.goldLt,
  RITUAL: "#9B59B6",  RESERVED: D.muted,
};
const KDS_COLOR: Record<KDSStatus, string> = {
  PENDING: D.muted, PREPARING: D.amber, READY: D.green,
  HELD: "#9B59B6",  DELIVERED: "#2C3E50",
};
function cents(c: number) { return `$${(c / 100).toFixed(2)}`; }
function elapsed(ms: number) {
  const m = Math.floor((Date.now() - ms) / 60000);
  return `${m}m`;
}

// ── FloorMap ─────────────────────────────────────────────────────────────────
function FloorMap({ floor, selected, onSelect, onRitual }: {
  floor: FloorTable[]; selected: string | null;
  onSelect: (id: string) => void; onRitual: (id: string) => void;
}) {
  const lounge = floor.filter(t => t.zone === "lounge");
  const bar    = floor.filter(t => t.zone === "bar");
  const lockers= floor.filter(t => t.zone === "locker");

  function TableNode({ t }: { t: FloorTable }) {
    const c = STATUS_COLOR[t.status];
    const isSel = selected === t.id;
    return (
      <motion.button
        key={t.id}
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
        onClick={() => onSelect(t.id)}
        onDoubleClick={() => t.status === "RITUAL" && onRitual(t.id)}
        style={{
          background: isSel ? c + "33" : D.s3,
          border: `2px solid ${isSel ? c : D.border}`,
          borderRadius: t.zone === "bar" ? 8 : 12,
          padding: t.zone === "bar" ? "10px 6px" : "14px 10px",
          cursor: "pointer", textAlign: "center", minWidth: t.zone === "bar" ? 48 : 72,
          boxShadow: isSel ? `0 0 12px ${c}66` : "none",
          transition: "box-shadow 0.2s",
        }}
      >
        <div style={{ fontSize: t.zone === "bar" ? 11 : 13, fontWeight: 700, color: c, letterSpacing: 1 }}>
          {t.label}
        </div>
        {t.guest && (
          <div style={{ fontSize: 10, color: D.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 60 }}>
            {t.guest}
          </div>
        )}
        {t.tabTotal && (
          <div style={{ fontSize: 10, color: D.goldLt, marginTop: 1 }}>{cents(t.tabTotal * 100)}</div>
        )}
        {t.status === "RITUAL" && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.8 }}
            style={{ fontSize: 9, color: "#9B59B6", marginTop: 2 }}>● RITUAL</motion.div>
        )}
      </motion.button>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div>
          <div style={{ fontSize: 10, color: D.muted, letterSpacing: 2, marginBottom: 10 }}>LOUNGE CHAIRS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {lounge.map(t => <TableNode key={t.id} t={t} />)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: D.muted, letterSpacing: 2, marginBottom: 10 }}>PRIVATE LOCKERS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {lockers.map(t => <TableNode key={t.id} t={t} />)}
          </div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: D.muted, letterSpacing: 2, marginBottom: 10 }}>BAR SEATS</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {bar.map(t => <TableNode key={t.id} t={t} />)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: c }} />
            <span style={{ fontSize: 10, color: D.muted, letterSpacing: 1 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MemberSidebar ─────────────────────────────────────────────────────────────
function MemberSidebar({ table, onClose, onRitual }: {
  table: FloorTable; onClose: () => void; onRitual: () => void;
}) {
  const c = STATUS_COLOR[table.status];
  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      style={{ ...sty.card, width: 300, flexShrink: 0, padding: 20, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: D.text }}>{table.label}</div>
          <div style={sty.tag(c)}>{table.status}</div>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          style={{ background: D.s3, border: "none", color: D.muted, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16 }}>✕</motion.button>
      </div>

      {table.guest && (
        <div style={{ ...sty.cardG, padding: 14 }}>
          <div style={{ fontSize: 10, color: D.gold, letterSpacing: 2, marginBottom: 6 }}>MEMBER</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{table.guest}</div>
          {table.tabTotal && <div style={{ fontSize: 14, color: D.goldLt, marginTop: 4 }}>Tab: {cents(table.tabTotal * 100)}</div>}
        </div>
      )}

      {table.lockerItems && table.lockerItems.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: D.muted, letterSpacing: 2, marginBottom: 8 }}>HUMIDOR LOCKER</div>
          {table.lockerItems.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderBottom: `1px solid ${D.border}` }}>
              <span style={{ fontSize: 13, color: D.text }}>{item}</span>
              <span style={sty.tag(D.gold)}>PERSONAL</span>
            </div>
          ))}
        </div>
      )}

      {table.preferredCut && (
        <div style={{ ...sty.card, padding: 12 }}>
          <div style={{ fontSize: 10, color: D.muted, letterSpacing: 2, marginBottom: 4 }}>PREFERRED CUT</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: D.goldLt }}>{table.preferredCut}</div>
        </div>
      )}

      {(table.status === "OCCUPIED" || table.status === "VIP" || table.status === "RITUAL") && (
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
          onClick={onRitual}
          style={{
            background: "linear-gradient(135deg, #6B2FA0 0%, #9B59B6 100%)",
            border: "1px solid #9B59B680", borderRadius: 12, padding: "16px",
            color: D.text, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 1,
          }}
        >
          ✦ DISPATCH RITUAL CUE
        </motion.button>
      )}
    </motion.div>
  );
}

// ── RitualTrigger ─────────────────────────────────────────────────────────────
function RitualTrigger({ table, onClose, onDispatch }: {
  table: FloorTable; onClose: () => void; onDispatch: () => void;
}) {
  const [dispatched, setDispatched] = useState(false);
  function handle() {
    setDispatched(true);
    fetch("/api/eat/pos-router/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "3600", action: "RITUAL_CUE", tableId: table.id }),
    }).catch(() => {});
    setTimeout(onDispatch, 1600);
  }
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "#00000090", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, y: 32 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        onClick={e => e.stopPropagation()}
        style={{ ...sty.card, padding: 32, maxWidth: 420, width: "100%", border: `1px solid #9B59B660` }}
      >
        <div style={{ fontSize: 11, color: "#9B59B6", letterSpacing: 3, marginBottom: 8 }}>RITUAL TRIGGER</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{table.label}</div>
        {table.guest && <div style={{ fontSize: 15, color: D.muted, marginBottom: 20 }}>{table.guest}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {[
            { icon: "🪵", label: "Cedar Spill",          note: "3× premium cedar" },
            { icon: "✂",  label: table.preferredCut ?? "Guillotine Cutter", note: "Staged & cleaned" },
            { icon: "🥃", label: "SmokeCraft Pairing",   note: "Macallan 18 — suggested" },
          ].map(({ icon, label, note }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 12,
              background: D.s3, borderRadius: 10, padding: "12px 14px" }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 11, color: D.muted }}>{note}</div>
              </div>
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2 }}
                style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: 4, background: D.green }} />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {!dispatched ? (
            <motion.button key="dispatch"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
              onClick={handle}
              style={{ width: "100%", background: "linear-gradient(135deg, #6B2FA0, #9B59B6)",
                border: "none", borderRadius: 12, padding: 18, fontSize: 16, fontWeight: 800,
                color: D.text, cursor: "pointer", letterSpacing: 1 }}
            >✦ DISPATCH SILENT CUE</motion.button>
          ) : (
            <motion.div key="sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: "center", color: D.green, fontSize: 16, fontWeight: 700, padding: 18 }}>
              ✓ CUE DISPATCHED TO STAGING
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ── KDS Board ─────────────────────────────────────────────────────────────────
function KDSBoard({ tickets, dispatch }: { tickets: KDSTicket[]; dispatch: React.Dispatch<EATAction> }) {
  const cols: KDSStatus[] = ["PENDING", "PREPARING", "READY", "HELD"];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, padding: "16px 16px 16px 0", overflow: "hidden" }}>
      <div style={{ fontSize: 10, color: D.muted, letterSpacing: 2, paddingLeft: 4 }}>KITCHEN DISPLAY SYSTEM</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, flex: 1, minHeight: 0 }}>
        {cols.map(col => (
          <div key={col} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: KDS_COLOR[col], paddingBottom: 8,
              borderBottom: `2px solid ${KDS_COLOR[col]}44` }}>
              {col} <span style={{ fontSize: 10, color: D.muted, fontWeight: 400 }}>
                ({tickets.filter(t => t.status === col).length})
              </span>
            </div>
            <AnimatePresence>
              {tickets.filter(t => t.status === col).map(ticket => (
                <motion.div
                  key={ticket.id}
                  layout
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                  style={{ ...sty.card, padding: 12, border: `1px solid ${KDS_COLOR[ticket.status]}44` }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: KDS_COLOR[ticket.status] }}>
                      #{String(ticket.ticketNum).padStart(3, "0")}
                    </span>
                    <span style={{ fontSize: 11, color: D.muted }}>{ticket.tableId} · {elapsed(ticket.startedAt)}</span>
                  </div>
                  {ticket.items.map((item, i) => (
                    <div key={i} style={{ fontSize: 12, color: D.text, paddingLeft: 4, paddingBottom: 3,
                      borderLeft: `2px solid ${D.border}`, marginLeft: 2, paddingTop: 1 }}>{item}</div>
                  ))}
                  {ticket.holdReason && (
                    <div style={{ ...sty.tag("#9B59B6"), marginTop: 8, display: "inline-block" }}>⏸ RITUAL HOLD</div>
                  )}
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    {ticket.status !== "DELIVERED" && (
                      <motion.button whileTap={{ scale: 0.92 }}
                        onClick={() => dispatch({ type: "ADVANCE_KDS", id: ticket.id })}
                        style={{ flex: 1, background: KDS_COLOR[ticket.status] + "22", border: `1px solid ${KDS_COLOR[ticket.status]}44`,
                          borderRadius: 7, padding: "7px 0", fontSize: 11, color: D.text, cursor: "pointer", fontWeight: 700 }}>
                        {ticket.status === "HELD" ? "▶ RESUME" : "→ NEXT"}
                      </motion.button>
                    )}
                    {ticket.status === "PREPARING" && (
                      <motion.button whileTap={{ scale: 0.92 }}
                        onClick={() => dispatch({ type: "HOLD_KDS", id: ticket.id })}
                        style={{ background: "#9B59B622", border: "1px solid #9B59B644", borderRadius: 7,
                          padding: "7px 8px", fontSize: 11, color: "#9B59B6", cursor: "pointer" }}>⏸</motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Asset Ledger ──────────────────────────────────────────────────────────────
function AssetLedger({ assets, dispatch }: { assets: EATAsset[]; dispatch: React.Dispatch<EATAction> }) {
  return (
    <div style={{ width: 280, padding: "16px 16px 16px 0", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
      <div style={{ fontSize: 10, color: D.muted, letterSpacing: 2, marginBottom: 2 }}>ASSET COUNTDOWN LEDGER</div>
      {assets.map(a => {
        const locked  = a.qty === 0;
        const low     = a.qty > 0 && a.qty <= 3;
        const accent  = locked ? D.red : low ? D.amber : D.text;
        return (
          <motion.button
            key={a.id}
            whileHover={locked ? {} : { scale: 1.02 }}
            whileTap={locked ? {} : { scale: 0.96 }}
            onClick={() => !locked && dispatch({ type: "DEDUCT", id: a.id })}
            disabled={locked}
            style={{
              ...sty.card,
              padding: "12px 14px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              cursor: locked ? "not-allowed" : "pointer",
              opacity: locked ? 0.5 : 1,
              border: `1px solid ${low || locked ? accent + "55" : D.border}`,
              filter: locked ? "blur(0.3px)" : "none",
              transition: "all 0.2s",
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: locked ? D.red : D.text }}>{a.name}</div>
              <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>{a.category} · {a.zone.toUpperCase()}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {locked ? (
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1 }}
                  style={{ fontSize: 11, color: D.red, fontWeight: 800, letterSpacing: 1 }}>LOCKED</motion.div>
              ) : low ? (
                <motion.div
                  animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}
                  style={{ fontSize: 22, fontWeight: 900, color: D.amber }}>{a.qty}</motion.div>
              ) : (
                <div style={{ fontSize: 20, fontWeight: 700, color: D.text }}>{a.qty}</div>
              )}
              <div style={{ fontSize: 9, color: D.muted }}>/ {a.par}</div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Split Check Engine ────────────────────────────────────────────────────────
function SplitCheckEngine({ items, dispatch }: { items: CheckItem[]; dispatch: React.Dispatch<EATAction> }) {
  const seatRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  const [confirmed, setConfirmed] = useState(false);

  const handleDragEnd = useCallback((itemId: string, info: PanInfo) => {
    const pt = info.point;
    for (let i = 0; i < 3; i++) {
      const r = seatRefs[i].current?.getBoundingClientRect();
      if (r && pt.x >= r.left && pt.x <= r.right && pt.y >= r.top && pt.y <= r.bottom) {
        dispatch({ type: "ASSIGN_SEAT", itemId, seat: i });
        return;
      }
    }
    dispatch({ type: "ASSIGN_SEAT", itemId, seat: null });
  }, [dispatch]);

  const seatTotal = (seat: number) =>
    items.filter(i => i.seat === seat).reduce((s, i) => s + i.priceCents, 0);
  const unassigned = items.filter(i => i.seat === null);
  const allAssigned = unassigned.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", padding: "0 16px 16px 0" }}>
      <div style={{ fontSize: 10, color: D.muted, letterSpacing: 2 }}>3-TAP SPLIT CHECK ENGINE</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, flex: 1, minHeight: 0 }}>
        {[0, 1, 2].map(seat => (
          <div key={seat} ref={seatRefs[seat]} style={{
            ...sty.card, padding: 14, minHeight: 180, display: "flex", flexDirection: "column", gap: 8,
            border: `2px dashed ${D.border}`,
            background: "transparent",
            transition: "border-color 0.2s",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: D.gold, letterSpacing: 2 }}>SEAT {seat + 1}</div>
            <AnimatePresence>
              {items.filter(i => i.seat === seat).map(item => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}
                  style={{ ...sty.card, padding: "8px 10px", display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: 12 }}>{item.name}</span>
                  <span style={{ fontSize: 12, color: D.goldLt }}>{cents(item.priceCents)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {items.some(i => i.seat === seat) && (
              <div style={{ marginTop: "auto", fontSize: 15, fontWeight: 800, color: D.goldLt, paddingTop: 8,
                borderTop: `1px solid ${D.border}` }}>
                {cents(seatTotal(seat))}
              </div>
            )}
          </div>
        ))}
      </div>

      {unassigned.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: D.muted, letterSpacing: 2, marginBottom: 8 }}>DRAG TO ASSIGN ↑</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {unassigned.map(item => (
              <motion.div
                key={item.id}
                drag
                dragMomentum={false}
                dragElastic={0.06}
                onDragEnd={(_, info) => handleDragEnd(item.id, info)}
                whileDrag={{ scale: 1.06, zIndex: 50, boxShadow: `0 8px 24px ${D.gold}44` }}
                style={{ ...sty.cardG, padding: "10px 14px", cursor: "grab", display: "flex",
                  alignItems: "center", gap: 8, userSelect: "none" }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</span>
                <span style={{ fontSize: 12, color: D.goldLt }}>{cents(item.priceCents)}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {allAssigned && !confirmed && (
          <motion.button
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
            onClick={() => setConfirmed(true)}
            style={{ background: `linear-gradient(135deg, ${D.gold}, ${D.goldLt})`,
              border: "none", borderRadius: 12, padding: 18,
              fontSize: 16, fontWeight: 800, color: "#000", cursor: "pointer", letterSpacing: 1 }}
          >✓ CONFIRM SPLIT — {cents(items.reduce((s, i) => s + i.priceCents, 0))}</motion.button>
        )}
        {confirmed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: 18, color: D.green, fontSize: 16, fontWeight: 700 }}>
            ✓ Split confirmed · Printing 3 checks
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Shift Dashboard ────────────────────────────────────────────────────────────
function ShiftDashboard({ metrics, shadow }: { metrics: EATState["shift"]; shadow: EATState["shadow"] }) {
  const stats = [
    { label: "TIPS TODAY",     value: cents(metrics.tipsCents),    color: D.goldLt },
    { label: "SHIFT SALES",    value: cents(metrics.salesCents),   color: D.text },
    { label: "TABLES SERVED",  value: String(metrics.tablesServed), color: D.text },
    { label: "AVG TAB",        value: cents(metrics.avgTabCents),  color: D.muted },
  ];
  const poolPct = Math.round((metrics.tipPoolCents / metrics.tipsCents) * 100) || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px 0", flex: 1 }}>
      <div style={{ fontSize: 10, color: D.muted, letterSpacing: 2 }}>MY SHIFT PERFORMANCE</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...sty.card, padding: 16 }}>
            <div style={{ fontSize: 9, color: D.muted, letterSpacing: 2, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...sty.card, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: D.muted, letterSpacing: 2 }}>TIP POOL DISTRIBUTION</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: D.gold }}>{cents(metrics.tipPoolCents)} ({poolPct}%)</span>
        </div>
        <div style={{ height: 10, background: D.s3, borderRadius: 5, overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${poolPct}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ height: "100%", background: `linear-gradient(90deg, ${D.gold}, ${D.goldLt})`, borderRadius: 5 }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 10, color: D.muted }}>Your keep: {cents(metrics.tipsCents - metrics.tipPoolCents)}</span>
          <span style={{ fontSize: 10, color: D.muted }}>Pool: {cents(metrics.tipPoolCents)}</span>
        </div>
      </div>

      <div style={{ ...sty.card, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: D.muted, letterSpacing: 2 }}>PACING SCORE</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: metrics.pacingScore >= 85 ? D.green : D.amber }}>
            {metrics.pacingScore}/100
          </span>
        </div>
        <div style={{ height: 10, background: D.s3, borderRadius: 5, overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${metrics.pacingScore}%` }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            style={{ height: "100%", background: metrics.pacingScore >= 85
              ? `linear-gradient(90deg, ${D.green}, #2ECC71)`
              : `linear-gradient(90deg, ${D.amber}, #F39C12)`, borderRadius: 5 }}
          />
        </div>
      </div>

      {shadow.queue.length > 0 && (
        <motion.div
          animate={{ borderColor: [D.amber + "44", D.amber + "AA", D.amber + "44"] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{ ...sty.card, padding: 14, border: `1px solid ${D.amber}44` }}
        >
          <div style={{ fontSize: 11, color: D.amber, fontWeight: 700, letterSpacing: 2 }}>
            ⚡ SHADOW MODE — {shadow.queue.filter(p => !p.synced).length} PAYMENT{shadow.queue.length > 1 ? "S" : ""} QUEUED
          </div>
          <div style={{ fontSize: 11, color: D.muted, marginTop: 4 }}>
            {shadow.offline ? "Offline · Will sync on reconnect" : "Syncing…"}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Main Module ───────────────────────────────────────────────────────────────
type Tab = "foh" | "boh" | "shift";
const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: "foh",   label: "FRONT OF HOUSE", sub: "Floor Map & Profiles" },
  { id: "boh",   label: "BACK OF HOUSE",  sub: "KDS & Asset Ledger" },
  { id: "shift", label: "MY SHIFT",       sub: "Performance & Split" },
];

export default function EatPosModule({ onBack }: { onBack?: () => void } = {}) {
  const [state, dispatch] = useReducer(eatReducer, INITIAL);
  const [tab, setTab] = useState<Tab>("foh");
  const [showRitual, setShowRitual] = useState(false);

  const selTable = state.floor.find(t => t.id === state.selectedTable) ?? null;
  const ritTable = state.floor.find(t => t.id === state.ritualTable) ?? null;

  // Shadow mode — detect connectivity
  useEffect(() => {
    const handleOnline  = () => { dispatch({ type: "SET_OFFLINE", v: false }); dispatch({ type: "FLUSH_SHADOW" }); };
    const handleOffline = () => dispatch({ type: "SET_OFFLINE", v: true });
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);

  const handleRitual = useCallback((tableId: string) => {
    dispatch({ type: "SET_RITUAL", id: tableId });
    setShowRitual(true);
    // Hold any KDS tickets for this table
    state.kds.filter(t => t.tableId === tableId && t.status === "PREPARING")
      .forEach(t => dispatch({ type: "HOLD_KDS", id: t.id }));
  }, [state.kds]);

  return (
    <div style={{ ...sty.fill, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${D.border}`,
        display: "flex", alignItems: "center", gap: 16, flexShrink: 0, background: D.s1 }}>
        {onBack && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={onBack}
            style={{ background: D.s3, border: `1px solid ${D.border}`, borderRadius: 8,
              padding: "8px 14px", color: D.muted, cursor: "pointer", fontSize: 13 }}>← BACK</motion.button>
        )}
        <div>
          <div style={{ fontSize: 11, color: D.gold, letterSpacing: 4, fontWeight: 700 }}>E.A.T. PLATFORM</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>LUXURY POS</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {/* Lounge Mode */}
          <div style={{ display: "flex", gap: 4 }}>
            {(["RITUAL", "CASUAL", "TRANSITION"] as LoungeMode[]).map(m => (
              <motion.button key={m} whileTap={{ scale: 0.92 }}
                onClick={() => dispatch({ type: "SET_LOUNGE", m })}
                style={{ padding: "6px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                  cursor: "pointer", letterSpacing: 1, border: "1px solid transparent",
                  background: state.env.loungeMode === m ? (m === "RITUAL" ? "#9B59B622" : D.s3) : "transparent",
                  color: state.env.loungeMode === m ? (m === "RITUAL" ? "#9B59B6" : D.text) : D.muted,
                  borderColor: state.env.loungeMode === m ? (m === "RITUAL" ? "#9B59B655" : D.border) : "transparent",
                }}>
                {m}
              </motion.button>
            ))}
          </div>
          {/* Velocity */}
          <div style={{ display: "flex", gap: 4, borderLeft: `1px solid ${D.border}`, paddingLeft: 8 }}>
            {(["HIGH", "MEDIUM", "LOW"] as Velocity[]).map(v => (
              <motion.button key={v} whileTap={{ scale: 0.92 }}
                onClick={() => dispatch({ type: "SET_VELOCITY", v })}
                style={{ padding: "6px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                  cursor: "pointer", letterSpacing: 1, border: "1px solid transparent",
                  background: state.env.velocity === v ? D.gold + "22" : "transparent",
                  color: state.env.velocity === v ? D.gold : D.muted,
                  borderColor: state.env.velocity === v ? D.gold + "55" : "transparent",
                }}>
                {v}
              </motion.button>
            ))}
          </div>
          {/* Offline indicator */}
          {state.shadow.offline && (
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1 }}
              style={{ ...sty.tag(D.amber), letterSpacing: 1 }}>⚡ SHADOW MODE</motion.div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: `1px solid ${D.border}`, flexShrink: 0, background: D.s1 }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <motion.button key={t.id} whileTap={{ scale: 0.97 }} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: "14px 20px", border: "none", cursor: "pointer",
                background: "transparent", textAlign: "left",
                borderBottom: active ? `2px solid ${D.gold}` : "2px solid transparent",
              }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2,
                color: active ? D.gold : D.muted }}>{t.label}</div>
              <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>{t.sub}</div>
            </motion.button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ position: "absolute", inset: 0, display: "flex", overflow: "hidden" }}
          >
            {tab === "foh" && (
              <>
                <div style={{ flex: 1, display: "flex", overflowY: "auto" }}>
                  <FloorMap
                    floor={state.floor}
                    selected={state.selectedTable}
                    onSelect={id => dispatch({ type: "SELECT_TABLE", id: state.selectedTable === id ? null : id })}
                    onRitual={handleRitual}
                  />
                </div>
                <AnimatePresence>
                  {selTable && (
                    <MemberSidebar
                      table={selTable}
                      onClose={() => dispatch({ type: "SELECT_TABLE", id: null })}
                      onRitual={() => handleRitual(selTable.id)}
                    />
                  )}
                </AnimatePresence>
              </>
            )}

            {tab === "boh" && (
              <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: "0 0 0 16px" }}>
                <KDSBoard tickets={state.kds} dispatch={dispatch} />
                <div style={{ width: 1, background: D.border, flexShrink: 0 }} />
                <AssetLedger assets={state.assets} dispatch={dispatch} />
              </div>
            )}

            {tab === "shift" && (
              <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: "16px 0 0 16px" }}>
                <div style={{ flex: 1, overflow: "auto" }}>
                  <ShiftDashboard metrics={state.shift} shadow={state.shadow} />
                </div>
                <div style={{ width: 1, background: D.border, flexShrink: 0 }} />
                <div style={{ width: 460, overflow: "auto", padding: "0 0 16px 16px", display: "flex", flexDirection: "column" }}>
                  <SplitCheckEngine items={state.checkItems} dispatch={dispatch} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Ritual overlay */}
      <AnimatePresence>
        {showRitual && ritTable && (
          <RitualTrigger
            table={ritTable}
            onClose={() => setShowRitual(false)}
            onDispatch={() => setShowRitual(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
