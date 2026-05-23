/**
 * StaffTerminal — High-Velocity Staff POS (STAGE_5_OPERATIONS)
 * Cinematic 3-column tactical terminal: Telemetry · Tickets · Ledger
 * Theme: True Obsidian (#020202) + Liquid Warm Gold (#D4AF37)
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

// ── Design tokens ────────────────────────────────────────────────────────────

const C = {
  base:         "#020202",
  glass:        "rgba(16,16,16,0.85)",
  glassEdge:    "rgba(28,28,28,0.90)",
  gold:         "#D4AF37",
  goldDim:      "rgba(212,175,55,0.14)",
  goldGlow:     "rgba(212,175,55,0.35)",
  goldBright:   "#E6A11D",
  chrome:       "#2A2A2A",
  white:        "#FFFFFF",
  amber:        "#E6A11D",
  slate:        "rgba(180,180,192,0.55)",
  red:          "#EF4444",
  green:        "#34D399",
  blue:         "#5B8DEF",
  purple:       "#A78BFA",
  sans:         "'Inter','SF Pro Display',sans-serif",
  mono:         "'JetBrains Mono','Courier New',monospace",
};

// Touch physics helpers — eliminates 300ms mobile delay
const withTouch = {
  onTouchStart: (e: React.TouchEvent) => { (e.currentTarget as HTMLElement).style.opacity = "0.80"; },
  onTouchEnd:   (e: React.TouchEvent) => { (e.currentTarget as HTMLElement).style.opacity = "1"; },
  onTouchMove:  (_e: React.TouchEvent) => {},
};

// Glass panel factory
const glassPanel = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: C.glass,
  backdropFilter: "blur(25px)",
  WebkitBackdropFilter: "blur(25px)",
  border: `1px solid ${C.chrome}`,
  borderRadius: 14,
  ...extra,
});

// ── Data structures ──────────────────────────────────────────────────────────

interface TicketItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface TableTicket {
  id: string;
  label: string;
  section: string;
  guestName: string;
  elapsedMs: number;
  items: TicketItem[];
}

const SEED_TABLES: TableTicket[] = [
  {
    id: "t101", label: "Table 101", section: "VIP SECTION", guestName: "John D.", elapsedMs: 6_120_000,
    items: [
      { id: "rp1992", name: "Rocky Patel Vintage 1992",    price: 42.00, qty: 1 },
      { id: "bt_bour", name: "Buffalo Trace Bourbon (2oz)", price: 32.00, qty: 2 },
      { id: "db_tor",  name: "Don Belicoso Toro",           price: 38.00, qty: 1 },
    ],
  },
  {
    id: "t205", label: "Table 205", section: "MAIN FLOOR", guestName: "Sara M.", elapsedMs: 3_300_000,
    items: [
      { id: "pad64",  name: "Padrón 1964 Anniversary",  price: 48.00, qty: 1 },
      { id: "mac12",  name: "Macallan 12yr Dram",        price: 28.00, qty: 2 },
    ],
  },
  {
    id: "t312", label: "Table 312", section: "PATIO RESERVE", guestName: "Carlos V.", elapsedMs: 1_800_000,
    items: [
      { id: "afuente", name: "Arturo Fuente Gran Reserva", price: 26.00, qty: 2 },
    ],
  },
  {
    id: "t408", label: "Table 408", section: "BAR SEATING", guestName: "James K.", elapsedMs: 900_000,
    items: [
      { id: "oliva",  name: "Oliva Serie V Melanio",      price: 54.00, qty: 1 },
    ],
  },
  {
    id: "t115", label: "Table 115", section: "VIP SECTION", guestName: "Elena R.", elapsedMs: 10_800_000,
    items: [
      { id: "bh56",   name: "Cohiba Behike 56",    price: 120.00, qty: 2 },
      { id: "remyxo", name: "Rémy Martin XO",      price:  90.00, qty: 2 },
    ],
  },
];

function formatElapsed(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h > 0) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}h`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function ticketTotal(items: TicketItem[]): number {
  return items.reduce((s, i) => s + i.price * i.qty, 0);
}

// ── Label primitive ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontFamily: C.mono, letterSpacing: "0.30em", color: C.gold, textTransform: "uppercase", marginBottom: 6 }}>
      {children}
    </div>
  );
}

// ── Column 1: Real-Time Telemetry ────────────────────────────────────────────

function TelemetryColumn() {
  const [puros,     setPuros]     = useState(145);
  const [pours,     setPours]     = useState(14);
  const [pending,   setPending]   = useState(3);
  const [ready,     setReady]     = useState(1);
  const [showAlert, setShowAlert] = useState(true);

  // Simulated live drift
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() < 0.08) setPuros(p => Math.max(0, p - 1));
      if (Math.random() < 0.12) setPours(p => Math.max(0, p + (Math.random() < 0.5 ? 1 : -1)));
    }, 3_500);
    return () => clearInterval(t);
  }, []);

  const stationBorder = (color: string): React.CSSProperties => ({
    borderTop: `2px solid ${color}`,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", overflow: "hidden" }}>
      <div style={{ paddingLeft: 2, flexShrink: 0 }}>
        <SectionLabel>E.A.T. CORE STATIONS</SectionLabel>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.white, letterSpacing: "0.04em" }}>REAL-TIME TELEMETRY</div>
      </div>

      {/* STATION 1 — HUMIDOR */}
      <div style={glassPanel({ ...stationBorder(C.gold), padding: "16px 18px", flexShrink: 0 })}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
          <span style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.30em", color: C.slate, textTransform: "uppercase" }}>STATION 1 · HUMIDOR</span>
        </div>

        <motion.div
          animate={{ textShadow: [`0 0 18px ${C.amber}44`, `0 0 38px ${C.amber}99`, `0 0 18px ${C.amber}44`] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          style={{ fontSize: 56, fontWeight: 900, color: C.amber, lineHeight: 1, letterSpacing: "-0.02em" }}>
          {puros}
        </motion.div>
        <div style={{ fontSize: 11, color: C.slate, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>PUROS REMAINING</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[{ label: "TEMP", val: "68°F" }, { label: "HUMIDITY", val: "71% RH" }].map(m => (
            <div key={m.label} style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${C.chrome}`, borderRadius: 8, padding: "8px 12px" }}>
              <div style={{ fontSize: 9, color: C.slate, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.amber }}>{m.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* STATION 2 — BAR METRICS */}
      <div style={glassPanel({ ...stationBorder(C.blue), padding: "16px 18px", flexShrink: 0 })}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: "50%", background: C.blue, boxShadow: `0 0 8px ${C.blue}` }} />
          <span style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.30em", color: C.slate, textTransform: "uppercase" }}>STATION 2 · BAR METRICS</span>
        </div>

        <div style={{ fontSize: 48, fontWeight: 900, color: C.white, lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 4 }}>{pours}</div>
        <div style={{ fontSize: 11, color: C.slate, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>ACTIVE POUR SESSIONS</div>

        <AnimatePresence>
          {showAlert && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: [1, 0.72, 1] }} exit={{ opacity: 0 }}
              transition={{ duration: 1.3, repeat: Infinity }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.35)",
                borderRadius: 9, padding: "10px 14px",
              }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.red, letterSpacing: "0.12em" }}>LOW STOCK ALERT</div>
                <div style={{ fontSize: 11, color: "rgba(239,68,68,0.75)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>RÉMY MARTIN XO — 2 REMAINING</div>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAlert(false)}
                style={{ fontSize: 12, color: C.slate, background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}>✕</motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* STATION 3 — KITCHEN LINE */}
      <div style={glassPanel({ ...stationBorder(C.purple), padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column" })}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2.0, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: "50%", background: C.purple, boxShadow: `0 0 8px ${C.purple}` }} />
          <span style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.30em", color: C.slate, textTransform: "uppercase" }}>STATION 3 · KITCHEN LINE</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { label: "PENDING", val: pending, color: "#F59E0B" },
            { label: "READY",   val: ready,   color: C.green },
          ].map(m => (
            <div key={m.label} style={{ background: `${m.color}0a`, border: `1px solid ${m.color}30`, borderRadius: 9, padding: "12px 0", textAlign: "center" }}>
              <div style={{ fontSize: 34, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.val}</div>
              <div style={{ fontSize: 9, color: C.slate, letterSpacing: "0.20em", textTransform: "uppercase", marginTop: 5 }}>{m.label}</div>
            </div>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }} {...withTouch}
          onClick={() => { setPending(p => Math.max(0, p - 1)); setReady(r => r + 1); }}
          style={{
            width: "100%", height: 48, borderRadius: 9, marginTop: "auto",
            background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.35)",
            color: C.purple, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em",
            cursor: "pointer", fontFamily: C.sans,
          }}>
          [ VIEW KITCHEN QUEUE ➔ ]
        </motion.button>
      </div>
    </div>
  );
}

// ── Ticket Tapper Modal ──────────────────────────────────────────────────────

function TicketTapperModal({
  table,
  onClose,
  onUpdate,
}: {
  table: TableTicket;
  onClose: () => void;
  onUpdate: (items: TicketItem[]) => void;
}) {
  const [items, setItems] = useState<TicketItem[]>(table.items.map(i => ({ ...i })));
  const [note, setNote] = useState("");

  const adjust = useCallback((id: string, delta: number) => {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0);
      onUpdate(next);
      return next;
    });
  }, [onUpdate]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax      = subtotal * 0.085;
  const total    = subtotal + tax;

  return (
    <motion.div key="tapper-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(10px)" }}
        onClick={onClose} />

      <motion.div
        initial={{ scale: 0.94, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 24 }}
        style={{
          position: "relative", zIndex: 1, width: 520, maxHeight: "90vh",
          background: "rgba(8,8,10,0.98)", border: `1px solid ${C.gold}`,
          borderRadius: 18, overflow: "hidden",
          boxShadow: `0 0 70px ${C.goldGlow}, 0 0 140px rgba(212,175,55,0.12)`,
          display: "flex", flexDirection: "column",
        }}>

        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.chrome}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.30em", color: C.gold, textTransform: "uppercase", marginBottom: 6 }}>🎟️ TICKET TAPPER</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.white }}>{table.label} — {table.guestName}</div>
            <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>{table.section}</div>
          </div>
          <motion.button whileTap={{ scale: 0.92 }} onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.chrome}`, color: C.slate, cursor: "pointer", fontSize: 15, fontFamily: C.sans }}>
            ✕
          </motion.button>
        </div>

        {/* SKU rows */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          <AnimatePresence>
            {items.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ padding: "32px 22px", textAlign: "center", color: C.slate, fontSize: 14 }}>
                Ticket cleared — all items removed.
              </motion.div>
            )}
            {items.map((item, idx) => (
              <motion.div key={item.id} layout
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12, height: 0, padding: 0 }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 22px",
                  borderBottom: idx < items.length - 1 ? `1px solid ${C.chrome}` : "none",
                }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.white, lineHeight: 1.3 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>${item.price.toFixed(2)} each</div>
                </div>

                {/* − */}
                <motion.button whileTap={{ scale: 0.88 }} {...withTouch}
                  onClick={() => adjust(item.id, -1)}
                  style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.40)", color: C.red, fontSize: 20, lineHeight: "30px", textAlign: "center", cursor: "pointer" }}>
                  −
                </motion.button>

                <div style={{ fontSize: 17, fontWeight: 800, color: C.amber, minWidth: 26, textAlign: "center" }}>{item.qty}</div>

                {/* + */}
                <motion.button whileTap={{ scale: 0.88 }} {...withTouch}
                  onClick={() => adjust(item.id, +1)}
                  style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.40)", color: C.green, fontSize: 20, lineHeight: "30px", textAlign: "center", cursor: "pointer" }}>
                  +
                </motion.button>

                {/* remove all ✕ */}
                <motion.button whileTap={{ scale: 0.88 }} {...withTouch}
                  onClick={() => adjust(item.id, -999)}
                  style={{ width: 28, height: 28, borderRadius: "50%", background: C.goldDim, border: `1px solid ${C.gold}44`, color: C.gold, fontSize: 13, lineHeight: "26px", textAlign: "center", cursor: "pointer" }}>
                  ✕
                </motion.button>

                <div style={{ fontSize: 14, fontWeight: 700, color: C.white, minWidth: 58, textAlign: "right" }}>
                  ${(item.price * item.qty).toFixed(2)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Custom notes */}
        <div style={{ padding: "10px 22px", borderTop: `1px solid ${C.chrome}`, flexShrink: 0 }}>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Custom notes for kitchen / bar…"
            rows={2}
            style={{
              width: "100%", boxSizing: "border-box", resize: "none", outline: "none",
              background: "rgba(255,255,255,0.04)", border: `1px solid ${C.chrome}`,
              borderRadius: 8, padding: "10px 12px", color: C.white,
              fontFamily: C.sans, fontSize: 13,
            }} />
        </div>

        {/* Totals */}
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.chrome}`, flexShrink: 0 }}>
          {[{ label: "Subtotal", val: subtotal }, { label: "Tax (8.5%)", val: tax }].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 13, color: C.slate }}>{r.label}</span>
              <span style={{ fontSize: 13, color: C.white }}>${r.val.toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.chrome}` }}>
            <span style={{ fontSize: 17, fontWeight: 900, color: C.white }}>TOTAL</span>
            <motion.span animate={{ color: [C.amber, "#FFD700", C.amber] }} transition={{ duration: 2.2, repeat: Infinity }}
              style={{ fontSize: 22, fontWeight: 900 }}>
              ${total.toFixed(2)}
            </motion.span>
          </div>
        </div>

        {/* Action row */}
        <div style={{ padding: "14px 22px", display: "flex", gap: 10, flexShrink: 0 }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
            style={{ flex: 1, height: 48, borderRadius: 9, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.chrome}`, color: C.slate, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: C.sans }}>
            CANCEL
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} {...withTouch}
            style={{
              flex: 2, height: 48, borderRadius: 9,
              background: `linear-gradient(135deg, ${C.gold} 0%, #A67C00 100%)`,
              border: "none", color: "#000000", fontSize: 13, fontWeight: 900,
              letterSpacing: "0.08em", cursor: "pointer", fontFamily: C.sans,
            }}>
            CONFIRM & UPDATE TICKET
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Column 2: High-Speed Ticket Overview ─────────────────────────────────────

function TicketsColumn({
  tables,
  activeId,
  onSelect,
  onItemsUpdate,
}: {
  tables: TableTicket[];
  activeId: string;
  onSelect: (id: string) => void;
  onItemsUpdate: (tableId: string, items: TicketItem[]) => void;
}) {
  const [tapperTable, setTapperTable] = useState<TableTicket | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ paddingLeft: 2, marginBottom: 14, flexShrink: 0 }}>
        <SectionLabel>ACTIVE LOUNGE TABLES</SectionLabel>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.white, letterSpacing: "0.04em" }}>TICKET OVERVIEW</div>
      </div>

      {/* Table scroll list */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 2 }}>
        {tables.map(t => {
          const isActive = t.id === activeId;
          const total    = ticketTotal(t.items);
          return (
            <motion.div key={t.id}
              onClick={() => onSelect(t.id)}
              onTouchStart={(e) => { withTouch.onTouchStart(e); onSelect(t.id); }}
              onTouchEnd={withTouch.onTouchEnd}
              whileTap={{ scale: 0.985 }}
              animate={{ boxShadow: isActive ? `0 0 22px ${C.goldGlow}` : "0 0 0px transparent" }}
              style={{
                ...glassPanel(),
                border: `1px solid ${isActive ? C.gold : C.chrome}`,
                padding: "14px 16px", cursor: "pointer",
                transition: "border-color 0.18s",
              }}>

              {/* Row header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.white, letterSpacing: "0.03em" }}>
                    {t.label}&nbsp;
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.amber }}>— {t.section}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>🕒 {formatElapsed(t.elapsedMs)} ACTIVE · {t.guestName}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.amber }}>${total.toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: C.slate, marginTop: 2 }}>{t.items.length} items</div>
                </div>
              </div>

              {/* Ticket Tapper button — 58px hit target */}
              <motion.button
                whileTap={{ scale: 0.97 }} {...withTouch}
                onClick={(e) => { e.stopPropagation(); setTapperTable(t); }}
                style={{
                  width: "100%", height: 58, borderRadius: 9,
                  background: isActive ? C.goldDim : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isActive ? C.gold : "rgba(212,175,55,0.22)"}`,
                  color: C.gold, fontSize: 13, fontWeight: 800, letterSpacing: "0.10em",
                  cursor: "pointer", fontFamily: C.sans,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: isActive ? `inset 0 0 24px ${C.goldDim}` : "none",
                }}>
                🎟️&nbsp; OPEN TICKET TAPPER ➔
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Ticket Tapper Modal */}
      <AnimatePresence>
        {tapperTable && (
          <TicketTapperModal
            key={tapperTable.id}
            table={tapperTable}
            onClose={() => setTapperTable(null)}
            onUpdate={(items) => onItemsUpdate(tapperTable.id, items)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Column 3: Active Ledger ──────────────────────────────────────────────────

function LedgerColumn({
  tables,
  activeId,
  onRemoveItem,
}: {
  tables: TableTicket[];
  activeId: string;
  onRemoveItem: (tableId: string, itemId: string) => void;
}) {
  const table = tables.find(t => t.id === activeId) ?? tables[0];
  if (!table) return null;

  const subtotal = ticketTotal(table.items);
  const tax      = subtotal * 0.085;
  const total    = subtotal + tax;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ paddingLeft: 2, marginBottom: 14, flexShrink: 0 }}>
        <SectionLabel>ACTIVE CHECKOUT LEDGER</SectionLabel>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.white, letterSpacing: "0.04em" }}>INVOICE</div>
      </div>

      {/* Active table header */}
      <div style={glassPanel({ borderTop: `2px solid ${C.gold}`, padding: "14px 16px", marginBottom: 10, flexShrink: 0 })}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.white, letterSpacing: "0.04em" }}>
          {table.label} — {table.guestName}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <span style={{ fontSize: 11, color: C.slate, letterSpacing: "0.10em" }}>{table.section}</span>
          <motion.span
            animate={{ opacity: [1, 0.60, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
            style={{ fontSize: 22, fontWeight: 900, color: C.amber }}>
            ${total.toFixed(2)}
          </motion.span>
        </div>
      </div>

      {/* SKU rows */}
      <div style={{ ...glassPanel(), flex: 1, overflowY: "auto", padding: "4px 0", marginBottom: 10 }}>
        <AnimatePresence>
          {table.items.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: "28px 16px", textAlign: "center", color: C.slate, fontSize: 13 }}>
              Ticket cleared.
            </motion.div>
          )}
          {table.items.map((item, idx) => (
            <motion.div key={item.id} layout
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10, height: 0, overflow: "hidden" }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "12px 14px",
                borderBottom: idx < table.items.length - 1 ? `1px solid ${C.chrome}` : "none",
              }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.white, lineHeight: 1.3 }}>
                  {item.qty}× {item.name}
                </div>
                <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>${item.price.toFixed(2)} each</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.amber, minWidth: 50, textAlign: "right" }}>
                ${(item.price * item.qty).toFixed(2)}
              </div>
              {/* Gold ✕ remove button */}
              <motion.button whileTap={{ scale: 0.86 }} {...withTouch}
                onClick={() => onRemoveItem(table.id, item.id)}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: C.goldDim, border: `1px solid ${C.gold}44`,
                  color: C.gold, fontSize: 13, lineHeight: "26px", textAlign: "center",
                  cursor: "pointer", flexShrink: 0,
                }}>
                ✕
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Summary block */}
      <div style={glassPanel({ padding: "16px 16px", flexShrink: 0 })}>
        {[{ label: "Subtotal", val: subtotal }, { label: "Tax (8.5%)", val: tax }].map(r => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: C.slate }}>{r.label}</span>
            <span style={{ fontSize: 13, color: C.white }}>${r.val.toFixed(2)}</span>
          </div>
        ))}
        <div style={{ height: 1, background: C.chrome, margin: "10px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: C.white, letterSpacing: "0.04em" }}>TOTAL</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: C.amber }}>${total.toFixed(2)}</span>
        </div>

        <motion.button whileTap={{ scale: 0.97 }} {...withTouch}
          style={{
            width: "100%", height: 54, borderRadius: 10, marginBottom: 8,
            background: `linear-gradient(135deg, ${C.gold} 0%, #A67C00 100%)`,
            border: "none", color: "#000000",
            fontSize: 14, fontWeight: 900, letterSpacing: "0.10em",
            cursor: "pointer", fontFamily: C.sans,
            boxShadow: `0 0 30px ${C.goldGlow}`,
          }}>
          PROCESS PAYMENT ➔
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }}
          style={{
            width: "100%", height: 40, borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: `1px solid ${C.chrome}`,
            color: C.slate, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: C.sans,
          }}>
          PRINT RECEIPT
        </motion.button>
      </div>
    </div>
  );
}

