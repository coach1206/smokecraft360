import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Globe, Monitor, Cpu, Zap, RefreshCw,
  AlertTriangle, CheckCircle, XCircle, Clock,
  ToggleRight, ChevronRight, Activity, Lock,
  Unlock, LogOut, Power, Upload, Shield, Radio,
} from "lucide-react";
import { getAuthHeaders } from "@/services/auth";

const BASE = "/api";

const C = {
  bg:     "#06040a",
  panel:  "rgba(255,255,255,0.04)",
  panelH: "rgba(255,255,255,0.07)",
  border: "rgba(201,168,76,0.15)",
  gold:   "#c9a84c",
  goldD:  "#d4af37",
  text:   "rgba(240,232,212,0.92)",
  muted:  "rgba(240,232,212,0.45)",
  dim:    "rgba(240,232,212,0.22)",
  red:    "#ef4444",
  green:  "#22c55e",
  amber:  "#f59e0b",
  blue:   "#60a5fa",
  purple: "#a78bfa",
};

type Tab = "fleet" | "ota" | "remote" | "audit";

interface Device {
  id: string; venueId: string; type: string; nickname: string;
  status: string; lastActiveAt: string | null;
  reportedVersion?: string | null; targetVersion?: string;
  compliant?: boolean; minutesSinceHeartbeat?: number | null;
  pendingActions?: string[];
  availableActions?: { kind: string; label: string; risk: string }[];
}

interface FleetSummary {
  targetVersion: string; total: number;
  compliant: number; outdated: number; unknown: number; offline: number;
  devices: Device[];
}

interface Channel {
  channel: string; currentVersion: string; previousVersion: string | null;
  deployCount: number; lastDeployedAt: string | null;
  freezeWindow: boolean; autoPromote: boolean;
}

interface VersionEntry {
  version: string; label: string; notes: string;
  deployedAt: string; deployedBy: string;
  status: "active" | "rolled_back" | "superseded";
  riskLevel: "low" | "medium" | "high"; packs: string[];
  channel: string;
}

interface GovernanceHealth {
  auditActionsLast24h: number; pendingApprovals: number;
  disabledSwitches: string[]; systemStatus: string;
}

const STATUS_COLOR: Record<string, string> = {
  active: C.green, inactive: C.amber, offline: C.red, online: C.green,
};
const RISK_COLOR: Record<string, string> = {
  low: C.green, medium: C.amber, high: C.red,
};
const CHAN_COLOR: Record<string, string> = {
  production: C.green, staging: C.amber, beta: C.blue,
};

const REMOTE_ACTION_ICONS: Record<string, React.ReactNode> = {
  force_refresh:      <RefreshCw size={13} />,
  restart_app:        <Power size={13} />,
  lock_kiosk:         <Lock size={13} />,
  unlock_kiosk:       <Unlock size={13} />,
  force_logout:       <LogOut size={13} />,
  maintenance_mode:   <AlertTriangle size={13} />,
  deploy_update:      <Upload size={13} />,
  emergency_shutdown: <Zap size={13} />,
};

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60)   return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
      textTransform: "uppercase", letterSpacing: "0.1em",
      background: `${color}18`, border: `1px solid ${color}40`, color,
    }}>{label}</span>
  );
}

