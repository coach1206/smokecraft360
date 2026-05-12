/**
 * EEIE Shared — Theme system, types, micro-components, utilities.
 * All EEIE sub-modules import from here.
 */

import { motion } from "framer-motion";

// ─── THEME ───────────────────────────────────────────────────────────────────

export function buildTheme(dark: boolean) {
  if (dark) {
    return {
      dark: true,
      bg:        "#070B14",
      bg2:       "#0C1322",
      sidebar:   "#060C1A",
      sidebarBorder: "rgba(0,160,255,0.08)",
      card:      "rgba(13,25,52,0.82)",
      cardHover: "rgba(20,40,80,0.90)",
      cardAlt:   "rgba(10,20,44,0.90)",
      border:    "rgba(0,140,255,0.12)",
      borderHi:  "rgba(0,180,255,0.35)",
      accent:    "#00AAFF",
      accent2:   "#0055FF",
      accentGlow:"rgba(0,170,255,0.18)",
      green:     "#00E87A",
      greenGlow: "rgba(0,232,122,0.15)",
      red:       "#FF3B5C",
      yellow:    "#FFB830",
      purple:    "#A78BFA",
      cyan:      "#22D3EE",
      text:      "#DCF0FF",
      textMid:   "rgba(180,220,255,0.70)",
      textSub:   "rgba(120,180,240,0.50)",
      textFaint: "rgba(80,140,220,0.30)",
      shadow:    "0 4px 24px rgba(0,60,160,0.28)",
      tabActive: "rgba(0,170,255,0.10)",
      kpiCard:   "rgba(12,22,46,0.90)",
      mono:      "'Space Mono','Fira Code',monospace",
      sans:      "Inter,system-ui,sans-serif",
    };
  }
  // Approved EEIE token system: deep navy shell + cool ice-blue panels + white glass cards
  return {
    dark: false,
    bg:        "#EAF4FF",
    bg2:       "#F0F8FF",
    sidebar:   "#061426",
    sidebarBorder: "rgba(8,123,255,0.12)",
    card:      "#FFFFFF",
    cardHover: "#F6FBFF",
    cardAlt:   "#EEF7FF",
    border:    "rgba(34,126,255,0.22)",
    borderHi:  "rgba(0,136,255,0.55)",
    accent:    "#087BFF",
    accent2:   "#0558D8",
    accentGlow:"rgba(8,123,255,0.15)",
    green:     "#18C98B",
    greenGlow: "rgba(24,201,139,0.14)",
    red:       "#E94B5A",
    yellow:    "#F6A623",
    purple:    "#8B5CF6",
    cyan:      "#41D9FF",
    text:      "#0B1E34",
    textMid:   "rgba(11,30,52,0.70)",
    textSub:   "rgba(54,112,143,0.85)",
    textFaint: "rgba(127,151,179,0.80)",
    shadow:    "0 4px 24px rgba(8,35,74,0.12), 0 0 0 1px rgba(34,126,255,0.14)",
    tabActive: "rgba(8,123,255,0.08)",
    kpiCard:   "#FFFFFF",
    mono:      "'Space Mono','Fira Code',monospace",
    sans:      "Inter,system-ui,sans-serif",
  };
}
export type Theme = ReturnType<typeof buildTheme>;

// ─── AUTH FETCH ───────────────────────────────────────────────────────────────

export async function fetchEEIE<T>(path: string): Promise<T | null> {
  try {
    const token = localStorage.getItem("SOVEREIGN_SESSION") ?? "";
    const r = await fetch(path, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!r.ok) return null;
    return r.json() as Promise<T>;
  } catch { return null; }
}

// ─── HAPTIC ───────────────────────────────────────────────────────────────────