// ── Left Nav Rail ────────────────────────────────────────────────────────────

function NavRail({ onBack }: { onBack: () => void }) {
  const navItems = [
    { icon: "⚡", label: "POS",   active: true  },
    { icon: "📊", label: "OPS",   active: false },
    { icon: "🍂", label: "SMOKE", active: false },
    { icon: "🥃", label: "BAR",   active: false },
    { icon: "🍺", label: "BREW",  active: false },
  ];

  return (
    <div style={{
      width: 64, height: "100%", flexShrink: 0,
      background: "rgba(6,6,6,0.98)", borderRight: `1px solid ${C.chrome}`,
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 14, gap: 6,
    }}>
      <motion.button whileTap={{ scale: 0.90 }} onClick={onBack} {...withTouch}
        style={{
          width: 44, height: 44, borderRadius: 10, marginBottom: 12,
          background: "rgba(212,175,55,0.10)", border: `1px solid ${C.gold}44`,
          color: C.gold, fontSize: 18, cursor: "pointer",
        }}>
        ←
      </motion.button>

      {navItems.map(n => (
        <div key={n.label} style={{
          width: 44, height: 44, borderRadius: 10,
          background: n.active ? C.goldDim : "transparent",
          border: `1px solid ${n.active ? C.gold : C.chrome}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          cursor: "pointer", gap: 2,
        }}>
          <span style={{ fontSize: 16 }}>{n.icon}</span>
          <span style={{ fontFamily: C.mono, fontSize: 7, color: n.active ? C.gold : C.slate, letterSpacing: "0.14em" }}>{n.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Root: StaffTerminal ──────────────────────────────────────────────────────

export default function StaffTerminal({ onBack: onBackProp }: { onBack?: () => void } = {}) {
  const [, navigate] = useLocation();
  const handleBack = onBackProp ?? (() => navigate("/"));
  const [tables, setTables] = useState<TableTicket[]>(SEED_TABLES);
  const [activeId, setActiveId] = useState<string>(SEED_TABLES[0].id);

  // Update items for a table (from Ticket Tapper)
  const handleItemsUpdate = useCallback((tableId: string, items: TicketItem[]) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, items } : t));
  }, []);

  // Remove a single SKU from the ledger
  const handleRemoveItem = useCallback((tableId: string, itemId: string) => {
    setTables(prev => prev.map(t =>
      t.id === tableId ? { ...t, items: t.items.filter(i => i.id !== itemId) } : t
    ));
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: C.base,
      backgroundImage: "radial-gradient(ellipse 90% 50% at 50% 0%, rgba(212,175,55,0.05) 0%, transparent 65%)",
      display: "flex", fontFamily: C.sans,
      overflow: "hidden",
    }}>
      {/* Deep vignette */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 0 140px rgba(0,0,0,0.75)", zIndex: 0 }} />

      {/* Left nav rail */}
      <NavRail onBack={handleBack} />

      {/* 3-column workspace */}
      <div style={{
        flex: 1, display: "grid",
        gridTemplateColumns: "270px 1fr 290px",
        gap: 12, padding: "14px 14px 14px 12px",
        overflow: "hidden", height: "100%", position: "relative", zIndex: 1,
      }}>
        <TelemetryColumn />
        <TicketsColumn
          tables={tables}
          activeId={activeId}
          onSelect={setActiveId}
          onItemsUpdate={handleItemsUpdate}
        />
        <LedgerColumn
          tables={tables}
          activeId={activeId}
          onRemoveItem={handleRemoveItem}
        />
      </div>
    </div>
  );
}
