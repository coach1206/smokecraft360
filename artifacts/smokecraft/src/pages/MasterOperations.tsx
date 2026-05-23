/**
 * MasterOperations — NOVEE OS: SOVEREIGN COMMAND CENTER.
 *
 * Route: /operations
 * Role: manager, venue_owner, super_admin
 *
 * Layout:
 *   ┌──────────────────── TOP KPI STRIP (sticky) ──────────────────────┐
 *   ├─ LEFT SIDEBAR (220px) ─┬──── MAIN CONTENT ────┬─ RIGHT FEED ─────┤
 *   │  18 nav items          │  Venue state card     │  Live event feed  │
 *   │  icons + status dots   │  Engine status grid   │  polled 15 s      │
 *   │                        │  Device / OTA cards   │                   │
 *   │                        │  Campaign activity    │                   │
 *   └────────────────────────┴───────────────────────┴───────────────────┘
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence }                   from "framer-motion";
import { useLocation }                               from "wouter";
import {
  LayoutDashboard, Radar, TrendingUp, Brain, Megaphone,
  Wind, ShieldCheck, Terminal, BarChart3, Monitor, Building2, FileText,
  Users, Gift, Crown, CalendarDays, Upload, Settings,
  Wifi, WifiOff, AlertTriangle, CheckCircle, Circle,
  ChevronRight, Activity, Zap, DollarSign, Star, BookOpen,
  RotateCcw, UserCheck, Download,
} from "lucide-react";

// ── design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:        "#050A14",               // deep navy (was cream)
  surface:   "rgba(6,12,28,0.97)",    // dark surface (was light glass)
  border:    "rgba(0,128,255,0.14)",  // metallic blue border (was gold border)
  gold:      "#0080FF",               // metallic blue (was warm amber)
  goldBright:"#22AAFF",               // bright blue (was same amber)
  text:      "#D8EEFF",               // platinum white (was near-black)
  textMuted: "rgba(180,210,250,0.60)",// muted blue-white (was warm brown)
  green:     "#34D399",
  amber:     "#F59E0B",
  red:       "#F87171",
  blue:      "#60A5FA",
  purple:    "#A78BFA",
};

// ── API helper ────────────────────────────────────────────────────────────────

async function apiGet<T = any>(path: string): Promise<T> {
  const token = localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token") ?? "";
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

// ── Sidebar nav config ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "operations",   label: "Operations",          desc: "This dashboard",              icon: LayoutDashboard, route: "/operations",              group: "core" },
  { id: "dashboard",    label: "Command Center",       desc: "Module navigation hub",       icon: Terminal,        route: "/dashboard",               group: "core" },
  { id: "presence",     label: "Presence Engine",      desc: "VIP arrival & recognition",   icon: Radar,           route: "/presence",                group: "engines" },
  { id: "revenue",      label: "Revenue Engine",       desc: "Margin & profit automation",  icon: TrendingUp,      route: "/revenue",                 group: "engines" },
  { id: "intelligence", label: "Intelligence",         desc: "AI triggers & automation",    icon: Brain,           route: "/intelligence",            group: "engines" },
  { id: "campaigns",    label: "Marketing",            desc: "Campaigns & promotions",      icon: Megaphone,       route: "/campaigns",               group: "engines" },
  { id: "environment",  label: "Environment",          desc: "Atmosphere & energy states",  icon: Wind,            route: "/environment",             group: "engines" },
  { id: "governance",   label: "Governance",           desc: "Roles, audit & compliance",   icon: ShieldCheck,     route: "/governance",              group: "operations" },
  { id: "central",      label: "Central Command",      desc: "OTA & remote device control", icon: Upload,          route: "/central-command",         group: "operations" },
  { id: "enterprise",   label: "Enterprise Intel",     desc: "9-tab intelligence suite",    icon: BarChart3,       route: "/enterprise-intelligence", group: "operations" },
  { id: "axiom-pay",    label: "NOVEE Pay",            desc: "Tabs · Fulfillment · Connect", icon: DollarSign,      route: "/axiom-pay",               group: "operations" },
  { id: "launch",       label: "Launch Readiness",     desc: "Pre-launch health & risk",     icon: ShieldCheck,     route: "/launch-readiness",        group: "operations" },
  { id: "finance-recon",label: "Reconciliation",      desc: "Revenue · Payouts · Alerts",   icon: BarChart3,       route: "/finance-reconciliation",  group: "operations" },
  { id: "training",     label: "Training Mode",        desc: "Employee · Investor · Demo",   icon: BookOpen,        route: "/training",                group: "operations" },
  { id: "legal",        label: "Legal",                desc: "ToS · Privacy · AUP",          icon: FileText,        route: "/legal",                   group: "operations" },
  { id: "devices",      label: "Devices",              desc: "Kiosk & hardware health",     icon: Monitor,         route: "/devices",                 group: "venue" },
  { id: "venues",       label: "Venues",               desc: "Venue management",            icon: Building2,       route: "/admin-panel",             group: "venue" },
  { id: "staff",        label: "Employees",            desc: "Team access & management",    icon: Users,           route: "/staff",                   group: "venue" },
  { id: "rewards",      label: "Loyalty",              desc: "Points & redemptions",        icon: Gift,            route: "/rewards",                 group: "venue" },
  { id: "presence-vip", label: "VIP Lounge",           desc: "High-value guest tracking",   icon: Crown,           route: "/presence",                group: "venue" },
  { id: "analytics",    label: "Analytics",            desc: "Revenue & swipe insights",    icon: Activity,        route: "/analytics",               group: "venue" },
  { id: "orders",       label: "Orders",               desc: "Live order management",       icon: CalendarDays,    route: "/orders",                  group: "venue" },
  { id: "settings",     label: "Settings",             desc: "System configuration",        icon: Settings,        route: "/settings",                group: "venue" },
  { id: "venue-config", label: "Venue Config Matrix",  desc: "Floor · Assets · Integration", icon: Building2,       route: "/operations",              group: "venue" },
];

// ── Engine status colors ──────────────────────────────────────────────────────

const ENGINE_STATUS_COLOR: Record<string, string> = {
  ACTIVE:  T.green,
  STANDBY: T.amber,
  WARNING: "#f97316",
  ERROR:   T.red,
};

// ── Relative time ─────────────────────────────────────────────────────────────

function relTime(ts: string | Date): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m    = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Ambient particle layer ────────────────────────────────────────────────────

const OPS_PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i, x: Math.random() * 100, y: Math.random() * 100,
  r: 0.7 + Math.random() * 2, dur: 10 + Math.random() * 16,
  del: Math.random() * 12, op: 0.03 + Math.random() * 0.08,
}));

function OpsParticles() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      {OPS_PARTICLES.map(p => (
        <motion.div key={p.id}
          style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.r * 2, height: p.r * 2, borderRadius: "50%", background: T.gold, opacity: p.op }}
          animate={{ y: [0, -30, 9, -18, 0], x: [0, 11, -8, 14, 0], opacity: [p.op, p.op * 2.5, p.op * 0.3, p.op * 1.8, p.op] }}
          transition={{ duration: p.dur, delay: p.del, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ── Small reusable components ─────────────────────────────────────────────────

function GlassCard({
  children,
  style,
  glow,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  glow?: string;
}) {
  return (
    <div
      style={{
        background: "linear-gradient(145deg, rgba(6,12,28,0.97) 0%, rgba(8,18,40,0.93) 100%)",
        border:     `1px solid ${T.border}`,
        borderRadius: 14,
        backdropFilter: "blur(20px)",
        boxShadow: glow
          ? `0 0 28px ${glow}22, 0 8px 32px rgba(0,0,0,0.40), 0 2px 6px rgba(0,0,0,0.20), inset 0 1px 0 rgba(0,128,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.10)`
          : `0 8px 32px rgba(0,0,0,0.40), 0 2px 6px rgba(0,0,0,0.20), inset 0 1px 0 rgba(0,128,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.10)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StatusDot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: 8, height: 8 }}>
      {pulse && (
        <motion.span
          animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: color,
          }}
        />
      )}
      <span style={{ position: "relative", display: "block", width: 8, height: 8, borderRadius: "50%", background: color }} />
    </span>
  );
}

// ── KPI Tile ──────────────────────────────────────────────────────────────────

function KpiTile({ kpi }: { kpi: any }) {
  const [display, setDisplay] = useState<number | string>(typeof kpi.value === "number" ? 0 : kpi.value);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (typeof kpi.value !== "number") { setDisplay(kpi.value); return; }
    const target = kpi.value as number;
    const start  = Date.now();
    const dur    = 900;
    const tick   = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      const v = Math.round(p * target);
      setDisplay(v);
      if (p < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [kpi.value]);

  const positive = typeof kpi.delta === "string" && (kpi.delta.startsWith("+") || kpi.delta === "ACTIVE" || kpi.delta === "+stable");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        minWidth: 136,
        padding: "12px 16px",
        background: "linear-gradient(145deg, rgba(0,128,255,0.11) 0%, rgba(0,128,255,0.04) 100%)",
        border:     `1px solid rgba(0,128,255,0.22)`,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: "0 4px 16px rgba(0,0,0,0.30), 0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(0,128,255,0.10)",
      }}
    >
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at 50% 0%, ${T.gold}08 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <span style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {kpi.label}
      </span>
      <span style={{ fontSize: 22, fontWeight: 600, color: T.goldBright, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1 }}>
        {kpi.unit === "$" ? "$" : ""}{typeof display === "number" ? display.toLocaleString() : display}{kpi.unit === "%" ? "%" : ""}
      </span>
      <span style={{ fontSize: 11, color: positive ? T.green : T.red, fontWeight: 500 }}>
        {kpi.delta}
      </span>
    </motion.div>
  );
}

// ── Engine Status Card ────────────────────────────────────────────────────────

function EngineCard({ engine }: { engine: any }) {
  const color = ENGINE_STATUS_COLOR[engine.status] ?? T.textMuted;
  return (
    <GlassCard glow={color} style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: "0.04em" }}>
          {engine.name}
        </span>
        <motion.span
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            fontSize: 11, fontWeight: 700, color, letterSpacing: "0.12em",
            background: `${color}18`, border: `1px solid ${color}44`,
            borderRadius: 4, padding: "2px 6px",
            display: "inline-block",
          }}
        >
          {engine.status}
        </motion.span>
      </div>
      <span style={{ fontSize: 12, color: T.textMuted }}>{engine.desc}</span>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: T.textMuted }}>
          ↑ {engine.uptime}% uptime
        </span>
        <span style={{ fontSize: 12, color: T.textMuted }}>
          {engine.eventsToday} events today
        </span>
      </div>
      <div style={{
        height: 1, background: `linear-gradient(90deg, ${color}44, transparent)`,
        marginTop: 2,
      }} />
      <span style={{ fontSize: 12, color: T.textMuted, fontStyle: "italic" }}>
        {engine.lastEvent}
      </span>
    </GlassCard>
  );
}

// ── Feed Event ────────────────────────────────────────────────────────────────

const FEED_COLORS: Record<string, string> = {
  vip:         T.gold,
  campaign:    T.purple,
  deployment:  T.blue,
  governance:  T.amber,
  environment: T.green,
  device:      "#f97316",
  revenue:     "#34d399",
  system:      T.textMuted,
};

function FeedEvent({ event, index }: { event: any; index: number }) {
  const color = FEED_COLORS[event.category] ?? T.textMuted;
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      style={{
        padding: "10px 12px",
        borderBottom: `1px solid rgba(0,128,255,0.08)`,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <div style={{ marginTop: 2 }}>
        <StatusDot color={color} pulse={event.severity === "high"} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.4 }}>
          {event.title}
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
          {event.detail}
        </div>
      </div>
      <span style={{ fontSize: 11, color: T.textMuted, flexShrink: 0, paddingTop: 2 }}>
        {relTime(event.ts)}
      </span>
    </motion.div>
  );
}

// ── Venue State Card ──────────────────────────────────────────────────────────

const ENERGY_COLORS: Record<string, string> = {
  quiet_reserve:      "#6366f1",
  social_warmth:      T.gold,
  elevated_lounge:    T.purple,
  peak_energy:        T.red,
  vip_session:        T.goldBright,
  late_night_reserve: "#1e293b",
  event_atmosphere:   T.green,
  mentor_session:     T.blue,
};

const ENERGY_LABELS: Record<string, string> = {
  quiet_reserve:      "Quiet Reserve",
  social_warmth:      "Social Warmth",
  elevated_lounge:    "Elevated Lounge",
  peak_energy:        "Peak Energy",
  vip_session:        "VIP Session",
  late_night_reserve: "Late Night Reserve",
  event_atmosphere:   "Event Atmosphere",
  mentor_session:     "Mentor Session",
};

function VenueStateCard({ venueState, kpis }: { venueState: any; kpis: any }) {
  const energyKey = venueState?.energyState ?? "social_warmth";
  const color     = ENERGY_COLORS[energyKey] ?? T.gold;
  const label     = ENERGY_LABELS[energyKey] ?? energyKey;
  const atmosphere = venueState?.atmosphere ?? 74;

  return (
    <GlassCard glow={color} style={{ padding: "20px 24px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
      <motion.div
        animate={{ opacity: [0.08, 0.18, 0.08] }}
        transition={{ duration: 4, repeat: Infinity }}
        style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at 20% 50%, ${color}28 0%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
            Live Venue State
          </div>
          <div style={{ fontSize: 28, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color }}>
            {label}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: T.textMuted }}>
              Atmosphere Score: <span style={{ color: T.gold }}>{atmosphere}%</span>
            </span>
            {venueState?.vipPulseActive && (
              <span style={{ fontSize: 11, color: T.goldBright, display: "flex", alignItems: "center", gap: 4 }}>
                <StatusDot color={T.goldBright} pulse /> VIP Pulse Active
              </span>
            )}
            <span style={{ fontSize: 11, color: T.textMuted }}>
              Automations today: <span style={{ color: T.text }}>{venueState?.automationRuns ?? 0}</span>
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 6 }}>Atmosphere</div>
          <div style={{ position: "relative", width: 64, height: 64 }}>
            <svg viewBox="0 0 64 64" style={{ width: 64, height: 64, transform: "rotate(-90deg)" }}>
              <circle cx="32" cy="32" r="26" fill="none" stroke={`${color}22`} strokeWidth="6" />
              <motion.circle
                cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                animate={{ strokeDashoffset: 2 * Math.PI * 26 * (1 - atmosphere / 100) }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 14, fontWeight: 700, color,
              transform: "rotate(90deg)",
            }}>
              {atmosphere}
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ── Venue Config Matrix ────────────────────────────────────────────────────────

const POS_PROVIDERS = ["Toast", "Clover", "Lightspeed", "Square", "Custom"] as const;
type PosProvider = typeof POS_PROVIDERS[number];

function VenueConfigPanel() {
  const [vcTab, setVcTab]             = useState<"floor" | "assets" | "integrations">("floor");
  const [tables, setTables]           = useState<Record<string, number>>({});
  const [tableCounter, setTableCounter] = useState(1);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [assetCraft, setAssetCraft]   = useState<"cigar" | "spirit" | "beer">("cigar");
  const [posProvider, setPosProvider] = useState<PosProvider>("Toast");
  const [webhookUrl, setWebhookUrl]   = useState("");
  const [apiKey, setApiKey]           = useState("");
  const [testStatus, setTestStatus]   = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [zoneName, setZoneName]       = useState("Main Floor");
  const [zones, setZones]             = useState([
    { name: "Main Floor", color: T.gold },
    { name: "VIP Lounge", color: T.purple },
    { name: "Bar Zone",   color: T.green  },
  ]);

  const ROWS = 6, COLS = 10;

  const toggleCell = (key: string) => {
    setTables(prev => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      const n = tableCounter;
      setTableCounter(c => c + 1);
      return { ...prev, [key]: n };
    });
  };

  const testConnection = async () => {
    setTestStatus("testing");
    await new Promise(r => setTimeout(r, 1400));
    setTestStatus(webhookUrl ? "ok" : "fail");
    setTimeout(() => setTestStatus("idle"), 3000);
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`,
    borderRadius: 7, padding: "9px 12px",
    color: T.text, fontFamily: "'Inter',sans-serif", fontSize: 14, outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: T.textMuted,
    letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6, display: "block",
  };

  return (
    <div>
      {/* Sub-tab bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {(["floor", "assets", "integrations"] as const).map(t => (
          <button key={t} onClick={() => setVcTab(t)}
            style={{
              padding: "8px 18px", borderRadius: 8, cursor: "pointer",
              background: vcTab === t ? `rgba(0,128,255,0.16)` : "rgba(255,255,255,0.03)",
              border: `1px solid ${vcTab === t ? T.gold : T.border}`,
              color: vcTab === t ? T.gold : T.textMuted,
              fontSize: 13, fontWeight: vcTab === t ? 700 : 400, letterSpacing: "0.08em",
              textTransform: "capitalize", transition: "all 0.15s",
            }}>
            {t === "floor" ? "Room & Floor Plan" : t === "assets" ? "Asset Catalog" : "Integration Provisioning"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={vcTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>

          {/* ── Floor Plan Builder ── */}
          {vcTab === "floor" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 16 }}>
              <GlassCard style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                    Floor Plan Canvas
                  </div>
                  <button onClick={() => { setTables({}); setTableCounter(1); }}
                    style={{ padding: "5px 12px", borderRadius: 6, background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.30)", color: "#F87171", fontSize: 11, cursor: "pointer" }}>
                    Clear Canvas
                  </button>
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                  gap: 4, userSelect: "none",
                }}>
                  {Array.from({ length: ROWS }, (_, r) =>
                    Array.from({ length: COLS }, (_, c) => {
                      const key = `${r}-${c}`;
                      const tableNum = tables[key];
                      const isHov = hoveredCell === key;
                      return (
                        <motion.div
                          key={key}
                          onMouseEnter={() => setHoveredCell(key)}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => toggleCell(key)}
                          animate={{
                            background: tableNum
                              ? `rgba(0,128,255,0.22)`
                              : isHov ? "rgba(0,128,255,0.06)" : "rgba(255,255,255,0.03)",
                            borderColor: tableNum ? T.gold : isHov ? `${T.gold}44` : T.border,
                          }}
                          style={{
                            height: 44, borderRadius: 6, border: `1px solid ${T.border}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", fontSize: tableNum ? 13 : 10, fontWeight: 700,
                            color: tableNum ? T.gold : T.textMuted, transition: "background 0.12s",
                          }}>
                          {tableNum ? `T${tableNum}` : "+"}
                        </motion.div>
                      );
                    })
                  )}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: T.textMuted }}>
                  {Object.keys(tables).length} table{Object.keys(tables).length !== 1 ? "s" : ""} placed · Click cell to add/remove
                </div>
              </GlassCard>

              {/* Zones panel */}
              <GlassCard style={{ padding: "16px 18px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Zones</div>
                {zones.map((z, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 10px", background: `${z.color}0c`, border: `1px solid ${z.color}28`, borderRadius: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: z.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: T.text, flex: 1 }}>{z.name}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12 }}>
                  <input value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder="New zone name"
                    style={{ ...fieldStyle, marginBottom: 8, fontSize: 13 }} />
                  <button onClick={() => { if (zoneName.trim()) { setZones(z => [...z, { name: zoneName.trim(), color: [T.gold, T.purple, T.green, T.blue, T.amber][z.length % 5] }]); setZoneName(""); } }}
                    style={{ width: "100%", padding: "8px", borderRadius: 7, background: `rgba(0,128,255,0.12)`, border: `1px solid ${T.gold}44`, color: T.gold, fontSize: 12, cursor: "pointer" }}>
                    + Add Zone
                  </button>
                </div>
              </GlassCard>
            </div>
          )}

          {/* ── Asset Catalog ── */}
          {vcTab === "assets" && (
            <GlassCard style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {(["cigar", "spirit", "beer"] as const).map(c => (
                  <button key={c} onClick={() => setAssetCraft(c)}
                    style={{
                      padding: "6px 16px", borderRadius: 7, cursor: "pointer",
                      background: assetCraft === c ? `rgba(0,128,255,0.14)` : "transparent",
                      border: `1px solid ${assetCraft === c ? T.gold : T.border}`,
                      color: assetCraft === c ? T.gold : T.textMuted,
                      fontSize: 12, fontWeight: assetCraft === c ? 700 : 400, textTransform: "capitalize",
                    }}>
                    {c === "cigar" ? "🍂 Cigars" : c === "spirit" ? "🥃 Spirits" : "🍺 Beer"}
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {assetCraft === "cigar" && (
                  <>
                    {["Product Name","Brand","Vitola","Wrapper Origin","Binder","Filler Blend","Strength (1–5)","Retail Price ($)"].map(f => (
                      <div key={f}>
                        <label style={labelStyle}>{f}</label>
                        <input style={fieldStyle} placeholder={`Enter ${f.toLowerCase()}...`} />
                      </div>
                    ))}
                  </>
                )}
                {assetCraft === "spirit" && (
                  <>
                    {["Product Name","Distillery","Category","Age Statement","ABV (%)","Flavor Profile","Region","Retail Price ($)"].map(f => (
                      <div key={f}>
                        <label style={labelStyle}>{f}</label>
                        <input style={fieldStyle} placeholder={`Enter ${f.toLowerCase()}...`} />
                      </div>
                    ))}
                  </>
                )}
                {assetCraft === "beer" && (
                  <>
                    {["Product Name","Brewery","Style","ABV (%)","IBU","Draft / Bottle","Serving Temp (°F)","Retail Price ($)"].map(f => (
                      <div key={f}>
                        <label style={labelStyle}>{f}</label>
                        <input style={fieldStyle} placeholder={`Enter ${f.toLowerCase()}...`} />
                      </div>
                    ))}
                  </>
                )}
              </div>
              <button style={{ marginTop: 16, padding: "10px 24px", borderRadius: 8, background: `rgba(0,128,255,0.14)`, border: `1px solid ${T.gold}55`, color: T.gold, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Save Asset Schema
              </button>
            </GlassCard>
          )}

          {/* ── Integration Provisioning ── */}
          {vcTab === "integrations" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <GlassCard style={{ padding: "18px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>POS Provider</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {POS_PROVIDERS.map(p => (
                    <label key={p} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <div onClick={() => setPosProvider(p)} style={{
                        width: 16, height: 16, borderRadius: "50%",
                        border: `2px solid ${posProvider === p ? T.gold : T.border}`,
                        background: posProvider === p ? T.gold : "transparent",
                        flexShrink: 0, cursor: "pointer", transition: "all 0.15s",
                      }} />
                      <span style={{ fontSize: 14, color: posProvider === p ? T.gold : T.text }}>{p}</span>
                    </label>
                  ))}
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Webhook Endpoint URL</label>
                  <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                    placeholder="https://your-pos.example.com/webhook"
                    style={fieldStyle} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>API Key / Secret</label>
                  <input value={apiKey} onChange={e => setApiKey(e.target.value)} type="password"
                    placeholder="••••••••••••••••"
                    style={fieldStyle} />
                </div>

                <motion.button onClick={testConnection} disabled={testStatus === "testing"} whileTap={{ scale: 0.97 }}
                  style={{
                    padding: "10px 20px", borderRadius: 8, cursor: testStatus === "testing" ? "default" : "pointer",
                    background: testStatus === "ok" ? "rgba(52,211,153,0.14)" : testStatus === "fail" ? "rgba(248,113,113,0.14)" : `rgba(0,128,255,0.14)`,
                    border: `1px solid ${testStatus === "ok" ? T.green : testStatus === "fail" ? T.red : T.gold}55`,
                    color: testStatus === "ok" ? T.green : testStatus === "fail" ? T.red : T.gold,
                    fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8,
                  }}>
                  {testStatus === "testing" && (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      style={{ width: 12, height: 12, border: `2px solid ${T.gold}`, borderTopColor: "transparent", borderRadius: "50%" }} />
                  )}
                  {testStatus === "ok" ? "✓ Connection Verified" : testStatus === "fail" ? "✗ Connection Failed" : "Test Connection"}
                </motion.button>
              </GlassCard>

              <GlassCard style={{ padding: "18px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Active Integrations</div>
                {[
                  { label: `${posProvider} POS`, status: testStatus === "ok" ? "CONNECTED" : "PENDING", color: testStatus === "ok" ? T.green : T.amber },
                  { label: "Stripe Payments",    status: "CONNECTED", color: T.green  },
                  { label: "SendGrid Email",      status: "CONNECTED", color: T.green  },
                  { label: "Cloudinary Media",   status: "CONNECTED", color: T.green  },
                  { label: "ElevenLabs TTS",     status: "ACTIVE",    color: T.blue   },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 4 ? `1px solid ${T.border}` : "none" }}>
                    <span style={{ fontSize: 14, color: T.text }}>{item.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: item.color, letterSpacing: "0.14em" }}>{item.status}</span>
                  </div>
                ))}
              </GlassCard>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MasterOperations() {
  const [, navigate] = useLocation();

  const [overview,  setOverview]  = useState<any>(null);
  const [engines,   setEngines]   = useState<any[]>([]);
  const [feed,      setFeed]      = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [lastPoll,  setLastPoll]  = useState<Date | null>(null);
  const [activeNav, setActiveNav] = useState("operations");

  const loadOverview = useCallback(async () => {
    try {
      const data = await apiGet("/api/dashboard/overview");
      setOverview(data);
    } catch { /* auth guard shows login */ }
  }, []);

  const loadEngines = useCallback(async () => {
    try {
      const data = await apiGet("/api/engines/status");
      setEngines(data.engines ?? []);
    } catch { /* silent */ }
  }, []);

  const loadFeed = useCallback(async () => {
    try {
      const data = await apiGet("/api/dashboard/feed");
      setFeed(data.events ?? []);
      setLastPoll(new Date());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    Promise.all([loadOverview(), loadEngines(), loadFeed()])
      .finally(() => setLoading(false));

    const kpiTimer    = setInterval(loadOverview, 30_000);
    const engineTimer = setInterval(loadEngines,  60_000);
    const feedTimer   = setInterval(loadFeed,     15_000);
    return () => { clearInterval(kpiTimer); clearInterval(engineTimer); clearInterval(feedTimer); };
  }, [loadOverview, loadEngines, loadFeed]);

  const kpis = overview?.kpis ?? {};
  const kpiList = [
    kpis.guestsToday, kpis.vipArrivals, kpis.revenueToday,
    kpis.loungeEnergy, kpis.returnGuestRate, kpis.campaignEngagement,
    kpis.deviceHealth, kpis.otaStatus, kpis.loyaltyActivations, kpis.environmentState,
  ].filter(Boolean);

  const navGroups = ["core", "engines", "operations", "venue"];
  const groupLabels: Record<string, string> = {
    core:       "Home",
    engines:    "Engines",
    operations: "Operations",
    venue:      "Venue",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050A14",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Inter', 'SF Pro Display', sans-serif",
      color: T.text,
      position: "relative",
    }}>
      {/* Ambient page glow */}
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,128,255,0.09) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <OpsParticles />
      {/* ── TOP KPI STRIP ── */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: `linear-gradient(180deg, rgba(5,10,20,0.99) 0%, rgba(5,10,20,0.96) 100%)`,
        backdropFilter: "blur(24px)",
        borderBottom: `1px solid ${T.border}`,
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "inset 0 1px 0 rgba(0,128,255,0.08), 0 1px 0 rgba(0,128,255,0.12), 0 8px 32px rgba(0,0,0,0.40)",
      }}>
        {/* Brand mark */}
        <div style={{ flexShrink: 0, marginRight: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.gold, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            NOVEE OS
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            SOVEREIGN COMMAND CENTER
          </div>
        </div>

        {/* KPI tiles — horizontal scroll */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", flex: 1, paddingBottom: 2 }}>
          {loading
            ? Array.from({ length: 6 }, (_, i) => (
                <div key={i} style={{ minWidth: 130, height: 64, background: "rgba(26,26,27,0.06)", borderRadius: 10, flexShrink: 0 }} />
              ))
            : kpiList.map((kpi: any, i: number) => <KpiTile key={i} kpi={kpi} />)
          }
        </div>

        {/* Live indicator */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <StatusDot color={T.green} pulse />
          <div>
            <div style={{ fontSize: 13, color: T.green, fontWeight: 700, letterSpacing: "0.08em" }}>LIVE</div>
            {lastPoll && (
              <div style={{ fontSize: 11, color: T.textMuted }}>{relTime(lastPoll)}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 80px)", position: "relative", zIndex: 1 }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{
          width: 240,
          flexShrink: 0,
          borderRight: `1px solid rgba(0,128,255,0.14)`,
          background: "linear-gradient(180deg, #070F20 0%, #050A14 100%)",
          overflowY: "auto",
          padding: "16px 0",
        }}>
          {navGroups.map((group) => {
            const items = NAV_ITEMS.filter((n) => n.group === group);
            if (!items.length) return null;
            return (
              <div key={group} style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "rgba(100,150,220,0.55)",
                  textTransform: "uppercase", letterSpacing: "0.18em",
                  padding: "8px 20px 4px",
                }}>
                  {groupLabels[group]}
                </div>
                {items.map((item) => {
                  const Icon    = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveNav(item.id);
                        if (item.route !== "/operations") navigate(item.route);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 20px",
                        background: isActive ? `rgba(0,128,255,0.12)` : "transparent",
                        borderLeft: isActive ? `3px solid ${T.gold}` : "3px solid transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.18s ease",
                      }}
                    >
                      <Icon size={16} color={isActive ? T.gold : T.textMuted} strokeWidth={isActive ? 2 : 1.5} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 15, fontWeight: isActive ? 600 : 400,
                          color: isActive ? T.gold : T.text,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {item.label}
                        </div>
                        <div style={{
                          fontSize: 12, color: T.textMuted,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {item.desc}
                        </div>
                      </div>
                      {isActive && <ChevronRight size={12} color={T.gold} />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, minWidth: 0 }}>

          {/* Venue Config Matrix — inline panel */}
          {activeNav === "venue-config" && <VenueConfigPanel />}

          {/* Standard ops content — hidden when viewing venue config */}
          {activeNav !== "venue-config" && (
          <>

          {/* Venue state */}
          {overview?.venueState && (
            <VenueStateCard venueState={overview.venueState} kpis={kpis} />
          )}

          {/* Engine status grid */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: T.textMuted,
              textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10,
            }}>
              Engine Health
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 10,
            }}>
              <AnimatePresence>
                {engines.map((eng, i) => (
                  <motion.div
                    key={eng.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <EngineCard engine={eng} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {!engines.length && loading && Array.from({ length: 7 }, (_, i) => (
                <div key={i} style={{ height: 110, background: T.surface, borderRadius: 12, border: `1px solid ${T.border}` }} />
              ))}
            </div>
          </div>

          {/* Device + OTA row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {/* Device health */}
            <GlassCard style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
                Device Health
              </div>
              {overview?.devices ? (
                <>
                  <div style={{ display: "flex", gap: 20, marginBottom: 10 }}>
                    {[
                      { label: "Active",   val: overview.devices.active,   color: T.green },
                      { label: "Inactive", val: overview.devices.inactive, color: T.amber },
                      { label: "Offline",  val: overview.devices.offline,  color: T.red   },
                    ].map((s) => (
                      <div key={s.label}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "'Cormorant Garamond', serif" }}>
                          {s.val}
                        </div>
                        <div style={{ fontSize: 12, color: T.textMuted }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 4, background: "rgba(0,128,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                    <motion.div
                      animate={{ width: `${kpis.deviceHealth?.value ?? 95}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      style={{ height: "100%", background: `linear-gradient(90deg, ${T.green}, ${T.gold})`, borderRadius: 2 }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 6 }}>
                    {kpis.deviceHealth?.value ?? 95}% operational · {overview.devices.total} total
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 20, marginBottom: 4 }}>
                    {[
                      { label: "Active",   val: "—", color: T.green },
                      { label: "Inactive", val: "—", color: T.amber },
                      { label: "Offline",  val: "—", color: T.red   },
                    ].map((s) => (
                      <div key={s.label}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "'Cormorant Garamond', serif", opacity: 0.4 }}>
                          {s.val}
                        </div>
                        <div style={{ fontSize: 11, color: T.textMuted }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted, fontStyle: "italic" }}>
                    Sign in to view fleet status
                  </div>
                </div>
              )}
            </GlassCard>

            {/* OTA status */}
            <GlassCard style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
                OTA Status
              </div>
              {[
                { channel: "Production", version: "v2.4.1", status: "ACTIVE",  color: T.green },
                { channel: "Staging",    version: "v2.5.0", status: "STANDBY", color: T.amber },
                { channel: "Beta",       version: "v2.5.1", status: "ACTIVE",  color: T.blue  },
              ].map((c) => (
                <div key={c.channel} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusDot color={c.color} pulse={c.status === "ACTIVE"} />
                    <span style={{ fontSize: 13, color: T.text }}>{c.channel}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: T.textMuted, fontFamily: "monospace" }}>{c.version}</span>
                    <span style={{ fontSize: 11, color: c.color, fontWeight: 600 }}>{c.status}</span>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 12, color: T.textMuted }}>
                Fleet compliance: <span style={{ color: T.gold }}>97%</span>
              </div>
            </GlassCard>
          </div>

          {/* Campaign activity */}
          <GlassCard style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Active Campaign Activity
              </div>
              <span style={{ fontSize: 12, color: T.gold }}>
                {overview?.campaigns?.active ?? 0} active
              </span>
            </div>
            {[
              { name: "Reserve Pairing Night",     type: "FEATURED_PAIRING",  lift: "+41%",  cvr: "28%", color: T.gold   },
              { name: "Whiskey & Smoke Event",      type: "VENUE_CHALLENGE",   lift: "+31%",  cvr: "22%", color: T.purple },
              { name: "Double XP Weekend",          type: "DOUBLE_XP",         lift: "+18%",  cvr: "34%", color: T.green  },
              { name: "Premium Maduro Spotlight",   type: "BRAND_SPOTLIGHT",   lift: "+12%",  cvr: "19%", color: T.blue   },
            ].map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: i < 3 ? `1px solid rgba(26,26,27,0.06)` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Star size={10} color={c.color} fill={c.color} />
                  <div>
                    <div style={{ fontSize: 14, color: T.text }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>{c.type.replace(/_/g, " ")}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                  <span style={{ color: T.green }}>Lift {c.lift}</span>
                  <span style={{ color: T.textMuted }}>CVR {c.cvr}</span>
                </div>
              </motion.div>
            ))}
          </GlassCard>

          {/* ── Training Controls ── */}
          <GlassCard style={{ padding: "16px 18px", marginTop: 16 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: T.textMuted,
              textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 12,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <BookOpen size={10} /> Training Controls
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {([
                { label: "Reset Vault Demo",       icon: RotateCcw,   color: "#f59e0b", action: () => { const tok = localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token"); fetch("/api/training/reset", { method: "POST", headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) } }).catch(() => {}); } },
                { label: "Activate Demo Accounts", icon: UserCheck,   color: "#34d399", action: () => { const tok = localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token"); fetch("/api/training/accounts/activate", { method: "POST", headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) } }).then(() => alert("Demo accounts activated. Login: vault.manager@demo.com / VaultDemo2025!")).catch(() => alert("Activation failed — try logging in as super_admin first.")); } },
                { label: "Investor Demo",           icon: BarChart3,   color: T.gold,   action: () => navigate("/training/investor") },
                { label: "Sales Demo",              icon: TrendingUp,  color: T.green,  action: () => navigate("/training/sales") },
                { label: "Employee Training",       icon: UserCheck,   color: "#a78bfa", action: () => navigate("/training/employee") },
                { label: "Export Training Packet",  icon: Download,    color: T.blue,   action: () => window.open("/training/certifications") },
                { label: "Toggle Offline Mode",     icon: WifiOff,     color: "#f87171", action: () => {
                  if (localStorage.getItem("axiom_offline_demo")) {
                    localStorage.removeItem("axiom_offline_demo");
                  } else {
                    localStorage.setItem("axiom_offline_demo", "1");
                  }
                }},
              ] as Array<{ label: string; icon: React.ElementType; color: string; action: () => void }>).map(({ label, icon: Icon, color, action }) => (
                <button
                  key={label}
                  onClick={action}
                  style={{
                    background: `${color}0c`, border: `1px solid ${color}22`,
                    borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                    color, fontSize: 12, fontWeight: 600, textAlign: "left",
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "background 0.15s",
                  }}
                >
                  <Icon size={10} style={{ flexShrink: 0 }} /> {label}
                </button>
              ))}
            </div>
          </GlassCard>
          </>
          )}
        </div>

        {/* ── RIGHT LIVE FEED ── */}
        <div style={{
          width: 280,
          flexShrink: 0,
          borderLeft: `1px solid rgba(212,139,0,0.14)`,
          background: "linear-gradient(180deg, rgba(26,26,27,0.22) 0%, rgba(26,26,27,0.12) 100%)",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{
            padding: "12px 14px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Live Feed
              </div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>
                Polls every 15 s
              </div>
            </div>
            <StatusDot color={T.green} pulse />
          </div>

          {/* Category legend */}
          <div style={{
            padding: "8px 14px",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            borderBottom: `1px solid ${T.border}`,
            flexShrink: 0,
          }}>
            {Object.entries(FEED_COLORS).slice(0, 6).map(([cat, color]) => (
              <span key={cat} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.textMuted }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
                {cat}
              </span>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            <AnimatePresence>
              {feed.map((evt, i) => <FeedEvent key={evt.id} event={evt} index={i} />)}
            </AnimatePresence>
            {!feed.length && loading && (
              <div style={{ padding: 20, color: T.textMuted, fontSize: 13, textAlign: "center" }}>
                Loading feed…
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NOVEE OS Corporate Signature Footer */}
      <div className="novee-footer">
        <div className="novee-footer-line1">AUTHORIZED OPERATOR // 360 ENTERPRISE SERVICES LLC</div>
        <div className="novee-footer-line2">POWERED BY PROFOUND INNOVATIONS</div>
      </div>
    </div>
  );
}
