/**
 * EEIE Command Center — Experience Enhancement Intelligence Engine
 * Apple Vision Pro × Tesla cockpit luxury aesthetic.
 * Day default: ice white + metallic blue. Night toggle: deep navy + cyan.
 * Modular: sub-components in ./eeie/ directory.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { orderBroadcast, type ArchiveBlendOrder } from "@/lib/orderBroadcast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Zap, Radio, Package, Brain, Network, RefreshCw,
  XCircle, Moon, Sun, ChevronLeft, ChevronRight, Shield,
  AlertTriangle, Monitor, Globe, PowerOff, Megaphone, Wrench,
  Siren, Gauge, Server, Users, BarChart2, Thermometer, Database,
  ImageIcon, Layers, Cpu, Lock, Cloud, Bell,
} from "lucide-react";

import {
  buildTheme, fetchEEIE, triggerHaptic,
  LiveDot, Badge, Meter, Waveform, Panel, TouchButton, KpiCard,
  type Theme, type EEIEStatus, type ClusterVenue, type VenueState,
  type SensoryEntry, type PosProvider, type Prediction, type Advisory,
  type BusHistory,
} from "./eeie/shared";
import { StaffCockpit }           from "./eeie/StaffCockpit";
import { AIPanel }                from "./eeie/AIPanel";
import { MoodSensorTab }          from "./eeie/MoodSensor";
import { VisualIntelligenceTab }  from "./eeie/VisualIntelligence";
import { DataBrainTab }           from "./eeie/DataBrain";

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

type TabId =
  | "overview" | "network" | "sensory" | "commerce" | "predictions" | "bus"
  | "cockpit" | "visual" | "mood" | "databrain" | "media";

interface NavItem { id: TabId; icon: React.ComponentType<{ size: number }>; label: string; group: string; }

const NAV: NavItem[] = [
  // Command
  { id: "overview",    icon: Monitor,      label: "Command Center",       group: "COMMAND" },
  { id: "network",     icon: Globe,        label: "Live Network",         group: "COMMAND" },
  { id: "sensory",     icon: Radio,        label: "Sensory Engine",       group: "COMMAND" },
  { id: "commerce",    icon: Package,      label: "Commerce Health",      group: "COMMAND" },
  { id: "predictions", icon: Brain,        label: "AI Predictions",       group: "COMMAND" },
  { id: "bus",         icon: Cpu,          label: "Event Bus",            group: "COMMAND" },
  // Operations
  { id: "cockpit",     icon: Users,        label: "Staff Cockpit",        group: "OPERATIONS" },
  { id: "visual",      icon: ImageIcon,    label: "Visual Intelligence",  group: "OPERATIONS" },
  { id: "media",       icon: BarChart2,    label: "Media Library",        group: "OPERATIONS" },
  { id: "mood",        icon: Thermometer,  label: "Mood Sensor",          group: "OPERATIONS" },
  { id: "databrain",   icon: Database,     label: "Unified Data Brain",   group: "OPERATIONS" },
];

function Sidebar({ active, onNav, isDark, onToggleDark, showAI, onToggleAI, T }: {
  active: TabId; onNav: (id: TabId) => void;
  isDark: boolean; onToggleDark: () => void;
  showAI: boolean; onToggleAI: () => void; T: Theme;
}) {
  const groups = ["COMMAND", "OPERATIONS"];

  return (
    <div style={{ width: 196, flexShrink: 0, background: T.sidebar, display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <div style={{ padding: "16px 14px 12px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(0,170,255,0.16)", border: "1px solid rgba(0,170,255,0.38)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={16} color="#00AAFF" />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.22em", color: "#00AAFF", fontFamily: "'Space Mono',monospace" }}>EEIE</div>
            <div style={{ fontSize: 7, color: "rgba(0,170,255,0.36)", letterSpacing: "0.14em", fontFamily: "'Space Mono',monospace" }}>COMMAND CENTER</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
        {groups.map(group => (
          <div key={group}>
            <div style={{ fontSize: 7, letterSpacing: "0.26em", color: "rgba(100,180,255,0.20)", fontFamily: "'Space Mono',monospace", padding: "10px 8px 4px", textTransform: "uppercase" as const }}>{group}</div>
            {NAV.filter(n => n.group === group).map(item => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <motion.button key={item.id} onClick={() => onNav(item.id)} whileHover={{ x: 2 }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 10px", borderRadius: 9, border: "none",
                    background: isActive ? "rgba(0,170,255,0.14)" : "transparent",
                    color: isActive ? "#60C8FF" : "rgba(130,190,255,0.36)",
                    cursor: "pointer", fontSize: 11, fontWeight: isActive ? 700 : 400,
                    marginBottom: 1, textAlign: "left" as const,
                    borderLeft: `2px solid ${isActive ? "#00AAFF" : "transparent"}`,
                    transition: "all 0.15s",
                  }}>
                  <Icon size={13} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {isActive && <ChevronRight size={11} style={{ opacity: 0.45 }} />}
                </motion.button>
              );
            })}
          </div>
        ))}

        {/* System section */}
        <div style={{ fontSize: 7, letterSpacing: "0.26em", color: "rgba(100,180,255,0.20)", fontFamily: "'Space Mono',monospace", padding: "10px 8px 4px", textTransform: "uppercase" as const }}>CONTROL</div>
        {[
          { icon: Gauge,  label: "System Integrity" },
          { icon: Lock,   label: "Security" },
          { icon: Server, label: "Infrastructure" },
          { icon: Cloud,  label: "Device Ecosystem" },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button key={item.label}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 9, border: "none", background: "transparent", color: "rgba(100,170,240,0.25)", cursor: "pointer", fontSize: 10.5, marginBottom: 1, textAlign: "left" as const }}>
              <Icon size={12} style={{ flexShrink: 0 }} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 12px 14px", borderTop: `1px solid ${T.sidebarBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
          <LiveDot color="#00E87A" size={6} />
          <span style={{ fontSize: 7.5, fontWeight: 700, color: "#00E87A", letterSpacing: "0.18em", fontFamily: "'Space Mono',monospace" }}>SOVEREIGN ACTIVE</span>
        </div>
        <div style={{ fontSize: 7, color: "rgba(0,200,100,0.28)", fontFamily: "'Space Mono',monospace", marginBottom: 10 }}>Token valid · All nodes online</div>

        {/* AI Panel toggle */}
        <motion.button whileTap={{ scale: 0.96 }} onClick={onToggleAI}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 10px", borderRadius: 8, border: `1px solid ${showAI ? "rgba(140,100,255,0.40)" : "rgba(0,170,255,0.14)"}`, background: showAI ? "rgba(140,100,255,0.14)" : "rgba(0,170,255,0.06)", color: showAI ? "#A78BFA" : "rgba(100,180,255,0.55)", cursor: "pointer", fontSize: 10, marginBottom: 6 }}>
          <Brain size={12} />
          {showAI ? "Hide EEIE AI" : "EEIE AI"}
          {!showAI && <span style={{ marginLeft: 2, background: "#FF3B5C", color: "#fff", borderRadius: 999, fontSize: 8, fontWeight: 800, padding: "1px 5px" }}>3</span>}
        </motion.button>

        <motion.button whileTap={{ scale: 0.96 }} onClick={onToggleDark}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,170,255,0.14)", background: "rgba(0,170,255,0.06)", color: "rgba(100,180,255,0.55)", cursor: "pointer", fontSize: 10 }}>
          {isDark ? <Sun size={12} /> : <Moon size={12} />}
          {isDark ? "Day Mode" : "Night Mode"}
        </motion.button>
      </div>
    </div>
  );
}

