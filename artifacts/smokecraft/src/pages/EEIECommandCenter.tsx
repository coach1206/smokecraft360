/**
 * EEIECommandCenter — Live EEIE Intelligence Dashboard.
 *
 * Phase F: Observability + Intelligence Diagnostics.
 * Route: /eeie-command
 *
 * 6-tab intelligence command surface:
 *   Overview      — system health, recent advisories, live energy states
 *   Venues        — per-venue cluster health + energy classification
 *   Sensory       — active craft audio layers, occupancy-driven intensity
 *   POS Health    — per-adapter status, last sync, simulated vs live
 *   Predictions   — recent hospitality behavioral predictions
 *   Event Bus     — NeuralEventBus recent topic history
 *
 * Design: Smoked Cream & Obsidian with Brushed Graphite staff accents.
 * Cormorant Garamond serif, frosted glass surfaces, amber glow.
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation }  from "wouter";
import { orderBroadcast, type ArchiveBlendOrder } from "@/lib/orderBroadcast";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Activity, Zap, Radio, Package, Brain, Network,
  RefreshCw, XCircle, Cpu, Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Design tokens ──────────────────────────────────────────────────────────────

const C = {
  bg:       "#F5F2ED",
  graphite: "#2A2A2A",
  gold:     "#D48B00",
  obsidian: "#1A1A1B",
  muted:    "#6B5E4E",
  card:     "#EFEBE0",
  border:   "rgba(26,26,27,0.09)",
  glass:    "rgba(255,255,255,0.45)",
};

const ENERGY_COLORS: Record<string, string> = {
  CALM:          "#6B9E6B",
  EXPLORATORY:   "#4A90D9",
  HIGH_MOMENTUM: "#D48B00",
  CONGESTED:     "#E07B39",
  STAGNATING:    "#B85C5C",
  RECOVERY:      "#7B5EA7",
};

const HEALTH_COLORS: Record<string, string> = {
  HEALTHY:    "#5A9E6B",
  DEGRADED:   "#D4A827",
  OFFLINE:    "#B85C5C",
  RECOVERING: "#7B5EA7",
};

const POS_STATUS_COLORS: Record<string, string> = {
  HEALTHY:       "#5A9E6B",
  DEGRADED:      "#D4A827",
  OFFLINE:       "#B85C5C",
  UNCONFIGURED:  "#9E9890",
};

const TABS = [
  { id: "overview",     label: "Overview",    icon: Activity },
  { id: "venues",       label: "Venues",      icon: Network },
  { id: "sensory",      label: "Sensory",     icon: Radio },
  { id: "pos",          label: "POS Health",  icon: Package },
  { id: "predictions",  label: "Predictions", icon: Brain },
  { id: "bus",          label: "Event Bus",   icon: Cpu },
] as const;

type Tab = typeof TABS[number]["id"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface EEIEStatus {
  ts: string;
  cluster: { total: number; healthy: number; degraded: number; offline: number; recovering: number; failoverActive: number };
  energy: { venues: number; states: Record<string, number> };
  sensory: { activeVenues: number; entries: unknown[] };
  pos: { total: number; healthy: number; configured: number; simulated: number; providers: PosProvider[] };
  predictions: { recent: number; entries: Prediction[] };
  advisories: { recent: number; entries: Advisory[] };
  intelligence: Record<string, number>;
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

interface VenueState {
  venueId: string; state: string; eventCount10m: number;
  conversionRate: number; guestCount: number; scoredAt: string;
}

interface ClusterVenue {
  venueId: string; health: string; minutesSince: number;
  activeSessions: number; lastHeartbeat: string | null; failoverActive: boolean;
}

interface BusHistory { [topic: string]: { topic: string; payload: unknown; ts: string }[] }

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, { credentials: "include" });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch { return null; }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Chip({ label, color, size = "sm" }: { label: string; color: string; size?: "sm" | "xs" }) {
  return (
    <span style={{
      display:        "inline-flex", alignItems: "center",
      padding:        size === "xs" ? "2px 8px" : "3px 10px",
      borderRadius:   20,
      fontSize:       size === "xs" ? 10 : 11,
      fontWeight:     700,
      letterSpacing:  "0.08em",
      textTransform:  "uppercase",
      color:          "#fff",
      background:     color,
    }}>
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = C.gold }: {
  icon: LucideIcon; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background:   C.glass, backdropFilter: "blur(16px)",
        border:       `1px solid ${C.border}`, borderRadius: 16,
        padding:      "20px 20px 16px", display: "flex", flexDirection: "column", gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.muted, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        <Icon size={14} style={{ color }} />
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: C.obsidian, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>}
    </motion.div>
  );
}

function IntelBar({ label, pct }: { label: string; pct: number }) {
  const color = pct >= 80 ? "#5A9E6B" : pct >= 60 ? C.gold : "#B85C5C";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: "100%", borderRadius: 3, background: color }}
        />
      </div>
    </div>
  );
}

function AdvisoryRow({ a }: { a: Advisory }) {
  const urgencyColor = a.urgency === "high" ? "#B85C5C" : a.urgency === "medium" ? C.gold : C.muted;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(0,0,0,0.03)", border: `1px solid ${C.border}`, display: "flex", gap: 12, alignItems: "flex-start" }}
    >
      <div style={{ width: 4, borderRadius: 2, background: urgencyColor, alignSelf: "stretch", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: urgencyColor, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{a.type.replace(/_/g, " ")}</div>
        <div style={{ fontSize: 13, color: C.obsidian, lineHeight: 1.5 }}>{a.message}</div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{new Date(a.ts).toLocaleTimeString()} · {a.confidence}% confidence</div>
      </div>
    </motion.div>
  );
}

// ── Live Order Ticker ─────────────────────────────────────────────────────────
// Self-contained — subscribes to BroadcastChannel, no prop drilling needed.

const CHAMPAGNE = "#C9A84C";

function LiveOrderTicker() {
  const [orders, setOrders] = useState<ArchiveBlendOrder[]>([]);

  useEffect(() => {
    return orderBroadcast.subscribe((order) => {
      setOrders((prev) => [order, ...prev].slice(0, 5));
    });
  }, []);

  if (orders.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background:   `${CHAMPAGNE}10`,
        border:       `1px solid ${CHAMPAGNE}44`,
        borderRadius: 14,
        padding:      "16px 18px",
      }}
    >
      {/* Header row */}
      <div style={{
        display:       "flex",
        alignItems:    "center",
        gap:           8,
        marginBottom:  12,
        fontSize:      12,
        fontWeight:    700,
        color:         CHAMPAGNE,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
      }}>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{ width: 8, height: 8, borderRadius: "50%", background: CHAMPAGNE, flexShrink: 0 }}
        />
        Live Archive Blend Orders
        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 500, color: C.muted }}>
          {orders.length} received
        </span>
      </div>

      {/* Order rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <AnimatePresence initial={false}>
          {orders.map((o, i) => (
            <motion.div
              key={o.orderId}
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        12,
                padding:    "10px 14px",
                borderRadius: 10,
                background: i === 0 ? `${CHAMPAGNE}18` : "rgba(0,0,0,0.03)",
                border:     `1px solid ${i === 0 ? CHAMPAGNE + "55" : C.border}`,
                boxShadow:  i === 0 ? `0 0 22px ${CHAMPAGNE}28` : "none",
              }}
            >
              {/* Icon */}
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: `${CHAMPAGNE}18`, border: `1px solid ${CHAMPAGNE}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, color: CHAMPAGNE,
              }}>
                ◈
              </div>

              {/* Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.obsidian, marginBottom: 2 }}>
                  {o.guestName}
                </div>
                <div style={{ fontSize: 10, color: C.muted }}>
                  {o.wood} · {o.band} · Harmony {o.harmonyScore}
                </div>
              </div>

              {/* Order ref + time */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{
                  fontSize:      9,
                  fontWeight:    700,
                  letterSpacing: "0.10em",
                  color:         CHAMPAGNE,
                  background:    `${CHAMPAGNE}18`,
                  border:        `1px solid ${CHAMPAGNE}33`,
                  borderRadius:  6,
                  padding:       "3px 8px",
                  marginBottom:  4,
                  fontFamily:    "monospace",
                }}>
                  {o.orderId.slice(0, 10).toUpperCase()}
                </div>
                <div style={{ fontSize: 9, color: C.muted }}>
                  {new Date(o.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Tab Panels ────────────────────────────────────────────────────────────────

function OverviewTab({ status }: { status: EEIEStatus }) {
  const intel = status.intelligence;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <LiveOrderTicker />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <StatCard icon={Network}    label="Cluster Venues"   value={status.cluster.total}    sub={`${status.cluster.healthy} healthy`} />
        <StatCard icon={Activity}   label="Active Venues"    value={status.energy.venues}    sub="with recent events" />
        <StatCard icon={Brain}      label="Predictions"      value={status.predictions.recent} sub="last 5 min" />
        <StatCard icon={Zap}        label="Advisories"       value={status.advisories.recent} sub="in buffer" />
        <StatCard icon={Package}    label="POS Healthy"      value={`${status.pos.healthy}/${status.pos.total}`} sub={status.pos.simulated > 0 ? `${status.pos.simulated} simulated` : "all real"} />
        <StatCard icon={Radio}      label="Sensory Active"   value={status.sensory.activeVenues} sub="venue layers" />
      </div>

      {/* ── Environmental Pulse — live Titan Green waveform ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1,  y: 0  }}
        transition={{ duration: 0.45, delay: 0.1 }}
        style={{
          background:     "rgba(0,255,65,0.04)",
          border:         "1px solid rgba(0,255,65,0.18)",
          borderRadius:   16,
          padding:        "18px 22px",
          display:        "flex",
          flexDirection:  "column",
          gap:            10,
        }}
      >
        {/* Header row */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          gap:            10,
          marginBottom:   2,
        }}>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#00FF41",
              boxShadow:  "0 0 8px #00FF41",
              flexShrink: 0,
            }}
          />
          <span style={{
            fontFamily:    "'Space Mono', monospace",
            fontSize:      10,
            fontWeight:    700,
            color:         "#00FF41",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            textShadow:    "0 0 8px rgba(0,255,65,0.5)",
          }}>
            Environmental Pulse
          </span>
          <span style={{
            marginLeft:    "auto",
            fontFamily:    "'Space Mono', monospace",
            fontSize:      9,
            color:         "rgba(0,255,65,0.55)",
            letterSpacing: "0.10em",
          }}>
            QUADRANT II · LIVE
          </span>
        </div>

        {/* Waveform — sine path scrolling at --hb-mult speed */}
        <div style={{ width: "100%", height: 48, overflow: "hidden", position: "relative" }}>
          <div style={{
            display:   "flex",
            width:     "200%",
            animation: "titan-wave-scroll calc(2s / var(--hb-mult, 0.85)) linear infinite",
          }}>
            {[0, 1].map(i => (
              <svg
                key={i}
                width="50%"
                height="48"
                viewBox="0 0 600 48"
                preserveAspectRatio="none"
                style={{ flexShrink: 0 }}
              >
                {/* Glow fill */}
                <path
                  d="M0,24 Q37.5,4 75,24 Q112.5,44 150,24 Q187.5,4 225,24 Q262.5,44 300,24 Q337.5,4 375,24 Q412.5,44 450,24 Q487.5,4 525,24 Q562.5,44 600,24"
                  fill="rgba(0,255,65,0.06)"
                />
                {/* Primary stroke */}
                <path
                  d="M0,24 Q37.5,4 75,24 Q112.5,44 150,24 Q187.5,4 225,24 Q262.5,44 300,24 Q337.5,4 375,24 Q412.5,44 450,24 Q487.5,4 525,24 Q562.5,44 600,24"
                  fill="none"
                  stroke="#00FF41"
                  strokeWidth="1.8"
                  strokeOpacity="0.85"
                />
                {/* Echo stroke — slightly offset, dimmer */}
                <path
                  d="M0,24 Q37.5,8 75,24 Q112.5,40 150,24 Q187.5,8 225,24 Q262.5,40 300,24 Q337.5,8 375,24 Q412.5,40 450,24 Q487.5,8 525,24 Q562.5,40 600,24"
                  fill="none"
                  stroke="#00FF41"
                  strokeWidth="0.7"
                  strokeOpacity="0.25"
                />
              </svg>
            ))}
          </div>

          {/* Left + right fade masks */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "linear-gradient(90deg, rgba(0,0,0,0.4) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.4) 100%)",
          }} />
        </div>

        {/* Metric row */}
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {[
            { label: "PULSE RATE",  value: "1.0×" },
            { label: "AMPLITUDE",   value: "100%" },
            { label: "SIGNAL",      value: "NOMINAL" },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 7.5, color: "rgba(0,255,65,0.45)", letterSpacing: "0.14em" }}>{m.label}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11,  color: "#00FF41",             letterSpacing: "0.08em", fontWeight: 700, marginTop: 2 }}>{m.value}</div>
            </div>
          ))}
        </div>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: C.glass, backdropFilter: "blur(16px)", border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.graphite, letterSpacing: "0.08em", textTransform: "uppercase" }}>Intelligence Matrix</div>
          <IntelBar label="EEIE Real Intelligence" pct={intel["eeieRealPct"] ?? 0} />
          <IntelBar label="Predictive Hospitality" pct={intel["predictivePct"] ?? 0} />
          <IntelBar label="Sensory Immersion"      pct={intel["sensoryImmersionPct"] ?? 0} />
          <IntelBar label="Distributed Scale"      pct={intel["distributedScalePct"] ?? 0} />
          <IntelBar label="Operational Autonomy"   pct={intel["operationalAutonomyPct"] ?? 0} />
          <IntelBar label="POS Readiness"          pct={intel["posReadinessPct"] ?? 0} />
          <IntelBar label="Multi-Venue Readiness"  pct={intel["multiVenueReadinessPct"] ?? 0} />
        </div>

        <div style={{ background: C.glass, backdropFilter: "blur(16px)", border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.graphite, letterSpacing: "0.08em", textTransform: "uppercase" }}>Recent Advisories</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
            {status.advisories.entries.length === 0
              ? <div style={{ fontSize: 13, color: C.muted }}>No advisories yet — venue intelligence is monitoring.</div>
              : status.advisories.entries.slice(0, 6).map(a => <AdvisoryRow key={a.id} a={a} />)
            }
          </div>
        </div>
      </div>

      {Object.keys(status.energy.states).length > 0 && (
        <div style={{ background: C.glass, backdropFilter: "blur(16px)", border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.graphite, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Live Energy Distribution</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {Object.entries(status.energy.states).map(([state, count]) => (
              <div key={state} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: `${ENERGY_COLORS[state] ?? C.muted}18`, border: `1px solid ${ENERGY_COLORS[state] ?? C.muted}33` }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: ENERGY_COLORS[state] ?? C.muted }} />
                <span style={{ fontSize: 13, color: C.obsidian, fontWeight: 600 }}>{state}</span>
                <span style={{ fontSize: 13, color: C.muted }}>({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VenuesTab({ cluster, energy }: { cluster: ClusterVenue[]; energy: VenueState[] }) {
  const energyMap = new Map(energy.map(e => [e.venueId, e]));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {cluster.length === 0 && <div style={{ color: C.muted, fontSize: 14, padding: 24, textAlign: "center" }}>No venues in cluster yet. Venues appear as they emit events.</div>}
      {cluster.map(v => {
        const energyState = energyMap.get(v.venueId);
        return (
          <motion.div key={v.venueId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: C.glass, backdropFilter: "blur(12px)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px", display: "flex", gap: 16, alignItems: "center" }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: C.muted, fontFamily: "monospace", marginBottom: 4 }}>{v.venueId.slice(0, 8)}…</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Chip label={v.health} color={HEALTH_COLORS[v.health] ?? C.muted} />
                {energyState && <Chip label={energyState.state} color={ENERGY_COLORS[energyState.state] ?? C.muted} size="xs" />}
                {v.failoverActive && <Chip label="FAILOVER" color="#B85C5C" size="xs" />}
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.obsidian }}>{v.activeSessions}</div>
                <div style={{ fontSize: 10, color: C.muted }}>Sessions</div>
              </div>
              {energyState && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.obsidian }}>{energyState.conversionRate.toFixed(0)}%</div>
                  <div style={{ fontSize: 10, color: C.muted }}>Conv.</div>
                </div>
              )}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: v.minutesSince > 30 ? "#B85C5C" : C.obsidian }}>{Math.round(v.minutesSince)}m</div>
                <div style={{ fontSize: 10, color: C.muted }}>Since Beat</div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function SensoryTab({ sensory }: { sensory: { activeVenues: number; entries: unknown[] } }) {
  const entries = sensory.entries as Array<{
    venueId: string; activeCraft: string | null; occupancy: number;
    intensityScale: number; triggerCount: number; lastTriggerAt: string | null;
  }>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.length === 0 && <div style={{ color: C.muted, fontSize: 14, padding: 24, textAlign: "center" }}>No active sensory layers. Layers activate when guests enter craft experiences.</div>}
      {entries.map(e => (
        <motion.div key={e.venueId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: C.glass, backdropFilter: "blur(12px)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted, fontFamily: "monospace" }}>{e.venueId.slice(0, 12)}…</div>
              {e.activeCraft && <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, marginTop: 2, textTransform: "uppercase" }}>{e.activeCraft}</div>}
              {!e.activeCraft && <div style={{ fontSize: 13, color: C.muted }}>No active craft</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.obsidian }}>{Math.round(e.intensityScale * 100)}%</div>
              <div style={{ fontSize: 10, color: C.muted }}>Intensity</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <div><span style={{ fontSize: 12, color: C.muted }}>Occupancy: </span><span style={{ fontSize: 12, fontWeight: 700 }}>{e.occupancy}</span></div>
            <div><span style={{ fontSize: 12, color: C.muted }}>Triggers: </span><span style={{ fontSize: 12, fontWeight: 700 }}>{e.triggerCount}</span></div>
            {e.lastTriggerAt && <div style={{ fontSize: 11, color: C.muted }}>{new Date(e.lastTriggerAt).toLocaleTimeString()}</div>}
          </div>
          <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: "rgba(0,0,0,0.08)" }}>
            <motion.div
              animate={{ width: `${e.intensityScale * 100}%` }}
              style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${C.gold}, #FFB833)` }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function POSTab({ providers }: { providers: PosProvider[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {providers.map(p => (
        <motion.div key={`${p.provider}-${p.venueId ?? "global"}`}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: C.glass, backdropFilter: "blur(12px)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.obsidian, textTransform: "capitalize" }}>{p.provider}</div>
              {p.venueId && <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>venue: {p.venueId.slice(0, 8)}…</div>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {p.simulated && <Chip label="Simulated" color="#9E9890" size="xs" />}
              <Chip label={p.status} color={POS_STATUS_COLORS[p.status] ?? C.muted} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted }}>Last Sync</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.obsidian }}>
                {p.lastSyncAt ? new Date(p.lastSyncAt).toLocaleTimeString() : "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted }}>Sync Duration</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{p.lastSyncDurationMs != null ? `${p.lastSyncDurationMs}ms` : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted }}>Failures</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: p.consecutiveFailures > 0 ? "#B85C5C" : C.obsidian }}>{p.consecutiveFailures}</div>
            </div>
          </div>
          {p.lastError && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#B85C5C18", border: "1px solid #B85C5C33", fontSize: 11, color: "#B85C5C", fontFamily: "monospace" }}>
              {p.lastError.slice(0, 120)}
            </div>
          )}
          {p.status === "UNCONFIGURED" && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#9E989018", fontSize: 11, color: C.muted }}>
              Add {p.provider.toUpperCase()}_API_KEY and {p.provider.toUpperCase()}_LOCATION_ID secrets to activate real integration.
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function PredictionsTab({ predictions }: { predictions: Prediction[] }) {
  const ACTION_COLORS: Record<string, string> = {
    PURCHASE: "#5A9E6B", UPGRADE: C.gold, BROWSE_MORE: "#4A90D9",
    DISENGAGE: "#B85C5C", SEEK_GUIDANCE: "#7B5EA7", REORDER: "#4A90D9",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {predictions.length === 0 && <div style={{ color: C.muted, fontSize: 14, padding: 24, textAlign: "center" }}>No predictions yet — engine analyses sessions every 5 minutes.</div>}
      {predictions.map(p => (
        <motion.div key={p.sessionId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: C.glass, backdropFilter: "blur(12px)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>session:{p.sessionId.slice(0, 8)}…</div>
            <Chip label={p.predictedNextAction.replace(/_/g, " ")} color={ACTION_COLORS[p.predictedNextAction] ?? C.muted} size="xs" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 8 }}>
            {[
              { label: "Hesitation",  value: p.hesitationScore },
              { label: "Curiosity",   value: p.curiosityScore },
              { label: "Confidence",  value: p.confidenceScore },
              { label: "Fatigue",     value: p.fatigueLevel },
              { label: "Premium",     value: p.premiumIntentScore },
            ].map(m => (
              <div key={m.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: m.value > 70 ? C.gold : C.obsidian }}>{m.value}</div>
                <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: C.muted }}>{p.confidence}% confidence · {new Date(p.ts).toLocaleTimeString()}</div>
        </motion.div>
      ))}
    </div>
  );
}

function BusTab({ history }: { history: BusHistory }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {Object.entries(history).map(([topic, events]) => (
        <div key={topic} style={{ background: C.glass, backdropFilter: "blur(12px)", border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, fontFamily: "monospace", marginBottom: 10 }}>{topic}</div>
          {events.length === 0
            ? <div style={{ fontSize: 12, color: C.muted }}>No recent events.</div>
            : events.map((e, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: i < events.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{new Date(e.ts).toLocaleTimeString()}</div>
                <pre style={{ fontSize: 10, color: C.obsidian, fontFamily: "monospace", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {JSON.stringify(e.payload, null, 2).slice(0, 200)}
                </pre>
              </div>
            ))
          }
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EEIECommandCenter() {
  const [, navigate]        = useLocation();
  const [tab, setTab]       = useState<Tab>("overview");
  const [status, setStatus] = useState<EEIEStatus | null>(null);
  const [cluster, setCluster] = useState<ClusterVenue[]>([]);
  const [energy, setEnergy]   = useState<VenueState[]>([]);
  const [bus, setBus]         = useState<BusHistory>({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const refresh = useCallback(async () => {
    setLoading(true);
    const [s, c, e, b] = await Promise.all([
      fetchJSON<EEIEStatus>("/api/eeie/status"),
      fetchJSON<{ venues: ClusterVenue[] }>("/api/eeie/cluster"),
      fetchJSON<{ venues: VenueState[] }>("/api/eeie/energy"),
      fetchJSON<{ history: BusHistory }>("/api/eeie/bus"),
    ]);
    if (s) setStatus(s);
    if (c) setCluster(c.venues);
    if (e) setEnergy(e.venues);
    if (b) setBus(b.history);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', sans-serif", color: C.obsidian }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 600, height: 200, background: `radial-gradient(ellipse, ${C.gold}20 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: `${C.graphite}F5`, backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/operations")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <ArrowLeft size={16} /> Back
          </motion.button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
            <Shield size={18} style={{ color: C.gold }} />
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>EEIE Command Center</span>
            <Chip label="LIVE" color={C.gold} size="xs" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "#999" }}>{lastRefresh.toLocaleTimeString()}</span>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => void refresh()}
              style={{ background: "none", border: `1px solid #555`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#ccc", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              Refresh
            </motion.button>
          </div>
        </div>

        {/* ── Titan V Status Band ─────────────────────────────────────── */}
        <div style={{
          maxWidth:      1100,
          margin:        "0 auto",
          padding:       "6px 20px",
          display:       "flex",
          alignItems:    "center",
          gap:           12,
          borderTop:     "1px solid rgba(212,175,55,0.14)",
          background:    "rgba(5,5,5,0.55)",
        }}>
          {/* Status: Engine */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#00FF41",
              boxShadow: "0 0 7px #00FF41",
              animation: "hub-pulse 2s ease-in-out infinite",
            }} />
            <span style={{
              fontFamily:    "'Space Mono', monospace",
              fontSize:      8.5,
              color:         "#00FF41",
              letterSpacing: "0.16em",
              textShadow:    "0 0 8px rgba(0,255,65,0.55)",
              textTransform: "uppercase",
            }}>
              TITAN V ENGINE: OPERATIONAL
            </span>
          </div>

          {/* Environmental Pulse Waveform */}
          <div style={{
            flex:       1,
            height:     20,
            overflow:   "hidden",
            display:    "flex",
            alignItems: "center",
            opacity:    0.7,
          }}>
            <div style={{
              display:           "flex",
              width:             "200%",
              animation:         "titan-wave-scroll calc(2s / var(--hb-mult, 0.85)) linear infinite",
            }}>
              {[0, 1].map(i => (
                <svg key={i} width="50%" height="20" viewBox="0 0 300 20" preserveAspectRatio="none" style={{ flexShrink: 0 }}>
                  <path
                    d="M0,10 Q18.75,0 37.5,10 Q56.25,20 75,10 Q93.75,0 112.5,10 Q131.25,20 150,10 Q168.75,0 187.5,10 Q206.25,20 225,10 Q243.75,0 262.5,10 Q281.25,20 300,10"
                    stroke="#D4AF37"
                    strokeWidth="1.2"
                    fill="none"
                    strokeOpacity="0.65"
                  />
                </svg>
              ))}
            </div>
          </div>

          {/* Status: Kiosk Lock */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#00FF41",
              boxShadow: "0 0 7px #00FF41",
              animation: "hub-pulse 1.6s ease-in-out infinite",
            }} />
            <span style={{
              fontFamily:    "'Space Mono', monospace",
              fontSize:      8.5,
              color:         "#00FF41",
              letterSpacing: "0.16em",
              textShadow:    "0 0 8px rgba(0,255,65,0.55)",
              textTransform: "uppercase",
            }}>
              KIOSK LOCK: ABSOLUTE
            </span>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", gap: 2, overflowX: "auto", borderTop: `1px solid rgba(255,255,255,0.06)` }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  background: active ? `${C.gold}22` : "none",
                  border: "none", borderBottom: `2px solid ${active ? C.gold : "transparent"}`,
                  padding: "10px 16px", cursor: "pointer", color: active ? C.gold : "#888",
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  whiteSpace: "nowrap", transition: "all 0.18s",
                }}>
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
        {loading && !status && (
          <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
            <Activity size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div>Loading intelligence systems…</div>
          </div>
        )}
        {!loading && !status && (
          <div style={{ textAlign: "center", padding: 60, color: "#B85C5C" }}>
            <XCircle size={32} style={{ marginBottom: 12 }} />
            <div>Could not connect to EEIE API. Ensure you are authenticated.</div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {status && (
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
              {tab === "overview"    && <OverviewTab status={status} />}
              {tab === "venues"      && <VenuesTab cluster={cluster} energy={energy} />}
              {tab === "sensory"     && <SensoryTab sensory={status.sensory} />}
              {tab === "pos"         && <POSTab providers={status.pos.providers} />}
              {tab === "predictions" && <PredictionsTab predictions={status.predictions.entries} />}
              {tab === "bus"         && <BusTab history={bus} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes hub-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes titan-wave-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}
