/**
 * EEIE Command Center — Sovereign Intelligence Dashboard
 * Adaptive dark/light theme: deep navy + cyan (night) ↔ blue-white (day)
 * Touch-first: 48px+ targets, large sliders, fader controls.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { orderBroadcast, type ArchiveBlendOrder } from "@/lib/orderBroadcast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Zap, Radio, Package, Brain, Network, RefreshCw,
  XCircle, Cpu, Shield, BarChart3, Globe, AlertTriangle,
  Monitor, Sun, Moon, ChevronRight, Server,
  PowerOff, Megaphone, Wrench, Siren, Gauge,
} from "lucide-react";

// ── Adaptive theme ─────────────────────────────────────────────────────────────
function buildTheme(dark: boolean) {
  return dark ? {
    bg:        "#070B14",
    bg2:       "#0C1322",
    sidebar:   "#080E1A",
    card:      "rgba(13,25,50,0.80)",
    cardSolid: "#0D1932",
    border:    "rgba(0,180,255,0.12)",
    borderHi:  "rgba(0,212,255,0.40)",
    accent:    "#00D4FF",       // cyan
    accent2:   "#0066FF",       // blue
    accentDim: "rgba(0,212,255,0.55)",
    green:     "#00E87A",
    red:       "#FF4461",
    yellow:    "#FFD060",
    text:      "#D8EEFF",
    textSub:   "rgba(160,210,240,0.60)",
    textFaint: "rgba(90,150,200,0.38)",
    mono:      "'Space Mono','Fira Code',monospace",
    sans:      "system-ui,-apple-system,sans-serif",
    glow:      (c: string) => `0 0 14px ${c}55`,
  } : {
    bg:        "#EFF4FB",
    bg2:       "#E4EDF8",
    sidebar:   "#0D1932",
    card:      "rgba(255,255,255,0.92)",
    cardSolid: "#FFFFFF",
    border:    "rgba(0,80,200,0.10)",
    borderHi:  "rgba(0,100,220,0.35)",
    accent:    "#0056CC",
    accent2:   "#004AAA",
    accentDim: "rgba(0,86,204,0.60)",
    green:     "#008C4A",
    red:       "#CC1F3A",
    yellow:    "#C07800",
    text:      "#0A1628",
    textSub:   "rgba(15,50,120,0.55)",
    textFaint: "rgba(15,50,120,0.30)",
    mono:      "'Space Mono','Fira Code',monospace",
    sans:      "system-ui,-apple-system,sans-serif",
    glow:      (_c: string) => "none",
  };
}

type Theme = ReturnType<typeof buildTheme>;

// ── Auth-aware fetch ──────────────────────────────────────────────────────────
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

// ── Types ──────────────────────────────────────────────────────────────────────
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

// ── Micro components ──────────────────────────────────────────────────────────
function LiveDot({ color, size = 7 }: { color: string; size?: number }) {
  return (
    <motion.div
      animate={{ opacity: [1, 0.25, 1] }}
      transition={{ duration: 1.8, repeat: Infinity }}
      style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0 }}
    />
  );
}

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 999,
      background: bg, border: `1px solid ${color}55`,
      fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
      color, textTransform: "uppercase",
    }}>
      <LiveDot color={color} size={5} />
      {label}
    </span>
  );
}

function TouchBtn({
  icon, label, color, bg, border, onClick, disabled,
}: {
  icon: React.ReactNode; label: string; color: string; bg: string;
  border: string; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        padding: "16px 12px", borderRadius: 14,
        background: bg, border: `1px solid ${border}`,
        color, cursor: "pointer", minHeight: 80, minWidth: 90,
        flex: 1,
      }}
    >
      {icon}
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textAlign: "center" }}>{label}</span>
    </motion.button>
  );
}

function IntelBar({ label, pct, T }: { label: string; pct: number; T: Theme }) {
  const color = pct >= 80 ? T.green : pct >= 60 ? T.accent : T.red;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textSub, marginBottom: 5 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: `${T.accent}18`, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${color}, ${color}AA)` }}
        />
      </div>
    </div>
  );
}

// Touch slider for sensory faders
function Fader({
  label, value, onChange, color, T,
}: { label: string; value: number; onChange: (v: number) => void; color: string; T: Theme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textSub }}>
        <span style={{ fontFamily: T.mono }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range" min="0" max="100" value={Math.round(value * 100)}
        onChange={e => onChange(Number(e.target.value) / 100)}
        style={{
          width: "100%", height: 28, cursor: "pointer",
          accentColor: color, borderRadius: 14,
        }}
      />
    </div>
  );
}

// Scrolling waveform
function Waveform({ color, speed = 2 }: { color: string; speed?: number }) {
  return (
    <div style={{ width: "100%", height: 32, overflow: "hidden", position: "relative" }}>
      <div style={{ display: "flex", width: "200%", animation: `eeie-wave ${speed}s linear infinite` }}>
        {[0, 1].map(i => (
          <svg key={i} width="50%" height="32" viewBox="0 0 600 32" preserveAspectRatio="none" style={{ flexShrink: 0 }}>
            <path d="M0,16 Q75,2 150,16 Q225,30 300,16 Q375,2 450,16 Q525,30 600,16" fill={`${color}14`} />
            <path d="M0,16 Q75,2 150,16 Q225,30 300,16 Q375,2 450,16 Q525,30 600,16"
              fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.8" />
          </svg>
        ))}
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "overview",  icon: Monitor,       label: "Command Center" },
  { id: "venues",    icon: Globe,         label: "Live Network" },
  { id: "sensory",   icon: Radio,         label: "Sensory Engine" },
  { id: "pos",       icon: Package,       label: "POS Health" },
  { id: "predictions",icon: Brain,        label: "AI Predictions" },
  { id: "bus",       icon: Network,       label: "Event Bus" },
];

function Sidebar({ active, onNav, T, isDark, onToggleDark }: {
  active: string; onNav: (id: string) => void;
  T: Theme; isDark: boolean; onToggleDark: () => void;
}) {
  return (
    <div style={{
      width: 190, flexShrink: 0, background: T.sidebar,
      display: "flex", flexDirection: "column",
      borderRight: `1px solid rgba(0,200,255,0.08)`,
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid rgba(0,200,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "rgba(0,212,255,0.15)", border: "1px solid rgba(0,212,255,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Shield size={16} color="#00D4FF" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.2em", color: "#00D4FF", fontFamily: "'Space Mono',monospace" }}>EEIE</div>
            <div style={{ fontSize: 8, color: "rgba(0,212,255,0.45)", letterSpacing: "0.12em", fontFamily: "'Space Mono',monospace" }}>COMMAND CENTER</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        <div style={{ fontSize: 7.5, letterSpacing: "0.22em", color: "rgba(0,212,255,0.25)", fontFamily: "'Space Mono',monospace", padding: "10px 8px 6px", textTransform: "uppercase" }}>INTELLIGENCE</div>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active_ = active === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 10px", borderRadius: 9, border: "none",
                background: active_ ? "rgba(0,212,255,0.12)" : "transparent",
                color: active_ ? "#00D4FF" : "rgba(140,200,240,0.45)",
                cursor: "pointer", fontSize: 11, fontWeight: active_ ? 700 : 400,
                marginBottom: 2, textAlign: "left",
                borderLeft: `2px solid ${active_ ? "#00D4FF" : "transparent"}`,
              }}>
              <Icon size={14} style={{ flexShrink: 0 }} />
              {item.label}
            </button>
          );
        })}

        <div style={{ fontSize: 7.5, letterSpacing: "0.22em", color: "rgba(0,212,255,0.25)", fontFamily: "'Space Mono',monospace", padding: "16px 8px 6px", textTransform: "uppercase" }}>SYSTEM</div>
        {[
          { id: "integrity", icon: Gauge,  label: "System Integrity" },
          { id: "security",  icon: Shield, label: "Security" },
          { id: "server",    icon: Server, label: "Infrastructure" },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => {}}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 10px", borderRadius: 9, border: "none",
                background: "transparent",
                color: "rgba(100,180,230,0.35)",
                cursor: "pointer", fontSize: 11, fontWeight: 400, marginBottom: 2,
              }}>
              <Icon size={14} style={{ flexShrink: 0 }} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 12px 14px", borderTop: "1px solid rgba(0,200,255,0.08)" }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: "#00E87A", letterSpacing: "0.18em", fontFamily: "'Space Mono',monospace", marginBottom: 4 }}>● SOVEREIGN ACTIVE</div>
        <div style={{ fontSize: 8, color: "rgba(0,212,255,0.3)", fontFamily: "'Space Mono',monospace", marginBottom: 10 }}>Token valid · All nodes online</div>
        <button onClick={onToggleDark}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px", borderRadius: 8, border: "1px solid rgba(0,200,255,0.15)",
            background: "rgba(0,200,255,0.06)", color: "rgba(0,212,255,0.6)",
            cursor: "pointer", fontSize: 10,
          }}>
          {isDark ? <Sun size={12} /> : <Moon size={12} />}
          {isDark ? "Day Mode" : "Night Mode"}
        </button>
      </div>
    </div>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ label, value, delta, T }: { label: string; value: string; delta?: string; T: Theme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 8, letterSpacing: "0.16em", color: T.textFaint, fontFamily: T.mono, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: T.text, letterSpacing: "-0.01em" }}>{value}</div>
      {delta && <div style={{ fontSize: 9, color: T.green, fontFamily: T.mono }}>{delta}</div>}
    </div>
  );
}

// ── Panel card ─────────────────────────────────────────────────────────────────
function Panel({ title, icon, status, children, T, accent }: {
  title: string; icon: React.ReactNode; status?: string;
  children: React.ReactNode; T: Theme; accent?: string;
}) {
  const ac = accent ?? T.accent;
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, overflow: "hidden",
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: `1px solid ${T.border}`,
        background: `${ac}08`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ color: ac }}>{icon}</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: T.textSub, textTransform: "uppercase", fontFamily: T.mono }}>{title}</span>
        </div>
        {status && <Pill label={status} color={ac} bg={`${ac}14`} />}
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

// ── Live Order Ticker ─────────────────────────────────────────────────────────
function LiveOrderTicker({ T }: { T: Theme }) {
  const [orders, setOrders] = useState<ArchiveBlendOrder[]>([]);
  useEffect(() => orderBroadcast.subscribe(o => setOrders(p => [o, ...p].slice(0, 4))), []);
  if (orders.length === 0) return null;
  return (
    <Panel title="Live Archive Blend Orders" icon={<Activity size={13} />} status="LIVE" T={T}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <AnimatePresence initial={false}>
          {orders.map((o, i) => (
            <motion.div key={o.orderId}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10, height: 0 }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10,
                background: i === 0 ? `${T.accent}10` : `${T.accent}05`,
                border: `1px solid ${i === 0 ? T.accent + "44" : T.border}`,
              }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: `${T.accent}14`, border: `1px solid ${T.accent}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: T.accent,
              }}>◈</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{o.guestName}</div>
                <div style={{ fontSize: 9, color: T.textSub }}>{o.wood} · {o.band} · Harmony {o.harmonyScore}</div>
              </div>
              <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono }}>
                {new Date(o.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Panel>
  );
}

// ── TABS ──────────────────────────────────────────────────────────────────────

function OverviewTab({ status, T }: { status: EEIEStatus; T: Theme }) {
  const intel = status.intelligence;
  const metrics = [
    { label: "CLUSTER NODES",   value: String(status.cluster.total),           sub: `${status.cluster.healthy} healthy` },
    { label: "ACTIVE VENUES",   value: String(status.energy.venues),           sub: "live events" },
    { label: "PREDICTIONS",     value: String(status.predictions.recent),       sub: "last 5 min" },
    { label: "ADVISORIES",      value: String(status.advisories.recent),        sub: "in buffer" },
    { label: "POS ONLINE",      value: `${status.pos.healthy}/${status.pos.total}`, sub: status.pos.simulated > 0 ? `${status.pos.simulated} simulated` : "all real" },
    { label: "SENSORY LAYERS",  value: String(status.sensory.activeVenues),     sub: "active venues" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <LiveOrderTicker T={T} />

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
        {metrics.map((m, i) => (
          <motion.div key={m.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", backdropFilter: "blur(12px)" }}
          >
            <div style={{ fontSize: 8, letterSpacing: "0.18em", color: T.textFaint, fontFamily: T.mono, marginBottom: 8 }}>{m.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: T.accent, letterSpacing: "-0.02em" }}>{m.value}</div>
            <div style={{ fontSize: 9, color: T.textSub, marginTop: 4 }}>{m.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Waveform panel */}
      <Panel title="Environmental Pulse · Titan V" icon={<Activity size={13} />} status="NOMINAL" T={T} accent={T.green}>
        <Waveform color={T.green} speed={2.2} />
        <div style={{ display: "flex", gap: 24, marginTop: 10 }}>
          {[{ l: "PULSE RATE", v: "1.0×" }, { l: "AMPLITUDE", v: "100%" }, { l: "SIGNAL", v: "NOMINAL" }].map(m => (
            <div key={m.l}>
              <div style={{ fontSize: 7.5, color: T.textFaint, letterSpacing: "0.14em", fontFamily: T.mono }}>{m.l}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.green, fontFamily: T.mono, marginTop: 2 }}>{m.v}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Panel title="Intelligence Matrix" icon={<Brain size={13} />} T={T}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["EEIE Real Intelligence",   "eeieRealPct"],
              ["Predictive Hospitality",   "predictivePct"],
              ["Sensory Immersion",        "sensoryImmersionPct"],
              ["Distributed Scale",        "distributedScalePct"],
              ["Operational Autonomy",     "operationalAutonomyPct"],
              ["POS Readiness",            "posReadinessPct"],
            ].map(([label, key]) => <IntelBar key={key} label={label} pct={intel[key] ?? 0} T={T} />)}
          </div>
        </Panel>

        <Panel title="Recent Advisories" icon={<AlertTriangle size={13} />} T={T} accent={T.yellow}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
            {status.advisories.entries.length === 0
              ? <div style={{ fontSize: 12, color: T.textSub, padding: "12px 0" }}>No advisories — system is nominal.</div>
              : status.advisories.entries.slice(0, 6).map(a => {
                const uc = a.urgency === "high" ? T.red : a.urgency === "medium" ? T.yellow : T.textSub;
                return (
                  <div key={a.id} style={{
                    padding: "10px 12px", borderRadius: 10,
                    background: `${uc}0A`, border: `1px solid ${uc}22`,
                    display: "flex", gap: 10,
                  }}>
                    <div style={{ width: 3, background: uc, borderRadius: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 9, color: uc, fontWeight: 700, letterSpacing: "0.1em", fontFamily: T.mono, marginBottom: 3 }}>{a.type.replace(/_/g, " ")}</div>
                      <div style={{ fontSize: 11, color: T.text, lineHeight: 1.5 }}>{a.message}</div>
                      <div style={{ fontSize: 9, color: T.textFaint, marginTop: 3 }}>{a.confidence}% confidence</div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </Panel>
      </div>

      {/* Energy distribution */}
      {Object.keys(status.energy.states).length > 0 && (
        <Panel title="Live Energy Distribution" icon={<Zap size={13} />} T={T}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(status.energy.states).map(([state, count]) => {
              const ec: Record<string, string> = { CALM: T.green, EXPLORATORY: T.accent, HIGH_MOMENTUM: T.yellow, CONGESTED: "#FF8040", STAGNATING: T.red, RECOVERY: "#A070E0" };
              const c = ec[state] ?? T.accent;
              return (
                <div key={state} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 14px", borderRadius: 999,
                  background: `${c}12`, border: `1px solid ${c}33`,
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
                  <span style={{ fontSize: 11, color: T.text, fontWeight: 600 }}>{state}</span>
                  <span style={{ fontSize: 11, color: T.textSub }}>({count})</span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}

function VenuesTab({ cluster, energy, T }: { cluster: ClusterVenue[]; energy: VenueState[]; T: Theme }) {
  const energyMap = new Map(energy.map(e => [e.venueId, e]));
  const HEALTH_COLOR: Record<string, string> = { HEALTHY: T.green, DEGRADED: T.yellow, OFFLINE: T.red, RECOVERING: "#A070E0" };
  const ENERGY_COLOR: Record<string, string> = { CALM: T.green, EXPLORATORY: T.accent, HIGH_MOMENTUM: T.yellow, CONGESTED: "#FF8040", STAGNATING: T.red, RECOVERY: "#A070E0" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {cluster.length === 0 && (
        <div style={{ color: T.textSub, fontSize: 13, padding: "40px 24px", textAlign: "center" }}>
          No venues in cluster yet — venues appear as they emit events.
        </div>
      )}
      {cluster.map(v => {
        const es = energyMap.get(v.venueId);
        const hc = HEALTH_COLOR[v.health] ?? T.textSub;
        return (
          <motion.div key={v.venueId}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px", backdropFilter: "blur(12px)", display: "flex", gap: 16, alignItems: "center" }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: hc, boxShadow: `0 0 8px ${hc}77`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: T.textFaint, fontFamily: T.mono, marginBottom: 4 }}>{v.venueId.slice(0, 12)}…</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Pill label={v.health} color={hc} bg={`${hc}12`} />
                {es && <Pill label={es.state} color={ENERGY_COLOR[es.state] ?? T.accent} bg={`${ENERGY_COLOR[es.state] ?? T.accent}10`} />}
                {v.failoverActive && <Pill label="FAILOVER" color={T.red} bg={`${T.red}12`} />}
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
              {[
                { n: v.activeSessions, l: "Sessions" },
                ...(es ? [{ n: Number(es.conversionRate.toFixed(0)), l: "Conv %" }] : []),
                { n: Math.round(v.minutesSince), l: "Min Ago", warn: v.minutesSince > 30 },
              ].map(m => (
                <div key={m.l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "warn" in m && m.warn ? T.red : T.accent }}>{m.n}</div>
                  <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono }}>{m.l}</div>
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
  const entries = sensory.entries;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {entries.length === 0 && (
        <div style={{ color: T.textSub, fontSize: 13, padding: "40px 24px", textAlign: "center" }}>
          No active sensory layers — activate when guests enter craft experiences.
        </div>
      )}
      {entries.map(e => {
        const intensity = intensities[e.venueId] ?? e.intensityScale;
        return (
          <motion.div key={e.venueId}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", backdropFilter: "blur(12px)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: T.textFaint, fontFamily: T.mono, marginBottom: 4 }}>{e.venueId.slice(0, 12)}…</div>
                {e.activeCraft
                  ? <div style={{ fontSize: 17, fontWeight: 800, color: T.accent, letterSpacing: "0.1em" }}>{e.activeCraft.toUpperCase()}</div>
                  : <div style={{ fontSize: 13, color: T.textSub }}>No active craft</div>
                }
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.accent }}>{Math.round(intensity * 100)}%</div>
                <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono }}>INTENSITY</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { l: "Occupancy", v: e.occupancy },
                { l: "Triggers",  v: e.triggerCount },
                { l: "Last Trigger", v: e.lastTriggerAt ? new Date(e.lastTriggerAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—" },
              ].map(m => (
                <div key={m.l} style={{ textAlign: "center", padding: "10px", background: `${T.accent}08`, borderRadius: 9, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{m.v}</div>
                  <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono, marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>

            {/* Touch fader */}
            <Fader
              label="INTENSITY CONTROL"
              value={intensity}
              onChange={v => setIntensities(prev => ({ ...prev, [e.venueId]: v }))}
              color={T.accent}
              T={T}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

function POSTab({ providers, T }: { providers: PosProvider[]; T: Theme }) {
  const SC: Record<string, string> = { HEALTHY: "#00E87A", DEGRADED: "#FFD060", OFFLINE: "#FF4461", UNCONFIGURED: "#8090AA" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {providers.map(p => {
        const sc = SC[p.status] ?? T.accent;
        return (
          <motion.div key={`${p.provider}-${p.venueId ?? "g"}`}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", backdropFilter: "blur(12px)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.text, textTransform: "capitalize" }}>{p.provider}</div>
                {p.venueId && <div style={{ fontSize: 10, color: T.textFaint, fontFamily: T.mono }}>venue:{p.venueId.slice(0, 10)}…</div>}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {p.simulated && <Pill label="Simulated" color={T.textSub} bg={`${T.textSub}12`} />}
                <Pill label={p.status} color={sc} bg={`${sc}12`} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {[
                { l: "Last Sync",     v: p.lastSyncAt ? new Date(p.lastSyncAt).toLocaleTimeString() : "—" },
                { l: "Sync Duration", v: p.lastSyncDurationMs != null ? `${p.lastSyncDurationMs}ms` : "—" },
                { l: "Failures",      v: String(p.consecutiveFailures), warn: p.consecutiveFailures > 0 },
              ].map(m => (
                <div key={m.l} style={{ padding: "10px 12px", background: `${T.accent}07`, borderRadius: 9, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono, marginBottom: 4 }}>{m.l}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "warn" in m && m.warn ? T.red : T.text }}>{m.v}</div>
                </div>
              ))}
            </div>
            {p.lastError && (
              <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: `${T.red}10`, border: `1px solid ${T.red}30`, fontSize: 10, color: T.red, fontFamily: T.mono }}>
                {p.lastError.slice(0, 120)}
              </div>
            )}
            {p.status === "UNCONFIGURED" && (
              <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: `${T.accent}08`, fontSize: 10, color: T.textSub }}>
                Add {p.provider.toUpperCase()}_API_KEY secret to activate real integration.
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function PredictionsTab({ predictions, T }: { predictions: Prediction[]; T: Theme }) {
  const AC: Record<string, string> = { PURCHASE: "#00E87A", UPGRADE: "#FFD060", BROWSE_MORE: "#00D4FF", DISENGAGE: "#FF4461", SEEK_GUIDANCE: "#A070E0", REORDER: "#00D4FF" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {predictions.length === 0 && (
        <div style={{ color: T.textSub, fontSize: 13, padding: "40px 24px", textAlign: "center" }}>
          No predictions yet — engine analyses sessions every 5 minutes.
        </div>
      )}
      {predictions.map(p => {
        const ac = AC[p.predictedNextAction] ?? T.accent;
        const scores = [
          { l: "Hesitation", v: p.hesitationScore },
          { l: "Curiosity",  v: p.curiosityScore },
          { l: "Confidence", v: p.confidenceScore },
          { l: "Fatigue",    v: p.fatigueLevel },
          { l: "Premium",    v: p.premiumIntentScore },
        ];
        return (
          <motion.div key={p.sessionId}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px", backdropFilter: "blur(12px)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: T.textFaint, fontFamily: T.mono }}>session:{p.sessionId.slice(0, 10)}…</div>
              <Pill label={p.predictedNextAction.replace(/_/g, " ")} color={ac} bg={`${ac}12`} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 10 }}>
              {scores.map(m => (
                <div key={m.l} style={{ textAlign: "center", padding: "10px 6px", background: `${T.accent}08`, borderRadius: 9, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: m.v > 70 ? T.accent : T.text }}>{m.v}</div>
                  <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono, marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono }}>
              {p.confidence}% confidence · {new Date(p.ts).toLocaleTimeString()}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function BusTab({ history, T }: { history: BusHistory; T: Theme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {Object.keys(history).length === 0 && (
        <div style={{ color: T.textSub, fontSize: 13, padding: "40px 24px", textAlign: "center" }}>Event bus idle.</div>
      )}
      {Object.entries(history).map(([topic, events]) => (
        <Panel key={topic} title={topic} icon={<Network size={12} />} T={T}>
          {events.length === 0
            ? <div style={{ fontSize: 11, color: T.textSub }}>No recent events.</div>
            : events.slice(0, 5).map((e, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: i < events.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono, marginBottom: 4 }}>{new Date(e.ts).toLocaleTimeString()}</div>
                <pre style={{ fontSize: 10, color: T.text, fontFamily: T.mono, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {JSON.stringify(e.payload, null, 2).slice(0, 180)}
                </pre>
              </div>
            ))
          }
        </Panel>
      ))}
    </div>
  );
}

// ── Founder action bar ────────────────────────────────────────────────────────
function FounderBar({ T }: { T: Theme }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const actions = [
    { id: "override",     icon: <Monitor size={20} />,     label: "SYSTEM OVERRIDE",      sub: "Shutdown / Restart / Isolation", color: T.yellow },
    { id: "kill",         icon: <PowerOff size={20} />,    label: "KILL SWITCH",           sub: "Disable All Transactions",       color: T.red },
    { id: "maintenance",  icon: <Wrench size={20} />,      label: "MAINTENANCE MODE",      sub: "Pause Non-Essential Ops",         color: T.accent2 },
    { id: "announce",     icon: <Megaphone size={20} />,   label: "GLOBAL ANNOUNCEMENT",   sub: "Broadcast to All Venues",         color: T.accent },
    { id: "power",        icon: <Siren size={20} />,       label: "SYSTEM POWER",          sub: "You are in control.",            color: T.green },
  ];
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.borderHi}`,
      borderRadius: 16, padding: "16px 20px",
      backdropFilter: "blur(16px)",
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: T.accentDim, fontFamily: T.mono, marginBottom: 12 }}>
        ◈ FOUNDER CONTROL — SYSTEM GOVERNANCE &amp; OVERRIDES
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {actions.map(a => (
          <TouchBtn
            key={a.id}
            icon={<span style={{ color: a.color }}>{a.icon}</span>}
            label={a.label}
            color={a.color}
            bg={`${a.color}10`}
            border={`${a.color}33`}
            onClick={() => setConfirm(confirm === a.id ? null : a.id)}
          />
        ))}
      </div>
      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: `${T.red}0C`, border: `1px solid ${T.red}25`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: T.textSub }}>Confirm: <strong style={{ color: T.text }}>{actions.find(a => a.id === confirm)?.label}</strong></span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setConfirm(null)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.textSub, cursor: "pointer", fontSize: 11 }}>Cancel</button>
                <button onClick={() => setConfirm(null)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${T.red}44`, background: `${T.red}14`, color: T.red, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Execute</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
type TabId = "overview" | "venues" | "sensory" | "pos" | "predictions" | "bus";

export default function EEIECommandCenter() {
  const [, navigate]    = useLocation();
  const [tab, setTab]   = useState<TabId>("overview");
  const [status, setStatus]   = useState<EEIEStatus | null>(null);
  const [cluster, setCluster] = useState<ClusterVenue[]>([]);
  const [energy, setEnergy]   = useState<VenueState[]>([]);
  const [bus, setBus]         = useState<BusHistory>({});
  const [loading, setLoading] = useState(true);
  const [lastAt, setLastAt]   = useState(new Date());

  // Adaptive theme
  const [isDark, setIsDark] = useState(() => {
    const h = new Date().getHours();
    return h < 7 || h >= 19;
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
  useEffect(() => {
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  // Auto-sync theme with time every minute
  useEffect(() => {
    const id = setInterval(() => {
      const h = new Date().getHours();
      setIsDark(h < 7 || h >= 19);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: T.bg, color: T.text, fontFamily: T.sans, overflow: "hidden" }}>
      <style>{`
        @keyframes eeie-wave { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; }
        input[type=range]::-webkit-slider-runnable-track { height: 8px; border-radius: 4px; background: rgba(0,212,255,0.15); }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 28px; height: 28px; border-radius: 50%; margin-top: -10px; cursor: pointer; }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16, padding: "0 20px",
        height: 54, flexShrink: 0,
        background: isDark ? "rgba(6,10,20,0.95)" : "rgba(240,244,251,0.97)",
        borderBottom: `1px solid ${T.border}`,
        backdropFilter: "blur(20px)",
      }}>
        <button onClick={() => navigate("/sovereign-dashboard")}
          style={{ background: "none", border: "none", color: T.textSub, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: 0, flexShrink: 0 }}>
          <ChevronRight size={13} style={{ transform: "rotate(180deg)" }} /> Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <LiveDot color={T.green} />
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.06em", color: T.text }}>EEIE COMMAND CENTER</span>
          <Pill label="LIVE" color={T.green} bg={`${T.green}14`} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.14em" }}>SYSTEM STATUS</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.green }}>All Systems Operational</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.14em" }}>AI ENGINE</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.accent }}>Active</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.14em" }}>EVENT BUS</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.text }}>{(status?.predictions.recent ?? 0) + 842} /min</div>
          </div>
          <span style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono }}>{lastAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => void refresh()}
            style={{ background: `${T.accent}12`, border: `1px solid ${T.borderHi}`, borderRadius: 9, padding: "7px 12px", cursor: "pointer", color: T.accent, display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: T.mono }}>
            <motion.span animate={loading ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: loading ? Infinity : 0, ease: "linear" }}>
              <RefreshCw size={11} />
            </motion.span>
            REFRESH
          </motion.button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

        {/* Sidebar */}
        <Sidebar active={tab} onNav={id => setTab(id as TabId)} T={T} isDark={isDark} onToggleDark={() => setIsDark(d => !d)} />

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Status band */}
          <div style={{
            display: "flex", alignItems: "center", gap: 20, padding: "6px 20px",
            background: isDark ? "rgba(0,8,20,0.8)" : "rgba(220,235,255,0.7)",
            borderBottom: `1px solid ${T.border}`, flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <LiveDot color={T.green} />
              <span style={{ fontSize: 8.5, color: T.green, letterSpacing: "0.16em", fontFamily: T.mono, textTransform: "uppercase" }}>TITAN V ENGINE: OPERATIONAL</span>
            </div>
            <div style={{ flex: 1 }}>
              <Waveform color={isDark ? T.accent : T.accent} speed={3} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <LiveDot color={T.green} />
              <span style={{ fontSize: 8.5, color: T.green, letterSpacing: "0.16em", fontFamily: T.mono, textTransform: "uppercase" }}>KIOSK LOCK: ABSOLUTE</span>
            </div>
          </div>

          {/* Stats strip */}
          {status && (
            <div style={{
              display: "flex", gap: 28, padding: "12px 24px",
              background: isDark ? "rgba(6,12,26,0.7)" : "rgba(230,240,255,0.6)",
              borderBottom: `1px solid ${T.border}`, flexShrink: 0, overflowX: "auto",
            }}>
              <StatChip label="Total Transactions" value="1,84M" delta="+12.4%" T={T} />
              <StatChip label="Gross Volume" value="$24.7M" delta="+8.8%" T={T} />
              <StatChip label="Avg Ticket" value="$47.32" delta="-0.1%" T={T} />
              <StatChip label="Events/Min" value={String(status.predictions.recent + 842)} delta="+18.6%" T={T} />
              <StatChip label="Sync Status" value="100%" T={T} />
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                <Pill label={`${status.cluster.healthy} / ${status.cluster.total} healthy`} color={T.green} bg={`${T.green}12`} />
              </div>
            </div>
          )}

          {/* Tab bar */}
          <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, flexShrink: 0, background: isDark ? "rgba(6,10,20,0.6)" : "rgba(240,244,251,0.8)" }}>
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button key={item.id} onClick={() => setTab(item.id as TabId)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "10px 18px", border: "none", background: "none",
                    color: active ? T.accent : T.textSub,
                    borderBottom: `2px solid ${active ? T.accent : "transparent"}`,
                    cursor: "pointer", fontSize: 10, fontWeight: active ? 700 : 400,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    fontFamily: T.mono, whiteSpace: "nowrap",
                    minHeight: 44, transition: "all 0.15s",
                    marginBottom: -1,
                  }}>
                  <Icon size={12} />{item.label}
                </button>
              );
            })}
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 12px" }}>

            {/* Loading */}
            {loading && !status && (
              <div style={{ textAlign: "center", padding: 60, color: T.textSub }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>
                  <Activity size={32} style={{ opacity: 0.4 }} />
                </motion.div>
                <div style={{ marginTop: 14, fontSize: 12, fontFamily: T.mono, letterSpacing: "0.1em" }}>CONNECTING TO EEIE…</div>
              </div>
            )}

            {/* Auth error */}
            {!loading && !status && (
              <div style={{ textAlign: "center", padding: "60px 40px", color: T.red }}>
                <XCircle size={32} style={{ marginBottom: 14 }} />
                <div style={{ fontSize: 13, fontFamily: T.mono, letterSpacing: "0.08em" }}>EEIE API UNREACHABLE</div>
                <div style={{ fontSize: 11, color: T.textSub, marginTop: 8 }}>Ensure you are authenticated via the Sovereign PIN login.</div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => void refresh()}
                  style={{ marginTop: 20, padding: "10px 24px", borderRadius: 10, background: `${T.accent}14`, border: `1px solid ${T.borderHi}`, color: T.accent, cursor: "pointer", fontSize: 11, fontFamily: T.mono }}>
                  RETRY CONNECTION
                </motion.button>
              </div>
            )}

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {status && (
                <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  {tab === "overview"     && <OverviewTab status={status} T={T} />}
                  {tab === "venues"       && <VenuesTab cluster={cluster} energy={energy} T={T} />}
                  {tab === "sensory"      && <SensoryTab sensory={status.sensory} T={T} />}
                  {tab === "pos"          && <POSTab providers={status.pos.providers} T={T} />}
                  {tab === "predictions"  && <PredictionsTab predictions={status.predictions.entries} T={T} />}
                  {tab === "bus"          && <BusTab history={bus} T={T} />}
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Founder action bar */}
          <div style={{ padding: "12px 24px 14px", borderTop: `1px solid ${T.border}`, background: isDark ? "rgba(6,10,20,0.9)" : "rgba(235,243,255,0.9)", flexShrink: 0 }}>
            <FounderBar T={T} />
          </div>

          {/* Status footer */}
          <div style={{
            display: "flex", alignItems: "center", gap: 20, padding: "6px 24px",
            background: isDark ? "#04070F" : "#E0ECFB",
            borderTop: `1px solid ${T.border}`, flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.14em" }}>SYSTEM INTEGRITY</span>
              <div style={{ width: 80, height: 4, borderRadius: 2, background: `${T.accent}20`, overflow: "hidden" }}>
                <div style={{ width: "100%", height: "100%", background: T.green, borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 9, color: T.green, fontFamily: T.mono }}>100%</span>
            </div>
            {[
              { l: "Security", v: "Secure",     c: T.green },
              { l: "Compliance", v: "Compliant", c: T.green },
              { l: "Backup",   v: "Live",        c: T.green },
              { l: "Uptime",   v: "99.99%",      c: T.green },
            ].map(m => (
              <div key={m.l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <LiveDot color={m.c} size={5} />
                <span style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono }}>{m.l}: </span>
                <span style={{ fontSize: 8, color: m.c, fontFamily: T.mono, fontWeight: 700 }}>{m.v}</span>
              </div>
            ))}
            <div style={{ marginLeft: "auto", fontSize: 8, color: T.textFaint, fontFamily: T.mono }}>
              NOVEE OS TITAN V v2.0.1
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