// ─── COMMAND CENTER TAB ────────────────────────────────────────────────────────

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
        <Waveform color={T.green} speed={2.8} height={40} />
        <div style={{ display: "flex", gap: 28, marginTop: 14 }}>
          {[{ l: "PULSE RATE", v: "1.0×" }, { l: "AMPLITUDE", v: "100%" }, { l: "SIGNAL", v: "NOMINAL" }, { l: "SENSOR CONF.", v: "98%" }, { l: "UPTIME", v: "99.99%" }].map(m => (
            <div key={m.l}>
              <div style={{ fontSize: 7.5, color: T.textFaint, letterSpacing: "0.16em", fontFamily: T.mono }}>{m.l}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.green, fontFamily: T.mono, marginTop: 3 }}>{m.v}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Intelligence Matrix */}
        <Panel title="Intelligence Matrix" subtitle="EEIE multi-dimensional readiness" icon={<Brain size={14} />} T={T}>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {[
              ["EEIE Real Intelligence",  "eeieRealPct"],
              ["Predictive Hospitality",  "predictivePct"],
              ["Sensory Immersion",       "sensoryImmersionPct"],
              ["Distributed Scale",       "distributedScalePct"],
              ["Operational Autonomy",    "operationalAutonomyPct"],
              ["Commerce Readiness",      "posReadinessPct"],
              ["Multi-Venue Scale",       "multiVenueReadinessPct"],
              ["Media Completeness",      "mediaCompletenessPct"],
            ].map(([label, key]) => {
              const pct = intel[key] ?? 0;
              const c = pct >= 80 ? T.green : pct >= 60 ? T.accent : T.yellow;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: T.textMid, marginBottom: 4 }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
            {status.advisories.entries.length === 0
              ? <div style={{ textAlign: "center", padding: "24px 0", color: T.textSub }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>✓</div>
                  <div style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>No advisories — System is nominal.</div>
                </div>
              : status.advisories.entries.slice(0, 6).map(a => {
                  const uc = a.urgency === "high" ? T.red : a.urgency === "medium" ? T.yellow : T.textSub;
                  return (
                    <motion.div key={a.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 10, background: `${uc}08`, border: `1px solid ${uc}1E` }}>
                      <div style={{ width: 3, background: uc, borderRadius: 2, flexShrink: 0, minHeight: 32 }} />
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
        <Panel title="Live Energy Distribution" subtitle="Venue behavioral states across network" icon={<Zap size={14} />} T={T}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(status.energy.states).map(([state, count]) => {
              const c = ENERGY_C[state] ?? T.accent;
              return (
                <motion.div key={state} whileHover={{ scale: 1.04 }}
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
      {cluster.length === 0 && <div style={{ color: T.textSub, fontSize: 13, padding: "48px 0", textAlign: "center" }}>No venues in cluster — venues appear as they emit heartbeat events.</div>}
      {cluster.map(v => {
        const es = emap.get(v.venueId);
        const hc = HC[v.health] ?? T.textSub;
        return (
          <motion.div key={v.venueId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -1 }}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px", boxShadow: T.shadow, display: "flex", gap: 14, alignItems: "center" }}>
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
                { n: String(v.activeSessions), l: "Sessions" },
                ...(es ? [{ n: `${es.conversionRate.toFixed(0)}%`, l: "Conv" }] : []),
                { n: `${Math.round(v.minutesSince)}m`, l: "Ago" },
              ].map((m, i) => (
                <div key={i} style={{ textAlign: "center" as const }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.accent }}>{m.n}</div>
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
      {sensory.entries.length === 0 && <div style={{ color: T.textSub, fontSize: 13, padding: "48px 0", textAlign: "center" }}>No active sensory layers — activate via craft experiences.</div>}
      {sensory.entries.map(e => {
        const intensity = intensities[e.venueId] ?? e.intensityScale;
        const pct = Math.round(intensity * 100);
        return (
          <motion.div key={e.venueId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 22px", boxShadow: T.shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 9.5, color: T.textFaint, fontFamily: T.mono, marginBottom: 4 }}>{e.venueId.slice(0, 14)}…</div>
                {e.activeCraft
                  ? <div style={{ fontSize: 18, fontWeight: 800, color: T.accent, letterSpacing: "0.12em" }}>{e.activeCraft.toUpperCase()}</div>
                  : <div style={{ fontSize: 13, color: T.textSub }}>No active craft</div>
                }
              </div>
              <div style={{ textAlign: "center" as const, padding: "10px 16px", background: `${T.accent}0E`, borderRadius: 12, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: T.accent }}>{pct}%</div>
                <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono, marginTop: 2 }}>INTENSITY</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
              {[{ l: "Occupancy", v: String(e.occupancy) }, { l: "Triggers", v: String(e.triggerCount) }, { l: "Last Trigger", v: e.lastTriggerAt ? new Date(e.lastTriggerAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—" }].map(m => (
                <div key={m.l} style={{ textAlign: "center" as const, padding: "10px", background: `${T.accent}06`, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{m.v}</div>
                  <div style={{ fontSize: 8.5, color: T.textFaint, fontFamily: T.mono, marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>
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
          <motion.div key={`${p.provider}-${p.venueId ?? "g"}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -1 }}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 22px", boxShadow: T.shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.text, textTransform: "capitalize" as const }}>{p.provider}</div>
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
                { l: "Failures",      v: String(p.consecutiveFailures) },
              ].map(m => (
                <div key={m.l} style={{ padding: "10px 14px", background: `${T.accent}06`, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 8.5, color: T.textFaint, fontFamily: T.mono, marginBottom: 4 }}>{m.l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{m.v}</div>
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
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px", boxShadow: T.shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 9.5, color: T.textFaint, fontFamily: T.mono }}>session:{p.sessionId.slice(0, 12)}…</div>
              <Badge label={p.predictedNextAction.replace(/_/g, " ")} color={ac} bg={`${ac}12`} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 10 }}>
              {[{ l: "Hesitation", v: p.hesitationScore }, { l: "Curiosity", v: p.curiosityScore }, { l: "Confidence", v: p.confidenceScore }, { l: "Fatigue", v: p.fatigueLevel }, { l: "Premium", v: p.premiumIntentScore }].map(m => (
                <div key={m.l} style={{ textAlign: "center" as const, padding: "10px 6px", background: `${T.accent}07`, borderRadius: 10, border: `1px solid ${T.border}` }}>
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
                <pre style={{ fontSize: 10, color: T.textMid, fontFamily: T.mono, margin: 0, whiteSpace: "pre-wrap" as const, wordBreak: "break-all" as const }}>{JSON.stringify(e.payload, null, 2).slice(0, 180)}</pre>
              </div>
            ))
          }
        </Panel>
      ))}
    </div>
  );
}

// ─── FOUNDER CONTROL BAR ──────────────────────────────────────────────────────

function FounderBar({ T }: { T: Theme }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const ACTIONS = [
    { id: "override",    icon: <Monitor size={20} />,   label: "SYSTEM OVERRIDE",     sub: "Shutdown / Restart",  color: T.yellow },
    { id: "kill",        icon: <PowerOff size={20} />,  label: "KILL SWITCH",          sub: "Disable Transactions",color: T.red },
    { id: "maintenance", icon: <Wrench size={20} />,    label: "MAINTENANCE MODE",     sub: "Pause Non-Essential", color: T.accent },
    { id: "announce",    icon: <Megaphone size={20} />, label: "GLOBAL ANNOUNCEMENT",  sub: "Broadcast All Venues",color: T.purple },
    { id: "power",       icon: <Siren size={20} />,     label: "SYSTEM POWER",         sub: "You are in control.", color: T.green },
    { id: "lock",        icon: <Lock size={20} />,      label: "LOCK KIOSKS",          sub: "Immediate lockdown",  color: T.red },
    { id: "sync",        icon: <RefreshCw size={20} />, label: "FORCE SYNC",           sub: "All venues",          color: T.cyan },
    { id: "broadcast",   icon: <Bell size={20} />,      label: "STAFF BROADCAST",      sub: "Emergency alert",     color: T.yellow },
  ];
  return (
    <div style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 14, padding: "12px 16px", boxShadow: T.shadow }}>
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", color: T.textFaint, fontFamily: T.mono, marginBottom: 10 }}>
        ◈ FOUNDER CONTROL — SOVEREIGN GOVERNANCE &amp; OVERRIDES
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
        {ACTIONS.map(a => (
          <TouchButton key={a.id}
            icon={<span style={{ color: a.color }}>{a.icon}</span>}
            label={a.label} sub={a.sub} color={a.color}
            variant="glass" size="lg"
            onClick={() => { setConfirm(confirm === a.id ? null : a.id); triggerHaptic("founderConfirm"); }}
          />
        ))}
      </div>
      <AnimatePresence>
        {confirm && (() => {
          const act = ACTIONS.find(a => a.id === confirm)!;
          return (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
              <div style={{ marginTop: 10, padding: "12px 16px", borderRadius: 10, background: `${act.color}08`, border: `1px solid ${act.color}22`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: T.textMid }}>Confirm: <strong style={{ color: T.text }}>{act.label}</strong></span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setConfirm(null)} style={{ padding: "9px 18px", borderRadius: 9, border: `1px solid ${T.border}`, background: "transparent", color: T.textSub, cursor: "pointer", fontSize: 11 }}>Cancel</button>
                  <button onClick={() => { setConfirm(null); triggerHaptic("success"); }} style={{ padding: "9px 18px", borderRadius: 9, border: `1px solid ${act.color}40`, background: `${act.color}14`, color: act.color, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Execute</button>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// ─── LIVE TICKER ──────────────────────────────────────────────────────────────

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

// ─── TAB BAR CONFIG ───────────────────────────────────────────────────────────

const TAB_LABELS: { id: TabId; label: string; icon: React.ComponentType<{ size: number }> }[] = [
  { id: "overview",    label: "Command Center",     icon: Monitor },
  { id: "network",     label: "Live Network",       icon: Globe },
  { id: "sensory",     label: "Sensory Engine",     icon: Radio },
  { id: "commerce",    label: "Commerce Health",    icon: Package },
  { id: "predictions", label: "AI Predictions",     icon: Brain },
  { id: "bus",         label: "Event Bus",          icon: Cpu },
  { id: "cockpit",     label: "Staff Cockpit",      icon: Users },
  { id: "visual",      label: "Visual Intelligence",icon: ImageIcon },
  { id: "mood",        label: "Mood Sensor",        icon: Thermometer },
  { id: "databrain",   label: "Unified Data Brain", icon: Database },
];

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function EEIECommandCenter() {
  const [, navigate]      = useLocation();
  const [tab, setTab]     = useState<TabId>("overview");
  const [status, setStatus]   = useState<EEIEStatus | null>(null);
  const [cluster, setCluster] = useState<ClusterVenue[]>([]);
  const [energy, setEnergy]   = useState<VenueState[]>([]);
  const [bus, setBus]         = useState<BusHistory>({});
  const [loading, setLoading] = useState(true);
  const [lastAt, setLastAt]   = useState(new Date());
  const [showAI, setShowAI]   = useState(true);

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

  const fullHeight = ["cockpit"].includes(tab);

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
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* ── TOP COMMAND RAIL ── */}
      <div style={{
        height: 54, flexShrink: 0,
        background: T.dark ? "rgba(6,10,20,0.97)" : "rgba(255,255,255,0.96)",
        borderBottom: `1px solid ${T.border}`,
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        display: "flex", alignItems: "center", gap: 14, padding: "0 18px",
        boxShadow: T.dark ? "none" : "0 1px 12px rgba(0,60,160,0.06)",
      }}>
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => navigate("/sovereign-dashboard")}
          style={{ background: "none", border: "none", color: T.textSub, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 11, padding: 0, flexShrink: 0 }}>
          <ChevronLeft size={14} /> Back
        </motion.button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <LiveDot color={T.green} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: T.text, letterSpacing: "0.06em" }}>EEIE COMMAND CENTER</div>
            <div style={{ fontSize: 7.5, color: T.textFaint, letterSpacing: "0.12em", fontFamily: T.mono }}>EXPERIENCE ENHANCEMENT INTELLIGENCE ENGINE</div>
          </div>
          <Badge label="LIVE" color={T.green} bg={`${T.green}12`} />
          <div style={{ flex: 1, overflow: "hidden", opacity: 0.55 }}>
            <Waveform color={T.accent} speed={4} height={20} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          {[
            { l: "SYSTEM STATUS",  v: "All Systems Operational", c: T.green },
            { l: "AI ENGINE",      v: "Active",                  c: T.accent },
            { l: "TITAN V",        v: "Operational",             c: T.green },
            { l: "SENSOR LAYER",   v: "2 Offline",               c: T.yellow },
          ].map(m => (
            <div key={m.l} style={{ textAlign: "right" as const }}>
              <div style={{ fontSize: 7, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.12em" }}>{m.l}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: m.c }}>{m.v}</div>
            </div>
          ))}
          <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono }}>{lastAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => void refresh()}
            style={{ background: `${T.accent}10`, border: `1px solid ${T.borderHi}`, borderRadius: 9, padding: "7px 12px", cursor: "pointer", color: T.accent, display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: T.mono }}>
            <motion.span animate={loading ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: loading ? Infinity : 0, ease: "linear" }}>
              <RefreshCw size={11} />
            </motion.span>
            REFRESH
          </motion.button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar active={tab} onNav={id => setTab(id as TabId)} isDark={isDark} onToggleDark={() => setIsDark(d => !d)} showAI={showAI} onToggleAI={() => setShowAI(p => !p)} T={T} />

        {/* ── MAIN COLUMN ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Status band */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "5px 20px", background: T.dark ? "rgba(0,8,20,0.8)" : "rgba(238,244,255,0.65)", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <LiveDot color={T.green} size={6} />
              <span style={{ fontSize: 8, color: T.green, letterSpacing: "0.16em", fontFamily: T.mono }}>TITAN V ENGINE: OPERATIONAL</span>
            </div>
            <div style={{ flex: 1 }}><Waveform color={T.accent} speed={3.5} height={16} /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <LiveDot color={T.green} size={6} />
              <span style={{ fontSize: 8, color: T.green, letterSpacing: "0.16em", fontFamily: T.mono }}>KIOSK LOCK: ABSOLUTE</span>
            </div>
          </div>

          {/* KPI strip */}
          {status && (
            <div style={{ display: "flex", gap: 8, padding: "10px 20px", borderBottom: `1px solid ${T.border}`, background: T.dark ? "rgba(6,12,28,0.7)" : "rgba(244,247,252,0.8)", flexShrink: 0, overflowX: "auto" }}>
              <KpiCard label="Cluster Nodes"    value={String(status.cluster.total)}             delta={`${status.cluster.healthy} healthy`} positive icon={Network}       T={T} color={T.green} />
              <KpiCard label="Active Venues"    value={String(status.energy.venues)}             delta="with live events"                          icon={Globe}         T={T} />
              <KpiCard label="AI Predictions"   value={String(status.predictions.recent)}        delta="last 5 min"                                icon={Brain}         T={T} color={T.purple} />
              <KpiCard label="Advisories"       value={String(status.advisories.recent)}         delta="in buffer"                                 icon={AlertTriangle}  T={T} color={status.advisories.recent > 0 ? T.yellow : T.green} />
              <KpiCard label="Commerce Online"  value={`${status.pos.healthy}/${status.pos.total}`} delta={status.pos.simulated > 0 ? `${status.pos.simulated} simulated` : "all live"} icon={Package} T={T} />
              <KpiCard label="Sensory Layers"   value={String(status.sensory.activeVenues)}     delta="active venues"                             icon={Radio}         T={T} />
              <KpiCard label="Guest Sessions"   value="4"                                        delta="live right now"                            icon={Users}         T={T} color={T.green} />
              <KpiCard label="Mood State"       value="Premium"                                  delta="upsell aggressive"                         icon={Thermometer}   T={T} color={T.accent} />
            </div>
          )}

          {/* Tab bar */}
          <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: T.dark ? "rgba(6,10,20,0.65)" : "rgba(248,250,254,0.92)", flexShrink: 0, overflowX: "auto" }}>
            {TAB_LABELS.map(item => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <motion.button key={item.id} onClick={() => setTab(item.id)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 16px", border: "none", background: isActive ? T.tabActive : "transparent", color: isActive ? T.accent : T.textSub, borderBottom: `2px solid ${isActive ? T.accent : "transparent"}`, cursor: "pointer", fontSize: 10, fontWeight: isActive ? 700 : 400, letterSpacing: "0.10em", textTransform: "uppercase" as const, fontFamily: T.mono, whiteSpace: "nowrap" as const, minHeight: 44, marginBottom: -1, transition: "all 0.15s" }}>
                  <Icon size={11} />{item.label}
                </motion.button>
              );
            })}
          </div>

          {/* Content area */}
          <div style={{ flex: 1, overflowY: "auto", padding: fullHeight ? "14px 20px" : "18px 20px 10px" }}>
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

            {/* Tab routing */}
            {tab === "cockpit" ? (
              <StaffCockpit T={T} />
            ) : tab === "mood" ? (
              <MoodSensorTab T={T} />
            ) : tab === "visual" ? (
              <VisualIntelligenceTab T={T} />
            ) : tab === "databrain" || tab === "media" ? (
              <DataBrainTab T={T} />
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
          <div style={{ padding: "8px 20px 10px", borderTop: `1px solid ${T.border}`, background: T.dark ? "rgba(6,10,20,0.94)" : "rgba(248,250,255,0.96)", flexShrink: 0 }}>
            <FounderBar T={T} />
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "5px 20px", background: T.dark ? "#04070F" : "#EBF0F9", borderTop: `1px solid ${T.border}`, flexShrink: 0, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono }}>SYSTEM INTEGRITY</span>
              <div style={{ width: 70, height: 4, borderRadius: 2, background: `${T.accent}18`, overflow: "hidden" }}>
                <div style={{ width: "100%", height: "100%", background: T.green }} />
              </div>
              <span style={{ fontSize: 9, color: T.green, fontFamily: T.mono, fontWeight: 700 }}>100%</span>
            </div>
            {[
              { l: "Security", v: "Secure" }, { l: "Compliance", v: "Compliant" },
              { l: "Backup", v: "Live" }, { l: "Uptime", v: "99.99%" },
              { l: "Event Bus", v: "Active" }, { l: "Distributor Sync", v: "Syncing" },
            ].map(m => (
              <div key={m.l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <LiveDot color={m.v === "Syncing" ? T.yellow : T.green} size={5} />
                <span style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono }}>{m.l}: </span>
                <span style={{ fontSize: 7.5, color: m.v === "Syncing" ? T.yellow : T.green, fontFamily: T.mono, fontWeight: 700 }}>{m.v}</span>
              </div>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 7.5, color: T.textFaint, fontFamily: T.mono }}>EEIE TITAN V v3.0.0</span>
          </div>
        </div>

        {/* AI Panel */}
        <AIPanel T={T} open={showAI} onClose={() => setShowAI(false)} />
      </div>
    </div>
  );
}
