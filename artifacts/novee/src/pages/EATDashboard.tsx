import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GOLD = "#D4AF37";
const G = GOLD;
const DIM = "rgba(212,175,55,0.55)";
const CREAM = "rgba(240,232,212,0.88)";
const CREAM_DIM = "rgba(240,232,212,0.45)";
const PANEL = "rgba(10,7,3,0.82)";
const BORDER = "rgba(212,175,55,0.18)";
const EMERALD = "#32B45A";

/* ─── shared panel wrapper ─── */
function Panel({ num, title, sub, children, style }: {
  num: string; title: string; sub?: string;
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      background: PANEL, border: `1px solid ${BORDER}`,
      borderRadius: 10, display: "flex", flexDirection: "column",
      overflow: "hidden", backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      ...style,
    }}>
      <div style={{
        padding: "10px 14px 8px", borderBottom: `1px solid ${BORDER}`,
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        background: "rgba(212,175,55,0.05)",
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: "rgba(212,175,55,0.18)", border: `1px solid ${G}66`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: G, fontFamily: "'Inter',sans-serif" }}>{num}</span>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: CREAM, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>{title}</div>
          {sub && <div style={{ fontSize: 9, color: DIM, letterSpacing: "0.10em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>{sub}</div>}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: EMERALD, boxShadow: `0 0 6px ${EMERALD}` }} />
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

/* ─── Metric chip ─── */
function Metric({ label, value, sub, color = G }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 9, letterSpacing: "0.20em", color: "rgba(255,255,255,0.38)", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "'Inter',sans-serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: EMERALD, fontFamily: "'Inter',sans-serif", letterSpacing: "0.06em" }}>{sub}</div>}
    </div>
  );
}

/* ─── Ghost button ─── */
function Btn({ label, onClick, active = false, danger = false, full = false }: {
  label: string; onClick: () => void; active?: boolean; danger?: boolean; full?: boolean;
}) {
  return (
    <motion.button type="button" onPointerDown={onClick} whileTap={{ scale: 0.94 }}
      style={{
        border: `1px solid ${danger ? "#C84A4A88" : active ? `${G}88` : `${G}44`}`,
        borderRadius: 6, padding: "7px 14px",
        background: danger ? "rgba(200,74,74,0.14)" : active ? "rgba(212,175,55,0.18)" : "rgba(212,175,55,0.08)",
        cursor: "pointer", fontSize: 10, fontWeight: 800, letterSpacing: "0.16em",
        color: danger ? "#F07070" : active ? G : DIM,
        textTransform: "uppercase", fontFamily: "'Inter',sans-serif",
        boxShadow: active ? `0 0 10px ${G}33` : "none",
        width: full ? "100%" : undefined, flexShrink: 0,
      }}>{label}</motion.button>
  );
}

/* ─── VENUE MAP SVG ─── */
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

function VenueMap({ selectedTable, onSelectTable }: { selectedTable: number | null; onSelectTable: (id: number) => void }) {
  return (
    <svg viewBox="0 0 560 360" style={{ width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="hm" cx="60%" cy="40%" r="55%">
          <stop offset="0%"   stopColor="#D4AF37" stopOpacity="0.22" />
          <stop offset="40%"  stopColor="#C87028" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000"    stopOpacity="0" />
        </radialGradient>
        <filter id="glow-t"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glow-v"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      {/* Floor */}
      <rect x="60" y="55" width="460" height="288" rx="12" fill="rgba(14,10,4,0.95)" stroke={BORDER} strokeWidth="1" />

      {/* VIP zone */}
      <rect x="380" y="64" width="130" height="148" rx="8" fill="rgba(212,175,55,0.06)" stroke={`${G}44`} strokeWidth="1" strokeDasharray="4 3" />
      <text x="398" y="80" fill={DIM} fontSize="8" fontFamily="Inter" fontWeight="700" letterSpacing="2">VIP LOUNGE</text>
      <text x="398" y="91" fill={`${G}55`} fontSize="7" fontFamily="Inter">High Activity</text>

      {/* Bar */}
      <rect x="64" y="59" width="72" height="278" rx="8" fill="rgba(10,6,2,0.90)" stroke="rgba(212,175,55,0.12)" strokeWidth="1" />
      <text x="100" y="210" fill={DIM} fontSize="8" fontFamily="Inter" fontWeight="700" letterSpacing="2" transform="rotate(-90,100,210)">BAR</text>

      {/* Heat overlay */}
      <rect x="60" y="55" width="460" height="288" rx="12" fill="url(#hm)" />

      {/* Tables */}
      {TABLES.map(t => {
        const active = t.status === "active";
        const isVip  = t.vip;
        const sel    = selectedTable === t.id;
        const col    = isVip ? G : active ? "#C8962A" : "rgba(255,255,255,0.20)";
        return (
          <g key={t.id} onClick={() => active && onSelectTable(t.id)} style={{ cursor: active ? "pointer" : "default" }}>
            {active && (
              <circle cx={t.x} cy={t.y} r={isVip ? 22 : 18} fill={isVip ? `${G}22` : "rgba(200,150,42,0.15)"} filter={`url(#${isVip ? "glow-v" : "glow-t"})`}>
                <animate attributeName="r" values={isVip ? "22;26;22" : "18;21;18"} dur={isVip ? "1.8s" : "2.4s"} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;1;0.6" dur={isVip ? "1.8s" : "2.4s"} repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={t.x} cy={t.y} r={14}
              fill={active ? (isVip ? "rgba(212,175,55,0.28)" : "rgba(180,120,30,0.22)") : "rgba(40,30,15,0.60)"}
              stroke={sel ? G : col} strokeWidth={sel ? 2 : 1} />
            <text x={t.x} y={t.y + 1} textAnchor="middle" dominantBaseline="middle"
              fill={active ? (isVip ? G : "#F0C060") : "rgba(255,255,255,0.28)"}
              fontSize="10" fontWeight="800" fontFamily="Inter">{t.id}</text>
            {active && t.guests > 0 && (
              <text x={t.x} y={t.y + 22} textAnchor="middle" fill={DIM} fontSize="7" fontFamily="Inter">{t.guests}g</text>
            )}
          </g>
        );
      })}

      {/* Legend */}
      <g transform="translate(490,270)">
        <text x="0" y="-4" fill={DIM} fontSize="7" fontFamily="Inter">High</text>
        <rect x="0" y="0" width="12" height="60" rx="3" fill="url(#hm)" stroke={BORDER} strokeWidth="0.5" />
        <text x="0" y="74" fill={DIM} fontSize="7" fontFamily="Inter">Low</text>
      </g>
    </svg>
  );
}

/* ─── RADAR CHART ─── */
function RadarChart({ vals, color = G }: { vals: number[]; color?: string }) {
  const N = vals.length; const R = 52; const CX = 70; const CY = 70;
  const ang = (i: number) => (i * 2 * Math.PI / N) - Math.PI / 2;
  const pt  = (i: number, r: number) => ({ x: CX + r * Math.cos(ang(i)), y: CY + r * Math.sin(ang(i)) });
  const poly = (pts: { x: number; y: number }[]) => pts.map(p => `${p.x},${p.y}`).join(" ");
  const axes = ["EARTH","WOOD","CREAM","SWEET","NUT","COCOA","PEPPER","SPICE"];
  return (
    <svg viewBox="0 0 140 140" width="140" height="140">
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} points={poly(Array.from({ length: N }, (_, i) => pt(i, R * f)))}
          fill="none" stroke={`rgba(212,175,55,${f === 1 ? 0.25 : 0.10})`} strokeWidth="0.8" />
      ))}
      {Array.from({ length: N }, (_, i) => {
        const p = pt(i, R);
        return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke={`${G}22`} strokeWidth="0.8" />;
      })}
      <polygon points={poly(vals.map((v, i) => pt(i, R * v / 100)))}
        fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      {axes.map((a, i) => {
        const p = pt(i, R + 12);
        return <text key={a} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
          fill={DIM} fontSize="6.5" fontFamily="Inter" fontWeight="700">{a}</text>;
      })}
    </svg>
  );
}

/* ─── REVENUE LINE CHART ─── */
function RevenueChart({ current }: { current: number }) {
  const base = [4200, 5800, 7100, 9200, 11400, 13800, 16200, 19500, 22100, 24800, 26900];
  const pts  = [...base, current];
  const max  = 34000; const W = 320; const H = 64;
  const x    = (i: number) => (i / (pts.length - 1)) * W;
  const y    = (v: number) => H - (v / max) * H;
  const d    = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const fill = `${d} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} style={{ width: "100%", height: 78 }}>
      <defs>
        <linearGradient id="rv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={G} stopOpacity="0.28" />
          <stop offset="100%" stopColor={G} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#rv)" />
      <path d={d} fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(pts.length - 1)} cy={y(current)} r="4" fill={G} />
      {["12a","2a","4a","6a","8a","10a","12p","2p","4p","6p","8p","Now"].map((l, i) => (
        <text key={l} x={x(i)} y={H + 12} textAnchor="middle" fill="rgba(212,175,55,0.38)" fontSize="7" fontFamily="Inter">{l}</text>
      ))}
    </svg>
  );
}

/* ─── ENVIRONMENT MODES ─── */
const ENV_MODES = [
  { id: "jazz",    label: "Jazz Lounge Mode",         lighting: "Amber Low",    music: "Smooth Jazz", scent: "Cedar & Vanilla", energy: "Warm & Relaxed" },
  { id: "vip",     label: "VIP Bourbon Night",         lighting: "Warm Dim",     music: "Neo-Soul",    scent: "Aged Oak",        energy: "Exclusive"      },
  { id: "energy",  label: "High Energy Event",         lighting: "Full Warm",    music: "Upbeat Jazz", scent: "Citrus & Cedar",  energy: "Electric"       },
  { id: "late",    label: "Late Night Sophisticated",  lighting: "Deep Low",     music: "Ambient",     scent: "Sandalwood",      energy: "Intimate"       },
  { id: "private", label: "Private Reserve Session",   lighting: "Candlelight",  music: "Classical",   scent: "Tobacco Flower",  energy: "Ultra-Private"  },
];

/* ─── STAFF ─── */
const STAFF = [
  { id: "daniel", name: "Daniel", role: "Floor Manager",    tables: [12, 8, 4],  perf: 94 },
  { id: "maya",   name: "Maya",   role: "Sommelier",        tables: [2, 5, 9],   perf: 88 },
  { id: "alex",   name: "Alex",   role: "Cigar Specialist", tables: [1, 7],      perf: 91 },
  { id: "jordan", name: "Jordan", role: "Senior Server",    tables: [3, 6, 11],  perf: 79 },
  { id: "casey",  name: "Casey",  role: "Server",           tables: [10, 13],    perf: 82 },
];

const TABLE_GUESTS: Record<number, { name: string; loyalty: string; spend: string; freq: string; prefs: string[]; rec: string }> = {
  12: { name: "John D.",   loyalty: "Platinum", spend: "$1,200 (Today)", freq: "High — Returning",   prefs: ["Medium–Full Bodied", "Bónnon Forward"],   rec: "Try our Pappy Van Winkle 15 — Perfect match for your current cigar profile." },
  8:  { name: "Sarah K.",  loyalty: "Gold",     spend: "$380 (Today)",   freq: "Medium — 3rd Visit",  prefs: ["Light–Medium", "Floral Notes"],            rec: "Cohiba Siglo II pairs beautifully with your Chardonnay selection." },
  4:  { name: "Marcus B.", loyalty: "Platinum", spend: "$940 (Today)",   freq: "High — Weekly",       prefs: ["Full Bodied", "Earthy & Rich"],            rec: "Arturo Fuente Opus X with Hennessy XO — premium reserve pairing." },
  2:  { name: "Elena R.",  loyalty: "Silver",   spend: "$210 (Today)",   freq: "Low — 1st Visit",     prefs: ["Light", "Citrus Tones"],                  rec: "Start with a Romeo y Julieta No. 2 — approachable entry into luxury cigars." },
  5:  { name: "Thomas W.", loyalty: "Gold",     spend: "$540 (Today)",   freq: "Medium — 2nd Visit",  prefs: ["Medium", "Woody Notes"],                  rec: "Cohiba Behike 54 pairs well with your Macallan 18 preference." },
  9:  { name: "Group: V",  loyalty: "Platinum", spend: "$580 (Today)",   freq: "High — Event",        prefs: ["Full Bodied", "Celebration Mood"],        rec: "Opus X BBMF with Dom Pérignon — perfect for a celebration." },
  1:  { name: "Leon G.",   loyalty: "Bronze",   spend: "$120 (Today)",   freq: "Low — 1st Visit",     prefs: ["Light", "Mild"],                          rec: "Montecristo No. 4 — an excellent introduction to premium cigars." },
  7:  { name: "David C.",  loyalty: "Gold",     spend: "$440 (Today)",   freq: "High — Weekly",       prefs: ["Medium–Full", "Earthy"],                  rec: "Arturo Fuente Anejo pairs excellently with Woodford Double Oaked." },
  11: { name: "Kim S.",    loyalty: "Silver",   spend: "$270 (Today)",   freq: "Medium — 2nd Visit",  prefs: ["Medium", "Smooth"],                       rec: "Davidoff Millennium Blend with Clase Azul Reposado." },
  13: { name: "Group: L",  loyalty: "Gold",     spend: "$310 (Today)",   freq: "Medium — Monthly",    prefs: ["Varied", "Mixed Preferences"],            rec: "Our pairing sampler board covers all taste profiles in this group." },
};

/* ─── ALERTS ─── */
const INIT_ALERTS = [
  { id: 1, type: "vip",     text: "VIP Lounge 2 — Request: More Water", table: 2,  urgent: true  },
  { id: 2, type: "refill",  text: "Table 9 — Refill Request",           table: 9,  urgent: false },
  { id: 3, type: "billing", text: "Table 14 — Bill Request",            table: 14, urgent: false },
];

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function EATDashboard() {
  const [envMode,       setEnvMode]      = useState("jazz");
  const [selectedTable, setSelectedTable] = useState<number | null>(12);
  const [selectedStaff, setSelectedStaff] = useState("daniel");
  const [alerts,        setAlerts]        = useState(INIT_ALERTS);
  const [recSent,       setRecSent]       = useState(false);
  const [revenue,       setRevenue]       = useState(28450);
  const [guests,        setGuests]        = useState(46);
  const [showModeMenu,  setShowModeMenu]  = useState(false);
  const [billSent,      setBillSent]      = useState<number | null>(null);

  const mode        = ENV_MODES.find(m => m.id === envMode) ?? ENV_MODES[0];
  const activeStaff = STAFF.find(s => s.id === selectedStaff) ?? STAFF[0];
  const tableGuest  = selectedTable ? TABLE_GUESTS[selectedTable] : null;
  const activeTables = TABLES.filter(t => t.status === "active").length;

  /* Live revenue tick */
  useEffect(() => {
    const t = setInterval(() => {
      setRevenue(v => v + Math.floor(Math.random() * 22 + 3));
      if (Math.random() < 0.18) setGuests(g => Math.max(30, g + (Math.random() < 0.55 ? 1 : -1)));
    }, 3500);
    return () => clearInterval(t);
  }, []);

  const dismissAlert = useCallback((id: number) => setAlerts(a => a.filter(x => x.id !== id)), []);
  const sendRec      = () => { setRecSent(true); setTimeout(() => setRecSent(false), 3000); };
  const sendBill     = (tableId: number) => { setBillSent(tableId); setTimeout(() => setBillSent(null), 2500); };

  return (
    <div style={{
      width: "100%", height: "100%", background: "#050301",
      overflow: "auto", fontFamily: "'Inter',sans-serif",
      padding: "8px", boxSizing: "border-box",
    }}>

      {/* ══ TOP METRICS BAR ══ */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
        padding: "10px 16px", marginBottom: 8,
        background: PANEL, border: `1px solid ${BORDER}`,
        borderRadius: 10, backdropFilter: "blur(20px)", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: G, letterSpacing: "0.16em", fontFamily: "'Cormorant Garamond',serif" }}>E.A.T SYSTEM</div>
          <div style={{ fontSize: 8, color: DIM, letterSpacing: "0.22em", textTransform: "uppercase" }}>Environment · Asset · Transaction</div>
        </div>
        <div style={{ width: 1, height: 36, background: BORDER, flexShrink: 0 }} />
        <Metric label="Lounge Revenue (Live)" value={`$${revenue.toLocaleString()}`} sub="+13% vs last hour" />
        <div style={{ width: 1, height: 36, background: BORDER, flexShrink: 0 }} />
        <Metric label="Active Guests" value={String(guests)} sub="+4 last 30 min" color={CREAM} />
        <div style={{ width: 1, height: 36, background: BORDER, flexShrink: 0 }} />
        <Metric label="Avg. Session Value" value="$128" sub="+$12 vs avg" color={CREAM} />
        <div style={{ width: 1, height: 36, background: BORDER, flexShrink: 0 }} />
        <Metric label="Experience Conversion" value="32%" sub="+12% vs last hour" color={EMERALD} />
        <div style={{ flex: 1 }} />
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "8px 14px",
          background: "rgba(212,175,55,0.10)", border: `1px solid ${G}44`, borderRadius: 8, flexShrink: 0,
        }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(212,175,55,0.22)", border: `1px solid ${G}66`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14, color: G }}>★</span>
          </div>
          <div>
            <div style={{ fontSize: 9, color: DIM, letterSpacing: "0.14em", textTransform: "uppercase" }}>Executive Mode</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: G }}>The Vault Lounge</div>
          </div>
        </div>
      </div>

      {/* ══ MAIN GRID ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridAutoRows: "auto", gap: 8 }}>

        {/* ── 1: LIVE FLOOR INTELLIGENCE ── */}
        <Panel num="1" title="Live Floor Intelligence" sub="Real-Time Venue Overview"
          style={{ gridColumn: "1", gridRow: "1 / 3" }}>
          <div style={{ padding: "8px 10px 4px", display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
            {[
              { label: "Energy Level",  value: "72%",            sub: "Elevated"       },
              { label: "Crowd Density", value: "Medium",         sub: "52% Capacity"   },
              { label: "Atmosphere",    value: mode.energy,      sub: mode.lighting     },
              { label: "Noise Level",   value: "Low",            sub: "−49 dB"         },
              { label: "Air Quality",   value: "Excellent",      sub: "AQI 22"         },
              { label: "Temperature",   value: "72°F",           sub: "Comfortable"    },
              { label: "Smoke Density", value: "Balanced",       sub: "Optimal Range"  },
            ].map(r => (
              <div key={r.label} style={{ minWidth: 80 }}>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.32)", letterSpacing: "0.10em", textTransform: "uppercase" }}>{r.label}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: CREAM, marginTop: 1 }}>{r.value}</div>
                <div style={{ fontSize: 8, color: DIM }}>{r.sub}</div>
              </div>
            ))}
          </div>

          {/* Venue map */}
          <div style={{ padding: "0 4px", flex: 1, minHeight: 220 }}>
            <VenueMap selectedTable={selectedTable} onSelectTable={t => { setSelectedTable(t); const s = STAFF.find(st => st.tables.includes(t)); if (s) setSelectedStaff(s.id); }} />
          </div>

          {/* Bottom env icons */}
          <div style={{
            borderTop: `1px solid ${BORDER}`, padding: "8px 12px",
            display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
            background: "rgba(212,175,55,0.04)", flexShrink: 0,
          }}>
            {[
              { icon: "☀", label: "LIGHTING",   val: mode.lighting },
              { icon: "♪", label: "MUSIC",      val: mode.music    },
              { icon: "✦", label: "SCENT",      val: mode.scent    },
              { icon: "◈", label: "AMBIANCE",   val: mode.energy   },
              { icon: "★", label: "VIP MODE",   val: "Enabled"     },
              { icon: "⚡", label: "ADAPTIVE AI",val: "On"          },
            ].map(ic => (
              <div key={ic.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, minWidth: 46 }}>
                <span style={{ fontSize: 13, color: G }}>{ic.icon}</span>
                <span style={{ fontSize: 7, color: DIM, letterSpacing: "0.10em", textTransform: "uppercase" }}>{ic.label}</span>
                <span style={{ fontSize: 8, color: CREAM_DIM }}>{ic.val}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* ── 2: ENVIRONMENT COMMAND ── */}
        <Panel num="2" title="Environment Command" sub="Atmosphere & Experience Control"
          style={{ gridColumn: "2" }}>
          <div style={{ padding: "10px 12px" }}>
            {/* Active mode */}
            <div style={{
              background: "rgba(212,175,55,0.10)", border: `1px solid ${G}44`,
              borderRadius: 8, padding: "10px 14px", marginBottom: 10,
              display: "flex", alignItems: "center", gap: 12,
            }}>
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
                      style={{
                        position: "absolute", right: 0, top: "110%", zIndex: 200, width: 210,
                        background: "#0A0602", border: `1px solid ${G}55`, borderRadius: 8, overflow: "hidden",
                        boxShadow: "0 12px 40px rgba(0,0,0,0.90)",
                      }}>
                      {ENV_MODES.map(m => (
                        <div key={m.id} onPointerDown={() => { setEnvMode(m.id); setShowModeMenu(false); }}
                          style={{
                            padding: "10px 14px", cursor: "pointer",
                            background: envMode === m.id ? "rgba(212,175,55,0.14)" : "transparent",
                            borderBottom: `1px solid ${BORDER}`,
                            borderLeft: envMode === m.id ? `2px solid ${G}` : "2px solid transparent",
                          }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: envMode === m.id ? G : CREAM, letterSpacing: "0.06em" }}>{m.label}</div>
                          <div style={{ fontSize: 8, color: DIM, marginTop: 2 }}>{m.energy}</div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 4 env param tiles */}
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

            {/* Stats row */}
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { label: "Energy Flow",   val: "Positive", sub: "+14%" },
                { label: "Mood Profile",  val: "Comfortable" },
                { label: "Special Event", val: "None", sub: "—" },
                { label: "Next Adapt",    val: "10:30 PM", sub: "Auto Adjust" },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 8px" }}>
                  <div style={{ fontSize: 7, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: CREAM }}>{s.val}</div>
                  {s.sub && <div style={{ fontSize: 8, color: EMERALD }}>{s.sub}</div>}
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* ── 3: ASSET INTELLIGENCE ── */}
        <Panel num="3" title="Asset Intelligence" sub="Inventory & Experience Assets"
          style={{ gridColumn: "3" }}>
          <div style={{ padding: "10px 12px" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {/* Top cigar */}
              <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 5 }}>Top Cigar</div>
                <div style={{ width: "100%", height: 52, background: "linear-gradient(135deg, rgba(100,60,20,0.60) 0%, rgba(60,35,10,0.90) 100%)", borderRadius: 6, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "76%", height: 10, background: "linear-gradient(90deg, #4A2810, #8B5020 40%, #6B3A15)", borderRadius: 5 }} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: CREAM, lineHeight: 1.2 }}>Padron 1964<br/>Anniversary Series</div>
                <div style={{ fontSize: 8, color: DIM, marginTop: 3 }}>Inventory: 18 Boxes</div>
                <div style={{ fontSize: 9, color: EMERALD, marginTop: 2 }}>↑ 24% Popularity</div>
              </div>
              {/* Top spirit */}
              <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 5 }}>Top Spirit</div>
                <div style={{ width: "100%", height: 52, background: "linear-gradient(135deg, rgba(40,25,10,0.80), rgba(20,12,4,0.95))", borderRadius: 6, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 14, height: 42, background: "linear-gradient(180deg, rgba(160,100,20,0.80), rgba(80,45,8,0.90))", borderRadius: "6px 6px 2px 2px" }} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: CREAM, lineHeight: 1.2 }}>Old Forester<br/>1920</div>
                <div style={{ fontSize: 8, color: DIM, marginTop: 3 }}>Sales: 7 btls/day</div>
                <div style={{ fontSize: 9, color: EMERALD, marginTop: 2 }}>↑ +34%</div>
              </div>
              {/* Pairing badge */}
              <div style={{ width: 70, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center", marginBottom: 5 }}>Pairing<br/>Success</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: G }}>91%</div>
                <div style={{ fontSize: 8, color: EMERALD, marginTop: 2, textAlign: "center" }}>High Match Rate</div>
              </div>
            </div>

            {/* Reserve inventory */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
              <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 6 }}>Reserve Inventory</div>
              {[
                { name: "Pappy Van Winkle 23", qty: 12 },
                { name: "Cohiba Behike 54",    qty: 8  },
                { name: "Macallan 18",         qty: 15 },
                { name: "Fuente OpusX",        qty: 20 },
              ].map(r => (
                <div key={r.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: CREAM_DIM }}>{r.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: G }}>{r.qty}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn label="View Pairings"  onClick={() => {}} />
              <Btn label="View All Assets" onClick={() => {}} />
            </div>
          </div>
        </Panel>

        {/* ── 4: TRANSACTION INTELLIGENCE ── */}
        <Panel num="4" title="Transaction Intelligence" sub="Live Revenue & Engagement Flow"
          style={{ gridColumn: "1" }}>
          <div style={{ padding: "10px 12px" }}>
            <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em" }}>Live Revenue</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: G }}>${revenue.toLocaleString()}</div>
                <div style={{ fontSize: 8, color: EMERALD }}>This Hour</div>
              </div>
              <div>
                <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em" }}>Transactions</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: CREAM }}>38</div>
                <div style={{ fontSize: 8, color: EMERALD }}>+4 this hour</div>
              </div>
              <div>
                <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em" }}>Avg. Ticket</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: CREAM }}>$112</div>
                <div style={{ fontSize: 8, color: EMERALD }}>+10%</div>
              </div>
            </div>

            {/* Table rows */}
            {[
              { table: "Table 12",    items: "Padron 1964 + Old Forester 1920",     amt: "$780", id: 12 },
              { table: "VIP Lounge 2",items: "Cohiba Behike + Macallan 18",          amt: "$450", id: 2  },
              { table: "Table 7",     items: "Arturo Fuente + Woodford Reserve",     amt: "$340", id: 7  },
              { table: "Table 3",     items: "Liga Privada + Buffalo Trace",         amt: "$180", id: 3  },
            ].map(r => (
              <div key={r.table} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "7px 8px", marginBottom: 4,
                background: selectedTable === r.id ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${selectedTable === r.id ? `${G}44` : BORDER}`,
                borderRadius: 6, cursor: "pointer",
              }} onPointerDown={() => setSelectedTable(r.id)}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: CREAM }}>{r.table}</div>
                  <div style={{ fontSize: 8, color: DIM }}>{r.items}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: G }}>{r.amt}</span>
                  <motion.button type="button" onPointerDown={e => { e.stopPropagation(); sendBill(r.id); }} whileTap={{ scale: 0.92 }}
                    style={{
                      border: `1px solid ${billSent === r.id ? `${EMERALD}88` : `${G}44`}`,
                      borderRadius: 5, padding: "4px 8px",
                      background: billSent === r.id ? `rgba(50,180,90,0.16)` : "rgba(212,175,55,0.08)",
                      cursor: "pointer", fontSize: 8, fontWeight: 700, color: billSent === r.id ? EMERALD : DIM,
                      fontFamily: "'Inter',sans-serif", letterSpacing: "0.10em", textTransform: "uppercase",
                    }}>
                    {billSent === r.id ? "✓ SENT" : "BILL"}
                  </motion.button>
                </div>
              </div>
            ))}

            {/* Revenue split */}
            <div style={{ marginTop: 6, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px 10px" }}>
              {[
                { label: "Cigars",      pct: 42, color: G          },
                { label: "Spirits",     pct: 38, color: "#C87028"  },
                { label: "Pairings",    pct: 14, color: "#6A9FD8"  },
                { label: "Accessories", pct: 6,  color: "#8B6B4A"  },
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

        {/* ── 5: STAFF HUD ── */}
        <Panel num="5" title="Staff HUD" sub="Team Intelligence & Service Operations"
          style={{ gridColumn: "2" }}>
          <div style={{ padding: "10px 12px", display: "flex", gap: 10, height: "100%", boxSizing: "border-box" }}>
            {/* Staff list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5, width: 88, flexShrink: 0 }}>
              {STAFF.map(s => {
                const sel = selectedStaff === s.id;
                return (
                  <div key={s.id} onPointerDown={() => { setSelectedStaff(s.id); if (s.tables.length) setSelectedTable(s.tables[0]); }}
                    style={{
                      background: sel ? "rgba(212,175,55,0.16)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${sel ? `${G}66` : BORDER}`,
                      borderLeft: `2px solid ${sel ? G : "transparent"}`,
                      borderRadius: 7, padding: "7px 8px", cursor: "pointer",
                    }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(212,175,55,0.20)", border: `1px solid ${G}44`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: G }}>{s.name[0]}</span>
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: CREAM }}>{s.name}</div>
                    <div style={{ fontSize: 7, color: DIM }}>{s.role}</div>
                    <div style={{ fontSize: 8, color: EMERALD, marginTop: 2 }}>{s.perf}%</div>
                  </div>
                );
              })}
            </div>

            {/* Table detail */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, overflow: "hidden" }}>
              {/* Staff info */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px 10px", flexShrink: 0 }}>
                <div style={{ fontSize: 9, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em" }}>{activeStaff.role}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: G }}>{activeStaff.name}</div>
                <div style={{ fontSize: 8, color: CREAM_DIM, marginTop: 2 }}>Tables: {activeStaff.tables.join(", ")} · Performance: {activeStaff.perf}%</div>
              </div>

              {/* Selected table guest */}
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
                      {tableGuest.prefs.map(p => (
                        <div key={p} style={{ fontSize: 9, color: CREAM_DIM }}>• {p}</div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${G}44`, borderRadius: 7, padding: "8px 10px", flex: 1, overflow: "hidden" }}>
                    <div style={{ fontSize: 7, color: G, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 3 }}>AI Recommendation</div>
                    <div style={{ fontSize: 10, color: CREAM, lineHeight: 1.5 }}>{tableGuest.rec}</div>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <Btn label="Support"  onClick={() => {}} />
                    <Btn label="Refill"   onClick={() => {}} />
                    <Btn label="VIP Attn" onClick={() => {}} />
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

        {/* ── 6: AI PAIRING ENGINE ── */}
        <Panel num="6" title="AI Pairing Engine" sub="AI Sommelier & Flavor Intelligence"
          style={{ gridColumn: "3" }}>
          <div style={{ padding: "10px 12px" }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              {/* Radar */}
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Flavor Match</div>
                <RadarChart vals={[78, 65, 55, 42, 70, 82, 90, 60]} />
                <div style={{ textAlign: "center", fontSize: 22, fontWeight: 900, color: G, marginTop: 0 }}>96%</div>
                <div style={{ textAlign: "center", fontSize: 8, color: EMERALD }}>Exceptional Match</div>
              </div>
              {/* Pairing detail */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 5 }}>Recommended Pairing</div>
                <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: CREAM }}>Plasencia Alma Fuerte</div>
                  <div style={{ fontSize: 9, color: DIM }}>+ Blanton's Single Barrel</div>
                  <div style={{ fontSize: 8, color: EMERALD, marginTop: 4 }}>Stage 2 — Exploring Flavors</div>
                </div>
                <div style={{ fontSize: 9, color: CREAM_DIM, lineHeight: 1.5, marginBottom: 8 }}>
                  Perfect match for your current cigar profile. Try our Pappy Van Winkle 15.
                </div>
                <motion.button type="button" onPointerDown={sendRec} whileTap={{ scale: 0.95 }}
                  style={{
                    width: "100%", padding: "9px", borderRadius: 6, cursor: "pointer",
                    background: recSent ? "rgba(50,180,90,0.22)" : "rgba(212,175,55,0.18)",
                    border: `1px solid ${recSent ? `${EMERALD}88` : `${G}66`}`,
                    color: recSent ? EMERALD : G, fontSize: 10, fontWeight: 800,
                    letterSpacing: "0.16em", textTransform: "uppercase",
                    fontFamily: "'Inter',sans-serif", transition: "all 0.25s",
                    marginBottom: 6,
                  }}>
                  {recSent ? "✓ RECOMMENDATION SENT" : "SEND RECOMMENDATION"}
                </motion.button>
                <Btn label="Why This Pairing?" onClick={() => {}} />
              </div>
            </div>

            {/* Taste evolution mini-chart */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px 10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em" }}>Guest Taste Evolution — 90 Days</div>
              </div>
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

        {/* ── 7: LOUNGE OPERATIONS ── */}
        <Panel num="7" title="Lounge Operations" sub="Live Operations & Alerts"
          style={{ gridColumn: "1" }}>
          <div style={{ padding: "10px 12px" }}>
            {/* KPI tiles */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[
                { label: "Active Tables",  value: activeTables, sub: "of 20",             color: G          },
                { label: "VIP Tables",     value: 3,            sub: "High Priority",      color: G          },
                { label: "Wait Time",      value: "8 min",      sub: "Average",            color: CREAM      },
                { label: "Service Alerts", value: alerts.length,sub: "Need Attention",     color: alerts.length > 0 ? "#F07070" : EMERALD },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 7, color: DIM, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                  <div style={{ fontSize: 7, color: CREAM_DIM }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Live alerts */}
            <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>Live Alerts</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <AnimatePresence>
                {alerts.map(a => (
                  <motion.div key={a.id} layout initial={{ opacity: 1 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "7px 10px", borderRadius: 6,
                      background: a.urgent ? "rgba(200,74,74,0.12)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${a.urgent ? "rgba(200,74,74,0.35)" : BORDER}`,
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.urgent ? "#F07070" : EMERALD, flexShrink: 0 }}>
                        {a.urgent && <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />}
                      </div>
                      <span style={{ fontSize: 10, color: a.urgent ? "#F0A0A0" : CREAM_DIM }}>{a.text}</span>
                    </div>
                    <Btn label="ACK" onClick={() => dismissAlert(a.id)} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {alerts.length === 0 && (
                <div style={{ textAlign: "center", padding: "12px", color: EMERALD, fontSize: 10 }}>✓ All alerts resolved</div>
              )}
            </div>
            <div style={{ marginTop: 8 }}>
              <Btn label="View All Alerts" onClick={() => setAlerts(INIT_ALERTS)} full />
            </div>
          </div>
        </Panel>

        {/* ── 8: EXECUTIVE COMMAND ── */}
        <Panel num="8" title="Executive Command" sub="Business Performance & Strategic Intelligence"
          style={{ gridColumn: "2 / 4" }}>
          <div style={{ padding: "10px 14px", display: "flex", gap: 16 }}>
            {/* Left KPIs + chart */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 290, flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { label: "Total Revenue",  value: `$${revenue.toLocaleString()}`, sub: "+13%", color: G    },
                  { label: "Gross Profit",   value: "$17,820",                      sub: "+19%", color: G    },
                ].map(k => (
                  <div key={k.label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "10px" }}>
                    <div style={{ fontSize: 7, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{k.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 9, color: EMERALD }}>{k.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { label: "Guest Engagement", value: "82%",  sub: "High",      color: CREAM   },
                  { label: "Loyalty Growth",   value: "+24%", sub: "This Week", color: EMERALD },
                  { label: "Return Rate",      value: "68%",  sub: "+11%",      color: CREAM   },
                ].map(k => (
                  <div key={k.label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px 6px" }}>
                    <div style={{ fontSize: 7, color: DIM, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{k.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 8, color: EMERALD }}>{k.sub}</div>
                  </div>
                ))}
              </div>
              {/* Revenue chart */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px 10px", flex: 1 }}>
                <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 4 }}>Revenue Performance</div>
                <RevenueChart current={revenue} />
              </div>
            </div>

            {/* Right: AI Insights + forecast */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 2 }}>AI Insights</div>
              {[
                { icon: "▲", text: "Increase VIP lounge lighting — high conversion opportunity", color: G          },
                { icon: "◆", text: "Old Forester pairing is driving highest guest engagement",   color: "#C87028"  },
                { icon: "●", text: "Weekend VIP reservations predicted to increase 24%",         color: EMERALD    },
              ].map((ins, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`,
                  borderRadius: 7, padding: "10px 12px",
                  borderLeft: `2px solid ${ins.color}`,
                }}>
                  <span style={{ fontSize: 12, color: ins.color, flexShrink: 0, marginTop: 1 }}>{ins.icon}</span>
                  <span style={{ fontSize: 11, color: CREAM_DIM, lineHeight: 1.45 }}>{ins.text}</span>
                </div>
              ))}

              {/* Forecast + action */}
              <div style={{ marginTop: "auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${G}44`, borderRadius: 7, padding: "10px 14px", flex: 1 }}>
                  <div style={{ fontSize: 8, color: DIM, textTransform: "uppercase", letterSpacing: "0.10em" }}>Revenue Forecast</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: G, marginTop: 3 }}>
                    ${(revenue * 1.16).toLocaleString("en", { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ fontSize: 8, color: CREAM_DIM }}>Projected end-of-night</div>
                </div>
                <Btn label="View Full Report" onClick={() => {}} active />
              </div>
            </div>
          </div>
        </Panel>

      </div>
    </div>
  );
}
