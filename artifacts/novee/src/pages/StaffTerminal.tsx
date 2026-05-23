/**
 * StaffTerminal — High-Velocity Staff POS  (matches POS3.png reference)
 * Full cinematic rebuild: Header · NavRail · 3-Column Grid · Footer
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  base:    "#020202",
  glass:   "rgba(16,16,16,0.90)",
  glass2:  "rgba(22,22,22,0.88)",
  gold:    "#D4AF37",
  goldDim: "rgba(212,175,55,0.15)",
  goldGlow:"rgba(212,175,55,0.40)",
  amber:   "#E6A11D",
  chrome:  "#2A2A2A",
  chrome2: "#1A1A1A",
  white:   "#FFFFFF",
  cream:   "#F0E8D8",
  slate:   "rgba(180,180,192,0.55)",
  red:     "#C0392B",
  redDim:  "rgba(192,57,43,0.20)",
  redBright:"#E74C3C",
  green:   "#27AE60",
  orange:  "#E67E22",
  sans:    "'Inter','SF Pro Display',sans-serif",
  mono:    "'JetBrains Mono','Courier New',monospace",
};

const BASE = import.meta.env.BASE_URL;
const IMG  = (n: string) => `${BASE}images/${n}`;

// Touch helper
const T = {
  onTouchStart: (e: React.TouchEvent) => { (e.currentTarget as HTMLElement).style.opacity = "0.78"; },
  onTouchEnd:   (e: React.TouchEvent) => { (e.currentTarget as HTMLElement).style.opacity = "1"; },
};

// Glass card factory
const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background:           C.glass,
  backdropFilter:       "blur(25px)",
  WebkitBackdropFilter: "blur(25px)",
  border:               `1px solid ${C.chrome}`,
  borderRadius:         10,
  overflow:             "hidden",
  ...extra,
});

// Gold hairline top accent
const goldTop = (): React.CSSProperties => ({ borderTop: `2px solid ${C.gold}` });

// ── Live Clock ───────────────────────────────────────────────────────────────
function useClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  const hh = t.getHours() % 12 || 12;
  const mm  = String(t.getMinutes()).padStart(2, "0");
  const ap  = t.getHours() >= 12 ? "PM" : "AM";
  const date = t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
  return `${hh}:${mm} ${ap}  ·  ${date}`;
}

// ── Section badge ────────────────────────────────────────────────────────────
function Badge({ n }: { n: number }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${C.gold}, #A67C00)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, fontWeight: 900, color: "#000",
    }}>{n}</div>
  );
}

// ── VIP pill ─────────────────────────────────────────────────────────────────
function VIP() {
  return (
    <span style={{
      background: `linear-gradient(135deg, ${C.gold}, #A67C00)`,
      color: "#000", fontSize: 9, fontWeight: 900,
      letterSpacing: "0.18em", padding: "2px 7px", borderRadius: 4,
    }}>VIP</span>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
interface TicketItem { id: string; name: string; brand: string; price: number; qty: number; img?: string; }
interface TableTicket { id: string; label: string; section: string; guestName: string; elapsedMs: number; isVip: boolean; items: TicketItem[]; img: string; }

const SEED: TableTicket[] = [
  {
    id: "t101", label: "TABLE 101", section: "VIP SECTION", guestName: "John D.",
    elapsedMs: 6_120_000, isVip: true,
    img: IMG("scenes/smokecraft-card.jpg"),
    items: [
      { id: "rp",  name: "Rocky Patel",   brand: "Vintage 1992", price: 42, qty: 1, img: IMG("cigar1.png") },
      { id: "bt",  name: "Buffalo Trace",  brand: "Bourbon",      price: 32, qty: 2, img: IMG("pour/pour_whiskey.png") },
      { id: "rmx", name: "Remy Martin XO", brand: "Cognac",       price: 48, qty: 1, img: IMG("pour/pour_aged.png") },
      { id: "ap",  name: "Acqua Panna",    brand: "Water",        price:  8, qty: 2 },
    ],
  },
  {
    id: "t102", label: "TABLE 102", section: "MAIN FLOOR", guestName: "Maria S.",
    elapsedMs: 3_420_000, isVip: false,
    img: IMG("scenes/pourcraft-card.jpg"),
    items: [
      { id: "p64",  name: "Padrón 1964",    brand: "Anniversary", price: 48, qty: 1, img: IMG("cigar2.png") },
      { id: "mac",  name: "Macallan 12yr",   brand: "Scotch",      price: 28, qty: 2, img: IMG("pour/pour_whiskey.png") },
    ],
  },
  {
    id: "t103", label: "TABLE 103", section: "MAIN LOUNGE", guestName: "Robert K.",
    elapsedMs: 1_380_000, isVip: false,
    img: IMG("scenes/bold.jpg"),
    items: [
      { id: "af",  name: "Arturo Fuente",  brand: "Gran Reserva", price: 26, qty: 2, img: IMG("cigar3.png") },
    ],
  },
];

function elapsed(ms: number) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}h`;
}
function total(items: TicketItem[]) { return items.reduce((s,i) => s + i.price * i.qty, 0); }

// ── Header Bar ───────────────────────────────────────────────────────────────
function HeaderBar() {
  const clock = useClock();
  const [pulse, setPulse] = useState(true);
  useEffect(() => { const id = setInterval(() => setPulse(p => !p), 1200); return () => clearInterval(id); }, []);

  return (
    <div style={{
      height: 52, flexShrink: 0, background: C.chrome2,
      borderBottom: `1px solid ${C.chrome}`,
      display: "flex", alignItems: "center",
      padding: "0 18px", gap: 16, zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: 220, flexShrink: 0 }}>
        <img src={IMG("logo_eat.png")} alt="EAT" style={{ height: 32, width: 32, objectFit: "contain" }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, letterSpacing: "0.16em" }}>E.A.T. SYSTEM</div>
          <div style={{ fontSize: 8,  fontWeight: 400, color: C.slate, letterSpacing: "0.22em" }}>ELITE ATMOSPHERE TECHNOLOGY</div>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Clock + live sync */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.cream, letterSpacing: "0.08em" }}>{clock}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <motion.div animate={{ opacity: pulse ? 1 : 0.2 }} transition={{ duration: 0.3 }}
            style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} />
          <span style={{ fontSize: 10, color: C.green, fontWeight: 700, letterSpacing: "0.18em" }}>LIVE SYNC</span>
          <span style={{ fontSize: 11, color: C.green }}>▐▐▌</span>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Platform badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.cream, letterSpacing: "0.10em" }}>NOVEE OS <span style={{ color: C.slate }}>v1.0</span></span>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", color: C.green,
          border: `1px solid ${C.green}`, borderRadius: 4, padding: "2px 8px",
        }}>LIVE</span>
        <span style={{ fontSize: 14, color: C.slate }}>📶</span>
      </div>
    </div>
  );
}

