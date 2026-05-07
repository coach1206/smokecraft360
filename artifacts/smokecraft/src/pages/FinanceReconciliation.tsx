/**
 * FinanceReconciliation — /finance-reconciliation
 * Enterprise financial reconciliation dashboard.
 *
 * Tabs:
 *  1. Overview        — health score, revenue, payment metrics
 *  2. Alert Queue     — reconciliation alerts with ack/resolve
 *  3. Orphan Tabs     — stuck + orphan tab tables
 *  4. Payout Status   — payout request pipeline
 *  5. AI Insights     — deterministic financial intelligence
 *
 * Auto-refreshes every 60 seconds.
 * Access: super_admin, venue_owner, manager
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence }                  from "framer-motion";
import { useLocation }                              from "wouter";
import {
  RefreshCw, Activity, AlertTriangle,
  CheckCircle, XCircle, CreditCard, DollarSign,
  Clock, Zap, TrendingUp, BarChart3, Shield,
  Lightbulb, Package,
} from "lucide-react";
import { AxEmptyState, AxLoadingState, AxLayout } from "../components/ax";
import type { AxLayoutTab } from "../components/ax/AxLayout";

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:        "#F5F2ED",
  surface:   "rgba(26,26,27,0.06)",
  border:    "rgba(212,139,0,0.18)",
  gold:      "#D48B00",
  goldBright:"#D48B00",
  text:      "rgba(26,26,27,0.90)",
  textMuted: "rgba(240,232,212,0.48)",
  textLight: "rgba(26,26,27,0.72)",
  green:     "#34d399",
  amber:     "#f59e0b",
  red:       "#ef4444",
  blue:      "#60a5fa",
  purple:    "#a78bfa",
};

// ── API ───────────────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token") ?? "";
}

async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPost<T = any>(path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(path, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

function fmtCents(c: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
}

function relTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Overview {
  checkedAt:          string;
  reconciliationScore:number;
  scoreLabel:         string;
  revenue: { totalCents: number; last24hCents: number; paidTabs: number };
  payments: { paidTabs: number; refundedTabs: number; stuckTabs: number; orphanTabs: number; failedRate: number; refundRate: number; payoutCompletion: number };
  payouts: { pending: { count: number; amountCents: number }; paid: { count: number; amountCents: number }; failed: { count: number; amountCents: number } };
  webhooks: { exhausted: number; pending: number; healthy: boolean };
  alerts: { open: number; critical: number };
  fulfillment: { unpaidFulfilledTabs: number };
}

interface Alert {
  id:          string;
  severity:    "critical" | "high" | "medium" | "low";
  status:      "open" | "acknowledged" | "resolved" | "dismissed";
  category:    string;
  title:       string;
  description: string;
  entityId:    string | null;
  entityType:  string | null;
  createdAt:   string;
}

interface TabRow { id: string; venueId: string; totalCents: number; openedAt: string; paymentStatus: string; status: string }
interface PayoutRow { id: string; venueId: string; amountCents: number; status: string; createdAt: string; paidAt: string | null }
interface Insight { id: string; category: string; severity: string; title: string; body: string }

// ── Atoms ─────────────────────────────────────────────────────────────────────

function GlassCard({ children, style, glow }: {
  children: React.ReactNode; style?: React.CSSProperties; glow?: string;
}) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 12, backdropFilter: "blur(12px)",
      boxShadow: glow ? `0 0 24px ${glow}22, inset 0 1px 0 rgba(26,26,27,0.07)` : "inset 0 1px 0 rgba(26,26,27,0.07)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub?: string; color?: string; icon?: React.ElementType;
}) {
  const c = color ?? T.text;
  return (
    <GlassCard glow={c} style={{ padding: "16px 18px" }}>
      {Icon && <Icon size={13} color={c} style={{ marginBottom: 8 }} />}
      <div style={{ fontSize: 20, fontWeight: 700, color: c, fontFamily: "'Cormorant Garamond', serif" }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 3 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{sub}</div>}
    </GlassCard>
  );
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color =
    label === "excellent" ? T.green  :
    label === "good"      ? T.blue   :
    label === "fair"      ? T.amber  : T.red;
  const circ  = 2 * Math.PI * 44;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={108} height={108} viewBox="0 0 108 108">
        <circle cx={54} cy={54} r={44} fill="none" stroke="rgba(26,26,27,0.08)" strokeWidth={8} />
        <motion.circle
          cx={54} cy={54} r={44} fill="none" stroke={color} strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
        <text x={54} y={50} textAnchor="middle" fill={color} style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif" }}>
          {score}
        </text>
        <text x={54} y={66} textAnchor="middle" fill={T.textMuted} style={{ fontSize: 9 }}>
          recon. score
        </text>
      </svg>
      <span style={{
        fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em",
        color, background: `${color}18`, border: `1px solid ${color}40`,
        borderRadius: 5, padding: "2px 8px",
      }}>
        {label}
      </span>
    </div>
  );
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: T.red, high: T.amber, medium: T.blue, low: T.textMuted,
};

function AlertRow({ alert, onAck, onResolve }: {
  alert: Alert; onAck: () => void; onResolve: () => void;
}) {
  const color = SEVERITY_COLOR[alert.severity] ?? T.textMuted;
  const Icon  = alert.severity === "critical" ? XCircle : alert.severity === "high" ? AlertTriangle : CheckCircle;
  return (
    <div style={{
      padding: "12px 14px",
      background: `${color}08`, border: `1px solid ${color}28`,
      borderRadius: 9, marginBottom: 8,
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 0 }}>
          <Icon size={13} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 12, color: T.text, fontWeight: 500, marginBottom: 2 }}>{alert.title}</div>
            <div style={{ fontSize: 10, color: T.textMuted, lineHeight: 1.55 }}>{alert.description}</div>
            <div style={{ fontSize: 9, color: T.textMuted, marginTop: 4 }}>
              <span style={{ color, fontWeight: 600, textTransform: "uppercase", marginRight: 6 }}>{alert.severity}</span>
              {alert.category.replace(/_/g, " ")} · {relTime(alert.createdAt)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          {alert.status === "open" && (
            <button onClick={onAck} style={{
              background: `${T.blue}18`, border: `1px solid ${T.blue}40`,
              borderRadius: 5, color: T.blue, fontSize: 9, fontWeight: 600,
              padding: "3px 7px", cursor: "pointer",
            }}>Ack</button>
          )}
          {alert.status !== "resolved" && (
            <button onClick={onResolve} style={{
              background: `${T.green}18`, border: `1px solid ${T.green}40`,
              borderRadius: 5, color: T.green, fontSize: 9, fontWeight: 600,
              padding: "3px 7px", cursor: "pointer",
            }}>Resolve</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const BASE_TABS: AxLayoutTab[] = [
  { id: "overview",   label: "Overview",      icon: BarChart3     },
  { id: "alerts",     label: "Alert Queue",   icon: AlertTriangle },
  { id: "orphans",    label: "Orphan Tabs",   icon: Clock         },
  { id: "payouts",    label: "Payout Status", icon: DollarSign    },
  { id: "insights",   label: "AI Insights",   icon: Lightbulb     },
];

// ── Tab panels ────────────────────────────────────────────────────────────────

function OverviewPanel({ data, onRun, running }: { data: Overview; onRun: () => void; running: boolean }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <GlassCard style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 24, flexShrink: 0 }}>
          <ScoreGauge score={data.reconciliationScore} label={data.scoreLabel} />
          <div>
            <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
              Financial Health
            </div>
            <div style={{ fontSize: 12, color: T.text, marginBottom: 12 }}>
              {data.reconciliationScore >= 90 ? "All financial systems nominal"
                : data.reconciliationScore >= 70 ? "Minor issues detected — review alerts"
                : data.reconciliationScore >= 50 ? "Significant anomalies present"
                : "Critical issues require immediate action"}
            </div>
            <button onClick={onRun} disabled={running} style={{
              background: `${T.gold}18`, border: `1px solid ${T.border}`,
              borderRadius: 7, color: T.gold, fontSize: 10, fontWeight: 600,
              padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              opacity: running ? 0.5 : 1,
            }}>
              <Zap size={10} /> {running ? "Running…" : "Run Reconciliation"}
            </button>
          </div>
        </GlassCard>

        {/* Revenue */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1, minWidth: 240 }}>
          <MetricCard label="Total Revenue" value={fmtCents(data.revenue.totalCents)} color={T.green} icon={DollarSign} />
          <MetricCard label="Revenue (24h)" value={fmtCents(data.revenue.last24hCents)} color={T.blue} icon={TrendingUp} />
          <MetricCard label="Paid Tabs" value={data.payments.paidTabs.toLocaleString()} color={T.green} icon={CreditCard} />
          <MetricCard label="Payout Rate" value={`${data.payments.payoutCompletion}%`} color={data.payments.payoutCompletion >= 90 ? T.green : T.amber} icon={Activity} />
        </div>
      </div>

      {/* Risk metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
        <MetricCard label="Stuck Tabs" value={String(data.payments.stuckTabs)} color={data.payments.stuckTabs > 0 ? T.amber : T.green} icon={Clock} sub="authorized >2h" />
        <MetricCard label="Orphan Tabs" value={String(data.payments.orphanTabs)} color={data.payments.orphanTabs > 0 ? T.amber : T.green} icon={Package} sub="open >72h" />
        <MetricCard label="Refund Rate" value={`${data.payments.refundRate.toFixed(1)}%`} color={data.payments.refundRate > 10 ? T.red : T.green} />
        <MetricCard label="Failed Webhooks" value={`${data.webhooks.exhausted}/${data.webhooks.pending}`} color={data.webhooks.exhausted > 0 ? T.red : T.green} sub="exhausted / pending" />
        <MetricCard label="Open Alerts" value={String(data.alerts.open)} color={data.alerts.critical > 0 ? T.red : data.alerts.open > 0 ? T.amber : T.green} sub={`${data.alerts.critical} critical`} />
        <MetricCard label="Pending Payouts" value={fmtCents(data.payouts.pending.amountCents)} color={T.gold} sub={`${data.payouts.pending.count} requests`} />
        <MetricCard label="Failed Payouts" value={fmtCents(data.payouts.failed.amountCents)} color={data.payouts.failed.count > 0 ? T.red : T.green} sub={`${data.payouts.failed.count} requests`} />
        <MetricCard label="Webhook Health" value={data.webhooks.healthy ? "Healthy" : "Issues"} color={data.webhooks.healthy ? T.green : T.red} icon={Shield} />
      </div>
    </div>
  );
}

function AlertsPanel({ alerts, onAck, onResolve }: {
  alerts: Alert[]; onAck: (id: string) => void; onResolve: (id: string) => void;
}) {
  if (alerts.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.green, padding: "16px 0" }}>
      <CheckCircle size={16} />
      <span style={{ fontSize: 13 }}>No active reconciliation alerts — all clear</span>
    </div>
  );
  return (
    <div>
      {alerts.map((a) => (
        <AlertRow key={a.id} alert={a} onAck={() => onAck(a.id)} onResolve={() => onResolve(a.id)} />
      ))}
    </div>
  );
}

function OrphansPanel({ stuckTabs, orphanTabs }: { stuckTabs: TabRow[]; orphanTabs: TabRow[] }) {
  const Table = ({ rows, label, color }: { rows: TabRow[]; label: string; color: string }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
        {label} ({rows.length})
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 11, color: T.green, display: "flex", alignItems: "center", gap: 6 }}>
          <CheckCircle size={12} /> None
        </div>
      ) : (
        rows.map((tab) => (
          <div key={tab.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 12px", marginBottom: 6,
            background: `${color}08`, border: `1px solid ${color}28`, borderRadius: 8,
            flexWrap: "wrap", gap: 6,
          }}>
            <div>
              <div style={{ fontSize: 11, color: T.text, fontFamily: "monospace" }}>{tab.id.slice(0, 16)}…</div>
              <div style={{ fontSize: 9, color: T.textMuted, marginTop: 2 }}>
                Opened {relTime(tab.openedAt)} · {tab.paymentStatus}
              </div>
            </div>
            <span style={{ fontSize: 12, color, fontWeight: 600 }}>{fmtCents(tab.totalCents)}</span>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div>
      <Table rows={stuckTabs} label="Stuck Authorized Tabs (>2h)" color={T.red} />
      <Table rows={orphanTabs} label="Orphan Open Tabs (>72h)" color={T.amber} />
    </div>
  );
}

function PayoutsPanel({ payouts }: { payouts: PayoutRow[] }) {
  const STATUS_COLOR: Record<string, string> = {
    pending: T.amber, approved: T.blue, paid: T.green, rejected: T.red, failed: T.red,
  };
  if (payouts.length === 0) return (
    <div style={{ fontSize: 12, color: T.textMuted }}>No payout requests in the last 30 days.</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {payouts.map((p) => {
        const color = STATUS_COLOR[p.status] ?? T.textMuted;
        return (
          <div key={p.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px",
            background: `${color}08`, border: `1px solid ${color}28`, borderRadius: 9,
            flexWrap: "wrap", gap: 8,
          }}>
            <div>
              <div style={{ fontSize: 11, color: T.text, fontFamily: "monospace" }}>{p.id.slice(0, 14)}…</div>
              <div style={{ fontSize: 9, color: T.textMuted, marginTop: 2 }}>
                {relTime(p.createdAt)}
                {p.paidAt ? ` · paid ${relTime(p.paidAt)}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{fmtCents(p.amountCents)}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, color,
                background: `${color}15`, border: `1px solid ${color}40`,
                borderRadius: 4, padding: "2px 7px", textTransform: "uppercase",
              }}>
                {p.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InsightsPanel({ insights }: { insights: Insight[] }) {
  const SEVERITY_COLOR: Record<string, string> = {
    critical: T.red, high: T.amber, medium: T.blue, low: T.green,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {insights.map((ins) => {
        const color = SEVERITY_COLOR[ins.severity] ?? T.textMuted;
        return (
          <GlassCard key={ins.id} glow={color} style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Lightbulb size={14} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 5 }}>{ins.title}</div>
                <div style={{ fontSize: 11, color: T.textLight, lineHeight: 1.65 }}>{ins.body}</div>
                <div style={{ fontSize: 9, color: T.textMuted, marginTop: 6 }}>
                  <span style={{ color, fontWeight: 600, textTransform: "uppercase", marginRight: 6 }}>{ins.severity}</span>
                  {ins.category}
                </div>
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FinanceReconciliation() {
  const [, navigate]  = useLocation();
  const [tab, setTab] = useState("overview");

  const [overview,  setOverview]  = useState<Overview | null>(null);
  const [alerts,    setAlerts]    = useState<Alert[]>([]);
  const [orphans,   setOrphans]   = useState<{ stuckTabs: TabRow[]; orphanTabs: TabRow[] } | null>(null);
  const [payouts,   setPayouts]   = useState<PayoutRow[]>([]);
  const [insights,  setInsights]  = useState<Insight[]>([]);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [running,   setRunning]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [ov, al, or_, po, ins] = await Promise.allSettled([
        apiGet<Overview>("/api/finance-reconciliation/overview"),
        apiGet<{ alerts: Alert[] }>("/api/finance-reconciliation/alerts"),
        apiGet<{ stuckTabs: TabRow[]; orphanTabs: TabRow[] }>("/api/finance-reconciliation/orphans"),
        apiGet<{ payouts: PayoutRow[] }>("/api/finance-reconciliation/payout-status"),
        apiGet<{ insights: Insight[] }>("/api/finance-reconciliation/insights"),
      ]);
      if (ov.status === "fulfilled")  setOverview(ov.value);
      if (al.status === "fulfilled")  setAlerts(al.value.alerts);
      if (or_.status === "fulfilled") setOrphans(or_.value);
      if (po.status === "fulfilled")  setPayouts(po.value.payouts);
      if (ins.status === "fulfilled") setInsights(ins.value.insights);
      setLastFetch(new Date());
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
    timerRef.current = setInterval(() => void loadAll(), 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loadAll]);

  const ackAlert = async (id: string) => {
    await apiPost(`/api/finance-reconciliation/alerts/${id}/ack`).catch(() => undefined);
    setAlerts((a) => a.map((x) => x.id === id ? { ...x, status: "acknowledged" } : x));
  };

  const resolveAlert = async (id: string) => {
    await apiPost(`/api/finance-reconciliation/alerts/${id}/resolve`).catch(() => undefined);
    setAlerts((a) => a.filter((x) => x.id !== id));
  };

  const runRecon = async () => {
    setRunning(true);
    await apiPost("/api/finance-reconciliation/run").catch(() => undefined);
    await loadAll();
    setRunning(false);
  };

  const openAlertCount = alerts.filter((a) => a.status !== "resolved").length;

  const tabs: AxLayoutTab[] = BASE_TABS.map((t) =>
    t.id === "alerts" ? { ...t, badge: openAlertCount } : t,
  );

  const rightSlot = (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {lastFetch && (
        <span style={{ fontSize: 10, color: T.textMuted }}>
          Updated {lastFetch.toLocaleTimeString()}
        </span>
      )}
      <button
        onClick={() => { setLoading(true); void loadAll(); }}
        style={{
          background: "transparent", border: `1px solid ${T.border}`,
          borderRadius: 6, color: T.textMuted, fontSize: 10,
          padding: "5px 10px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4,
        }}
      >
        <RefreshCw size={10} /> Refresh
      </button>
      {overview && overview.alerts.critical > 0 && (
        <span style={{
          background: `${T.red}18`, border: `1px solid ${T.red}40`,
          borderRadius: 6, color: T.red, fontSize: 10, fontWeight: 700,
          padding: "3px 9px",
        }}>
          {overview.alerts.critical} CRITICAL
        </span>
      )}
    </div>
  );

  return (
    <AxLayout
      title="Financial Reconciliation"
      subtitle="Revenue · Payouts · Webhooks · Alerts"
      onBack={() => navigate("/operations")}
      backLabel="Operations"
      tabs={tabs}
      activeTab={tab}
      onTabChange={setTab}
      live
      rightSlot={rightSlot}
      maxWidth={1100}
    >
      {loading ? (
        <AxLoadingState rows={2} columns={4} rowHeight={88} message="Loading financial data…" />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "overview" && !overview && (
              <AxEmptyState
                icon={Shield}
                title="Authentication Required"
                body="Sign in as manager, venue_owner, or super_admin to view financial reconciliation data."
                color={T.gold}
              />
            )}
            {tab === "overview" && overview  && <OverviewPanel data={overview} onRun={runRecon} running={running} />}
            {tab === "alerts"   && <AlertsPanel alerts={alerts} onAck={ackAlert} onResolve={resolveAlert} />}
            {tab === "orphans"  && !orphans && (
              <AxEmptyState
                icon={Clock}
                title="No Orphan Data"
                body="Orphan tab detection requires an authenticated session. Log in to view stuck and orphan tabs."
                color={T.amber}
              />
            )}
            {tab === "orphans"  && orphans   && <OrphansPanel stuckTabs={orphans.stuckTabs} orphanTabs={orphans.orphanTabs} />}
            {tab === "payouts"  && <PayoutsPanel payouts={payouts} />}
            {tab === "insights" && <InsightsPanel insights={insights} />}
          </motion.div>
        </AnimatePresence>
      )}
    </AxLayout>
  );
}