export function triggerHaptic(type: "success" | "warning" | "critical" | "softTap" | "managerAlert" | "guestRequest" | "syncAlert" | "founderConfirm") {
  if (!navigator.vibrate) return;
  const patterns: Record<string, number[]> = {
    success:       [40],
    warning:       [30, 60, 30],
    critical:      [80, 40, 80, 40, 80],
    softTap:       [15],
    managerAlert:  [60, 40, 60],
    guestRequest:  [50, 30, 50],
    syncAlert:     [25, 25, 25],
    founderConfirm:[100, 50, 100],
  };
  navigator.vibrate(patterns[type] ?? [30]);
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface EEIEStatus {
  ts: string;
  cluster: { total: number; healthy: number; degraded: number; offline: number; recovering: number; failoverActive: number };
  energy: { venues: number; states: Record<string, number> };
  sensory: { activeVenues: number; entries: SensoryEntry[] };
  pos: { total: number; healthy: number; configured: number; simulated: number; providers: PosProvider[] };
  predictions: { recent: number; entries: Prediction[] };
  advisories: { recent: number; entries: Advisory[] };
  intelligence: Record<string, number>;
}
export interface SensoryEntry {
  venueId: string; activeCraft: string | null; occupancy: number;
  intensityScale: number; triggerCount: number; lastTriggerAt: string | null;
}
export interface PosProvider {
  provider: string; venueId?: string; connected: boolean; simulated: boolean;
  status: string; lastSyncAt: string | null; lastSyncDurationMs: number | null;
  consecutiveFailures: number; lastError: string | null;
}
export interface Prediction {
  sessionId: string; venueId: string; hesitationScore: number; curiosityScore: number;
  confidenceScore: number; fatigueLevel: number; premiumIntentScore: number;
  predictedNextAction: string; confidence: number; ts: string;
}
export interface Advisory {
  id: string; venueId: string; type: string; message: string;
  confidence: number; urgency: string; ts: string;
}
export interface ClusterVenue {
  venueId: string; health: string; minutesSince: number;
  activeSessions: number; lastHeartbeat: string | null; failoverActive: boolean;
}
export interface VenueState {
  venueId: string; state: string; eventCount10m: number;
  conversionRate: number; guestCount: number; scoredAt: string;
}
export type BusHistory = { [topic: string]: { topic: string; payload: unknown; ts: string }[] };

export interface CartItem { name: string; type: "cigar" | "liquor" | "food"; price: number; qty: number; }
export interface GuestSession {
  id: string; table: string; guestName: string; initials: string;
  status: "active" | "paused" | "completed" | "attention";
  loyaltyTier: string; xp: number; returning: boolean;
  favCigar: string; favLiquor: string; favFood: string;
  flavors: string[]; strength: "light" | "medium" | "full" | "extra-full";
  startedAt: string; aiMatchScore: number; moodTag: string;
  blendProfile: Record<string, number>;
  cart: CartItem[];
}

export const MOCK_SESSIONS: GuestSession[] = [
  {
    id: "T1", table: "Table 1", guestName: "Marcus R.", initials: "MR",
    status: "active", loyaltyTier: "Obsidian", xp: 4820, returning: true,
    favCigar: "Padron 1964 Exclusivo", favLiquor: "Woodford Reserve Double Oaked", favFood: "Smoked Short Rib Sliders",
    flavors: ["Creamy","Nutty","Cocoa","Cedar"], strength: "medium",
    startedAt: new Date(Date.now()-18*60000).toISOString(), aiMatchScore: 92, moodTag: "Premium",
    blendProfile: { Creamy:82, Sweet:68, Nutty:75, Earthy:40, Spicy:30, Woody:55, Pepper:25, Citrus:20 },
    cart: [],
  },
  {
    id: "T2", table: "Table 4", guestName: "Sophia L.", initials: "SL",
    status: "attention", loyaltyTier: "Gold", xp: 2100, returning: false,
    favCigar: "Arturo Fuente Opus X", favLiquor: "Hennessy VSOP", favFood: "Truffle Charcuterie Board",
    flavors: ["Spicy","Leather","Dark Fruit","Pepper"], strength: "full",
    startedAt: new Date(Date.now()-34*60000).toISOString(), aiMatchScore: 88, moodTag: "High Energy",
    blendProfile: { Creamy:30, Sweet:40, Nutty:35, Earthy:60, Spicy:85, Woody:70, Pepper:80, Citrus:45 },
    cart: [{ name: "Arturo Fuente Opus X", type: "cigar", price: 42, qty: 1 }],
  },
  {
    id: "T3", table: "Table 7", guestName: "James O.", initials: "JO",
    status: "paused", loyaltyTier: "Silver", xp: 980, returning: false,
    favCigar: "Cohiba Robusto", favLiquor: "Macallan 18", favFood: "Aged Cheese Flight",
    flavors: ["Earthy","Woody","Honey","Toast"], strength: "medium",
    startedAt: new Date(Date.now()-52*60000).toISOString(), aiMatchScore: 79, moodTag: "Social",
    blendProfile: { Creamy:50, Sweet:55, Nutty:60, Earthy:78, Spicy:30, Woody:80, Pepper:40, Citrus:30 },
    cart: [],
  },
  {
    id: "T4", table: "Table 2", guestName: "Elena V.", initials: "EV",
    status: "active", loyaltyTier: "Platinum", xp: 7350, returning: true,
    favCigar: "My Father Le Bijou 1922", favLiquor: "Balvenie DoubleWood 17", favFood: "Vanilla Crème Brûlée",
    flavors: ["Sweet","Floral","Vanilla","Caramel"], strength: "light",
    startedAt: new Date(Date.now()-9*60000).toISOString(), aiMatchScore: 96, moodTag: "VIP Active",
    blendProfile: { Creamy:90, Sweet:88, Nutty:70, Earthy:25, Spicy:15, Woody:40, Pepper:10, Citrus:55 },
    cart: [],
  },
];

export const TIER_C: Record<string, string> = {
  Obsidian: "#A78BFA", Platinum: "#60C8FF", Gold: "#D97706", Silver: "#94A3B8",
};
export const STATUS_COLOR = (s: GuestSession["status"], T: Theme) =>
  s === "active" ? T.green : s === "attention" ? T.yellow : s === "paused" ? T.accent : T.textSub;

// ─── MICRO COMPONENTS ────────────────────────────────────────────────────────

export function LiveDot({ color, size = 7 }: { color: string; size?: number }) {
  return (
    <motion.div
      animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 2, repeat: Infinity }}
      style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0 }}
    />
  );
}

