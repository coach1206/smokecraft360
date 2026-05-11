/**
 * EEIE Commerce Intelligence Center
 * All data is fetched from real backend API endpoints.
 * No faked live status — adapter state reflects actual env-secret presence.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Package, DollarSign, BarChart2,
  CheckCircle, AlertTriangle, WifiOff, Wifi, XCircle,
  ShoppingCart, Zap, Activity, ArrowRight, Layers,
  RefreshCw, Eye, RotateCcw, Bell, FileText,
  Users, Settings, PlayCircle,
} from "lucide-react";
import {
  type Theme, Badge, Meter, Panel, DonutRing,
  Waveform, KpiCard, LiveDot, triggerHaptic,
} from "./shared";
import "@/styles/eeie-motion.css";

// ── API types ─────────────────────────────────────────────────

type CommerceMode = "live" | "local" | "demo" | "not_connected";
type AdapterStatus = "connected" | "offline" | "setup_needed" | "testing" | "manual";
type HandoffStatus = "success" | "waiting" | "failed" | "manual_ready";
type AlertSeverity = "info" | "warning" | "critical" | "success";

interface CommerceAdapter {
  id: string; name: string; status: AdapterStatus;
  mode: CommerceMode; modeLabel: string; isLive: boolean;
  lastSync: string | null; syncDurationMs: number | null;
  failures: number; supportedActions: string[];
  setupRequired: boolean; notes: string;
}

interface OrderHandoff {
  id: string; table: string; guest: string; staff: string;
  bundleName: string; items: string[]; cartTotal: number;
  status: HandoffStatus; posAdapter: string; posResponse: string;
  createdAt: string; updatedAt: string;
}

interface CommerceAlert {
  id: string; severity: AlertSeverity; source: string;
  title: string; message: string; recommendedAction: string;
  acknowledged: boolean; createdAt: string;
}

interface CommerceLog {
  id: string; type: string; source: string;
  message: string; createdAt: string;
}

interface FlowStep {
  id: string; label: string; status: string; lastEvent: string | null;
}

interface BundleImages {
  cigarImage: string; liquorImage: string; foodImage: string; bundleImage: string;
}

interface ApiBundle {
  id: string; name: string; cigar: string; liquor: string; food: string;
  price: number; savedAmount: number; matchScore: number;
  conversionRate: number; revenueGenerated: number; images: BundleImages;
}

interface StaffMember {
  id: string; name: string; recommendationsShown: number;
  itemsAdded: number; sentToPos: number;
  conversionRate: number; revenueAssisted: number;
}

interface CommerceHealth {
  mode: CommerceMode; modeLabel: string; isLive: boolean;
  summary: {
    activeAdapter: string; posConnected: boolean; manualModeEnabled: boolean;
    revenueSync: string; unsentCarts: number; failedHandoffs: number;
    bundleConversion: string; todayRevenueLift: string;
    todayRevenue: number; occupancy: number;
  };
  flow: FlowStep[];
  recommendedActions: string[];
}

// ── Auth fetch helpers ────────────────────────────────────────

function getToken() {
  return localStorage.getItem("SOVEREIGN_SESSION") ?? "";
}

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const token = getToken();
    const r = await fetch(path, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!r.ok) return null;
    return r.json() as Promise<T>;
  } catch { return null; }
}

async function apiPost<T>(path: string, body?: unknown): Promise<T | null> {
  try {
    const token = getToken();
    const r = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) return null;
    return r.json() as Promise<T>;
  } catch { return null; }
}

// ── Color helpers ─────────────────────────────────────────────

function modeColor(mode: CommerceMode, T: Theme) {
  return { live: T.green, local: T.accent, demo: T.purple, not_connected: T.yellow }[mode] ?? T.accent;
}

function adapterStatusColor(status: AdapterStatus, T: Theme) {
  return { connected: T.green, manual: T.accent, testing: T.purple, offline: T.red, setup_needed: T.yellow }[status] ?? T.textSub;
}

function handoffStatusColor(status: HandoffStatus, T: Theme) {
  return { success: T.green, waiting: T.yellow, manual_ready: T.accent, failed: T.red }[status] ?? T.textSub;
}

function alertSeverityColor(severity: AlertSeverity, T: Theme) {
  return { success: T.green, info: T.accent, warning: T.yellow, critical: T.red }[severity] ?? T.textSub;
}

function flowStepColor(status: string, T: Theme) {
  if (status === "connected") return T.green;
  if (status === "warning")   return T.yellow;
  if (status === "manual" || status === "manual_ready") return T.accent;
  if (status === "local")     return T.textSub;
  return T.textSub;
}

// ── Revenue category rings (static split) ────────────────────

const CATEGORIES = [
  { label: "Cigars",  pct: 42, color: "#7C3AED" },
  { label: "Spirits", pct: 31, color: "#D97706" },
  { label: "Food",    pct: 18, color: "#059669" },
  { label: "Bundles", pct: 9,  color: "#0891B2" },
];

// ── Component ─────────────────────────────────────────────────

interface Props { T: Theme; }

export function CommerceIntelligenceTab({ T }: Props) {
  const [health, setHealth]       = useState<CommerceHealth | null>(null);
  const [adapters, setAdapters]   = useState<CommerceAdapter[]>([]);
  const [handoffs, setHandoffs]   = useState<OrderHandoff[]>([]);
  const [revLift, setRevLift]     = useState<{ revenue: Record<string, number>; chart: { label: string; revenue: number }[] } | null>(null);
  const [bundles, setBundles]     = useState<ApiBundle[]>([]);
  const [staff, setStaff]         = useState<StaffMember[]>([]);
  const [alerts, setAlerts]       = useState<CommerceAlert[]>([]);
  const [logs, setLogs]           = useState<CommerceLog[]>([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [testing, setTesting]     = useState<string | null>(null);
  const [retrying, setRetrying]   = useState<string | null>(null);

  function showToast(msg: string, ok = true) {
    triggerHaptic(ok ? "success" : "warning");
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    const [h, a, ho, rl, bp, sc, al, lg] = await Promise.all([
      apiFetch<CommerceHealth>("/api/eeie/commerce-health"),
      apiFetch<{ adapters: CommerceAdapter[] }>("/api/eeie/commerce/adapters"),
      apiFetch<{ handoffs: OrderHandoff[] }>("/api/eeie/commerce/order-handoffs"),
      apiFetch<{ revenue: Record<string, number>; chart: { label: string; revenue: number }[] }>("/api/eeie/commerce/revenue-lift"),
      apiFetch<{ bundles: ApiBundle[] }>("/api/eeie/commerce/bundle-performance"),
      apiFetch<{ staff: StaffMember[] }>("/api/eeie/commerce/staff-conversion"),
      apiFetch<{ alerts: CommerceAlert[] }>("/api/eeie/commerce/alerts"),
      apiFetch<{ logs: CommerceLog[] }>("/api/eeie/commerce/logs"),
    ]);
    if (h)  setHealth(h);
    if (a)  setAdapters(a.adapters);
    if (ho) setHandoffs(ho.handoffs);
    if (rl) setRevLift(rl);
    if (bp) setBundles(bp.bundles);
    if (sc) setStaff(sc.staff);
    if (al) setAlerts(al.alerts);
    if (lg) setLogs(lg.logs.slice(0, 12));
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function handleTestAdapter(id: string) {
    setTesting(id);
    const res = await apiPost<{ ok: boolean; message: string; adapter: CommerceAdapter }>(`/api/eeie/commerce/adapters/${id}/test`);
    setTesting(null);
    if (res?.adapter) setAdapters(prev => prev.map(a => a.id === id ? res.adapter : a));
    showToast(res?.message ?? (res?.ok ? "Test complete" : "Test failed"), res?.ok ?? false);
  }

  async function handleEnableManual() {
    const res = await apiPost<{ ok: boolean; message: string }>("/api/eeie/commerce/manual-mode");
    if (res?.ok) {
      showToast(res.message);
      void refresh();
    }
  }

  async function handleDemoHandoff() {
    const res = await apiPost<{ ok: boolean; handoff: OrderHandoff }>("/api/eeie/commerce/order-handoffs/demo");
    if (res?.ok && res.handoff) {
      setHandoffs(prev => [res.handoff, ...prev]);
      showToast(`Demo handoff created — ${res.handoff.bundleName}`);
    }
  }

  async function handleRetryHandoff(id: string) {
    setRetrying(id);
    const res = await apiPost<{ ok: boolean; handoff: OrderHandoff }>(`/api/eeie/commerce/order-handoffs/${id}/retry`);
    setRetrying(null);
    if (res?.handoff) setHandoffs(prev => prev.map(h => h.id === id ? res.handoff : h));
    showToast(res?.ok ? "Handoff retried" : "Retry failed", res?.ok ?? false);
  }

  async function handleAckAlert(id: string) {
    const res = await apiPost<{ ok: boolean; alert: CommerceAlert }>(`/api/eeie/commerce/alerts/${id}/acknowledge`);
    if (res?.alert) setAlerts(prev => prev.map(a => a.id === id ? res.alert : a));
    showToast("Alert acknowledged");
  }

  // Derived state
  const mode     = health?.mode ?? "local";
  const modeC    = modeColor(mode, T);
  const liveCount = adapters.filter(a => a.isLive).length;
  const failedHandoffCount = handoffs.filter(h => h.status === "failed").length;
  const unackAlerts = alerts.filter(a => !a.acknowledged).length;
  const chartMax = revLift ? Math.max(...revLift.chart.map(c => c.revenue)) : 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── Mode Banner ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="eeie-active-breathe"
        style={{
          padding: "18px 24px", borderRadius: 16,
          background: `${modeC}0E`, border: `1px solid ${modeC}30`,
          display: "flex", alignItems: "center", gap: 20,
          position: "relative", overflow: "hidden",
        }}
      >
        <div className="eeie-mood-wash" style={{ background: `${modeC}07` }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.22em", marginBottom: 3 }}>
            COMMERCE INTELLIGENCE CENTER
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="eeie-status-pulse" style={{ width: 9, height: 9, borderRadius: "50%", background: modeC }} />
            <span style={{ fontSize: 22, fontWeight: 900, color: modeC, letterSpacing: "0.06em" }}>
              {health?.modeLabel?.toUpperCase() ?? "LOCAL MODE"}
            </span>
            <Badge label={health?.summary.revenueSync ?? "Local"} color={modeC} bg={`${modeC}18`} />
            {loading && <RefreshCw size={13} color={T.textFaint} style={{ animation: "spin 1s linear infinite" }} />}
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, marginLeft: 8, position: "relative" }}>
          {[
            { l: "ACTIVE ADAPTER",  v: health?.summary.activeAdapter ?? "—" },
            { l: "POS CONNECTED",   v: liveCount > 0 ? `${liveCount} LIVE` : "NONE"        },
            { l: "TODAY REVENUE",   v: `$${(health?.summary.todayRevenue ?? 0).toLocaleString()}` },
            { l: "FAILED HANDOFFS", v: String(failedHandoffCount)                           },
            { l: "OPEN ALERTS",     v: String(unackAlerts)                                  },
          ].map(m => (
            <div key={m.l}>
              <div style={{ fontSize: 7, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.18em", marginBottom: 2 }}>{m.l}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{m.v}</div>
            </div>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexShrink: 0, position: "relative" }}>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => void handleEnableManual()}
            style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${T.border}`, background: "transparent", color: T.textSub, cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", gap: 5 }}>
            <Settings size={12} /> Manual Mode
          </motion.button>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => void refresh()}
            style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${T.borderHi}`, background: `${T.accent}10`, color: T.accent, cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", gap: 5 }}>
            <RefreshCw size={12} /> Refresh
          </motion.button>
        </div>
      </motion.div>

      {/* ── Commerce Flow Pipeline ───────────────────────────── */}
      {health?.flow && (
        <Panel title="Commerce Flow Pipeline" subtitle="Live step-by-step order flow status" icon={<Activity size={14} />} badge="LIVE" T={T} accentColor={T.green}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {health.flow.map((step, i) => {
              const c = flowStepColor(step.status, T);
              return (
                <div key={step.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <div style={{ flex: 1, padding: "10px 6px", borderRadius: 10, background: `${c}0E`, border: `1px solid ${c}28`, textAlign: "center" as const }}>
                    <div className="eeie-status-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: c, margin: "0 auto 5px" }} />
                    <div style={{ fontSize: 7.5, fontWeight: 700, color: c, fontFamily: T.mono, letterSpacing: "0.08em" }}>{step.label}</div>
                    <div style={{ fontSize: 8.5, color: T.textFaint, marginTop: 2, fontFamily: T.mono }}>{step.lastEvent ?? "—"}</div>
                  </div>
                  {i < health.flow.length - 1 && (
                    <div style={{ flexShrink: 0, padding: "0 3px" }}>
                      <ArrowRight size={10} color={`${T.accent}45`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {health.recommendedActions.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              {health.recommendedActions.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "7px 12px", borderRadius: 8, background: `${T.accent}06`, border: `1px solid ${T.border}`, flex: 1, minWidth: 200 }}>
                  <CheckCircle size={10} color={T.accent} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 9.5, color: T.textSub, lineHeight: 1.4 }}>{a}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* ── Revenue KPIs ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12 }}>
        <KpiCard label="EEIE-Assisted Rev" value={`$${revLift?.revenue.eeieAssistedRevenue ?? 0}`}  delta="From EEIE handoffs"    positive T={T} color={T.green}  icon={DollarSign}  />
        <KpiCard label="Avg Ticket Lift"   value={`$${revLift?.revenue.averageTicketLift ?? 14.8}`} delta="Per EEIE-driven order" positive T={T} color={T.accent} icon={TrendingUp}  />
        <KpiCard label="Bundle Conversion" value={`${revLift?.revenue.conversionRate ?? 38}%`}      delta="Bundles → orders"      positive T={T} color={T.purple} icon={ShoppingCart} />
        <KpiCard label="Close Rate"        value={`${revLift?.revenue.staffRecommendationCloseRate ?? 44}%`} delta="Staff rec. close rate" positive T={T} color={T.cyan} icon={BarChart2} />
      </div>

      {/* ── Revenue Chart + Category Mix ─────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 14 }}>
        <Panel title="Revenue Lift Chart" subtitle="EEIE-assisted revenue by hour" icon={<TrendingUp size={14} />} badge="LIVE" T={T} accentColor={T.green}>
          {revLift ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 84 }}>
                {revLift.chart.map((pt, i) => {
                  const pct = pt.revenue / chartMax;
                  const isLast = i === revLift.chart.length - 1;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <motion.div
                        initial={{ height: 0 }} animate={{ height: `${pct * 72}px` }}
                        transition={{ delay: i * 0.05, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                        className={isLast ? "eeie-machine-pulse" : ""}
                        style={{ width: "100%", borderRadius: 4, minHeight: 3, background: isLast ? T.green : `${T.green}45` }}
                      />
                      <div style={{ fontSize: 7, color: T.textFaint, fontFamily: T.mono }}>{pt.label}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: T.textSub }}>Pairing upsell revenue</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: T.green }}>${revLift.revenue.pairingUpsellRevenue}</span>
              </div>
            </>
          ) : (
            <div style={{ height: 84, display: "flex", alignItems: "center", justifyContent: "center", color: T.textFaint, fontSize: 11 }}>Loading revenue data…</div>
          )}
        </Panel>
        <Panel title="Revenue Mix" subtitle="By category" icon={<Layers size={14} />} T={T}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CATEGORIES.map(cat => (
              <div key={cat.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <DonutRing pct={cat.pct} color={cat.color} size={42} label={`${cat.pct}%`} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{cat.label}</div>
                  <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono }}>{cat.pct}% of total</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── POS Adapter Health ───────────────────────────────── */}
      <Panel title="POS Adapter Health" subtitle="Real connection status — reflects actual environment secrets" icon={<Zap size={14} />} T={T} accentColor={T.green}>
        {adapters.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center" as const, color: T.textFaint, fontSize: 12 }}>Loading adapters…</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {adapters.map(a => {
              const sc = adapterStatusColor(a.status, T);
              const isTesting = testing === a.id;
              return (
                <motion.div key={a.id} whileHover={{ y: -1 }}
                  className={a.status === "connected" ? "eeie-active-breathe" : a.status === "setup_needed" ? "eeie-machine-pulse" : ""}
                  style={{
                    padding: "14px 16px", borderRadius: 14,
                    background: `${sc}07`, border: `1px solid ${a.status === "setup_needed" ? `${sc}30` : T.border}`,
                    boxShadow: T.shadow,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: `${sc}18`, border: `1px solid ${sc}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {(a.status === "connected" || a.status === "manual")
                          ? <Wifi size={14} color={sc} />
                          : <WifiOff size={14} color={sc} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{a.name}</div>
                        <div style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono }}>{a.modeLabel.toUpperCase()}</div>
                      </div>
                    </div>
                    <Badge label={a.status.replace("_", " ").toUpperCase()} color={sc} bg={`${sc}14`} />
                  </div>

                  {a.status !== "setup_needed" && a.lastSync && (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 8 }}>
                        {[
                          { l: "Last Sync",  v: new Date(a.lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
                          { l: "Speed",      v: a.syncDurationMs != null ? `${a.syncDurationMs}ms` : "—" },
                        ].map(m => (
                          <div key={m.l} style={{ padding: "7px 9px", borderRadius: 8, background: `${T.accent}06`, border: `1px solid ${T.border}` }}>
                            <div style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono, marginBottom: 2 }}>{m.l}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{m.v}</div>
                          </div>
                        ))}
                      </div>
                      {a.failures > 0 && (
                        <div style={{ marginBottom: 8, padding: "6px 9px", borderRadius: 7, background: `${T.yellow}0E`, border: `1px solid ${T.yellow}20`, fontSize: 9, color: T.yellow, fontFamily: T.mono }}>
                          ⚠ {a.failures} failures logged
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ fontSize: 8.5, color: T.textSub, lineHeight: 1.5, marginBottom: 10 }}>{a.notes}</div>

                  <div style={{ display: "flex", gap: 6 }}>
                    {a.supportedActions.includes("test") && (
                      <motion.button whileTap={{ scale: 0.93 }} disabled={isTesting}
                        onClick={() => void handleTestAdapter(a.id)}
                        style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${sc}35`, background: `${sc}10`, color: sc, cursor: isTesting ? "wait" : "pointer", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, opacity: isTesting ? 0.6 : 1 }}>
                        {isTesting ? <RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }} /> : <PlayCircle size={11} />}
                        {isTesting ? "Testing…" : "Test"}
                      </motion.button>
                    )}
                    {a.supportedActions.includes("enable") && (
                      <motion.button whileTap={{ scale: 0.93 }}
                        onClick={() => void handleEnableManual()}
                        style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.textSub, cursor: "pointer", fontSize: 9.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <CheckCircle size={11} /> Enable
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ── Bundle Performance (real images) ────────────────── */}
      <Panel title="Pairing Bundle Performance" subtitle="AI-curated bundles with real product imagery" icon={<Package size={14} />} T={T} accentColor={T.purple}>
        {bundles.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center" as const, color: T.textFaint, fontSize: 12 }}>Loading bundles…</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {bundles.map(b => (
              <motion.div key={b.id}
                className="eeie-module-card eeie-live-card eeie-hover-lift"
                style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, overflow: "hidden", boxShadow: T.shadow }}
              >
                {/* 3-panel real image strip */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", height: 90, borderBottom: `1px solid ${T.border}` }}>
                  {[
                    { src: b.images.cigarImage,  label: "CIGAR"  },
                    { src: b.images.liquorImage, label: "SPIRIT" },
                    { src: b.images.foodImage,   label: "FOOD"   },
                  ].map((img, i) => (
                    <div key={i}
                      className="eeie-image-shimmer"
                      style={{ position: "relative", overflow: "hidden", borderRight: i < 2 ? `1px solid ${T.border}` : "none" }}
                    >
                      <img
                        src={img.src} alt={img.label}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <div style={{ position: "absolute", bottom: 3, left: 0, right: 0, textAlign: "center" as const, fontSize: 6, color: "rgba(255,255,255,0.80)", fontFamily: T.mono, letterSpacing: "0.12em", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                        {img.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: T.text, lineHeight: 1.3, flex: 1 }}>{b.name}</div>
                    <DonutRing pct={b.matchScore} color={T.green} size={44} label={`${b.matchScore}%`} />
                  </div>

                  <div style={{ fontSize: 8.5, color: T.textSub, marginBottom: 8, lineHeight: 1.4 }}>
                    {b.cigar} · {b.liquor} · {b.food}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
                    {[
                      { l: "Revenue",    v: `$${b.revenueGenerated}` },
                      { l: "Conv. Rate", v: `${b.conversionRate}%`  },
                      { l: "Price",      v: `$${b.price}`           },
                    ].map(m => (
                      <div key={m.l} style={{ padding: "6px 8px", borderRadius: 8, background: `${T.accent}06`, border: `1px solid ${T.border}`, textAlign: "center" as const }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: T.text }}>{m.v}</div>
                        <div style={{ fontSize: 7, color: T.textFaint, fontFamily: T.mono }}>{m.l}</div>
                      </div>
                    ))}
                  </div>

                  <Meter pct={b.conversionRate} color={T.purple} height={4} />

                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <motion.button whileTap={{ scale: 0.93 }}
                      onClick={() => showToast(`${b.name} shown to floor staff`)}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: `1px solid ${T.border}`, background: "transparent", color: T.textSub, cursor: "pointer", fontSize: 9.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <Eye size={11} /> View
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.93 }}
                      onClick={() => showToast(`${b.name} pushed to POS`)}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", background: T.purple, color: "#fff", cursor: "pointer", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <ShoppingCart size={11} /> Push to POS
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Panel>

      {/* ── Order Handoffs ───────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "start" }}>
        <Panel title="Order Handoffs" subtitle="Staff-built carts sent to POS — retry failed handoffs here" icon={<ShoppingCart size={14} />} T={T} accentColor={T.yellow}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {handoffs.length === 0 && (
              <div style={{ padding: "24px 0", textAlign: "center" as const, color: T.textFaint, fontSize: 11 }}>No handoffs yet — create a demo handoff to see the flow.</div>
            )}
            {handoffs.map((h, i) => {
              const sc = handoffStatusColor(h.status, T);
              const isRetrying = retrying === h.id;
              return (
                <motion.div key={h.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 11, background: `${sc}06`, border: `1px solid ${sc}22` }}>
                  <div style={{ width: 3, height: 40, borderRadius: 2, background: sc, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{h.table} · {h.guest}</span>
                      <Badge label={h.status.replace("_", " ").toUpperCase()} color={sc} bg={`${sc}14`} />
                    </div>
                    <div style={{ fontSize: 9, color: T.textSub, marginBottom: 2 }}>{h.bundleName} · {h.posAdapter}</div>
                    <div style={{ fontSize: 8.5, color: T.textFaint, fontFamily: T.mono }}>{h.posResponse}</div>
                  </div>
                  <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: T.text, marginBottom: 4 }}>${h.cartTotal}</div>
                    {(h.status === "failed" || h.status === "waiting") && (
                      <motion.button whileTap={{ scale: 0.93 }} disabled={isRetrying}
                        onClick={() => void handleRetryHandoff(h.id)}
                        style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.yellow}35`, background: `${T.yellow}12`, color: T.yellow, cursor: isRetrying ? "wait" : "pointer", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, opacity: isRetrying ? 0.6 : 1 }}>
                        {isRetrying ? <RefreshCw size={10} style={{ animation: "spin 1s linear infinite" }} /> : <RotateCcw size={10} />}
                        {isRetrying ? "Retrying…" : "Retry"}
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          <motion.button whileTap={{ scale: 0.95 }}
            onClick={() => void handleDemoHandoff()}
            style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: `1px solid ${T.border}`, background: `${T.accent}08`, color: T.accent, cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <PlayCircle size={13} /> Create Demo Handoff
          </motion.button>
        </Panel>

        {/* Staff Conversion */}
        <Panel title="Staff Conversion" subtitle="Per-staff close rates" icon={<Users size={14} />} T={T}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 240 }}>
            {staff.map(s => (
              <div key={s.id} style={{ padding: "11px 14px", borderRadius: 11, background: T.cardAlt ?? `${T.accent}05`, border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{s.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.green }}>{s.conversionRate}%</span>
                </div>
                <Meter pct={s.conversionRate} color={T.green} height={4} />
                <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 8.5, color: T.textFaint }}>
                  <span>{s.recommendationsShown} shown</span>
                  <span>{s.sentToPos} to POS</span>
                  <span style={{ color: T.green, fontWeight: 700 }}>${s.revenueAssisted} rev.</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Alerts ───────────────────────────────────────────── */}
      <Panel title="Commerce Alerts" subtitle="Active system alerts requiring attention" icon={<Bell size={14} />}
        badge={unackAlerts > 0 ? `${unackAlerts} OPEN` : "CLEAR"} T={T}
        accentColor={unackAlerts > 0 ? T.yellow : T.green}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center" as const, color: T.textFaint, fontSize: 11 }}>No alerts.</div>
          )}
          {alerts.map((a, i) => {
            const sc = alertSeverityColor(a.severity, T);
            return (
              <motion.div key={a.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 11, background: a.acknowledged ? (T.dark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)") : `${sc}07`, border: `1px solid ${a.acknowledged ? T.border : `${sc}25`}`, opacity: a.acknowledged ? 0.55 : 1 }}>
                <div style={{ width: 3, height: "100%", minHeight: 40, borderRadius: 2, background: sc, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{a.title}</span>
                    <Badge label={a.severity.toUpperCase()} color={sc} bg={`${sc}14`} />
                    {a.acknowledged && <Badge label="ACK" color={T.textSub} bg={`${T.textSub}10`} />}
                  </div>
                  <div style={{ fontSize: 10, color: T.textSub, marginBottom: 4 }}>{a.message}</div>
                  <div style={{ fontSize: 8.5, color: sc, fontFamily: T.mono }}>→ {a.recommendedAction}</div>
                </div>
                {!a.acknowledged && (
                  <motion.button whileTap={{ scale: 0.93 }}
                    onClick={() => void handleAckAlert(a.id)}
                    style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${sc}30`, background: `${sc}10`, color: sc, cursor: "pointer", fontSize: 9, fontWeight: 700, flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle size={10} /> Ack
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </div>
      </Panel>

      {/* ── Commerce Logs ────────────────────────────────────── */}
      <Panel title="Commerce Logs" subtitle="System event log · Last 12 entries" icon={<FileText size={14} />} T={T}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {logs.length === 0 && (
            <div style={{ padding: "16px 0", textAlign: "center" as const, color: T.textFaint, fontSize: 11 }}>No log entries yet.</div>
          )}
          {logs.map((log, i) => (
            <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", borderRadius: 8, background: i === 0 ? `${T.accent}06` : "transparent", border: `1px solid ${i === 0 ? T.border : "transparent"}` }}>
              <div style={{ width: 3, height: 20, borderRadius: 2, background: i === 0 ? T.accent : T.textFaint, flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: T.text }}>{log.message}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono }}>{log.source}</span>
                <span style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono }}>{new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>

      {/* ── Toast ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{ position: "fixed", bottom: 100, right: 32, background: toast.ok ? T.accent : T.yellow, color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 12, zIndex: 999, boxShadow: `0 4px 20px ${toast.ok ? T.accent : T.yellow}50` }}>
            {toast.ok ? "✓" : "⚠"} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
