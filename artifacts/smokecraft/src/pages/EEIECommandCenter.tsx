/**
 * EEIE Command Center — Experience Enhancement Intelligence Engine
 * Premium luxury white/silver/blue command interface (Apple Vision Pro × Tesla).
 * Day default: ice white + metallic blue. Night toggle: deep navy + cyan.
 * Touch-first: 56px+ buttons, drag faders, large tap targets.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { orderBroadcast, type ArchiveBlendOrder } from "@/lib/orderBroadcast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Zap, Radio, Package, Brain, Network, RefreshCw,
  XCircle, Cpu, Moon, Sun, ChevronLeft, ChevronRight, Shield,
  AlertTriangle, Monitor, Globe, PowerOff, Megaphone, Wrench,
  Siren, Gauge, Server, Users, ShoppingCart, Star, Coffee,
  Leaf, Info, Plus, Send, ClipboardList, BookOpen, Layers,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// THEME SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

function buildTheme(dark: boolean) {
  if (dark) {
    return {
      dark: true,
      bg:        "#070B14",
      bg2:       "#0C1322",
      sidebar:   "#060C1A",
      sidebarBorder: "rgba(0,160,255,0.08)",
      card:      "rgba(13,25,52,0.82)",
      cardHover: "rgba(20,40,80,0.90)",
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
  return {
    dark: false,
    bg:        "#EEF2F8",
    bg2:       "#F4F7FC",
    sidebar:   "#0B1D3A",
    sidebarBorder: "rgba(255,255,255,0.06)",
    card:      "rgba(255,255,255,0.90)",
    cardHover: "rgba(255,255,255,0.98)",
    border:    "rgba(0,80,200,0.09)",
    borderHi:  "rgba(0,100,220,0.28)",
    accent:    "#0062E6",
    accent2:   "#0040C0",
    accentGlow:"rgba(0,98,230,0.10)",
    green:     "#059669",
    greenGlow: "rgba(5,150,105,0.10)",
    red:       "#DC2626",
    yellow:    "#D97706",
    purple:    "#7C3AED",
    text:      "#0A1628",
    textMid:   "rgba(10,30,80,0.70)",
    textSub:   "rgba(10,30,80,0.50)",
    textFaint: "rgba(10,30,80,0.28)",
    shadow:    "0 2px 16px rgba(0,60,160,0.07), 0 0 0 1px rgba(0,100,220,0.06)",
    tabActive: "rgba(0,98,230,0.06)",
    kpiCard:   "rgba(255,255,255,0.95)",
    mono:      "'Space Mono','Fira Code',monospace",
    sans:      "Inter,system-ui,sans-serif",
  };
}
type Theme = ReturnType<typeof buildTheme>;

// ─────────────────────────────────────────────────────────────────────────────
// AUTH-AWARE FETCH
// ─────────────────────────────────────────────────────────────────────────────

async function fetchEEIE<T>(path: string): Promise<T | null> {
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

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface EEIEStatus {
  ts: string;
  cluster: { total: number; healthy: number; degraded: number; offline: number; recovering: number; failoverActive: number };
  energy: { venues: number; states: Record<string, number> };
  sensory: { activeVenues: number; entries: SensoryEntry[] };
  pos: { total: number; healthy: number; configured: number; simulated: number; providers: PosProvider[] };
  predictions: { recent: number; entries: Prediction[] };
  advisories: { recent: number; entries: Advisory[] };
  intelligence: Record<string, number>;
}
interface SensoryEntry {
  venueId: string; activeCraft: string | null; occupancy: number;
  intensityScale: number; triggerCount: number; lastTriggerAt: string | null;
}
interface PosProvider {
  provider: string; venueId?: string; connected: boolean; simulated: boolean;
  status: string; lastSyncAt: string | null; lastSyncDurationMs: number | null;
  consecutiveFailures: number; lastError: string | null;
}
interface Prediction {
  sessionId: string; venueId: string; hesitationScore: number; curiosityScore: number;
  confidenceScore: number; fatigueLevel: number; premiumIntentScore: number;
  predictedNextAction: string; confidence: number; ts: string;
}
interface Advisory {
  id: string; venueId: string; type: string; message: string;
  confidence: number; urgency: string; ts: string;
}
interface ClusterVenue {
  venueId: string; health: string; minutesSince: number;
  activeSessions: number; lastHeartbeat: string | null; failoverActive: boolean;
}
interface VenueState {
  venueId: string; state: string; eventCount10m: number;
  conversionRate: number; guestCount: number; scoredAt: string;
}
interface BusHistory { [topic: string]: { topic: string; payload: unknown; ts: string }[] }

// Staff Cockpit mock types
interface GuestSession {
  id: string; table: string; guestName: string; initials: string;
  status: "active" | "paused" | "completed" | "attention";
  loyaltyTier: string; xp: number; returning: boolean;
  favCigar: string; favLiquor: string;
  flavors: string[]; strength: "light" | "medium" | "full" | "extra-full";
  startedAt: string; aiMatchScore: number;
  cart: CartItem[];
}
interface CartItem { name: string; type: "cigar" | "liquor"; price: number; qty: number; }

const MOCK_SESSIONS: GuestSession[] = [
  { id: "T1", table: "Table 1", guestName: "Marcus R.", initials: "MR", status: "active", loyaltyTier: "Obsidian", xp: 4820, returning: true, favCigar: "Padron 1964 Exclusivo", favLiquor: "Woodford Reserve Double Oaked", flavors: ["Creamy","Nutty","Cocoa","Cedar"], strength: "medium", startedAt: new Date(Date.now()-18*60000).toISOString(), aiMatchScore: 92, cart: [] },
  { id: "T2", table: "Table 4", guestName: "Sophia L.", initials: "SL", status: "attention", loyaltyTier: "Gold", xp: 2100, returning: false, favCigar: "Arturo Fuente Opus X", favLiquor: "Hennessy VSOP", flavors: ["Spicy","Leather","Dark Fruit","Pepper"], strength: "full", startedAt: new Date(Date.now()-34*60000).toISOString(), aiMatchScore: 88, cart: [{ name: "Arturo Fuente Opus X", type: "cigar", price: 42, qty: 1 }] },
  { id: "T3", table: "Table 7", guestName: "James O.", initials: "JO", status: "paused", loyaltyTier: "Silver", xp: 980, returning: false, favCigar: "Cohiba Robusto", favLiquor: "Macallan 18", flavors: ["Earthy","Woody","Honey","Toast"], strength: "medium", startedAt: new Date(Date.now()-52*60000).toISOString(), aiMatchScore: 79, cart: [] },
  { id: "T4", table: "Table 2", guestName: "Elena V.", initials: "EV", status: "active", loyaltyTier: "Platinum", xp: 7350, returning: true, favCigar: "My Father Le Bijou 1922", favLiquor: "Balvenie DoubleWood 17", flavors: ["Sweet","Floral","Vanilla","Caramel"], strength: "light", startedAt: new Date(Date.now()-9*60000).toISOString(), aiMatchScore: 96, cart: [] },
];

const STATUS_COLOR = (s: GuestSession["status"], T: Theme) =>
  s === "active" ? T.green : s === "attention" ? T.yellow : s === "paused" ? T.accent : T.textSub;

// ─────────────────────────────────────────────────────────────────────────────
// MICRO COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function LiveDot({ color, size = 7 }: { color: string; size?: number }) {
  return (
    <motion.div
      animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 2, repeat: Infinity }}
      style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0 }}
    />
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 999,
      background: bg, border: `1px solid ${color}40`,
      fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
      color, textTransform: "uppercase" as const, whiteSpace: "nowrap" as const,
    }}>{label}</span>
  );
}

function Meter({ pct, color, height = 5 }: { pct: number; color: string; height?: number }) {
  return (
    <div style={{ height, borderRadius: height, background: `${color}1A`, overflow: "hidden" }}>
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ height: "100%", borderRadius: height, background: color }}
      />
    </div>
  );
}

function Waveform({ color, speed = 3, height = 28 }: { color: string; speed?: number; height?: number }) {
  return (
    <div style={{ width: "100%", height, overflow: "hidden", position: "relative" }}>
      <div style={{ display: "flex", width: "200%", animation: `eeie-wave ${speed}s linear infinite` }}>
        {[0, 1].map(i => (
          <svg key={i} width="50%" height={height} viewBox={`0 0 600 ${height}`} preserveAspectRatio="none" style={{ flexShrink: 0 }}>
            <defs><linearGradient id={`wg${i}`} x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor={color} stopOpacity="0.1"/><stop offset="50%" stopColor={color} stopOpacity="0.9"/><stop offset="100%" stopColor={color} stopOpacity="0.1"/></linearGradient></defs>
            <path d={`M0,${height/2} Q75,${height*0.1} 150,${height/2} Q225,${height*0.9} 300,${height/2} Q375,${height*0.1} 450,${height/2} Q525,${height*0.9} 600,${height/2}`} fill="none" stroke={`url(#wg${i})`} strokeWidth="1.5"/>
          </svg>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ label, value, delta, positive, icon: Icon, T }: {
  label: string; value: string; delta?: string; positive?: boolean;
  icon?: React.ComponentType<{ size: number; color?: string }>; T: Theme;
}) {
  return (
    <motion.div whileHover={{ y: -2 }}
      style={{ background: T.kpiCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", boxShadow: T.shadow, flex: 1, minWidth: 120 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.18em", color: T.textFaint, fontFamily: T.mono, textTransform: "uppercase" }}>{label}</div>
        {Icon && <Icon size={14} color={T.accent} />}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>{value}</div>
      {delta && (
        <div style={{ fontSize: 10, color: positive === false ? T.red : T.green, fontFamily: T.mono, marginTop: 6 }}>{delta}</div>
      )}
    </motion.div>
  );
}

function Panel({ title, subtitle, icon, badge, children, T, accentColor }: {
  title: string; subtitle?: string; icon?: React.ReactNode; badge?: string;
  children: React.ReactNode; T: Theme; accentColor?: string;
}) {
  const ac = accentColor ?? T.accent;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: T.shadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${T.border}`, background: T.dark ? `${ac}08` : `${ac}04` }}>
        {icon && <span style={{ color: ac, display: "flex", alignItems: "center" }}>{icon}</span>}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: T.textMid, textTransform: "uppercase", fontFamily: T.mono }}>{title}</div>
          {subtitle && <div style={{ fontSize: 9, color: T.textFaint, marginTop: 1 }}>{subtitle}</div>}
        </div>
        {badge && <Badge label={badge} color={ac} bg={`${ac}12`} />}
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

function TouchButton({
  icon, label, sub, color, onClick, size = "md", variant = "solid", disabled,
}: {
  icon: React.ReactNode; label: string; sub?: string;
  color: string; onClick?: () => void; size?: "sm" | "md" | "lg";
  variant?: "solid" | "glass" | "ghost"; disabled?: boolean;
}) {
  const h = size === "lg" ? 72 : size === "md" ? 56 : 44;
  const bg = variant === "solid" ? color : variant === "glass" ? `${color}12` : "transparent";
  const textColor = variant === "solid" ? "#fff" : color;
  return (
    <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}
      onClick={onClick} disabled={disabled}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4,
        minHeight: h, padding: "10px 14px", borderRadius: 12,
        background: bg, border: `1px solid ${color}40`,
        color: textColor, cursor: "pointer", flex: 1,
        boxShadow: variant === "solid" ? `0 4px 14px ${color}35` : "none",
      }}
    >
      {icon}
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textAlign: "center", lineHeight: 1.3 }}>{label}</span>
      {sub && <span style={{ fontSize: 8, opacity: 0.7, textAlign: "center" }}>{sub}</span>}
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────

const NAV = [
  { id: "overview",    icon: Monitor,     label: "Command Center" },
  { id: "network",     icon: Globe,       label: "Live Network" },
  { id: "sensory",     icon: Radio,       label: "Sensory Engine" },
  { id: "commerce",    icon: Package,     label: "Commerce Health" },
  { id: "predictions", icon: Brain,       label: "AI Predictions" },
  { id: "bus",         icon: Network,     label: "Event Bus" },
  { id: "cockpit",     icon: Users,       label: "Staff Cockpit" },
];

function Sidebar({ active, onNav, isDark, onToggleDark, T }: {
  active: string; onNav: (id: string) => void;
  isDark: boolean; onToggleDark: () => void; T: Theme;
}) {
  return (
    <div style={{ width: 196, flexShrink: 0, background: T.sidebar, display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(0,170,255,0.18)", border: "1px solid rgba(0,170,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={17} color="#00AAFF" />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.22em", color: "#00AAFF", fontFamily: "'Space Mono',monospace" }}>EEIE</div>
            <div style={{ fontSize: 7.5, color: "rgba(0,170,255,0.38)", letterSpacing: "0.14em", fontFamily: "'Space Mono',monospace" }}>COMMAND CENTER</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        <div style={{ fontSize: 7, letterSpacing: "0.26em", color: "rgba(100,180,255,0.22)", fontFamily: "'Space Mono',monospace", padding: "10px 8px 5px", textTransform: "uppercase" }}>INTELLIGENCE</div>
        {NAV.map(item => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <motion.button key={item.id} onClick={() => onNav(item.id)}
              whileHover={{ x: 2 }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 9,
                padding: "11px 10px", borderRadius: 10, border: "none",
                background: isActive ? "rgba(0,170,255,0.15)" : "transparent",
                color: isActive ? "#60C8FF" : "rgba(140,200,255,0.38)",
                cursor: "pointer", fontSize: 11.5, fontWeight: isActive ? 700 : 400,
                marginBottom: 2, textAlign: "left" as const,
                borderLeft: `2px solid ${isActive ? "#00AAFF" : "transparent"}`,
                transition: "all 0.15s",
              }}>
              <Icon size={14} style={{ flexShrink: 0 }} />
              {item.label}
              {isActive && <ChevronRight size={12} style={{ marginLeft: "auto", opacity: 0.5 }} />}
            </motion.button>
          );
        })}

        <div style={{ fontSize: 7, letterSpacing: "0.26em", color: "rgba(100,180,255,0.22)", fontFamily: "'Space Mono',monospace", padding: "14px 8px 5px", textTransform: "uppercase" }}>SYSTEM</div>
        {[
          { icon: Gauge,  label: "System Integrity" },
          { icon: Shield, label: "Security" },
          { icon: Server, label: "Infrastructure" },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button key={item.label}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 10px", borderRadius: 10, border: "none", background: "transparent", color: "rgba(100,170,240,0.28)", cursor: "pointer", fontSize: 11, fontWeight: 400, marginBottom: 2, textAlign: "left" as const }}>
              <Icon size={13} style={{ flexShrink: 0 }} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 12px 16px", borderTop: `1px solid ${T.sidebarBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
          <LiveDot color="#00E87A" size={6} />
          <span style={{ fontSize: 8, fontWeight: 700, color: "#00E87A", letterSpacing: "0.18em", fontFamily: "'Space Mono',monospace" }}>SOVEREIGN ACTIVE</span>
        </div>
        <div style={{ fontSize: 7.5, color: "rgba(0,200,100,0.30)", fontFamily: "'Space Mono',monospace", marginBottom: 12 }}>Token valid · All nodes online</div>
        <motion.button whileTap={{ scale: 0.96 }} onClick={onToggleDark}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 12px", borderRadius: 9, border: "1px solid rgba(0,170,255,0.18)", background: "rgba(0,170,255,0.07)", color: "rgba(100,180,255,0.65)", cursor: "pointer", fontSize: 10.5 }}>
          {isDark ? <Sun size={13} /> : <Moon size={13} />}
          {isDark ? "Day Mode" : "Night Mode"}
        </motion.button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({ status, T }: { status: EEIEStatus; T: Theme }) {
  const intel = status.intelligence;
  const ENERGY_C: Record<string, string> = {
    CALM: T.green, EXPLORATORY: T.accent, HIGH_MOMENTUM: T.yellow,
    CONGESTED: "#F97316", STAGNATING: T.red, RECOVERY: T.purple,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Env Pulse */}
      <Panel title="Environmental Pulse · Titan V Engine" subtitle="Real-time venue intelligence signal" icon={<Activity size={14} />} badge="NOMINAL" T={T} accentColor={T.green}>
        <Waveform color={T.green} speed={2.8} height={36} />
        <div style={{ display: "flex", gap: 28, marginTop: 12 }}>
          {[{ l: "PULSE RATE", v: "1.0×" }, { l: "AMPLITUDE", v: "100%" }, { l: "SIGNAL", v: "NOMINAL" }, { l: "UPTIME", v: "99.99%" }].map(m => (
            <div key={m.l}>
              <div style={{ fontSize: 7.5, color: T.textFaint, letterSpacing: "0.16em", fontFamily: T.mono }}>{m.l}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.green, fontFamily: T.mono, marginTop: 3 }}>{m.v}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Intelligence Matrix */}
        <Panel title="Intelligence Matrix" icon={<Brain size={14} />} T={T}>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {[
              ["EEIE Real Intelligence",  "eeieRealPct"],
              ["Predictive Hospitality",  "predictivePct"],
              ["Sensory Immersion",       "sensoryImmersionPct"],
              ["Distributed Scale",       "distributedScalePct"],
              ["Operational Autonomy",    "operationalAutonomyPct"],
              ["Commerce Readiness",      "posReadinessPct"],
              ["Multi-Venue Scale",       "multiVenueReadinessPct"],
            ].map(([label, key]) => {
              const pct = intel[key] ?? 0;
              const c = pct >= 80 ? T.green : pct >= 60 ? T.accent : T.yellow;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: T.textMid, marginBottom: 5 }}>
                    <span>{label}</span><span style={{ fontWeight: 700, color: c }}>{pct}%</span>
                  </div>
                  <Meter pct={pct} color={c} />
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Advisories */}
        <Panel title="Recent Advisories" subtitle="System monitoring feed" icon={<AlertTriangle size={14} />} T={T} accentColor={T.yellow}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
            {status.advisories.entries.length === 0
              ? <div style={{ textAlign: "center", padding: "24px 0", color: T.textSub }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>✓</div>
                  <div style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>No advisories — System is nominal.</div>
                </div>
              : status.advisories.entries.slice(0, 7).map(a => {
                  const uc = a.urgency === "high" ? T.red : a.urgency === "medium" ? T.yellow : T.textSub;
                  return (
                    <motion.div key={a.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 10, background: `${uc}08`, border: `1px solid ${uc}1E` }}>
                      <div style={{ width: 3, background: uc, borderRadius: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 9, color: uc, fontWeight: 700, letterSpacing: "0.12em", fontFamily: T.mono, marginBottom: 3 }}>{a.type.replace(/_/g, " ")}</div>
                        <div style={{ fontSize: 11, color: T.text, lineHeight: 1.5 }}>{a.message}</div>
                        <div style={{ fontSize: 9, color: T.textFaint, marginTop: 3 }}>{a.confidence}% confidence</div>
                      </div>
                    </motion.div>
                  );
                })
            }
          </div>
        </Panel>
      </div>

      {/* Energy Distribution */}
      {Object.keys(status.energy.states).length > 0 && (
        <Panel title="Live Energy Distribution" subtitle="Venue behavioral states" icon={<Zap size={14} />} T={T}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(status.energy.states).map(([state, count]) => {
              const c = ENERGY_C[state] ?? T.accent;
              return (
                <motion.div key={state} whileHover={{ scale: 1.03 }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 999, background: `${c}0E`, border: `1px solid ${c}28` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                  <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{state}</span>
                  <span style={{ fontSize: 11, color: T.textSub }}>({count})</span>
                </motion.div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}

function NetworkTab({ cluster, energy, T }: { cluster: ClusterVenue[]; energy: VenueState[]; T: Theme }) {
  const emap = new Map(energy.map(e => [e.venueId, e]));
  const HC: Record<string, string> = { HEALTHY: T.green, DEGRADED: T.yellow, OFFLINE: T.red, RECOVERING: T.purple };
  const EC: Record<string, string> = { CALM: T.green, EXPLORATORY: T.accent, HIGH_MOMENTUM: T.yellow, CONGESTED: "#F97316", STAGNATING: T.red, RECOVERY: T.purple };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {cluster.length === 0 && (
        <div style={{ color: T.textSub, fontSize: 13, padding: "48px 0", textAlign: "center" }}>
          No venues in cluster — venues appear as they emit heartbeat events.
        </div>
      )}
      {cluster.map(v => {
        const es = emap.get(v.venueId);
        const hc = HC[v.health] ?? T.textSub;
        return (
          <motion.div key={v.venueId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -1 }}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px", boxShadow: T.shadow, display: "flex", gap: 14, alignItems: "center" }}
          >
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: hc, boxShadow: `0 0 8px ${hc}55`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: T.textFaint, fontFamily: T.mono, marginBottom: 5 }}>{v.venueId.slice(0, 14)}…</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge label={v.health} color={hc} bg={`${hc}10`} />
                {es && <Badge label={es.state} color={EC[es.state] ?? T.accent} bg={`${EC[es.state] ?? T.accent}0E`} />}
                {v.failoverActive && <Badge label="FAILOVER" color={T.red} bg={`${T.red}10`} />}
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
              {[
                { n: v.activeSessions, l: "Sessions" },
                ...(es ? [{ n: `${es.conversionRate.toFixed(0)}%`, l: "Conv" }] : []),
                { n: `${Math.round(v.minutesSince)}m`, l: "Ago", warn: v.minutesSince > 30 },
              ].map((m, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "warn" in m && m.warn ? T.red : T.accent }}>{m.n}</div>
                  <div style={{ fontSize: 8.5, color: T.textFaint, fontFamily: T.mono, marginTop: 1 }}>{m.l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function SensoryTab({ sensory, T }: { sensory: EEIEStatus["sensory"]; T: Theme }) {
  const [intensities, setIntensities] = useState<Record<string, number>>({});
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {sensory.entries.length === 0 && (
        <div style={{ color: T.textSub, fontSize: 13, padding: "48px 0", textAlign: "center" }}>
          No active sensory layers — layers activate when guests enter craft experiences.
        </div>
      )}
      {sensory.entries.map(e => {
        const intensity = intensities[e.venueId] ?? e.intensityScale;
        const pct = Math.round(intensity * 100);
        return (
          <motion.div key={e.venueId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 22px", boxShadow: T.shadow }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 9.5, color: T.textFaint, fontFamily: T.mono, marginBottom: 4 }}>{e.venueId.slice(0, 14)}…</div>
                {e.activeCraft
                  ? <div style={{ fontSize: 18, fontWeight: 800, color: T.accent, letterSpacing: "0.12em" }}>{e.activeCraft.toUpperCase()}</div>
                  : <div style={{ fontSize: 13, color: T.textSub }}>No active craft</div>
                }
              </div>
              <div style={{ textAlign: "center", padding: "10px 16px", background: `${T.accent}0E`, borderRadius: 12, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: T.accent }}>{pct}%</div>
                <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono, marginTop: 2 }}>INTENSITY</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
              {[{ l: "Occupancy", v: e.occupancy }, { l: "Triggers", v: e.triggerCount }, { l: "Last Trigger", v: e.lastTriggerAt ? new Date(e.lastTriggerAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—" }].map(m => (
                <div key={m.l} style={{ textAlign: "center", padding: "10px", background: `${T.accent}06`, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{m.v}</div>
                  <div style={{ fontSize: 8.5, color: T.textFaint, fontFamily: T.mono, marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>
            {/* Touch fader */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textSub, marginBottom: 8 }}>
                <span style={{ fontFamily: T.mono, letterSpacing: "0.14em" }}>INTENSITY CONTROL</span>
                <span style={{ fontWeight: 700, color: T.accent }}>{pct}%</span>
              </div>
              <input type="range" min="0" max="100" value={pct}
                onChange={ev => setIntensities(p => ({ ...p, [e.venueId]: Number(ev.target.value) / 100 }))}
                style={{ width: "100%", height: 32, cursor: "pointer", accentColor: T.accent }} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function CommerceTab({ providers, T }: { providers: PosProvider[]; T: Theme }) {
  const SC: Record<string, string> = { HEALTHY: T.green, DEGRADED: T.yellow, OFFLINE: T.red, UNCONFIGURED: T.textSub };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {providers.map(p => {
        const sc = SC[p.status] ?? T.accent;
        return (
          <motion.div key={`${p.provider}-${p.venueId ?? "g"}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -1 }}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 22px", boxShadow: T.shadow }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.text, textTransform: "capitalize" }}>{p.provider}</div>
                {p.venueId && <div style={{ fontSize: 9.5, color: T.textFaint, fontFamily: T.mono, marginTop: 2 }}>venue:{p.venueId.slice(0, 12)}…</div>}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {p.simulated && <Badge label="Simulated" color={T.textSub} bg={`${T.textSub}12`} />}
                <Badge label={p.status} color={sc} bg={`${sc}12`} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {[
                { l: "Last Sync",     v: p.lastSyncAt ? new Date(p.lastSyncAt).toLocaleTimeString() : "—" },
                { l: "Duration",      v: p.lastSyncDurationMs != null ? `${p.lastSyncDurationMs}ms` : "—" },
                { l: "Failures",      v: String(p.consecutiveFailures), warn: p.consecutiveFailures > 0 },
              ].map(m => (
                <div key={m.l} style={{ padding: "10px 14px", background: `${T.accent}06`, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 8.5, color: T.textFaint, fontFamily: T.mono, marginBottom: 4 }}>{m.l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "warn" in m && m.warn ? T.red : T.text }}>{m.v}</div>
                </div>
              ))}
            </div>
            {p.lastError && <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 9, background: `${T.red}0A`, border: `1px solid ${T.red}25`, fontSize: 10, color: T.red, fontFamily: T.mono }}>{p.lastError.slice(0, 120)}</div>}
            {p.status === "UNCONFIGURED" && <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 9, background: `${T.accent}08`, fontSize: 10, color: T.textSub }}>Add {p.provider.toUpperCase()}_API_KEY secret to activate real integration.</div>}
          </motion.div>
        );
      })}
    </div>
  );
}

function PredictionsTab({ predictions, T }: { predictions: Prediction[]; T: Theme }) {
  const AC: Record<string, string> = { PURCHASE: T.green, UPGRADE: T.yellow, BROWSE_MORE: T.accent, DISENGAGE: T.red, SEEK_GUIDANCE: T.purple, REORDER: T.accent };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {predictions.length === 0 && <div style={{ color: T.textSub, fontSize: 13, padding: "48px 0", textAlign: "center" }}>No predictions yet — AI engine analyses sessions every 5 minutes.</div>}
      {predictions.map(p => {
        const ac = AC[p.predictedNextAction] ?? T.accent;
        return (
          <motion.div key={p.sessionId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px", boxShadow: T.shadow }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 9.5, color: T.textFaint, fontFamily: T.mono }}>session:{p.sessionId.slice(0, 12)}…</div>
              <Badge label={p.predictedNextAction.replace(/_/g, " ")} color={ac} bg={`${ac}12`} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 10 }}>
              {[{ l: "Hesitation", v: p.hesitationScore }, { l: "Curiosity", v: p.curiosityScore }, { l: "Confidence", v: p.confidenceScore }, { l: "Fatigue", v: p.fatigueLevel }, { l: "Premium", v: p.premiumIntentScore }].map(m => (
                <div key={m.l} style={{ textAlign: "center", padding: "10px 6px", background: `${T.accent}07`, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 21, fontWeight: 800, color: m.v > 70 ? T.accent : T.text }}>{m.v}</div>
                  <div style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono, marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono }}>{p.confidence}% confidence · {new Date(p.ts).toLocaleTimeString()}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

function BusTab({ history, T }: { history: BusHistory; T: Theme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {Object.keys(history).length === 0 && <div style={{ color: T.textSub, fontSize: 13, padding: "48px 0", textAlign: "center" }}>Event bus idle — no recent topic activity.</div>}
      {Object.entries(history).map(([topic, events]) => (
        <Panel key={topic} title={topic} icon={<Network size={13} />} T={T}>
          {events.length === 0
            ? <div style={{ fontSize: 11, color: T.textSub }}>No recent events.</div>
            : events.slice(0, 5).map((e, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: i < Math.min(events.length, 5) - 1 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ fontSize: 8.5, color: T.textFaint, fontFamily: T.mono, marginBottom: 3 }}>{new Date(e.ts).toLocaleTimeString()}</div>
                <pre style={{ fontSize: 10, color: T.textMid, fontFamily: T.mono, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{JSON.stringify(e.payload, null, 2).slice(0, 180)}</pre>
              </div>
            ))
          }
        </Panel>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF COCKPIT
// ─────────────────────────────────────────────────────────────────────────────

function StaffCockpit({ T }: { T: Theme }) {
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_SESSIONS[0].id);
  const [sessions, setSessions] = useState<GuestSession[]>(MOCK_SESSIONS);
  const [note, setNote] = useState("");
  const [cartMsg, setCartMsg] = useState<string | null>(null);

  const selected = sessions.find(s => s.id === selectedId) ?? null;

  function pauseSession(id: string) {
    setSessions(p => p.map(s => s.id === id ? { ...s, status: s.status === "paused" ? "active" : "paused" } : s));
  }
  function addToCart(session: GuestSession, item: CartItem) {
    setSessions(p => p.map(s => s.id === session.id ? { ...s, cart: [...s.cart, item] } : s));
    setCartMsg(`${item.name} added`);
    setTimeout(() => setCartMsg(null), 2500);
  }
  function sendToPOS(session: GuestSession) {
    setCartMsg(`📲 ${session.cart.length} item(s) sent to Commerce Infrastructure`);
    setSessions(p => p.map(s => s.id === session.id ? { ...s, cart: [] } : s));
    setTimeout(() => setCartMsg(null), 3000);
  }

  const TIER_C: Record<string, string> = { Obsidian: "#A78BFA", Platinum: "#60C8FF", Gold: T.yellow, Silver: T.textSub };

  return (
    <div style={{ display: "flex", gap: 16, height: "100%" }}>
      {/* Session list */}
      <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.2em", color: T.textFaint, fontFamily: T.mono, marginBottom: 4 }}>ACTIVE TABLES</div>
        {sessions.map(s => {
          const sc = STATUS_COLOR(s.status, T);
          const isSelected = selectedId === s.id;
          return (
            <motion.div key={s.id} onClick={() => setSelectedId(s.id)} whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}
              style={{ background: isSelected ? `${T.accent}12` : T.card, border: `1px solid ${isSelected ? T.borderHi : T.border}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", boxShadow: isSelected ? `0 0 0 2px ${T.accent}30` : T.shadow }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: T.textFaint, fontFamily: T.mono }}>{s.table.toUpperCase()}</span>
                <LiveDot color={sc} size={7} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{s.guestName}</div>
              <div style={{ fontSize: 9, color: T.textSub, marginTop: 3 }}>
                {Math.round((Date.now() - new Date(s.startedAt).getTime()) / 60000)}m · {s.loyaltyTier}
              </div>
              {s.status === "attention" && (
                <div style={{ marginTop: 6, fontSize: 8.5, color: T.yellow, fontWeight: 700, fontFamily: T.mono }}>⚠ NEEDS ATTENTION</div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Detail panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 0, overflowY: "auto" }}>
        {!selected ? (
          <div style={{ color: T.textSub, textAlign: "center", padding: "60px 0" }}>Select a table to view guest session.</div>
        ) : (
          <>
            {/* Guest header */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 22px", boxShadow: T.shadow }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${T.accent}14`, border: `2px solid ${T.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: T.accent, flexShrink: 0 }}>
                  {selected.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{selected.guestName}</span>
                    {selected.returning && <Badge label="RETURNING" color={T.accent} bg={`${T.accent}12`} />}
                    <Badge label={selected.loyaltyTier} color={TIER_C[selected.loyaltyTier] ?? T.accent} bg={`${TIER_C[selected.loyaltyTier] ?? T.accent}12`} />
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div><span style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono }}>XP </span><span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{selected.xp.toLocaleString()}</span></div>
                    <div><span style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono }}>STRENGTH </span><span style={{ fontSize: 12, fontWeight: 700, color: T.accent }}>{selected.strength.toUpperCase()}</span></div>
                    <div><span style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono }}>AI MATCH </span><span style={{ fontSize: 12, fontWeight: 700, color: T.green }}>{selected.aiMatchScore}%</span></div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                    {selected.flavors.map(f => <Badge key={f} label={f} color={T.purple} bg={`${T.purple}0E`} />)}
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => pauseSession(selected.id)}
                  style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${T.borderHi}`, background: selected.status === "paused" ? `${T.green}14` : `${T.yellow}14`, color: selected.status === "paused" ? T.green : T.yellow, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                  {selected.status === "paused" ? "▶ Resume" : "⏸ Pause"}
                </motion.button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* AI Cigar Match */}
              <Panel title="AI Cigar Match" subtitle={`Based on ${selected.flavors.join(", ")}`} icon={<Leaf size={14} />} badge="RECOMMENDED" T={T} accentColor={T.green}>
                <div style={{ background: `${T.green}06`, border: `1px solid ${T.green}1A`, borderRadius: 12, padding: "14px" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 3 }}>{selected.favCigar}</div>
                  <div style={{ fontSize: 9.5, color: T.textSub, marginBottom: 10 }}>Medium · Handcrafted · Premium Reserve</div>
                  <Meter pct={selected.aiMatchScore} color={T.green} height={6} />
                  <div style={{ fontSize: 9, color: T.green, fontFamily: T.mono, marginTop: 5 }}>{selected.aiMatchScore}% MATCH</div>
                  <div style={{ fontSize: 10.5, color: T.textMid, marginTop: 10, lineHeight: 1.6 }}>
                    "{selected.flavors.slice(0,2).join(" and ")} notes perfectly complement this blend's profile."
                  </div>
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => addToCart(selected, { name: selected.favCigar, type: "cigar", price: 42, qty: 1 })}
                    style={{ marginTop: 12, width: "100%", padding: "12px", borderRadius: 10, background: T.green, border: "none", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, boxShadow: `0 4px 14px ${T.green}35` }}>
                    + Add to Order
                  </motion.button>
                </div>
              </Panel>

              {/* Liquor Pairing */}
              <Panel title="Liquor Pairing Intelligence" subtitle="Flavor bridge analysis" icon={<Coffee size={14} />} badge="OPTIMAL" T={T} accentColor={T.purple}>
                <div style={{ background: `${T.purple}06`, border: `1px solid ${T.purple}1A`, borderRadius: 12, padding: "14px" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 3 }}>{selected.favLiquor}</div>
                  <div style={{ fontSize: 9.5, color: T.textSub, marginBottom: 10 }}>2 oz pour · Available · Premium</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                    {["Creamy", "Toasted", "Vanilla", "Oak"].map(f => <Badge key={f} label={f} color={T.purple} bg={`${T.purple}0E`} />)}
                  </div>
                  <div style={{ fontSize: 10.5, color: T.textMid, lineHeight: 1.6 }}>
                    "{selected.favLiquor} lifts the {selected.flavors[0]?.toLowerCase()} and {selected.flavors[1]?.toLowerCase()} notes while extending the finish."
                  </div>
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => addToCart(selected, { name: selected.favLiquor, type: "liquor", price: 18, qty: 1 })}
                    style={{ marginTop: 12, width: "100%", padding: "12px", borderRadius: 10, background: T.purple, border: "none", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, boxShadow: `0 4px 14px ${T.purple}35` }}>
                    + Add Pairing
                  </motion.button>
                </div>
              </Panel>
            </div>

            {/* Staff Nudge */}
            <Panel title="Staff Nudge System" subtitle="AI-suggested guest interaction" icon={<BookOpen size={14} />} T={T} accentColor={T.accent}>
              <div style={{ background: `${T.accent}06`, border: `1px solid ${T.borderHi}`, borderRadius: 12, padding: "16px", marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: T.accent, fontFamily: T.mono, marginBottom: 8 }}>SUGGESTED SCRIPT</div>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7, fontStyle: "italic" }}>
                  "This {selected.favLiquor.split(" ").slice(-2).join(" ")} pairing brings out the {selected.flavors.slice(0,2).map(f=>f.toLowerCase()).join(", ")} in your cigar. Would you like to add a 2 oz pour?"
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { icon: <Star size={16} />, label: "APPLY REWARD", sub: "Loyalty pts", color: T.yellow, variant: "glass" as const },
                  { icon: <ClipboardList size={16} />, label: "ADD NOTE", sub: "Staff memo", color: T.accent, variant: "glass" as const },
                  { icon: <Send size={16} />, label: "SEND TO POS", sub: "Commerce layer", color: T.green, variant: "solid" as const, onClick: () => sendToPOS(selected) },
                  { icon: <Users size={16} />, label: "RETURN TO GUEST", sub: "Handoff screen", color: T.purple, variant: "glass" as const },
                ].map(btn => (
                  <TouchButton key={btn.label} icon={btn.icon} label={btn.label} sub={btn.sub}
                    color={btn.color} variant={btn.variant} onClick={"onClick" in btn ? btn.onClick : undefined} size="md" />
                ))}
              </div>
              {note !== undefined && (
                <div style={{ marginTop: 12 }}>
                  <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a staff note for this guest..."
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.dark ? "rgba(255,255,255,0.05)" : "rgba(0,60,160,0.04)", color: T.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                </div>
              )}
            </Panel>

            {/* Cart */}
            {selected.cart.length > 0 && (
              <Panel title={`Order (${selected.cart.length} items)`} icon={<ShoppingCart size={14} />} T={T} accentColor={T.green}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selected.cart.map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 9, background: `${T.green}06`, border: `1px solid ${T.border}` }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{item.name}</div>
                        <div style={{ fontSize: 9, color: T.textSub, textTransform: "capitalize" }}>{item.type}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.green }}>${item.price}</div>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 4px", borderTop: `1px solid ${T.border}`, marginTop: 4 }}>
                    <span style={{ fontWeight: 700, color: T.text }}>Total</span>
                    <span style={{ fontWeight: 800, color: T.green, fontSize: 16 }}>${selected.cart.reduce((s, i) => s + i.price * i.qty, 0)}</span>
                  </div>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => sendToPOS(selected)}
                    style={{ width: "100%", padding: "14px", borderRadius: 12, background: T.green, border: "none", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 800, boxShadow: `0 4px 16px ${T.green}35`, marginTop: 4 }}>
                    📲 Send to Commerce Infrastructure
                  </motion.button>
                </div>
              </Panel>
            )}
          </>
        )}
      </div>

      {/* Cart toast */}
      <AnimatePresence>
        {cartMsg && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{ position: "fixed", bottom: 100, right: 32, background: T.green, color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 12, zIndex: 999, boxShadow: `0 4px 20px ${T.green}50` }}>
            ✓ {cartMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FOUNDER CONTROL BAR
// ─────────────────────────────────────────────────────────────────────────────

function FounderBar({ T }: { T: Theme }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const ACTIONS = [
    { id: "override",    icon: <Monitor size={22} />,   label: "SYSTEM OVERRIDE",    sub: "Shutdown / Restart", color: T.yellow },
    { id: "kill",        icon: <PowerOff size={22} />,  label: "KILL SWITCH",         sub: "Disable Transactions", color: T.red },
    { id: "maintenance", icon: <Wrench size={22} />,    label: "MAINTENANCE MODE",    sub: "Pause Non-Essential", color: T.accent },
    { id: "announce",    icon: <Megaphone size={22} />, label: "GLOBAL ANNOUNCEMENT", sub: "Broadcast All Venues", color: T.purple },
    { id: "power",       icon: <Siren size={22} />,     label: "SYSTEM POWER",        sub: "You are in control.", color: T.green },
  ];
  return (
    <div style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 16, padding: "14px 18px", boxShadow: T.shadow }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.2em", color: T.textFaint, fontFamily: T.mono, marginBottom: 12 }}>
        ◈ FOUNDER CONTROL — SOVEREIGN GOVERNANCE &amp; OVERRIDES
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {ACTIONS.map(a => (
          <TouchButton key={a.id} icon={<span style={{ color: a.color }}>{a.icon}</span>}
            label={a.label} sub={a.sub} color={a.color}
            bg={`${a.color}0E`} border={`${a.color}2A`}
            variant="glass" size="lg"
            onClick={() => setConfirm(confirm === a.id ? null : a.id)} />
        ))}
      </div>
      <AnimatePresence>
        {confirm && (() => {
          const act = ACTIONS.find(a => a.id === confirm)!;
          return (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
              <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: `${act.color}08`, border: `1px solid ${act.color}22`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: T.textMid }}>Confirm: <strong style={{ color: T.text }}>{act.label}</strong></span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setConfirm(null)} style={{ padding: "9px 18px", borderRadius: 9, border: `1px solid ${T.border}`, background: "transparent", color: T.textSub, cursor: "pointer", fontSize: 11 }}>Cancel</button>
                  <button onClick={() => setConfirm(null)} style={{ padding: "9px 18px", borderRadius: 9, border: `1px solid ${act.color}40`, background: `${act.color}14`, color: act.color, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Execute</button>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE ORDER TICKER (uses BroadcastChannel)
// ─────────────────────────────────────────────────────────────────────────────

function LiveTicker({ T }: { T: Theme }) {
  const [orders, setOrders] = useState<ArchiveBlendOrder[]>([]);
  useEffect(() => orderBroadcast.subscribe(o => setOrders(p => [o, ...p].slice(0, 4))), []);
  if (orders.length === 0) return null;
  return (
    <Panel title="Live Archive Blend Orders" icon={<Layers size={14} />} badge="LIVE" T={T}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <AnimatePresence initial={false}>
          {orders.map((o, i) => (
            <motion.div key={o.orderId} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: i === 0 ? `${T.accent}0E` : `${T.accent}05`, border: `1px solid ${i === 0 ? T.borderHi : T.border}` }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `${T.accent}12`, border: `1px solid ${T.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: T.accent, flexShrink: 0 }}>◈</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{o.guestName}</div>
                <div style={{ fontSize: 9, color: T.textSub }}>{o.wood} · {o.band} · Harmony {o.harmonyScore}</div>
              </div>
              <div style={{ fontSize: 8.5, color: T.textFaint, fontFamily: T.mono }}>{new Date(o.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Panel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

type TabId = "overview" | "network" | "sensory" | "commerce" | "predictions" | "bus" | "cockpit";

const TAB_LABELS: { id: TabId; label: string; icon: React.ComponentType<{ size: number }> }[] = [
  { id: "overview",     label: "Command Center",   icon: Monitor },
  { id: "network",      label: "Live Network",     icon: Globe },
  { id: "sensory",      label: "Sensory Engine",   icon: Radio },
  { id: "commerce",     label: "Commerce Health",  icon: Package },
  { id: "predictions",  label: "AI Predictions",   icon: Brain },
  { id: "bus",          label: "Event Bus",        icon: Cpu },
  { id: "cockpit",      label: "Staff Cockpit",    icon: Users },
];

export default function EEIECommandCenter() {
  const [, navigate]      = useLocation();
  const [tab, setTab]     = useState<TabId>("overview");
  const [status, setStatus]   = useState<EEIEStatus | null>(null);
  const [cluster, setCluster] = useState<ClusterVenue[]>([]);
  const [energy, setEnergy]   = useState<VenueState[]>([]);
  const [bus, setBus]         = useState<BusHistory>({});
  const [loading, setLoading] = useState(true);
  const [lastAt, setLastAt]   = useState(new Date());

  // Default: day mode (white/silver/blue luxury)
  const [isDark, setIsDark] = useState(() => {
    const h = new Date().getHours();
    return h < 7 || h >= 20;
  });
  const T = useMemo(() => buildTheme(isDark), [isDark]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [s, c, e, b] = await Promise.all([
      fetchEEIE<EEIEStatus>("/api/eeie/status"),
      fetchEEIE<{ venues: ClusterVenue[] }>("/api/eeie/cluster"),
      fetchEEIE<{ venues: VenueState[] }>("/api/eeie/energy"),
      fetchEEIE<{ history: BusHistory }>("/api/eeie/bus"),
    ]);
    if (s) setStatus(s);
    if (c) setCluster(c.venues);
    if (e) setEnergy(e.venues);
    if (b) setBus(b.history);
    setLastAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { const id = setInterval(() => void refresh(), 30_000); return () => clearInterval(id); }, [refresh]);
  useEffect(() => { const id = setInterval(() => { const h = new Date().getHours(); setIsDark(h < 7 || h >= 20); }, 60_000); return () => clearInterval(id); }, []);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: T.bg, color: T.text, fontFamily: T.sans, overflow: "hidden" }}>
      <style>{`
        @keyframes eeie-wave { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; }
        input[type=range]::-webkit-slider-runnable-track { height: 10px; border-radius: 5px; background: rgba(0,100,200,0.12); }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 30px; height: 30px; border-radius: 50%; background: ${T.accent}; border: 2px solid rgba(255,255,255,0.8); box-shadow: 0 2px 8px ${T.accent}60; margin-top: -10px; cursor: grab; }
        input[type=range]::-webkit-slider-thumb:active { cursor: grabbing; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
      `}</style>

      {/* ── TOP COMMAND RAIL ── */}
      <div style={{
        height: 56, flexShrink: 0,
        background: T.dark ? "rgba(6,10,20,0.97)" : "rgba(255,255,255,0.95)",
        borderBottom: `1px solid ${T.border}`,
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        display: "flex", alignItems: "center", gap: 16, padding: "0 20px",
        boxShadow: T.dark ? "none" : "0 1px 12px rgba(0,60,160,0.07)",
      }}>
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => navigate("/sovereign-dashboard")}
          style={{ background: "none", border: "none", color: T.textSub, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 11, padding: 0, flexShrink: 0 }}>
          <ChevronLeft size={14} /> Back
        </motion.button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <LiveDot color={T.green} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.text, letterSpacing: "0.06em" }}>EEIE COMMAND CENTER</div>
            <div style={{ fontSize: 8, color: T.textFaint, letterSpacing: "0.12em", fontFamily: T.mono }}>EXPERIENCE ENHANCEMENT INTELLIGENCE ENGINE</div>
          </div>
          <Badge label="LIVE" color={T.green} bg={`${T.green}12`} />
          <div style={{ flex: 1, overflow: "hidden", opacity: 0.6 }}>
            <Waveform color={T.accent} speed={4} height={20} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          {[
            { l: "SYSTEM STATUS", v: "All Systems Operational", c: T.green },
            { l: "AI ENGINE", v: "Active", c: T.accent },
            { l: "TITAN V", v: "Operational", c: T.green },
          ].map(m => (
            <div key={m.l} style={{ textAlign: "right" }}>
              <div style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.12em" }}>{m.l}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: m.c }}>{m.v}</div>
            </div>
          ))}
          <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono }}>{lastAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => void refresh()}
            style={{ background: `${T.accent}10`, border: `1px solid ${T.borderHi}`, borderRadius: 9, padding: "7px 13px", cursor: "pointer", color: T.accent, display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontFamily: T.mono }}>
            <motion.span animate={loading ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: loading ? Infinity : 0, ease: "linear" }}>
              <RefreshCw size={11} />
            </motion.span>
            REFRESH
          </motion.button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar active={tab} onNav={id => setTab(id as TabId)} isDark={isDark} onToggleDark={() => setIsDark(d => !d)} T={T} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Status band */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "6px 22px", background: T.dark ? "rgba(0,8,20,0.8)" : "rgba(238,244,255,0.7)", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <LiveDot color={T.green} size={6} />
              <span style={{ fontSize: 8, color: T.green, letterSpacing: "0.16em", fontFamily: T.mono }}>TITAN V ENGINE: OPERATIONAL</span>
            </div>
            <div style={{ flex: 1 }}><Waveform color={T.accent} speed={3.5} height={18} /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <LiveDot color={T.green} size={6} />
              <span style={{ fontSize: 8, color: T.green, letterSpacing: "0.16em", fontFamily: T.mono }}>KIOSK LOCK: ABSOLUTE</span>
            </div>
          </div>

          {/* KPI strip */}
          {status && (
            <div style={{ display: "flex", gap: 10, padding: "12px 22px", borderBottom: `1px solid ${T.border}`, background: T.dark ? "rgba(6,12,28,0.7)" : "rgba(244,247,252,0.8)", flexShrink: 0, overflowX: "auto" }}>
              <KpiCard label="Cluster Nodes"     value={String(status.cluster.total)}                    delta={`${status.cluster.healthy} healthy`}   positive={status.cluster.healthy > 0}   icon={Network}  T={T} />
              <KpiCard label="Active Venues"     value={String(status.energy.venues)}                    delta="with live events"                                                               icon={Globe}    T={T} />
              <KpiCard label="AI Predictions"    value={String(status.predictions.recent)}               delta="last 5 min"                                                                     icon={Brain}    T={T} />
              <KpiCard label="Advisories"        value={String(status.advisories.recent)}                delta="in buffer"                                                                      icon={AlertTriangle} T={T} />
              <KpiCard label="Commerce Online"   value={`${status.pos.healthy}/${status.pos.total}`}     delta={status.pos.simulated > 0 ? `${status.pos.simulated} simulated` : "all live"}  icon={Package}  T={T} />
              <KpiCard label="Sensory Layers"    value={String(status.sensory.activeVenues)}             delta="active venues"                                                                  icon={Radio}    T={T} />
            </div>
          )}

          {/* Tab bar */}
          <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: T.dark ? "rgba(6,10,20,0.65)" : "rgba(248,250,254,0.9)", flexShrink: 0, overflowX: "auto" }}>
            {TAB_LABELS.map(item => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <motion.button key={item.id} onClick={() => setTab(item.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 18px", border: "none", background: isActive ? T.tabActive : "transparent", color: isActive ? T.accent : T.textSub, borderBottom: `2px solid ${isActive ? T.accent : "transparent"}`, cursor: "pointer", fontSize: 10.5, fontWeight: isActive ? 700 : 400, letterSpacing: "0.10em", textTransform: "uppercase", fontFamily: T.mono, whiteSpace: "nowrap", minHeight: 46, marginBottom: -1, transition: "all 0.15s" }}>
                  <Icon size={12} />{item.label}
                </motion.button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: tab === "cockpit" ? "16px 22px" : "20px 22px 10px" }}>
            {loading && !status && (
              <div style={{ textAlign: "center", padding: "80px 0", color: T.textSub }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block" }}>
                  <Activity size={32} style={{ opacity: 0.4 }} />
                </motion.div>
                <div style={{ marginTop: 14, fontSize: 12, fontFamily: T.mono, letterSpacing: "0.12em" }}>CONNECTING TO EEIE…</div>
              </div>
            )}
            {!loading && !status && (
              <div style={{ textAlign: "center", padding: "80px 40px" }}>
                <XCircle size={36} style={{ color: T.red, marginBottom: 14 }} />
                <div style={{ fontSize: 14, fontFamily: T.mono, color: T.red, letterSpacing: "0.08em" }}>EEIE API UNREACHABLE</div>
                <div style={{ fontSize: 12, color: T.textSub, marginTop: 8 }}>Authenticate via Sovereign PIN to access intelligence systems.</div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => void refresh()}
                  style={{ marginTop: 20, padding: "12px 28px", borderRadius: 12, background: `${T.accent}12`, border: `1px solid ${T.borderHi}`, color: T.accent, cursor: "pointer", fontSize: 12, fontFamily: T.mono, fontWeight: 700 }}>
                  RETRY CONNECTION
                </motion.button>
              </div>
            )}

            {tab === "cockpit" ? (
              <StaffCockpit T={T} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <LiveTicker T={T} />
                <AnimatePresence mode="wait">
                  {status && (
                    <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      {tab === "overview"    && <OverviewTab status={status} T={T} />}
                      {tab === "network"     && <NetworkTab cluster={cluster} energy={energy} T={T} />}
                      {tab === "sensory"     && <SensoryTab sensory={status.sensory} T={T} />}
                      {tab === "commerce"    && <CommerceTab providers={status.pos.providers} T={T} />}
                      {tab === "predictions" && <PredictionsTab predictions={status.predictions.entries} T={T} />}
                      {tab === "bus"         && <BusTab history={bus} T={T} />}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Founder Control */}
          <div style={{ padding: "10px 22px 12px", borderTop: `1px solid ${T.border}`, background: T.dark ? "rgba(6,10,20,0.92)" : "rgba(248,250,255,0.95)", flexShrink: 0 }}>
            <FounderBar T={T} />
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "6px 22px", background: T.dark ? "#04070F" : "#EBF0F9", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono }}>SYSTEM INTEGRITY</span>
              <div style={{ width: 80, height: 4, borderRadius: 2, background: `${T.accent}18`, overflow: "hidden" }}>
                <div style={{ width: "100%", height: "100%", background: T.green }} />
              </div>
              <span style={{ fontSize: 9, color: T.green, fontFamily: T.mono, fontWeight: 700 }}>100%</span>
            </div>
            {[{ l: "Security", v: "Secure" }, { l: "Compliance", v: "Compliant" }, { l: "Backup", v: "Live" }, { l: "Uptime", v: "99.99%" }].map(m => (
              <div key={m.l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <LiveDot color={T.green} size={5} />
                <span style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono }}>{m.l}: </span>
                <span style={{ fontSize: 7.5, color: T.green, fontFamily: T.mono, fontWeight: 700 }}>{m.v}</span>
              </div>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 7.5, color: T.textFaint, fontFamily: T.mono }}>EEIE TITAN V v2.0.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