function StatCard({ label, value, color = C.text }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 12, background: C.panel,
      border: `1px solid ${C.border}`, textAlign: "center",
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function CentralCommand() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("fleet");

  const [fleet, setFleet]                 = useState<FleetSummary | null>(null);
  const [channels, setChannels]           = useState<Channel[]>([]);
  const [channelDetail, setChannelDetail] = useState<Record<string, VersionEntry[]>>({});
  const [history, setHistory]             = useState<VersionEntry[]>([]);
  const [health, setHealth]               = useState<GovernanceHealth | null>(null);
  const [venueSummary, setVenueSummary]   = useState<Device[]>([]);

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [actionLoading, setActionLoading]   = useState<string | null>(null);
  const [actionResult, setActionResult]     = useState<string | null>(null);
  const [pushLoading, setPushLoading]       = useState(false);
  const [rollbackLoading, setRollbackLoading] = useState<string | null>(null);

  const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };

  const loadFleet = useCallback(async () => {
    const r = await fetch(`${BASE}/ota/fleet`, { headers });
    if (r.ok) setFleet(await r.json());
  }, []);

  const loadChannels = useCallback(async () => {
    const r = await fetch(`${BASE}/ota/channels`, { headers });
    if (r.ok) setChannels((await r.json()).channels);
  }, []);

  const loadHistory = useCallback(async () => {
    const r = await fetch(`${BASE}/ota/history`, { headers });
    if (r.ok) setHistory((await r.json()).deployments);
  }, []);

  const loadHealth = useCallback(async () => {
    const r = await fetch(`${BASE}/governance/health`, { headers });
    if (r.ok) setHealth(await r.json());
  }, []);

  const loadVenueSummary = useCallback(async () => {
    const r = await fetch(`${BASE}/remote-actions/venue-summary`, { headers });
    if (r.ok) setVenueSummary((await r.json()).devices);
  }, []);

  const loadChannelDetail = useCallback(async (ch: string) => {
    if (channelDetail[ch]) return;
    const r = await fetch(`${BASE}/ota/channels/${ch}`, { headers });
    if (r.ok) {
      const d = await r.json();
      setChannelDetail(prev => ({ ...prev, [ch]: d.history }));
    }
  }, [channelDetail]);

  useEffect(() => {
    void loadFleet();
    void loadChannels();
    void loadHealth();
  }, []);

  useEffect(() => {
    if (tab === "ota" && history.length === 0) loadHistory();
    if (tab === "ota") channels.forEach(c => loadChannelDetail(c.channel));
    if (tab === "remote" && venueSummary.length === 0) loadVenueSummary();
  }, [tab, channels]);

  async function dispatchAction(deviceId: string, action: string) {
    setActionLoading(`${deviceId}-${action}`);
    setActionResult(null);
    try {
      const r = await fetch(`${BASE}/remote-actions/${deviceId}`, {
        method: "POST", headers,
        body: JSON.stringify({ action }),
      });
      const d = await r.json();
      setActionResult(r.ok ? `✓ ${d.message}` : `✗ ${d.error}`);
      if (r.ok) void loadVenueSummary();
    } finally {
      setActionLoading(null);
    }
  }

  async function fleetPush() {
    setPushLoading(true);
    try {
      const r = await fetch(`${BASE}/ota/fleet/push`, { method: "POST", headers });
      if (r.ok) {
        const d = await r.json();
        setActionResult(`✓ Update queued to ${d.queued} devices`);
        void loadFleet();
      }
    } finally { setPushLoading(false); }
  }

  async function rollback(channel: string) {
    setRollbackLoading(channel);
    try {
      const r = await fetch(`${BASE}/ota/channels/${channel}/rollback`, { method: "POST", headers });
      if (r.ok) {
        void loadChannels();
        void loadHistory();
        setChannelDetail(prev => { const n = { ...prev }; delete n[channel]; return n; });
      }
    } finally { setRollbackLoading(null); }
  }

  const TABS = [
    { id: "fleet" as Tab,  label: "Device Fleet",    icon: <Monitor size={13} /> },
    { id: "ota"   as Tab,  label: "OTA Channels",    icon: <Upload size={13} /> },
    { id: "remote" as Tab, label: "Remote Actions",  icon: <Radio size={13} /> },
    { id: "audit" as Tab,  label: "Deploy History",  icon: <Activity size={13} /> },
  ];

  const statusColor = health?.systemStatus === "operational" ? C.green
    : health?.systemStatus === "degraded" ? C.amber : C.red;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: `1px solid ${C.border}`,
        background: "rgba(6,4,10,0.96)", backdropFilter: "blur(20px)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/command-center")}
            style={{
              width: 42, height: 42, borderRadius: 12, background: C.panel,
              border: `1px solid ${C.border}`, color: C.muted,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <ArrowLeft size={18} />
          </motion.button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Globe size={16} color={C.gold} />
              <span style={{ fontSize: 18, fontWeight: 700, color: C.gold }}>Axiom Central Command</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
              Remote Operations · OTA Deployment · Device Fleet
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {fleet && (
            <>
              <StatCard label="Devices" value={fleet.total} />
              <StatCard label="Online"  value={fleet.total - fleet.offline} color={C.green} />
              <StatCard label="Outdated" value={fleet.outdated} color={fleet.outdated > 0 ? C.amber : C.text} />
            </>
          )}
          {health && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 20,
              background: `${statusColor}12`, border: `1px solid ${statusColor}30`,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, textTransform: "capitalize" }}>
                {health.systemStatus}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: "flex", gap: 4, padding: "12px 24px 0",
        borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        background: "rgba(6,4,10,0.8)",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 16px 10px", borderRadius: "10px 10px 0 0",
            background: tab === t.id ? C.panel : "transparent",
            border: tab === t.id ? `1px solid ${C.border}` : "1px solid transparent",
            borderBottom: tab === t.id ? "1px solid transparent" : "none",
            color: tab === t.id ? C.gold : C.muted,
            fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
            cursor: "pointer", position: "relative", bottom: -1,
          }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Action result toast ── */}
      <AnimatePresence>
        {actionResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setActionResult(null), 3000)}
            style={{
              position: "fixed", top: 80, right: 24, zIndex: 300,
              padding: "10px 18px", borderRadius: 10,
              background: actionResult.startsWith("✓") ? `${C.green}18` : `${C.red}18`,
              border: `1px solid ${actionResult.startsWith("✓") ? `${C.green}40` : `${C.red}40`}`,
              color: actionResult.startsWith("✓") ? C.green : C.red,
              fontSize: 12, fontWeight: 600,
            }}>
            {actionResult}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        <AnimatePresence mode="wait">

          {/* ── Fleet Tab ── */}
          {tab === "fleet" && (
            <motion.div key="fleet" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {fleet && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
                    <StatCard label="Total"     value={fleet.total} />
                    <StatCard label="Compliant" value={fleet.compliant}  color={C.green} />
                    <StatCard label="Outdated"  value={fleet.outdated}   color={fleet.outdated > 0 ? C.amber : C.text} />
                    <StatCard label="Unknown"   value={fleet.unknown}    color={C.muted} />
                    <StatCard label="Offline"   value={fleet.offline}    color={fleet.offline > 0 ? C.red : C.text} />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted }}>
                      Device Fleet — Target: v{fleet.targetVersion}
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }}
                      onClick={() => void loadFleet()}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                        borderRadius: 8, background: C.panel, border: `1px solid ${C.border}`,
                        color: C.muted, fontSize: 11, cursor: "pointer",
                      }}>
                      <RefreshCw size={11} /> Refresh
                    </motion.button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {fleet.devices.map(d => (
                      <motion.div key={d.id} whileHover={{ x: 2 }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "12px 16px", borderRadius: 10,
                          background: d.status === "offline" ? `${C.red}06` : C.panel,
                          border: `1px solid ${d.status === "offline" ? `${C.red}25` : C.border}`,
                        }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[d.status] ?? C.muted, flexShrink: 0 }} />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{d.nickname || d.type}</span>
                              <Pill label={d.type} color={C.muted} />
                            </div>
                            <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
                              Last seen: {timeAgo(d.lastActiveAt)}
                              {d.reportedVersion && <span style={{ marginLeft: 8 }}>v{d.reportedVersion}</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {d.reportedVersion && (
                            <Pill
                              label={d.compliant ? "current" : "outdated"}
                              color={d.compliant ? C.green : C.amber}
                            />
                          )}
                          <Pill label={d.status} color={STATUS_COLOR[d.status] ?? C.muted} />
                        </div>
                      </motion.div>
                    ))}
                    {fleet.devices.length === 0 && (
                      <div style={{ color: C.muted, fontSize: 13, padding: 40, textAlign: "center" }}>
                        No devices registered for this venue.
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ── OTA Tab ── */}
          {tab === "ota" && (
            <motion.div key="ota" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                {channels.map(ch => (
                  <div key={ch.channel} style={{
                    padding: "16px 18px", borderRadius: 14,
                    background: C.panel, border: `1px solid ${CHAN_COLOR[ch.channel] ?? C.border}30`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: CHAN_COLOR[ch.channel] ?? C.muted }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: CHAN_COLOR[ch.channel] ?? C.text, textTransform: "capitalize" }}>{ch.channel}</span>
                      </div>
                      {ch.freezeWindow && <Pill label="freeze" color={C.amber} />}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>v{ch.currentVersion}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 12 }}>
                      {ch.deployCount} deploys · last {timeAgo(ch.lastDeployedAt)}
                    </div>
                    {ch.previousVersion && (
                      <motion.button whileTap={{ scale: 0.95 }}
                        disabled={rollbackLoading === ch.channel}
                        onClick={() => rollback(ch.channel)}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                          background: `${C.red}10`, border: `1px solid ${C.red}30`,
                          color: C.red, fontSize: 11, fontWeight: 600,
                          opacity: rollbackLoading === ch.channel ? 0.5 : 1,
                        }}>
                        <RefreshCw size={10} /> Rollback to v{ch.previousVersion}
                      </motion.button>
                    )}

                    {/* Channel history */}
                    {channelDetail[ch.channel] && (
                      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                        {channelDetail[ch.channel].slice(0, 3).map(h => (
                          <div key={h.version} style={{
                            padding: "8px 10px", borderRadius: 8,
                            background: h.status === "active" ? `${CHAN_COLOR[ch.channel] ?? C.gold}08` : "rgba(255,255,255,0.02)",
                            border: `1px solid ${h.status === "active" ? `${CHAN_COLOR[ch.channel] ?? C.gold}25` : C.border}`,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: h.status === "active" ? C.text : C.muted }}>
                                v{h.version}
                              </span>
                              <Pill
                                label={h.status}
                                color={h.status === "active" ? CHAN_COLOR[ch.channel] ?? C.green : h.status === "rolled_back" ? C.red : C.dim}
                              />
                            </div>
                            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{h.label}</div>
                            <div style={{ fontSize: 9, color: C.dim, marginTop: 1 }}>{timeAgo(h.deployedAt)} · {h.deployedBy}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Fleet push */}
              {fleet && fleet.outdated > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 18px", borderRadius: 12,
                  background: `${C.amber}08`, border: `1px solid ${C.amber}30`, marginBottom: 16,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.amber }}>
                      {fleet.outdated} device{fleet.outdated > 1 ? "s" : ""} running outdated version
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>Push v{fleet.targetVersion} to all outdated devices</div>
                  </div>
                  <motion.button whileTap={{ scale: 0.95 }}
                    disabled={pushLoading}
                    onClick={fleetPush}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
                      borderRadius: 10, cursor: "pointer",
                      background: `${C.gold}15`, border: `1px solid ${C.gold}40`,
                      color: C.gold, fontSize: 12, fontWeight: 700,
                      opacity: pushLoading ? 0.5 : 1,
                    }}>
                    <Upload size={13} /> {pushLoading ? "Pushing…" : "Push Update"}
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Remote Actions Tab ── */}
          {tab === "remote" && (
            <motion.div key="remote" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>
                Commands are queued and executed on the device's next heartbeat (typically within 30s).
              </div>
              {venueSummary.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13, padding: 40, textAlign: "center" }}>
                  No devices registered.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {venueSummary.map(d => (
                    <motion.div key={d.id}
                      style={{
                        padding: "14px 16px", borderRadius: 12,
                        background: selectedDevice?.id === d.id ? C.panelH : C.panel,
                        border: `1px solid ${selectedDevice?.id === d.id ? C.gold + "40" : C.border}`,
                      }}>
                      <div
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                        onClick={() => setSelectedDevice(selectedDevice?.id === d.id ? null : d)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[d.status] ?? C.muted, flexShrink: 0 }} />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{d.nickname || d.type}</span>
                              <Pill label={d.type} color={C.muted} />
                              <Pill label={d.status} color={STATUS_COLOR[d.status] ?? C.muted} />
                            </div>
                            {d.pendingActions && d.pendingActions.length > 0 && (
                              <div style={{ fontSize: 10, color: C.amber, marginTop: 2 }}>
                                ⏳ {d.pendingActions.join(", ")}
                              </div>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={14} color={C.dim}
                          style={{ transform: selectedDevice?.id === d.id ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                      </div>

                      <AnimatePresence>
                        {selectedDevice?.id === d.id && d.availableActions && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                            <div style={{
                              display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14,
                              paddingTop: 14, borderTop: `1px solid ${C.border}`,
                            }}>
                              {d.availableActions.map(a => (
                                <motion.button key={a.kind} whileTap={{ scale: 0.93 }}
                                  disabled={!!actionLoading}
                                  onClick={() => dispatchAction(d.id, a.kind)}
                                  style={{
                                    display: "flex", alignItems: "center", gap: 6,
                                    padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                                    background: `${RISK_COLOR[a.risk] ?? C.muted}10`,
                                    border: `1px solid ${RISK_COLOR[a.risk] ?? C.muted}35`,
                                    color: RISK_COLOR[a.risk] ?? C.muted,
                                    fontSize: 11, fontWeight: 600,
                                    opacity: actionLoading === `${d.id}-${a.kind}` ? 0.5 : 1,
                                  }}>
                                  {REMOTE_ACTION_ICONS[a.kind] ?? <Zap size={13} />}
                                  {actionLoading === `${d.id}-${a.kind}` ? "…" : a.label}
                                </motion.button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Deploy History Tab ── */}
          {tab === "audit" && (
            <motion.div key="audit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {history.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13, padding: 40, textAlign: "center" }}>
                  Loading deployment history…
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {history.map((h, i) => (
                    <motion.div key={`${h.channel}-${h.version}-${i}`}
                      style={{
                        padding: "14px 18px", borderRadius: 12,
                        background: h.status === "active" ? `${CHAN_COLOR[h.channel] ?? C.gold}06` : C.panel,
                        border: `1px solid ${h.status === "active" ? `${CHAN_COLOR[h.channel] ?? C.gold}25` : C.border}`,
                      }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>v{h.version}</span>
                            <Pill label={h.channel} color={CHAN_COLOR[h.channel] ?? C.muted} />
                            <Pill label={h.status}  color={h.status === "active" ? C.green : h.status === "rolled_back" ? C.red : C.dim} />
                            <Pill label={h.riskLevel + " risk"} color={RISK_COLOR[h.riskLevel]} />
                          </div>
                          <div style={{ fontSize: 13, color: C.text, marginBottom: 3 }}>{h.label}</div>
                          {h.notes && <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{h.notes}</div>}
                          {h.packs.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {h.packs.map(p => (
                                <span key={p} style={{
                                  fontSize: 9, padding: "1px 6px", borderRadius: 999,
                                  background: "rgba(255,255,255,0.06)", color: C.dim,
                                  border: `1px solid ${C.border}`,
                                }}>{p}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 11, color: C.muted }}>{timeAgo(h.deployedAt)}</div>
                          <div style={{ fontSize: 10, color: C.dim }}>{h.deployedBy}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: "10px 24px", borderTop: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 10, color: C.dim, letterSpacing: "0.12em",
        textTransform: "uppercase", flexShrink: 0,
        background: "rgba(6,4,10,0.9)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Cpu size={9} />
          <span>Axiom Central Command · Remote Operations Layer</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Shield size={9} color={C.gold} /> Governance Active
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <CheckCircle size={9} color={C.green} /> Audit Logging
          </span>
        </div>
      </div>
    </div>
  );
}
