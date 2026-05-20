import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  eatEngine,
  type FloorTable,
  type CheckoutRequest,
} from "@/lib/eatEngine";
import { socket } from "@/lib/socket";

const G    = "#D4AF37";
const DIM  = "rgba(212,175,55,0.55)";
const CREAM     = "rgba(240,232,212,0.88)";
const CREAM_DIM = "rgba(240,232,212,0.45)";
const PANEL  = "rgba(10,7,3,0.82)";
const BORDER = "rgba(212,175,55,0.18)";
const EM     = "#32B45A";
const RED    = "#F07070";

/* ══════════════════════════ SHARED ATOMS ══════════════════════════ */
function Panel({ num, title, sub, children, style }: {
  num: string; title: string; sub?: string;
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", ...style }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: "rgba(212,175,55,0.05)" }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(212,175,55,0.18)", border: `1px solid ${G}66`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: G, fontFamily: "'Inter',sans-serif" }}>{num}</span>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: CREAM, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>{title}</div>
          {sub && <div style={{ fontSize: 9, color: DIM, letterSpacing: "0.10em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>{sub}</div>}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: EM, boxShadow: `0 0 6px ${EM}` }} />
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

function Metric({ label, value, sub, color = G }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 9, letterSpacing: "0.20em", color: "rgba(255,255,255,0.38)", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "'Inter',sans-serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: EM, fontFamily: "'Inter',sans-serif" }}>{sub}</div>}
    </div>
  );
}

function Btn({ label, onClick, active = false, danger = false, full = false, success = false }: {
  label: string; onClick: () => void; active?: boolean; danger?: boolean; full?: boolean; success?: boolean;
}) {
  return (
    <motion.button type="button" onPointerDown={onClick} whileTap={{ scale: 0.93 }}
      style={{
        border: `1px solid ${danger ? "#C84A4A88" : success ? `${EM}88` : active ? `${G}88` : `${G}44`}`,
        borderRadius: 6, padding: "7px 14px",
        background: danger ? "rgba(200,74,74,0.14)" : success ? "rgba(50,180,90,0.16)" : active ? "rgba(212,175,55,0.18)" : "rgba(212,175,55,0.08)",
        cursor: "pointer", fontSize: 10, fontWeight: 800, letterSpacing: "0.16em",
        color: danger ? RED : success ? EM : active ? G : DIM,
        textTransform: "uppercase", fontFamily: "'Inter',sans-serif",
        boxShadow: active ? `0 0 10px ${G}33` : "none",
        width: full ? "100%" : undefined, flexShrink: 0,
      }}>{label}</motion.button>
  );
}

/* ══════════════════════════ VENUE MAP ══════════════════════════ */
const TABLES = [
  { id: 1,  x: 155, y: 115, status: "active",  vip: false, guests: 2, spend: 180 },
  { id: 2,  x: 240, y: 95,  status: "active",  vip: false, guests: 3, spend: 290 },
  { id: 3,  x: 310, y: 120, status: "idle",    vip: false, guests: 0, spend: 0   },
  { id: 4,  x: 385, y: 100, status: "active",  vip: false, guests: 4, spend: 430 },
  { id: 5,  x: 200, y: 195, status: "active",  vip: false, guests: 2, spend: 210 },
  { id: 6,  x: 290, y: 200, status: "idle",    vip: false, guests: 0, spend: 0   },
  { id: 7,  x: 370, y: 195, status: "active",  vip: false, guests: 3, spend: 340 },
  { id: 8,  x: 440, y: 170, status: "active",  vip: false, guests: 2, spend: 195 },
  { id: 9,  x: 165, y: 275, status: "active",  vip: false, guests: 5, spend: 580 },
  { id: 10, x: 255, y: 285, status: "idle",    vip: false, guests: 0, spend: 0   },
  { id: 11, x: 340, y: 270, status: "active",  vip: false, guests: 2, spend: 270 },
  { id: 12, x: 420, y: 260, status: "active",  vip: true,  guests: 4, spend: 820 },
  { id: 13, x: 115, y: 185, status: "active",  vip: false, guests: 3, spend: 310 },
  { id: 14, x: 105, y: 280, status: "idle",    vip: false, guests: 0, spend: 0   },
];

function VenueMap({ selectedTable, onSelectTable, staffTables }: {
  selectedTable: number | null;
  onSelectTable: (id: number) => void;
  staffTables: number[];
}) {
  return (
    <svg viewBox="0 0 560 360" style={{ width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="hm" cx="60%" cy="40%" r="55%">
          <stop offset="0%"   stopColor="#D4AF37" stopOpacity="0.22" />
          <stop offset="40%"  stopColor="#C87028" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000"    stopOpacity="0" />
        </radialGradient>
        <filter id="glow-t"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glow-v"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glow-sel"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect x="60" y="55" width="460" height="288" rx="12" fill="rgba(14,10,4,0.95)" stroke={BORDER} strokeWidth="1" />
      <rect x="380" y="64" width="130" height="148" rx="8" fill="rgba(212,175,55,0.06)" stroke={`${G}44`} strokeWidth="1" strokeDasharray="4 3" />
      <text x="398" y="80"  fill={DIM} fontSize="8" fontFamily="Inter" fontWeight="700" letterSpacing="2">VIP LOUNGE</text>
      <text x="398" y="91"  fill={`${G}55`} fontSize="7" fontFamily="Inter">High Activity</text>
      <rect x="64" y="59" width="72" height="278" rx="8" fill="rgba(10,6,2,0.90)" stroke="rgba(212,175,55,0.12)" strokeWidth="1" />
      <text x="100" y="210" fill={DIM} fontSize="8" fontFamily="Inter" fontWeight="700" letterSpacing="2" transform="rotate(-90,100,210)">BAR</text>
      <rect x="60" y="55" width="460" height="288" rx="12" fill="url(#hm)" />
      {TABLES.map(t => {
        const active = t.status === "active";
        const sel    = selectedTable === t.id;
        const owned  = staffTables.includes(t.id);
        const col    = t.vip ? G : active ? "#C8962A" : "rgba(255,255,255,0.20)";
        return (
          <g key={t.id} onClick={() => active && onSelectTable(t.id)} style={{ cursor: active ? "pointer" : "default" }}>
            {sel && <circle cx={t.x} cy={t.y} r={22} fill={`${G}18`} stroke={G} strokeWidth="1.5" filter="url(#glow-sel)"><animate attributeName="r" values="22;26;22" dur="1.4s" repeatCount="indefinite" /></circle>}
            {owned && !sel && <circle cx={t.x} cy={t.y} r={19} fill="none" stroke={`${G}44`} strokeWidth="1" strokeDasharray="3 2" />}
            {active && !sel && (
              <circle cx={t.x} cy={t.y} r={t.vip ? 22 : 18} fill={t.vip ? `${G}22` : "rgba(200,150,42,0.15)"} filter={`url(#${t.vip ? "glow-v" : "glow-t"})`}>
                <animate attributeName="r" values={t.vip ? "22;26;22" : "18;21;18"} dur={t.vip ? "1.8s" : "2.4s"} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;1;0.6" dur={t.vip ? "1.8s" : "2.4s"} repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={t.x} cy={t.y} r={14}
              fill={active ? (t.vip ? "rgba(212,175,55,0.28)" : "rgba(180,120,30,0.22)") : "rgba(40,30,15,0.60)"}
              stroke={sel ? G : col} strokeWidth={sel ? 2 : 1} />
            <text x={t.x} y={t.y + 1} textAnchor="middle" dominantBaseline="middle"
              fill={active ? (t.vip ? G : "#F0C060") : "rgba(255,255,255,0.28)"}
              fontSize="10" fontWeight="800" fontFamily="Inter">{t.id}</text>
            {active && t.guests > 0 && (
              <text x={t.x} y={t.y + 22} textAnchor="middle" fill={DIM} fontSize="7" fontFamily="Inter">{t.guests}g</text>
            )}
          </g>
        );
      })}
      <g transform="translate(490,270)">
        <text x="0" y="-4" fill={DIM} fontSize="7" fontFamily="Inter">High</text>
        <rect x="0" y="0" width="12" height="60" rx="3" fill="url(#hm)" stroke={BORDER} strokeWidth="0.5" />
        <text x="0" y="74" fill={DIM} fontSize="7" fontFamily="Inter">Low</text>
      </g>
    </svg>
  );
}

/* ══════════════════════════ RADAR CHART ══════════════════════════ */
function RadarChart({ vals, color = G }: { vals: number[]; color?: string }) {
  const N = vals.length; const R = 52; const CX = 70; const CY = 70;
  const ang = (i: number) => (i * 2 * Math.PI / N) - Math.PI / 2;
  const pt  = (i: number, r: number) => ({ x: CX + r * Math.cos(ang(i)), y: CY + r * Math.sin(ang(i)) });
  const poly = (pts: { x: number; y: number }[]) => pts.map(p => `${p.x},${p.y}`).join(" ");
  const axes = ["EARTH","WOOD","CREAM","SWEET","NUT","COCOA","PEPPER","SPICE"];
  return (
    <svg viewBox="0 0 140 140" width="140" height="140">
      {[0.25, 0.5, 0.75, 1].map(f => <polygon key={f} points={poly(Array.from({ length: N }, (_, i) => pt(i, R * f)))} fill="none" stroke={`rgba(212,175,55,${f === 1 ? 0.25 : 0.10})`} strokeWidth="0.8" />)}
      {Array.from({ length: N }, (_, i) => { const p = pt(i, R); return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke={`${G}22`} strokeWidth="0.8" />; })}
      <polygon points={poly(vals.map((v, i) => pt(i, R * v / 100)))} fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      {axes.map((a, i) => { const p = pt(i, R + 12); return <text key={a} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill={DIM} fontSize="6.5" fontFamily="Inter" fontWeight="700">{a}</text>; })}
    </svg>
  );
}

/* ══════════════════════════ REVENUE CHART ══════════════════════════ */
function RevenueChart({ current }: { current: number }) {
  const base = [4200,5800,7100,9200,11400,13800,16200,19500,22100,24800,26900];
  const pts  = [...base, current];
  const max  = 36000; const W = 320; const H = 64;
  const x    = (i: number) => (i / (pts.length - 1)) * W;
  const y    = (v: number) => H - (v / max) * H;
  const d    = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} style={{ width: "100%", height: 78 }}>
      <defs>
        <linearGradient id="rv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={G} stopOpacity="0.28" />
          <stop offset="100%" stopColor={G} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill="url(#rv)" />
      <path d={d} fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(pts.length - 1)} cy={y(current)} r="4" fill={G} />
      {["12a","2a","4a","6a","8a","10a","12p","2p","4p","6p","8p","Now"].map((l, i) => (
        <text key={l} x={x(i)} y={H + 12} textAnchor="middle" fill="rgba(212,175,55,0.38)" fontSize="7" fontFamily="Inter">{l}</text>
      ))}
    </svg>
  );
}

/* ══════════════════════════ DATA ══════════════════════════ */
const ENV_MODES = [
  { id: "jazz",    label: "Jazz Lounge Mode",        lighting: "Amber Low",   music: "Smooth Jazz", scent: "Cedar & Vanilla", energy: "Warm & Relaxed" },
  { id: "vip",     label: "VIP Bourbon Night",        lighting: "Warm Dim",    music: "Neo-Soul",    scent: "Aged Oak",        energy: "Exclusive"      },
  { id: "energy",  label: "High Energy Event",        lighting: "Full Warm",   music: "Upbeat Jazz", scent: "Citrus & Cedar",  energy: "Electric"       },
  { id: "late",    label: "Late Night Sophisticated", lighting: "Deep Low",    music: "Ambient",     scent: "Sandalwood",      energy: "Intimate"       },
  { id: "private", label: "Private Reserve Session",  lighting: "Candlelight", music: "Classical",   scent: "Tobacco Flower",  energy: "Ultra-Private"  },
];

const STAFF = [
  { id: "daniel", name: "Daniel", role: "Floor Manager",    tables: [12, 8, 4],  perf: 94 },
  { id: "maya",   name: "Maya",   role: "Sommelier",        tables: [2, 5, 9],   perf: 88 },
  { id: "alex",   name: "Alex",   role: "Cigar Specialist", tables: [1, 7],      perf: 91 },
  { id: "jordan", name: "Jordan", role: "Senior Server",    tables: [3, 6, 11],  perf: 79 },
  { id: "casey",  name: "Casey",  role: "Server",           tables: [10, 13],    perf: 82 },
];

const BILL_ITEMS: Record<number, { item: string; qty: number; price: number }[]> = {
  12: [{ item: "Padron 1964 Anniversary", qty: 2, price: 48 }, { item: "Pappy Van Winkle 15yr", qty: 2, price: 85 }, { item: "Old Forester 1920", qty: 1, price: 42 }, { item: "Premium Pairing Board", qty: 1, price: 38 }],
  2:  [{ item: "Cohiba Behike 54",         qty: 1, price: 95 }, { item: "Macallan 18",            qty: 2, price: 68 }, { item: "Still Water",         qty: 3, price: 8  }],
  4:  [{ item: "Arturo Fuente OpusX",      qty: 2, price: 72 }, { item: "Hennessy XO",            qty: 2, price: 78 }, { item: "Reserve Cigar Board", qty: 1, price: 55 }],
  7:  [{ item: "Arturo Fuente Anejo",      qty: 2, price: 56 }, { item: "Woodford Double Oaked",  qty: 2, price: 48 }],
  9:  [{ item: "Opus X BBMF",              qty: 3, price: 88 }, { item: "Dom Pérignon",            qty: 1, price: 210}, { item: "Celebration Board",   qty: 1, price: 65 }],
};

const TABLE_GUESTS: Record<number, { name: string; loyalty: string; spend: string; freq: string; prefs: string[]; rec: string }> = {
  12: { name: "John D.",   loyalty: "Platinum", spend: "$1,200 (Today)", freq: "High — Returning",  prefs: ["Medium–Full Bodied", "Bónnon Forward"], rec: "Try our Pappy Van Winkle 15 — perfect match for your current cigar profile." },
  8:  { name: "Sarah K.",  loyalty: "Gold",     spend: "$380 (Today)",   freq: "Medium — 3rd Visit", prefs: ["Light–Medium", "Floral Notes"],         rec: "Cohiba Siglo II pairs beautifully with your Chardonnay selection." },
  4:  { name: "Marcus B.", loyalty: "Platinum", spend: "$940 (Today)",   freq: "High — Weekly",      prefs: ["Full Bodied", "Earthy & Rich"],         rec: "Arturo Fuente Opus X with Hennessy XO — premium reserve pairing." },
  2:  { name: "Elena R.",  loyalty: "Silver",   spend: "$210 (Today)",   freq: "Low — 1st Visit",    prefs: ["Light", "Citrus Tones"],               rec: "Start with Romeo y Julieta No. 2 — an approachable entry into luxury cigars." },
  5:  { name: "Thomas W.", loyalty: "Gold",     spend: "$540 (Today)",   freq: "Medium — 2nd Visit", prefs: ["Medium", "Woody Notes"],               rec: "Cohiba Behike 54 pairs well with your Macallan 18 preference." },
  9:  { name: "Group: V",  loyalty: "Platinum", spend: "$580 (Today)",   freq: "High — Event",       prefs: ["Full Bodied", "Celebration"],          rec: "Opus X BBMF with Dom Pérignon — perfect for a celebration." },
  1:  { name: "Leon G.",   loyalty: "Bronze",   spend: "$120 (Today)",   freq: "Low — 1st Visit",    prefs: ["Light", "Mild"],                       rec: "Montecristo No. 4 — an excellent introduction to premium cigars." },
  7:  { name: "David C.",  loyalty: "Gold",     spend: "$440 (Today)",   freq: "High — Weekly",      prefs: ["Medium–Full", "Earthy"],               rec: "Arturo Fuente Anejo pairs excellently with Woodford Double Oaked." },
  11: { name: "Kim S.",    loyalty: "Silver",   spend: "$270 (Today)",   freq: "Medium — 2nd Visit", prefs: ["Medium", "Smooth"],                    rec: "Davidoff Millennium Blend with Clase Azul Reposado." },
  13: { name: "Group: L",  loyalty: "Gold",     spend: "$310 (Today)",   freq: "Medium — Monthly",   prefs: ["Varied", "Mixed"],                     rec: "Our pairing sampler board covers all taste profiles in this group." },
};

const WHY_PAIRING = `
Plasencia Alma Fuerte delivers rich cocoa and coffee notes with a dense, buttery draw that creates an ideal anchor for spirit pairing.
Blanton's Single Barrel — with its caramel, vanilla, and oak backbone — mirrors the cigar's earthy cedar finish without overpowering the mid-body complexity.
The 96% match reflects a 12-dimensional flavor alignment across pepper, spice, and cream vectors, validated against 3,200+ historical guest pairing preferences in this lounge's dataset.
`;

const FEATURED_PAIRINGS = [
  { cigar: "Padron 1964 Anniv.", spirit: "Pappy Van Winkle 15", score: 96, tag: "BEST SELLER" },
  { cigar: "Cohiba Behike 54",   spirit: "Macallan 18",         score: 93, tag: "TRENDING"   },
  { cigar: "Arturo Fuente OpX",  spirit: "Hennessy XO",         score: 91, tag: "CLASSIC"    },
  { cigar: "Liga Privada No. 9", spirit: "Buffalo Trace",       score: 88, tag: "POPULAR"    },
  { cigar: "Opus X BBMF",        spirit: "Dom Pérignon",        score: 97, tag: "ELITE"      },
  { cigar: "Romeo y Julieta 2",  spirit: "Woodford Reserve",   score: 82, tag: "INTRO"       },
];

interface AlertItem { id: number; type: string; text: string; table?: number; urgent: boolean; time: string; }

const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const INIT_ALERTS: AlertItem[] = [
  { id: 1, type: "vip",     text: "VIP Lounge 2 — Request: More Water",  table: 2,  urgent: true,  time: "9:41 PM" },
  { id: 2, type: "refill",  text: "Table 9 — Refill Request",            table: 9,  urgent: false, time: "9:44 PM" },
  { id: 3, type: "billing", text: "Table 14 — Bill Request",             table: 14, urgent: false, time: "9:47 PM" },
];

let alertIdCounter = 10;

/* ══════════════════════════ TOAST SYSTEM ══════════════════════════ */
interface Toast { id: number; msg: string; color: string; }
let toastId = 0;

function Toasts({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div style={{ position: "fixed", top: 70, right: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
            style={{ background: "rgba(8,5,2,0.96)", border: `1px solid ${t.color}66`, borderLeft: `3px solid ${t.color}`, borderRadius: 8, padding: "10px 16px", minWidth: 240, maxWidth: 320, pointerEvents: "all", backdropFilter: "blur(16px)" }}>
            <div style={{ fontSize: 11, color: t.color, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>{t.msg}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════ BILL MODAL ══════════════════════════ */
function BillModal({ tableId, onClose, onSendToPOS }: { tableId: number; onClose: () => void; onSendToPOS: () => void }) {
  const guest = TABLE_GUESTS[tableId];
  const items = BILL_ITEMS[tableId] ?? [{ item: "Miscellaneous Items", qty: 1, price: 180 }];
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = Math.round(subtotal * 0.085);
  const svc = Math.round(subtotal * 0.20);
  const total = subtotal + tax + svc;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.80)", backdropFilter: "blur(18px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.div initial={{ scale: 0.88, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 30 }}
        onClick={e => e.stopPropagation()}
        style={{ background: "rgba(8,5,2,0.98)", border: `1px solid ${G}44`, borderRadius: 14, padding: "28px 28px 24px", width: 420, boxShadow: `0 24px 80px rgba(0,0,0,0.95)` }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, color: DIM, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 3 }}>TABLE {tableId} — BILL SUMMARY</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: CREAM, fontFamily: "'Cormorant Garamond',serif" }}>{guest?.name ?? "Guest"}</div>
            <div style={{ fontSize: 10, color: DIM }}>{guest?.loyalty ?? "—"} Member</div>
          </div>
          <button type="button" onPointerDown={onClose} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: CREAM_DIM, fontSize: 16 }}>×</button>
        </div>
        {/* Items */}
        <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: "12px 0", marginBottom: 12 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: CREAM }}>{it.item}</div>
                <div style={{ fontSize: 9, color: DIM }}>× {it.qty}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: G }}>${(it.qty * it.price).toLocaleString()}</div>
            </div>
          ))}
        </div>
        {/* Totals */}
        {[
          { label: "Subtotal", val: `$${subtotal.toLocaleString()}` },
          { label: "Tax (8.5%)", val: `$${tax.toLocaleString()}` },
          { label: "Service (20%)", val: `$${svc.toLocaleString()}` },
        ].map(r => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: CREAM_DIM }}>{r.label}</span>
            <span style={{ fontSize: 10, color: CREAM_DIM }}>{r.val}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${BORDER}`, paddingTop: 10, marginTop: 6, marginBottom: 18 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: CREAM }}>TOTAL</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: G }}>${total.toLocaleString()}</span>
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <motion.button type="button" onPointerDown={() => { onSendToPOS(); onClose(); }} whileTap={{ scale: 0.95 }}
            style={{ flex: 1, padding: "14px", background: `linear-gradient(135deg, ${G}, #C8960A)`, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 800, color: "#090600", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>
            SEND TO POS
          </motion.button>
          <Btn label="Print" onClick={onClose} />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════ REPORT MODAL ══════════════════════════ */
function ReportModal({ revenue, onClose }: { revenue: number; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(18px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.div initial={{ scale: 0.88, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 30 }} onClick={e => e.stopPropagation()}
        style={{ background: "rgba(8,5,2,0.98)", border: `1px solid ${G}44`, borderRadius: 14, padding: "28px", width: 540, maxHeight: "80vh", overflow: "auto", boxShadow: `0 24px 80px rgba(0,0,0,0.95)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, color: DIM, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 3 }}>Executive Intelligence Report</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: G, fontFamily: "'Cormorant Garamond',serif" }}>Full Venue Analysis</div>
          </div>
          <button type="button" onPointerDown={onClose} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: CREAM_DIM, fontSize: 16 }}>×</button>
        </div>
        {[
          { section: "Revenue Performance", rows: [["Live Revenue", `$${revenue.toLocaleString()}`], ["Gross Margin", "62.6%"], ["Cost of Goods", `$${Math.round(revenue * 0.374).toLocaleString()}`], ["Net Operating", `$${Math.round(revenue * 0.48).toLocaleString()}`]] },
          { section: "Guest Intelligence",  rows: [["Avg Session Duration", "2h 14m"], ["Loyalty Redemptions", "8 today"], ["New Members Enrolled", "3 tonight"], ["VIP Upgrades", "1 tonight"]] },
          { section: "Inventory Velocity", rows: [["Cigars Moved", "34 units"], ["Spirits Poured", "67 servings"], ["Reserve Stock Used", "12% of inventory"], ["Low Stock Items", "2 items flagged"]] },
          { section: "Staff Performance",  rows: [["Top Performer", "Daniel — 94%"], ["Avg Response Time", "2.4 min"], ["Upsell Success Rate", "38%"], ["Guest Satisfaction", "4.8 / 5.0"]] },
        ].map(s => (
          <div key={s.section} style={{ marginBottom: 18, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 9, color: DIM, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 10 }}>{s.section}</div>
            {s.rows.map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: CREAM_DIM }}>{k}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: G }}>{v}</span>
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════ MAIN COMPONENT ══════════════════════════ */
export default function EATDashboard({ eatFlags }: { eatFlags?: any }) {
  const [envMode,        setEnvMode]       = useState("jazz");
  const [selectedTable,  setSelectedTable]  = useState<number | null>(12);
  const [selectedStaff,  setSelectedStaff]  = useState("daniel");
  const [alerts,         setAlerts]         = useState<AlertItem[]>(INIT_ALERTS);
  const [revenue,        setRevenue]        = useState(28450);
  const [guests,         setGuests]         = useState(46);
  const [showModeMenu,   setShowModeMenu]   = useState(false);
  const [toasts,         setToasts]         = useState<Toast[]>([]);
  const [billModal,      setBillModal]      = useState<number | null>(null);
  const [showReport,     setShowReport]     = useState(false);
  const [modeAnnounce,   setModeAnnounce]  = useState<string | null>(null);
  const [assetView,      setAssetView]      = useState<"default" | "pairings">("default");
  const [showWhyPairing, setShowWhyPairing] = useState(false);
  const [recTable,       setRecTable]       = useState<number | null>(null);
  const [billSentMap,    setBillSentMap]    = useState<Record<number, boolean>>({});
  const modeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ── Live engine state ──────────────────────────────────────────────────────
  const [wsConnected,  setWsConnected]  = useState(socket.connected);
  const [liveFloor,    setLiveFloor]    = useState<{ tables: FloorTable[] } | null>(null);

  const mode        = ENV_MODES.find(m => m.id === envMode) ?? ENV_MODES[0];
  const activeStaff = STAFF.find(s => s.id === selectedStaff) ?? STAFF[0];
  const tableGuest  = selectedTable ? TABLE_GUESTS[selectedTable] : null;
  const activeTables = TABLES.filter(t => t.status === "active").length;

  /* ── EAT Engine: start + subscribe ── */
  useEffect(() => {
    eatEngine.start();
    const unsubFloor = eatEngine.subscribeFloor(f => setLiveFloor({ tables: f.tables }));
    const unsubEnv   = eatEngine.subscribeEnvironment(env => {
      const matchedMode = ENV_MODES.find(m =>
        m.label.toLowerCase().includes(env.lightingMode.toLowerCase()) ||
        env.activeSceneId === m.id
      );
      if (matchedMode) setEnvMode(matchedMode.id);
    });
    const onConn    = () => setWsConnected(true);
    const onDisconn = () => setWsConnected(false);
    socket.on("connect",    onConn);
    socket.on("disconnect", onDisconn);
    return () => {
      unsubFloor(); unsubEnv();
      socket.off("connect",    onConn);
      socket.off("disconnect", onDisconn);
    };
  }, []);

  /* Live revenue tick */
  useEffect(() => {
    const t = setInterval(() => {
      setRevenue(v => v + Math.floor(Math.random() * 22 + 3));
      if (Math.random() < 0.18) setGuests(g => Math.max(30, g + (Math.random() < 0.55 ? 1 : -1)));
    }, 3500);
    return () => clearInterval(t);
  }, []);

  /* Toast helper */
  const toast = useCallback((msg: string, color = G) => {
    const id = ++toastId;
    setToasts(t => [...t, { id, msg, color }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);

  /* Select table from map */
  const selectTable = useCallback((id: number) => {
    setSelectedTable(id);
    const s = STAFF.find(st => st.tables.includes(id));
    if (s) setSelectedStaff(s.id);
  }, []);

  /* Dismiss alert */
  const dismissAlert = useCallback((id: number) => {
    setAlerts(a => a.filter(x => x.id !== id));
    toast("Alert acknowledged", EM);
  }, [toast]);

  /* Add live alert from staff action */
  const addAlert = useCallback((type: string, text: string, table: number | undefined, urgent: boolean) => {
    const id = alertIdCounter++;
    setAlerts(a => [{ id, type, text, table, urgent, time: now() }, ...a]);
  }, []);

  /* Change mode */
  const changeMode = useCallback((id: string) => {
    const m = ENV_MODES.find(x => x.id === id);
    if (!m) return;
    setEnvMode(id);
    setShowModeMenu(false);
    setModeAnnounce(m.label);
    if (modeTimerRef.current) clearTimeout(modeTimerRef.current);
    modeTimerRef.current = setTimeout(() => setModeAnnounce(null), 3000);
    toast(`Environment switched to: ${m.label}`, G);
  }, [toast]);

  /* Send recommendation to table */
  const sendRec = () => {
    const tbl = selectedTable;
    setRecTable(tbl);
    setTimeout(() => setRecTable(null), 3200);
    if (tbl) {
      toast(`Recommendation sent to Table ${tbl} · Staff: ${activeStaff.name}`, EM);
      addAlert("rec", `Table ${tbl} — AI Recommendation delivered by ${activeStaff.name}`, tbl, false);
    }
  };

  /* Bill actions — wire to real checkout API */
  const sendBill = useCallback(async (tableId: number) => {
    setBillSentMap(m => ({ ...m, [tableId]: true }));
    setBillModal(tableId);
    const items = BILL_ITEMS[tableId] ?? [{ item: "Miscellaneous Items", qty: 1, price: 180 }];
    const req: CheckoutRequest = {
      venueId:     "venue_01",
      tableNumber: String(tableId).padStart(2, "0"),
      items:       items.map(i => ({
        productId: `table_${tableId}_item_${i.item.replace(/\s+/g, "_").toLowerCase()}`,
        name:      i.item,
        qty:       i.qty,
        price:     i.price,
      })),
      successUrl: window.location.href,
      cancelUrl:  window.location.href,
    };
    try {
      const result = await eatEngine.checkout(req);
      if (result.checkoutUrl && !result.checkoutUrl.startsWith("#") && result.checkoutUrl !== "") {
        window.open(result.checkoutUrl, "_blank", "noopener");
        toast(`Stripe checkout opened — Table ${tableId}`, G);
      } else {
        toast(`Bill sent — Table ${tableId} — manual record`, G);
      }
    } catch {
      toast(`Bill recorded manually — Table ${tableId}`, DIM);
    }
    setTimeout(() => setBillSentMap(m => ({ ...m, [tableId]: false })), 4000);
  }, [toast]);

  /* Staff actions */
  const staffAction = (action: "support" | "refill" | "vip", tableId: number | null) => {
    const tbl = tableId ?? 0;
    const labels: Record<string, string> = { support: "Support Requested", refill: "Refill Request", vip: "VIP Attention Required" };
    const text = `Table ${tbl} — ${labels[action]} (${activeStaff.name})`;
    const urgent = action === "vip";
    addAlert(action, text, tbl, urgent);
    toast(`${labels[action]} — Table ${tbl}`, urgent ? RED : G);
  };

  return (
    <div style={{ width: "100%", height: "100%", background: "#050301", overflow: "auto", fontFamily: "'Inter',sans-serif", padding: "8px", boxSizing: "border-box" }}>

      <Toasts toasts={toasts} dismiss={id => setToasts(t => t.filter(x => x.id !== id))} />

      {/* Mode announcement banner */}
      <AnimatePresence>
        {modeAnnounce && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: "fixed", top: 68, left: "50%", transform: "translateX(-50%)", zIndex: 7000, background: `rgba(212,175,55,0.18)`, border: `1px solid ${G}66`, borderRadius: 10, padding: "12px 28px", backdropFilter: "blur(20px)", textAlign: "center", pointerEvents: "none" }}>
            <div style={{ fontSize: 9, color: DIM, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 2 }}>Environment Mode Activated</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: G, fontFamily: "'Cormorant Garamond',serif" }}>{modeAnnounce}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bill modal */}
      <AnimatePresence>
        {billModal !== null && (
          <BillModal tableId={billModal} onClose={() => setBillModal(null)}
            onSendToPOS={() => toast(`Bill sent to POS — Table ${billModal} — Total $${(BILL_ITEMS[billModal] ?? []).reduce((s, i) => s + i.qty * i.price, 0) + 1}`, EM)} />
        )}
      </AnimatePresence>

      {/* Full report modal */}
      <AnimatePresence>
        {showReport && <ReportModal revenue={revenue} onClose={() => setShowReport(false)} />}
      </AnimatePresence>

      {/* ── TOP METRICS BAR ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", padding: "10px 16px", marginBottom: 8, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, backdropFilter: "blur(20px)", flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: G, letterSpacing: "0.16em", fontFamily: "'Cormorant Garamond',serif" }}>E.A.T SYSTEM</div>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: wsConnected ? EM : DIM,
              boxShadow: wsConnected ? `0 0 6px ${EM}` : "none",
              flexShrink: 0,
            }} title={wsConnected ? "WebSocket Live" : "Polling"} />
          </div>
          <div style={{ fontSize: 8, color: DIM, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            {wsConnected ? "Live · Connected" : "Environment · Asset · Transaction"}
          </div>
        </div>
        <div style={{ width: 1, height: 36, background: BORDER, flexShrink: 0 }} />
        <Metric label="Lounge Revenue (Live)" value={`$${revenue.toLocaleString()}`} sub="+13% vs last hour" />
        <div style={{ width: 1, height: 36, background: BORDER, flexShrink: 0 }} />
        <Metric label="Active Guests" value={String(guests)} sub="+4 last 30 min" color={CREAM} />
        <div style={{ width: 1, height: 36, background: BORDER, flexShrink: 0 }} />
        <Metric label="Avg. Session Value" value="$128" sub="+$12 vs avg" color={CREAM} />
        <div style={{ width: 1, height: 36, background: BORDER, flexShrink: 0 }} />
        <Metric label="Experience Conversion" value="32%" sub="+12% vs last hour" color={EM} />
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "rgba(212,175,55,0.10)", border: `1px solid ${G}44`, borderRadius: 8, flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(212,175,55,0.22)", border: `1px solid ${G}66`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14, color: G }}>★</span>
          </div>
          <div>
            <div style={{ fontSize: 9, color: DIM, letterSpacing: "0.14em", textTransform: "uppercase" }}>Executive Mode</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: G }}>The Vault Lounge</div>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridAutoRows: "auto", gap: 8 }}>

        {/* ══ 1: LIVE FLOOR INTELLIGENCE ══ */}
        <Panel num="1" title="Live Floor Intelligence" sub="Real-Time Venue Overview" style={{ gridColumn: "1", gridRow: "1 / 3" }}>
          <div style={{ padding: "8px 10px 4px", display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
            {[
              { label: "Energy Level",  value: "72%",       sub: "Elevated"      },
              { label: "Crowd Density", value: "Medium",    sub: "52% Capacity"  },
              { label: "Atmosphere",    value: mode.energy, sub: mode.lighting   },
              { label: "Noise Level",   value: "Low",       sub: "−49 dB"        },
              { label: "Air Quality",   value: "Excellent", sub: "AQI 22"        },
              { label: "Temperature",   value: "72°F",      sub: "Comfortable"   },
              { label: "Smoke Density", value: "Balanced",  sub: "Optimal Range" },
            ].map(r => (
              <div key={r.label} style={{ minWidth: 80 }}>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.32)", letterSpacing: "0.10em", textTransform: "uppercase" }}>{r.label}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: CREAM, marginTop: 1 }}>{r.value}</div>
                <div style={{ fontSize: 8, color: DIM }}>{r.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "0 4px", flex: 1, minHeight: 220 }}>
            <VenueMap selectedTable={selectedTable} onSelectTable={selectTable} staffTables={activeStaff.tables} />
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, padding: "8px 12px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", background: "rgba(212,175,55,0.04)", flexShrink: 0 }}>
            {[
              { icon: "☀", label: "LIGHTING",    val: mode.lighting },
              { icon: "♪", label: "MUSIC",       val: mode.music    },
              { icon: "✦", label: "SCENT",       val: mode.scent    },
              { icon: "◈", label: "AMBIANCE",    val: mode.energy   },
              { icon: "★", label: "VIP MODE",    val: "Enabled"     },
              { icon: "⚡", label: "ADAPTIVE AI", val: "On"          },
            ].map(ic => (
              <div key={ic.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, minWidth: 46 }}>
                <span style={{ fontSize: 13, color: G }}>{ic.icon}</span>
                <span style={{ fontSize: 7, color: DIM, letterSpacing: "0.10em", textTransform: "uppercase" }}>{ic.label}</span>
                <span style={{ fontSize: 8, color: CREAM_DIM }}>{ic.val}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* ══ 2: ENVIRONMENT COMMAND ══ */}
        <Panel num="2" title="Environment Command" sub="Atmosphere & Experience Control" style={{ gridColumn: "2" }}>
          <div style={{ padding: "10px 12px" }}>
            <div style={{ background: "rgba(212,175,55,0.10)", border: `1px solid ${G}44`, borderRadius: 8, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 8, color: DIM, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 2 }}>Active Mode</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: G }}>{mode.label}</div>
                <div style={{ fontSize: 9, color: CREAM_DIM, marginTop: 2 }}>{mode.energy}</div>
              </div>
              <div style={{ position: "relative" }}>
                <Btn label="Change Mode" onClick={() => setShowModeMenu(m => !m)} active={showModeMenu} />
                <AnimatePresence>
                  {showModeMenu && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      style={{ position: "absolute", right: 0, top: "110%", zIndex: 200, width: 220, background: "#0A0602", border: `1px solid ${G}55`, borderRadius: 8, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.90)" }}>
                      {ENV_MODES.map(m => (
                        <div key={m.id} onPointerDown={() => changeMode(m.id)}
                          style={{ padding: "10px 14px", cursor: "pointer", background: envMode === m.id ? "rgba(212,175,55,0.14)" : "transparent", borderBottom: `1px solid ${BORDER}`, borderLeft: envMode === m.id ? `2px solid ${G}` : "2px solid transparent" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: envMode === m.id ? G : CREAM, letterSpacing: "0.06em" }}>{m.label}</div>
                          <div style={{ fontSize: 8, color: DIM, marginTop: 2 }}>{m.energy}</div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
              {[
                { icon: "☀", label: "Lighting", val: mode.lighting },
                { icon: "♪", label: "Music",    val: mode.music    },
                { icon: "✦", label: "Scent",    val: mode.scent    },
                { icon: "◈", label: "Ambiance", val: mode.energy   },
              ].map(ic => (
                <div key={ic.label} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, marginBottom: 3 }}>{ic.icon}</div>
                  <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em" }}>{ic.label}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: CREAM, marginTop: 2 }}>{ic.val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { label: "Energy Flow",   val: "Positive",    sub: "+14%" },
                { label: "Mood Profile",  val: "Comfortable", sub: ""     },
                { label: "Special Event", val: "None",        sub: "—"    },
                { label: "Next Adapt",    val: "10:30 PM",    sub: "Auto" },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 8px" }}>
                  <div style={{ fontSize: 7, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: CREAM }}>{s.val}</div>
                  {s.sub && <div style={{ fontSize: 8, color: EM }}>{s.sub}</div>}
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* ══ 3: ASSET INTELLIGENCE ══ */}
        <Panel num="3" title="Asset Intelligence" sub="Inventory & Experience Assets" style={{ gridColumn: "3" }}>
          <div style={{ padding: "10px 12px" }}>
            {/* View toggle */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <Btn label="Overview" onClick={() => setAssetView("default")} active={assetView === "default"} />
              <Btn label="View Pairings" onClick={() => setAssetView("pairings")} active={assetView === "pairings"} />
            </div>

            <AnimatePresence mode="wait">
              {assetView === "default" ? (
                <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 5 }}>Top Cigar</div>
                      <div style={{ width: "100%", height: 52, background: "linear-gradient(135deg, rgba(100,60,20,0.60), rgba(60,35,10,0.90))", borderRadius: 6, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: "76%", height: 10, background: "linear-gradient(90deg, #4A2810, #8B5020 40%, #6B3A15)", borderRadius: 5 }} />
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: CREAM, lineHeight: 1.2 }}>Padron 1964<br/>Anniversary Series</div>
                      <div style={{ fontSize: 8, color: DIM, marginTop: 3 }}>Inventory: 18 Boxes</div>
                      <div style={{ fontSize: 9, color: EM, marginTop: 2 }}>↑ 24% Popularity</div>
                    </div>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 5 }}>Top Spirit</div>
                      <div style={{ width: "100%", height: 52, background: "linear-gradient(135deg, rgba(40,25,10,0.80), rgba(20,12,4,0.95))", borderRadius: 6, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 14, height: 42, background: "linear-gradient(180deg, rgba(160,100,20,0.80), rgba(80,45,8,0.90))", borderRadius: "6px 6px 2px 2px" }} />
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: CREAM, lineHeight: 1.2 }}>Old Forester<br/>1920</div>
                      <div style={{ fontSize: 8, color: DIM, marginTop: 3 }}>Sales: 7 btls/day</div>
                      <div style={{ fontSize: 9, color: EM, marginTop: 2 }}>↑ +34%</div>
                    </div>
                    <div style={{ width: 70, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center", marginBottom: 5 }}>Pairing<br/>Success</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: G }}>91%</div>
                      <div style={{ fontSize: 8, color: EM, marginTop: 2, textAlign: "center" }}>High Match</div>
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 6 }}>Reserve Inventory</div>
                    {[{ name: "Pappy Van Winkle 23", qty: 12 }, { name: "Cohiba Behike 54", qty: 8 }, { name: "Macallan 18", qty: 15 }, { name: "Fuente OpusX", qty: 20 }].map(r => (
                      <div key={r.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: CREAM_DIM }}>{r.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: G }}>{r.qty}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="pairings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Featured Pairings — Live Scores</div>
                  {FEATURED_PAIRINGS.map(p => (
                    <div key={p.cigar} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px 10px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: CREAM }}>{p.cigar}</span>
                          <span style={{ fontSize: 7, background: "rgba(212,175,55,0.18)", color: G, border: `1px solid ${G}44`, borderRadius: 3, padding: "1px 5px", letterSpacing: "0.10em" }}>{p.tag}</span>
                        </div>
                        <div style={{ fontSize: 9, color: DIM }}>+ {p.spirit}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: G }}>{p.score}%</div>
                        <div style={{ height: 3, width: 40, background: "rgba(255,255,255,0.10)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${p.score}%`, background: G, borderRadius: 2 }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Panel>

        {/* ══ 4: TRANSACTION INTELLIGENCE ══ */}
        <Panel num="4" title="Transaction Intelligence" sub="Live Revenue & Engagement Flow" style={{ gridColumn: "1" }}>
          <div style={{ padding: "10px 12px" }}>
            <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
              {[
                { label: "Live Revenue",  val: `$${revenue.toLocaleString()}`, color: G,    sub: "This Hour" },
                { label: "Transactions",  val: "38",                           color: CREAM, sub: "+4 this hour" },
                { label: "Avg. Ticket",   val: "$112",                         color: CREAM, sub: "+10%" },
              ].map(k => (
                <div key={k.label}>
                  <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em" }}>{k.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: k.color }}>{k.val}</div>
                  <div style={{ fontSize: 8, color: EM }}>{k.sub}</div>
                </div>
              ))}
            </div>
            {[
              { table: "Table 12",    items: "Padron 1964 + Old Forester 1920",     amt: "$780", id: 12 },
              { table: "VIP Lounge 2",items: "Cohiba Behike + Macallan 18",          amt: "$450", id: 2  },
              { table: "Table 7",     items: "Arturo Fuente + Woodford Reserve",     amt: "$340", id: 7  },
              { table: "Table 3",     items: "Liga Privada + Buffalo Trace",         amt: "$180", id: 3  },
            ].map(r => (
              <div key={r.table} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 8px", marginBottom: 4, background: selectedTable === r.id ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.03)", border: `1px solid ${selectedTable === r.id ? `${G}44` : BORDER}`, borderRadius: 6, cursor: "pointer" }} onPointerDown={() => selectTable(r.id)}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: CREAM }}>{r.table}</div>
                  <div style={{ fontSize: 8, color: DIM }}>{r.items}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: G }}>{r.amt}</span>
                  <motion.button type="button" onPointerDown={e => { e.stopPropagation(); void sendBill(r.id); }} whileTap={{ scale: 0.92 }}
                    style={{ border: `1px solid ${billSentMap[r.id] ? `${EM}88` : `${G}44`}`, borderRadius: 5, padding: "4px 8px", background: billSentMap[r.id] ? "rgba(50,180,90,0.16)" : "rgba(212,175,55,0.08)", cursor: "pointer", fontSize: 8, fontWeight: 700, color: billSentMap[r.id] ? EM : DIM, fontFamily: "'Inter',sans-serif", letterSpacing: "0.10em", textTransform: "uppercase" }}>
                    {billSentMap[r.id] ? "✓" : "BILL"}
                  </motion.button>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 6, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px 10px" }}>
              {[
                { label: "Cigars",      pct: 42, color: G         },
                { label: "Spirits",     pct: 38, color: "#C87028" },
                { label: "Pairings",    pct: 14, color: "#6A9FD8" },
                { label: "Accessories", pct: 6,  color: "#8B6B4A" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 9, color: CREAM_DIM, width: 62 }}>{s.label}</div>
                  <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
                    <div style={{ width: `${s.pct}%`, height: "100%", background: s.color, borderRadius: 3, boxShadow: `0 0 6px ${s.color}55` }} />
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: s.color, width: 24, textAlign: "right" }}>{s.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* ══ 5: STAFF HUD ══ */}
        <Panel num="5" title="Staff HUD" sub="Team Intelligence & Service Operations" style={{ gridColumn: "2" }}>
          <div style={{ padding: "10px 12px", display: "flex", gap: 10, height: "100%", boxSizing: "border-box" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, width: 88, flexShrink: 0 }}>
              {STAFF.map(s => {
                const sel = selectedStaff === s.id;
                return (
                  <div key={s.id} onPointerDown={() => { setSelectedStaff(s.id); if (s.tables.length) setSelectedTable(s.tables[0]); }}
                    style={{ background: sel ? "rgba(212,175,55,0.16)" : "rgba(255,255,255,0.04)", border: `1px solid ${sel ? `${G}66` : BORDER}`, borderLeft: `2px solid ${sel ? G : "transparent"}`, borderRadius: 7, padding: "7px 8px", cursor: "pointer" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(212,175,55,0.20)", border: `1px solid ${G}44`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: G }}>{s.name[0]}</span>
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: CREAM }}>{s.name}</div>
                    <div style={{ fontSize: 7, color: DIM }}>{s.role}</div>
                    <div style={{ fontSize: 8, color: EM, marginTop: 2 }}>{s.perf}%</div>
                  </div>
                );
              })}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, overflow: "hidden" }}>
              <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px 10px", flexShrink: 0 }}>
                <div style={{ fontSize: 9, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em" }}>{activeStaff.role}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: G }}>{activeStaff.name}</div>
                <div style={{ fontSize: 8, color: CREAM_DIM, marginTop: 2 }}>Tables: {activeStaff.tables.join(", ")} · Performance: {activeStaff.perf}%</div>
              </div>
              {tableGuest ? (
                <>
                  <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${G}44`, borderRadius: 7, padding: "8px 10px", flexShrink: 0 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: G, marginBottom: 3 }}>TABLE {selectedTable}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: CREAM }}>VIP Guest: {tableGuest.name}</div>
                    <div style={{ fontSize: 9, color: DIM }}>Loyalty: {tableGuest.loyalty}</div>
                    <div style={{ fontSize: 9, color: CREAM_DIM, marginTop: 3 }}>Spend: {tableGuest.spend}</div>
                    <div style={{ fontSize: 9, color: CREAM_DIM }}>Freq: {tableGuest.freq}</div>
                    <div style={{ marginTop: 5 }}>
                      <div style={{ fontSize: 7, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 2 }}>Preferences</div>
                      {tableGuest.prefs.map(p => <div key={p} style={{ fontSize: 9, color: CREAM_DIM }}>• {p}</div>)}
                    </div>
                  </div>
                  <div style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${G}44`, borderRadius: 7, padding: "8px 10px", flex: 1, overflow: "hidden" }}>
                    <div style={{ fontSize: 7, color: G, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 3 }}>AI Recommendation</div>
                    <div style={{ fontSize: 10, color: CREAM, lineHeight: 1.5 }}>{tableGuest.rec}</div>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <Btn label="Support"  onClick={() => staffAction("support", selectedTable)} />
                    <Btn label="Refill"   onClick={() => staffAction("refill",  selectedTable)} />
                    <Btn label="VIP Attn" onClick={() => staffAction("vip",     selectedTable)} danger />
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ color: DIM, fontSize: 11, textAlign: "center" }}>Select a table<br/>from the floor map</div>
                </div>
              )}
            </div>
          </div>
        </Panel>

        {/* ══ 6: AI PAIRING ENGINE ══ */}
        <Panel num="6" title="AI Pairing Engine" sub="AI Sommelier & Flavor Intelligence" style={{ gridColumn: "3" }}>
          <div style={{ padding: "10px 12px" }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Flavor Match</div>
                <RadarChart vals={[78, 65, 55, 42, 70, 82, 90, 60]} />
                <div style={{ textAlign: "center", fontSize: 22, fontWeight: 900, color: G, marginTop: 0 }}>96%</div>
                <div style={{ textAlign: "center", fontSize: 8, color: EM }}>Exceptional Match</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 5 }}>Recommended Pairing</div>
                <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: CREAM }}>Plasencia Alma Fuerte</div>
                  <div style={{ fontSize: 9, color: DIM }}>+ Blanton's Single Barrel</div>
                  <div style={{ fontSize: 8, color: EM, marginTop: 4 }}>Stage 2 — Exploring Flavors</div>
                </div>
                {/* Send recommendation — wired to table */}
                <motion.button type="button" onPointerDown={sendRec} whileTap={{ scale: 0.95 }}
                  style={{ width: "100%", padding: "9px", borderRadius: 6, cursor: "pointer", background: recTable !== null ? "rgba(50,180,90,0.22)" : "rgba(212,175,55,0.18)", border: `1px solid ${recTable !== null ? `${EM}88` : `${G}66`}`, color: recTable !== null ? EM : G, fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif", transition: "all 0.25s", marginBottom: 6 }}>
                  {recTable !== null ? `✓ SENT TO TABLE ${recTable}` : "SEND RECOMMENDATION"}
                </motion.button>
                <Btn label={showWhyPairing ? "Hide Explanation" : "Why This Pairing?"} onClick={() => setShowWhyPairing(v => !v)} active={showWhyPairing} />
              </div>
            </div>

            {/* Why pairing explanation */}
            <AnimatePresence>
              {showWhyPairing && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "10px 12px", marginBottom: 8, overflow: "hidden" }}>
                  <div style={{ fontSize: 8, color: G, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>AI Flavor Rationale</div>
                  {WHY_PAIRING.trim().split("\n").filter(Boolean).map((line, i) => (
                    <p key={i} style={{ fontSize: 9, color: CREAM_DIM, lineHeight: 1.6, margin: "0 0 6px" }}>{line.trim()}</p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Taste evolution */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px 10px" }}>
              <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 4 }}>Guest Taste Evolution — 90 Days</div>
              <svg viewBox="0 0 260 38" style={{ width: "100%", height: 38 }}>
                <defs>
                  <linearGradient id="te" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={G} stopOpacity="0.30" />
                    <stop offset="100%" stopColor={G} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path d="M0,34 C30,29 50,19 80,17 C110,15 130,21 160,14 C190,7 220,4 260,3 L260,38 L0,38 Z" fill="url(#te)" />
                <path d="M0,34 C30,29 50,19 80,17 C110,15 130,21 160,14 C190,7 220,4 260,3" fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div style={{ fontSize: 8, color: CREAM_DIM, marginTop: 2 }}>Trends: Rich & Earthy · Spice Forward · Oaky & Warm</div>
            </div>
          </div>
        </Panel>

        {/* ══ 7: LOUNGE OPERATIONS ══ */}
        <Panel num="7" title="Lounge Operations" sub="Live Operations & Alerts" style={{ gridColumn: "1" }}>
          <div style={{ padding: "10px 12px" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[
                { label: "Active Tables",  value: activeTables,  sub: "of 20",          color: G },
                { label: "VIP Tables",     value: 3,             sub: "High Priority",   color: G },
                { label: "Wait Time",      value: "8 min",       sub: "Average",         color: CREAM },
                { label: "Live Alerts",    value: alerts.length, sub: alerts.length > 0 ? "Needs Attention" : "All Clear", color: alerts.length > 0 ? RED : EM },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 7, color: DIM, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                  <div style={{ fontSize: 7, color: CREAM_DIM }}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>Live Alerts</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 160, overflowY: "auto" }}>
              <AnimatePresence>
                {alerts.map(a => (
                  <motion.div key={a.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 6, background: a.urgent ? "rgba(200,74,74,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${a.urgent ? "rgba(200,74,74,0.35)" : BORDER}`, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.urgent ? RED : EM, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 10, color: a.urgent ? "#F0A0A0" : CREAM_DIM }}>{a.text}</div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.28)" }}>{a.time}</div>
                      </div>
                    </div>
                    <Btn label="ACK" onClick={() => dismissAlert(a.id)} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {alerts.length === 0 && (
                <div style={{ textAlign: "center", padding: "12px", color: EM, fontSize: 10 }}>✓ All alerts resolved</div>
              )}
            </div>
            <div style={{ marginTop: 8 }}>
              <Btn label="Reset Demo Alerts" onClick={() => setAlerts(INIT_ALERTS)} full />
            </div>
          </div>
        </Panel>

        {/* ══ 8: EXECUTIVE COMMAND ══ */}
        <Panel num="8" title="Executive Command" sub="Business Performance & Strategic Intelligence" style={{ gridColumn: "2 / 4" }}>
          <div style={{ padding: "10px 14px", display: "flex", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 290, flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { label: "Total Revenue", value: `$${revenue.toLocaleString()}`, sub: "+13%", color: G    },
                  { label: "Gross Profit",  value: "$17,820",                      sub: "+19%", color: G    },
                ].map(k => (
                  <div key={k.label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "10px" }}>
                    <div style={{ fontSize: 7, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{k.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 9, color: EM }}>{k.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { label: "Guest Engagement", value: "82%",  sub: "High",       color: CREAM  },
                  { label: "Loyalty Growth",   value: "+24%", sub: "This Week",  color: EM     },
                  { label: "Return Rate",      value: "68%",  sub: "+11%",       color: CREAM  },
                ].map(k => (
                  <div key={k.label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px 6px" }}>
                    <div style={{ fontSize: 7, color: DIM, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{k.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 8, color: EM }}>{k.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px 10px", flex: 1 }}>
                <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 4 }}>Revenue Performance</div>
                <RevenueChart current={revenue} />
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 2 }}>AI Insights</div>
              {[
                { icon: "▲", text: "Increase VIP lounge lighting — high conversion opportunity",  color: G         },
                { icon: "◆", text: "Old Forester pairing is driving highest guest engagement",    color: "#C87028" },
                { icon: "●", text: "Weekend VIP reservations predicted to increase 24%",          color: EM        },
              ].map((ins, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "10px 12px", borderLeft: `2px solid ${ins.color}` }}>
                  <span style={{ fontSize: 12, color: ins.color, flexShrink: 0, marginTop: 1 }}>{ins.icon}</span>
                  <span style={{ fontSize: 11, color: CREAM_DIM, lineHeight: 1.45 }}>{ins.text}</span>
                </div>
              ))}
              <div style={{ marginTop: "auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${G}44`, borderRadius: 7, padding: "10px 14px", flex: 1 }}>
                  <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em" }}>Revenue Forecast</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: G, marginTop: 3 }}>${(revenue * 1.16).toLocaleString("en", { maximumFractionDigits: 0 })}</div>
                  <div style={{ fontSize: 8, color: CREAM_DIM }}>Projected end-of-night</div>
                </div>
                <Btn label="View Full Report" onClick={() => setShowReport(true)} active />
              </div>
            </div>
          </div>
        </Panel>

      </div>
    </div>
  );
}