// ── Nav Rail ──────────────────────────────────────────────────────────────────
function NavRail({ onBack }: { onBack: () => void }) {
  const navItems = [
    { icon: "🏠", label: "Hub",     sub: "Hub",            active: true,  onClick: onBack },
    { icon: "🍂", label: "SC",      sub: "Smoke\nCraft",   active: false, onClick: undefined },
    { icon: "🍸", label: "PR",      sub: "Pairing\nEngine",active: false, onClick: undefined },
    { icon: "🎓", label: "CH",      sub: "Coach\nHelp",    active: false, onClick: undefined },
  ];

  return (
    <div style={{
      width: 64, flexShrink: 0,
      background: "rgba(4,4,4,0.98)",
      borderRight: `1px solid ${C.chrome}`,
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 10, gap: 4, height: "100%",
    }}>
      {navItems.map(item => (
        <motion.button key={item.label}
          whileTap={{ scale: 0.92 }} onClick={item.onClick} {...T}
          style={{
            width: 52, minHeight: 58, borderRadius: 9,
            background: item.active ? C.goldDim : "transparent",
            border: `1px solid ${item.active ? C.gold : C.chrome}`,
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", cursor: "pointer", gap: 3, padding: "6px 0",
          }}>
          <span style={{ fontSize: 18 }}>{item.icon}</span>
          <span style={{ fontFamily: C.mono, fontSize: 8, color: item.active ? C.gold : C.slate, letterSpacing: "0.12em", lineHeight: 1.2, textAlign: "center", whiteSpace: "pre-line" }}>
            {item.sub}
          </span>
        </motion.button>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* POS LIVE — active gold */}
      <motion.button
        whileTap={{ scale: 0.94 }} {...T}
        style={{
          width: 52, minHeight: 72, borderRadius: 9, marginBottom: 10,
          background: `linear-gradient(180deg, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.10) 100%)`,
          border: `1px solid ${C.gold}`,
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", cursor: "pointer", gap: 4,
          boxShadow: `0 0 18px ${C.goldGlow}`,
        }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: C.gold }}>P</span>
        <span style={{ fontFamily: C.mono, fontSize: 7, color: C.gold, letterSpacing: "0.14em", lineHeight: 1.2, textAlign: "center" }}>POS{"\n"}LIVE</span>
      </motion.button>
    </div>
  );
}

// ── Column 1: Real-Time Telemetry ─────────────────────────────────────────────
function TelemetryColumn() {
  const [puros, setPuros] = useState(145);
  const [pours, setPours] = useState(14);
  const [pending, setPending] = useState(3);
  const [ready,   setReady]   = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      if (Math.random() < 0.07) setPuros(p => Math.max(0, p - 1));
    }, 4_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%", overflow: "hidden" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 2px 4px", flexShrink: 0 }}>
        <Badge n={1} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.white, letterSpacing: "0.06em" }}>REAL-TIME TELEMETRY</div>
          <div style={{ fontSize: 9, fontFamily: C.mono, color: C.gold, letterSpacing: "0.28em", textTransform: "uppercase" }}>E.A.T. CORE STATION MONITORS</div>
        </div>
      </div>

      {/* STATION 1: HUMIDOR */}
      <div style={card({ ...goldTop(), padding: 0, flexShrink: 0 })}>
        {/* Station label row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px 8px" }}>
          <span style={{ fontSize: 16 }}>🍃</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.slate, letterSpacing: "0.26em", textTransform: "uppercase" }}>STATION 1: HUMIDOR</span>
        </div>

        {/* Two-panel: metric left + image right */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 110 }}>
          {/* Metric */}
          <div style={{ padding: "0 14px 10px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <motion.div
              animate={{ textShadow: [`0 0 20px ${C.amber}55`, `0 0 45px ${C.amber}99`, `0 0 20px ${C.amber}55`] }}
              transition={{ duration: 2.2, repeat: Infinity }}
              style={{ fontSize: 64, fontWeight: 900, color: C.amber, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {puros}
            </motion.div>
            <div style={{ fontSize: 10, color: C.slate, letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 4 }}>PUROS REMAINING</div>
          </div>
          {/* Image */}
          <div style={{
            background: `url(${IMG("cedar_box.png")}) center/cover no-repeat, linear-gradient(135deg, #3D2B1F, #1A120A)`,
            borderLeft: `1px solid ${C.chrome}`,
          }} />
        </div>

        {/* Climate */}
        <div style={{ padding: "8px 14px", borderTop: `1px solid ${C.chrome}` }}>
          <div style={{ fontSize: 8, color: C.slate, letterSpacing: "0.26em", textTransform: "uppercase", marginBottom: 6 }}>CLIMATE CONTROL</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { icon: "🌡️", label: "TEMPERATURE", val: "68°F" },
              { icon: "💧", label: "RELATIVE HUMIDITY", val: "71%" },
            ].map(m => (
              <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.chrome}`, borderRadius: 7, padding: "6px 10px" }}>
                <span style={{ fontSize: 14 }}>{m.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.amber }}>{m.val}</div>
                  <div style={{ fontSize: 8, color: C.slate, letterSpacing: "0.16em" }}>{m.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alert bar */}
        <motion.div
          animate={{ opacity: [1, 0.70, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: C.redDim, borderTop: `1px solid ${C.red}55`,
            padding: "9px 14px", cursor: "pointer",
          }}>
          <span style={{ fontSize: 13 }}>⚠️</span>
          <span style={{ flex: 1, fontSize: 11, fontWeight: 800, color: C.redBright, letterSpacing: "0.14em" }}>TARGET ALERT: LOW STOCK</span>
          <span style={{ fontSize: 14, color: C.redBright }}>›</span>
        </motion.div>
      </div>

      {/* STATION 2: BAR METRICS */}
      <div style={card({ borderTop: `2px solid #3A6BC4`, padding: 0, flexShrink: 0 })}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px 6px" }}>
          <span style={{ fontSize: 14 }}>🍸</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.slate, letterSpacing: "0.26em", textTransform: "uppercase" }}>STATION 2: BAR METRICS</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", padding: "0 14px 12px", gap: 12 }}>
          <div>
            <div style={{ fontSize: 48, fontWeight: 900, color: C.white, lineHeight: 1, letterSpacing: "-0.02em" }}>{pours}</div>
            <div style={{ fontSize: 10, color: C.slate, letterSpacing: "0.20em", textTransform: "uppercase", marginTop: 4 }}>ACTIVE POUR SESSIONS</div>
          </div>
          {/* Bottle image */}
          <div style={{
            width: 52, height: 80, borderRadius: 8, overflow: "hidden",
            background: `url(${IMG("pour/pour_whiskey.png")}) center/cover no-repeat, linear-gradient(180deg, #2C1810, #0A0A0A)`,
            border: `1px solid ${C.chrome}`,
          }} />
        </div>

        {/* Low stock alert */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: C.redDim, borderTop: `1px solid ${C.red}55`, padding: "9px 14px",
        }}>
          <span style={{ fontSize: 11 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.redBright, letterSpacing: "0.16em" }}>LOW STOCK</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.white }}>REMY MARTIN XO</div>
            <div style={{ fontSize: 9, color: C.slate, letterSpacing: "0.14em" }}>COGNAC</div>
          </div>
        </div>
      </div>

      {/* STATION 3: KITCHEN LINE */}
      <div style={card({ borderTop: "2px solid #7B5EA7", padding: 0, flex: 1, display: "flex", flexDirection: "column" })}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px 6px" }}>
          <span style={{ fontSize: 14 }}>🍳</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.slate, letterSpacing: "0.26em", textTransform: "uppercase" }}>STATION 3: KITCHEN LINE</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "0 14px 12px" }}>
          {[
            { val: pending, label: "PENDING ORDERS", color: C.amber },
            { val: ready,   label: "READY ORDERS",   color: C.green },
          ].map(m => (
            <div key={m.label} style={{ background: `${m.color}0a`, border: `1px solid ${m.color}30`, borderRadius: 8, padding: "12px 0", textAlign: "center" }}>
              <div style={{ fontSize: 38, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.val}</div>
              <div style={{ fontSize: 8, color: C.slate, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 5 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* View Queue button */}
        <motion.button
          whileTap={{ scale: 0.97 }} {...T}
          onClick={() => { setPending(p => Math.max(0, p - 1)); setReady(r => r + 1); }}
          style={{
            marginTop: "auto", width: "100%", height: 44,
            background: "rgba(123,94,167,0.12)", border: "none",
            borderTop: "1px solid rgba(123,94,167,0.35)",
            color: "#A78BFA", fontSize: 12, fontWeight: 800, letterSpacing: "0.14em",
            cursor: "pointer", fontFamily: C.sans,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          <span>📋</span> VIEW KITCHEN QUEUE <span>›</span>
        </motion.button>
      </div>
    </div>
  );
}

// ── Ticket Tapper Modal ───────────────────────────────────────────────────────
function TicketTapperModal({ table, onClose, onUpdate }: {
  table: TableTicket;
  onClose: () => void;
  onUpdate: (items: TicketItem[]) => void;
}) {
  const [items, setItems] = useState<TicketItem[]>(table.items.map(i => ({ ...i })));
  const adjust = useCallback((id: string, d: number) => {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + d) } : i).filter(i => i.qty > 0);
      onUpdate(next);
      return next;
    });
  }, [onUpdate]);

  const sub  = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax  = sub * 0.085;
  const tot  = sub + tax;

  return (
    <motion.div key="tapper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }} onClick={onClose} />
      <motion.div initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
        style={{
          position: "relative", zIndex: 1, width: 520, maxHeight: "90vh",
          background: "rgba(8,8,10,0.98)", border: `1px solid ${C.gold}`,
          borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column",
          boxShadow: `0 0 60px ${C.goldGlow}`,
        }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.chrome}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, letterSpacing: "0.28em", marginBottom: 4 }}>🎟️ TICKET TAPPER</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.white }}>{table.label} — {table.guestName}</div>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.chrome}`, color: C.slate, cursor: "pointer", fontSize: 14 }}>
            ✕
          </motion.button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          <AnimatePresence>
            {items.map((item, idx) => (
              <motion.div key={item.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10, height: 0 }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", borderBottom: idx < items.length - 1 ? `1px solid ${C.chrome}` : "none" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: C.slate }}>{item.brand} · ${item.price.toFixed(2)} each</div>
                </div>
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => adjust(item.id, -1)}
                  style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.40)", color: "#E74C3C", fontSize: 18, lineHeight: "28px", textAlign: "center", cursor: "pointer" }}>−</motion.button>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.amber, minWidth: 24, textAlign: "center" }}>{item.qty}</div>
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => adjust(item.id, 1)}
                  style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(39,174,96,0.12)", border: "1px solid rgba(39,174,96,0.40)", color: C.green, fontSize: 18, lineHeight: "28px", textAlign: "center", cursor: "pointer" }}>+</motion.button>
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => adjust(item.id, -999)}
                  style={{ width: 26, height: 26, borderRadius: "50%", background: C.goldDim, border: `1px solid ${C.gold}44`, color: C.gold, fontSize: 12, lineHeight: "24px", textAlign: "center", cursor: "pointer" }}>✕</motion.button>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.white, minWidth: 54, textAlign: "right" }}>${(item.price * item.qty).toFixed(2)}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.chrome}` }}>
          {[{ label: "Subtotal", val: sub }, { label: "Tax (8.5%)", val: tax }].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: C.slate }}>{r.label}</span>
              <span style={{ fontSize: 13, color: C.white }}>${r.val.toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", borderTop: `1px solid ${C.chrome}`, marginTop: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: C.white }}>TOTAL</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: C.amber }}>${tot.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ padding: "12px 20px", display: "flex", gap: 10 }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
            style={{ flex: 1, height: 46, borderRadius: 9, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.chrome}`, color: C.slate, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: C.sans }}>CANCEL</motion.button>
          <motion.button whileTap={{ scale: 0.97 }}
            style={{ flex: 2, height: 46, borderRadius: 9, background: `linear-gradient(135deg, ${C.gold}, #A67C00)`, border: "none", color: "#000", fontSize: 13, fontWeight: 900, letterSpacing: "0.08em", cursor: "pointer", fontFamily: C.sans }}>
            CONFIRM & UPDATE TICKET
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Column 2: High-Speed Ticket Overview ──────────────────────────────────────
const TABS = ["ALL TABLES", "VIP SECTION", "MAIN FLOOR", "OUTDOOR"] as const;
type Tab = typeof TABS[number];

function TicketsColumn({ tables, activeId, onSelect, onItemsUpdate }: {
  tables: TableTicket[];
  activeId: string;
  onSelect: (id: string) => void;
  onItemsUpdate: (tableId: string, items: TicketItem[]) => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("ALL TABLES");
  const [tapperTable, setTapperTable] = useState<TableTicket | null>(null);

  const filtered = activeTab === "ALL TABLES"
    ? tables
    : tables.filter(t => t.section.includes(activeTab.replace(" SECTION", "").replace(" FLOOR","").replace(" LOUNGE","")));

  const activeTables = 12, vipTables = 4;
  const avgMs = tables.reduce((s, t) => s + t.elapsedMs, 0) / tables.length;
  const totalVal = tables.reduce((s, t) => s + total(t.items), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 2px 4px", flexShrink: 0 }}>
        <Badge n={2} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.white, letterSpacing: "0.06em" }}>HIGH-SPEED TICKET OVERVIEW</div>
          <div style={{ fontSize: 9, fontFamily: C.mono, color: C.gold, letterSpacing: "0.28em", textTransform: "uppercase" }}>ACTIVE LOUNGE TABLES & QUEUES</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexShrink: 0, alignItems: "center" }}>
        {TABS.map(tab => (
          <motion.button key={tab} whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(tab)}
            style={{
              height: 28, padding: "0 10px", borderRadius: 6, cursor: "pointer",
              background: activeTab === tab ? `linear-gradient(135deg, ${C.gold}, #A67C00)` : "rgba(255,255,255,0.04)",
              border: `1px solid ${activeTab === tab ? C.gold : C.chrome}`,
              color: activeTab === tab ? "#000" : C.slate,
              fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", fontFamily: C.sans,
              whiteSpace: "nowrap",
            }}>{tab}</motion.button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 16, color: C.slate, cursor: "pointer" }}>⚙️</div>
      </div>

      {/* Table card list */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(t => {
          const isActive = t.id === activeId;
          const tab = total(t.items);
          return (
            <motion.div key={t.id} whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(t.id)}
              animate={{ boxShadow: isActive ? `0 0 20px ${C.goldGlow}` : "0 0 0 transparent" }}
              style={{
                ...card(),
                border: `1px solid ${isActive ? C.gold : C.chrome}`,
                cursor: "pointer", flexShrink: 0,
              }}>
              {/* Table info row */}
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, padding: "12px 14px 8px", alignItems: "flex-start" }}>
                {/* Thumbnail */}
                <div style={{
                  width: 52, height: 52, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                  background: `url(${t.img}) center/cover no-repeat, linear-gradient(135deg, #3D2010, #111)`,
                  border: `1px solid ${C.chrome}`,
                }} />
                {/* Info */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: C.white, letterSpacing: "0.04em" }}>{t.label}</span>
                    {t.isVip && <VIP />}
                    <span style={{ fontSize: 10, color: C.slate, letterSpacing: "0.12em" }}>{t.isVip ? "" : t.section}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.slate }}>Guest: {t.guestName}</div>
                </div>
                {/* Time */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: C.amber, fontWeight: 700 }}>⏱ {elapsed(t.elapsedMs)}</div>
                  <div style={{ fontSize: 9, color: C.slate, marginTop: 2 }}>TIME ACTIVE</div>
                </div>
              </div>

              {/* Tab total */}
              <div style={{ padding: "0 14px 10px", display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 10, color: C.slate, letterSpacing: "0.20em", textTransform: "uppercase" }}>CURRENT TAB</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: C.amber }}>${tab.toFixed(2)}</span>
              </div>

              {/* Ticket Tapper button */}
              <motion.button whileTap={{ scale: 0.97 }} {...T}
                onClick={e => { e.stopPropagation(); setTapperTable(t); }}
                style={{
                  width: "100%", height: 48,
                  background: `linear-gradient(90deg, rgba(212,175,55,0.18), rgba(212,175,55,0.10))`,
                  border: "none", borderTop: `1px solid ${C.gold}55`,
                  color: C.gold, fontSize: 13, fontWeight: 900, letterSpacing: "0.12em",
                  cursor: "pointer", fontFamily: C.sans,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                ★&nbsp; OPEN TICKET TAPPER&nbsp; ★
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Stats strip */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        background: C.glass2, border: `1px solid ${C.chrome}`, borderRadius: 8,
        marginTop: 8, flexShrink: 0, overflow: "hidden",
      }}>
        {[
          { label: "ACTIVE TABLES",   val: String(activeTables) },
          { label: "VIP TABLES",      val: String(vipTables) },
          { label: "AVERAGE TIME",    val: elapsed(avgMs) },
          { label: "TOTAL TAB VALUE", val: `$${totalVal.toFixed(2)}` },
        ].map((s, i) => (
          <div key={s.label} style={{
            padding: "10px 12px", textAlign: "center",
            borderRight: i < 3 ? `1px solid ${C.chrome}` : "none",
          }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: C.amber }}>{s.val}</div>
            <div style={{ fontSize: 8, color: C.slate, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {tapperTable && (
          <TicketTapperModal key={tapperTable.id} table={tapperTable}
            onClose={() => setTapperTable(null)}
            onUpdate={items => onItemsUpdate(tapperTable.id, items)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Column 3: Active Ledger ───────────────────────────────────────────────────
function LedgerColumn({ tables, activeId, onRemoveItem }: {
  tables: TableTicket[];
  activeId: string;
  onRemoveItem: (tableId: string, itemId: string) => void;
}) {
  const table = tables.find(t => t.id === activeId) ?? tables[0];
  if (!table) return null;

  const sub = total(table.items);
  const tax = sub * 0.085;
  const tot = sub + tax;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 2px 4px", flexShrink: 0 }}>
        <Badge n={3} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.white, letterSpacing: "0.06em" }}>ACTIVE LEDGER</div>
          <div style={{ fontSize: 9, fontFamily: C.mono, color: C.gold, letterSpacing: "0.28em", textTransform: "uppercase" }}>PERSISTENT LINE ITEMS</div>
        </div>
      </div>

      {/* Table identity card */}
      <div style={card({ ...goldTop(), padding: "12px 14px", marginBottom: 8, flexShrink: 0 })}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.white }}>{table.label}</span>
            {table.isVip && <VIP />}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: C.slate, letterSpacing: "0.18em" }}>BALANCE</div>
            <motion.div animate={{ color: [C.amber, "#FFD700", C.amber] }} transition={{ duration: 2.4, repeat: Infinity }}
              style={{ fontSize: 20, fontWeight: 900 }}>${tot.toFixed(2)}</motion.div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>{table.guestName}</div>
      </div>

      {/* LINE ITEMS label */}
      <div style={{ fontSize: 9, fontFamily: C.mono, color: C.slate, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 6, paddingLeft: 2, flexShrink: 0 }}>LINE ITEMS</div>

      {/* Item rows */}
      <div style={{ ...card(), flex: 1, overflowY: "auto", padding: "2px 0", marginBottom: 8 }}>
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
                display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                borderBottom: idx < table.items.length - 1 ? `1px solid ${C.chrome}` : "none",
              }}>
              {/* Product thumbnail */}
              <div style={{
                width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                background: item.img ? `url(${item.img}) center/cover no-repeat, linear-gradient(135deg, #2A1810, #111)` : `linear-gradient(135deg, #2A1810, #111)`,
                border: `1px solid ${C.chrome}`,
              }} />

              {/* Qty badge */}
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg, ${C.gold}, #A67C00)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 900, color: "#000",
              }}>{item.qty}x</div>

              {/* Name + brand */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.white, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                <div style={{ fontSize: 10, color: C.slate, fontStyle: "italic" }}>{item.brand}</div>
              </div>

              {/* Price */}
              <div style={{ fontSize: 13, fontWeight: 700, color: C.white, minWidth: 44, textAlign: "right" }}>${item.price.toFixed(2)}</div>

              {/* Remove ✕ */}
              <motion.button whileTap={{ scale: 0.86 }} {...T}
                onClick={() => onRemoveItem(table.id, item.id)}
                style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  background: C.goldDim, border: `1px solid ${C.gold}55`,
                  color: C.gold, fontSize: 12, lineHeight: "24px", textAlign: "center",
                  cursor: "pointer",
                }}>✕</motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Totals + actions */}
      <div style={card({ padding: "14px 14px 0", flexShrink: 0 })}>
        {[{ label: "SUBTOTAL", val: sub }, { label: "TAX", val: tax }].map(r => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 12, color: C.slate, letterSpacing: "0.14em" }}>{r.label}</span>
            <span style={{ fontSize: 12, color: C.white }}>${r.val.toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 12px", borderTop: `1px solid ${C.chrome}` }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: C.white, letterSpacing: "0.06em" }}>TOTAL</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: C.amber }}>${tot.toFixed(2)}</span>
        </div>

        {/* View Full Ledger */}
        <motion.button whileTap={{ scale: 0.97 }} {...T}
          style={{
            width: "100%", height: 48, marginBottom: 10,
            background: "rgba(255,255,255,0.04)", border: `1px solid ${C.chrome}`,
            borderRadius: 9, color: C.cream, fontSize: 12, fontWeight: 800,
            letterSpacing: "0.14em", cursor: "pointer", fontFamily: C.sans,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          <span>📊</span> VIEW FULL LEDGER <span style={{ color: C.gold }}>›</span>
        </motion.button>

        {/* Process Payment */}
        <motion.button whileTap={{ scale: 0.97 }} {...T}
          style={{
            width: "100%", height: 54, marginBottom: 12,
            background: `linear-gradient(135deg, ${C.gold} 0%, #A67C00 100%)`,
            border: "none", borderRadius: 9,
            color: "#000", fontSize: 14, fontWeight: 900, letterSpacing: "0.10em",
            cursor: "pointer", fontFamily: C.sans,
            boxShadow: `0 0 28px ${C.goldGlow}`,
          }}>
          PROCESS PAYMENT ➔
        </motion.button>
      </div>
    </div>
  );
}

// ── Footer: Staff · Insights · System ─────────────────────────────────────────

const STAFF = [
  { name: "Alex R.",    role: "Manager",    color: C.green  },
  { name: "Jasmine L.", role: "Server",     color: C.green  },
  { name: "Marco B.",   role: "Bartender",  color: C.green  },
  { name: "Tanya G.",   role: "Runner",     color: C.green  },
  { name: "Devon H.",   role: "Host",       color: C.green  },
];

const SYSTEM_INDICATORS = [
  { icon: "🍃", label: "HUMIDOR",  status: "Optimal",   color: C.green  },
  { icon: "🍸", label: "BAR",      status: "Normal",    color: C.green  },
  { icon: "🍳", label: "KITCHEN",  status: "Busy",      color: C.orange },
  { icon: "📶", label: "NETWORK",  status: "Excellent", color: C.green  },
];

function FooterBar() {
  return (
    <div style={{
      flexShrink: 0, height: 110,
      background: C.chrome2, borderTop: `1px solid ${C.chrome}`,
      display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
      overflow: "hidden",
    }}>
      {/* Staff on Floor */}
      <div style={{ padding: "10px 16px", borderRight: `1px solid ${C.chrome}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontFamily: C.mono, color: C.gold, letterSpacing: "0.28em", textTransform: "uppercase" }}>STAFF ON FLOOR</span>
          <span style={{ fontSize: 9, color: C.slate, cursor: "pointer" }}>VIEW ALL ›</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          {STAFF.map(s => (
            <div key={s.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              {/* Avatar circle */}
              <div style={{ position: "relative" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: `linear-gradient(135deg, #3D2B1F, #1A120A)`,
                  border: `1px solid ${C.chrome}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14,
                }}>👤</div>
                <div style={{
                  position: "absolute", bottom: 1, right: 1,
                  width: 8, height: 8, borderRadius: "50%",
                  background: s.color, border: `1px solid ${C.base}`,
                }} />
              </div>
              <div style={{ fontSize: 8, color: C.cream, textAlign: "center", lineHeight: 1.2, maxWidth: 40 }}>{s.name}</div>
              <div style={{ fontSize: 7, color: C.slate, textAlign: "center" }}>{s.role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Venue Insights */}
      <div style={{ padding: "10px 16px", borderRight: `1px solid ${C.chrome}` }}>
        <div style={{ fontSize: 9, fontFamily: C.mono, color: C.gold, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 8 }}>VENUE INSIGHTS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "SALES/HOUR",       val: "$2,847",  sub: "+18% vs last hour", color: C.green  },
            { label: "AVG CHECK",         val: "$86.40",  sub: "+12% vs last hour", color: C.green  },
            { label: "TOP CATEGORY",      val: "Cognac",  sub: "38% of sales",      color: C.amber  },
            { label: "PAIRING SUCCESS",   val: "92%",     sub: "High Impact",       color: C.green  },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 14, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.val}</div>
              <div style={{ fontSize: 8, color: C.slate, letterSpacing: "0.14em", textTransform: "uppercase", margin: "3px 0 2px" }}>{m.label}</div>
              <div style={{ fontSize: 8, color: m.color }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div style={{ padding: "10px 16px" }}>
        <div style={{ fontSize: 9, fontFamily: C.mono, color: C.gold, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 8 }}>SYSTEM STATUS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {SYSTEM_INDICATORS.map(s => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8, fontSize: 16,
                background: `${s.color}18`, border: `1px solid ${s.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{s.icon}</div>
              <div style={{ fontSize: 8, color: s.color, fontWeight: 700, textAlign: "center" }}>{s.status}</div>
              <div style={{ fontSize: 7, color: C.slate, letterSpacing: "0.14em", textAlign: "center" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function StaffTerminal({ onBack: onBackProp }: { onBack?: () => void } = {}) {
  const [, navigate] = useLocation();
  const handleBack = onBackProp ?? (() => navigate("/craft-hub"));

  const [tables, setTables] = useState<TableTicket[]>(SEED);
  const [activeId, setActiveId] = useState<string>(SEED[0].id);

  const handleItemsUpdate = useCallback((tableId: string, items: TicketItem[]) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, items } : t));
  }, []);

  const handleRemoveItem = useCallback((tableId: string, itemId: string) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, items: t.items.filter(i => i.id !== itemId) } : t));
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: C.base,
      backgroundImage: "radial-gradient(ellipse 100% 40% at 50% 0%, rgba(212,175,55,0.04) 0%, transparent 60%)",
      display: "flex", flexDirection: "column",
      fontFamily: C.sans, overflow: "hidden",
    }}>
      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 0 120px rgba(0,0,0,0.65)", zIndex: 0 }} />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <HeaderBar />
      </div>

      {/* Main body: NavRail + 3 columns */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", zIndex: 1 }}>
        <NavRail onBack={handleBack} />

        <div style={{
          flex: 1, display: "grid",
          gridTemplateColumns: "300px 1fr 280px",
          gap: 10, padding: "10px 12px 10px 10px",
          overflow: "hidden",
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

      {/* Footer */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <FooterBar />
      </div>
    </div>
  );
}