export function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 999,
      background: bg, border: `1px solid ${color}40`,
      fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
      color, textTransform: "uppercase" as const, whiteSpace: "nowrap" as const,
    }}>{label}</span>
  );
}

export function Meter({ pct, color, height = 5 }: { pct: number; color: string; height?: number }) {
  return (
    <div style={{ height, borderRadius: height, background: `${color}1A`, overflow: "hidden" }}>
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ height: "100%", borderRadius: height, background: color }}
      />
    </div>
  );
}

export function Waveform({ color, speed = 3, height = 28 }: { color: string; speed?: number; height?: number }) {
  return (
    <div style={{ width: "100%", height, overflow: "hidden", position: "relative" }}>
      <div style={{ display: "flex", width: "200%", animation: `eeie-wave ${speed}s linear infinite` }}>
        {[0, 1].map(i => (
          <svg key={i} width="50%" height={height} viewBox={`0 0 600 ${height}`} preserveAspectRatio="none" style={{ flexShrink: 0 }}>
            <defs><linearGradient id={`wg${i}${speed}`} x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor={color} stopOpacity="0.1"/><stop offset="50%" stopColor={color} stopOpacity="0.9"/><stop offset="100%" stopColor={color} stopOpacity="0.1"/></linearGradient></defs>
            <path d={`M0,${height/2} Q75,${height*0.1} 150,${height/2} Q225,${height*0.9} 300,${height/2} Q375,${height*0.1} 450,${height/2} Q525,${height*0.9} 600,${height/2}`} fill="none" stroke={`url(#wg${i}${speed})`} strokeWidth="1.5"/>
          </svg>
        ))}
      </div>
    </div>
  );
}

export function Panel({ title, subtitle, icon, badge, children, T, accentColor, noPad }: {
  title: string; subtitle?: string; icon?: React.ReactNode; badge?: string;
  children: React.ReactNode; T: Theme; accentColor?: string; noPad?: boolean;
}) {
  const ac = accentColor ?? T.accent;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: T.shadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 18px", borderBottom: `1px solid ${T.border}`, background: T.dark ? `${ac}08` : `${ac}04` }}>
        {icon && <span style={{ color: ac, display: "flex", alignItems: "center" }}>{icon}</span>}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: T.textMid, textTransform: "uppercase" as const, fontFamily: T.mono }}>{title}</div>
          {subtitle && <div style={{ fontSize: 9, color: T.textFaint, marginTop: 1 }}>{subtitle}</div>}
        </div>
        {badge && <Badge label={badge} color={ac} bg={`${ac}12`} />}
      </div>
      <div style={noPad ? {} : { padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

export function TouchButton({
  icon, label, sub, color, onClick, size = "md", variant = "solid", disabled,
}: {
  icon?: React.ReactNode; label: string; sub?: string;
  color: string; onClick?: () => void; size?: "sm" | "md" | "lg";
  variant?: "solid" | "glass" | "ghost"; disabled?: boolean;
}) {
  const h = size === "lg" ? 72 : size === "md" ? 56 : 44;
  const bg = variant === "solid" ? color : variant === "glass" ? `${color}14` : "transparent";
  const textColor = variant === "solid" ? "#fff" : color;
  return (
    <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}
      onClick={onClick} disabled={disabled}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4,
        minHeight: h, padding: "10px 14px", borderRadius: 12,
        background: bg, border: `1px solid ${color}40`,
        color: textColor, cursor: disabled ? "not-allowed" : "pointer", flex: 1,
        boxShadow: variant === "solid" ? `0 4px 14px ${color}35` : "none",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon}
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textAlign: "center" as const, lineHeight: 1.3 }}>{label}</span>
      {sub && <span style={{ fontSize: 8, opacity: 0.7, textAlign: "center" as const }}>{sub}</span>}
    </motion.button>
  );
}

export function KpiCard({ label, value, delta, positive, icon: Icon, T, color }: {
  label: string; value: string; delta?: string; positive?: boolean;
  icon?: React.ComponentType<{ size: number; color?: string }>; T: Theme; color?: string;
}) {
  const c = color ?? T.accent;
  return (
    <motion.div whileHover={{ y: -2 }}
      style={{ background: T.kpiCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", boxShadow: T.shadow, flex: 1, minWidth: 110 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", color: T.textFaint, fontFamily: T.mono, textTransform: "uppercase" as const }}>{label}</div>
        {Icon && <Icon size={13} color={c} />}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>{value}</div>
      {delta && (
        <div style={{ fontSize: 9.5, color: positive === false ? T.red : c, fontFamily: T.mono, marginTop: 5 }}>{delta}</div>
      )}
    </motion.div>
  );
}

export function RadarChart({ labels, values, color, size = 140 }: {
  labels: string[]; values: number[]; color: string; size?: number;
}) {
  const N = labels.length;
  const cx = size / 2, cy = size / 2;
  const r = size * 0.36;
  const labelR = r + size * 0.11;
  const rings = [0.25, 0.5, 0.75, 1];

  function pt(i: number, scale: number) {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    return [cx + scale * r * Math.cos(angle), cy + scale * r * Math.sin(angle)] as [number, number];
  }

  const dataPoints = values.map((v, i) => pt(i, v / 100));
  const dataPath = dataPoints.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + " Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map(s => {
        const pts = Array.from({ length: N }, (_, i) => pt(i, s).join(",")).join(" ");
        return <polygon key={s} points={pts} fill="none" stroke={`${color}22`} strokeWidth={0.8} />;
      })}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={`${color}20`} strokeWidth={0.8} />;
      })}
      <path d={dataPath} fill={`${color}20`} stroke={color} strokeWidth={1.5} />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill={color} />
      ))}
      {labels.map((l, i) => {
        const [x, y] = pt(i, labelR / r);
        return (
          <text key={i} x={x} y={y} fontSize={6.5} fill={`${color}90`}
            textAnchor="middle" dominantBaseline="middle" fontFamily="'Space Mono',monospace">
            {l}
          </text>
        );
      })}
    </svg>
  );
}

export function DonutRing({ pct, color, size = 72, label }: { pct: number; color: string; size?: number; label?: string }) {
  const r = size * 0.38;
  const stroke = size * 0.1;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}1A`} strokeWidth={stroke} />
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${circ}`}
          initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {label && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.18, fontWeight: 800, color, fontFamily: "'Space Mono',monospace" }}>
          {label}
        </div>
      )}
    </div>
  );
}
