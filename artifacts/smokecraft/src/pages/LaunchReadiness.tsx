/**
 * LaunchReadiness — /launch-readiness
 * Pre-Launch Readiness Panel (Final Admin Control Center).
 *
 * Aggregates real-time health across:
 *   Payment Health · Security · Devices · Fulfillment · Operations
 *
 * Displays: risk score, live alert list, per-dimension health cards.
 * Auto-refreshes every 30 seconds.
 *
 * Role: super_admin, venue_owner, manager
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence }                  from "framer-motion";
import { useLocation }                              from "wouter";
import {
  ArrowLeft, ShieldCheck, CreditCard, Monitor, Activity,
  AlertTriangle, CheckCircle, XCircle, RefreshCw,
  Zap, Lock, Layers, BarChart3, ExternalLink,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:        "#06040a",
  surface:   "rgba(255,255,255,0.04)",
  border:    "rgba(201,168,76,0.18)",
  gold:      "#c9a84c",
  goldBright:"#d4af37",
  text:      "rgba(240,232,212,0.92)",
  textMuted: "rgba(240,232,212,0.48)",
  green:     "#34d399",
  amber:     "#f59e0b",
  red:       "#ef4444",
  blue:      "#60a5fa",
  purple:    "#a78bfa",
};

// ── API ───────────────────────────────────────────────────────────────────────

function getToken(): string {
  return localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token") ?? "";
}

async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPost<T = any>(path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReadinessData {
  checkedAt:     string;
  riskScore:     number;
  riskLabel:     "low" | "moderate" | "elevated" | "critical";
  paymentHealth: {
    paymentsEnabled:      boolean;
    failedWebhooks:       { pending: number; exhausted: number; recovered: number };
    stuckTabs:            number;
    openTabs:             number;
    paidTodayCents:       number;
    stripeActivityLast24h: number;
    venueConnect:         { total: number; connected: number; onboarded: number };
  };
  security: {
    killSwitches:          Record<string, boolean>;
    auditActivityLastHour: number;
    rewardsEnabled:        boolean;
    aiEnabled:             boolean;
  };
  devices: {
    total:           number;
    online:          number;
    offline:         number;
    staleHeartbeats: number;
    healthPct:       number;
  };
  fulfillment: {
    pending:  number;
    active:   number;
    ready:    number;
    byStatus: Record<string, number>;
  };
  operations: {
    openSupportTickets: number;
  };
  alerts: Array<{
    level:  "critical" | "warning" | "info";
    area:   string;
    msg:    string;
    action: string;
  }>;
}

interface FailedWebhook {
  id:            string;
  stripeEventId: string;
  eventType:     string;
  errorMessage:  string;
  status:        string;
  attempts:      number;
  maxAttempts:   number;
  createdAt:     string;
}

// ── Small components ──────────────────────────────────────────────────────────

function GlassCard({ children, style, glow }: {
  children: React.ReactNode; style?: React.CSSProperties; glow?: string;
}) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 12, backdropFilter: "blur(12px)",
      boxShadow: glow
        ? `0 0 24px ${glow}22, inset 0 1px 0 rgba(255,255,255,0.05)`
        : "inset 0 1px 0 rgba(255,255,255,0.05)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function RiskGauge({ score, label }: { score: number; label: string }) {
  const color =
    label === "low"      ? T.green  :
    label === "moderate" ? T.blue   :
    label === "elevated" ? T.amber  : T.red;

  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={52} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <motion.circle
          cx={65} cy={65} r={52} fill="none"
          stroke={color} strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
        <text x={65} y={60} textAnchor="middle" fill={color}
          style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif" }}>
          {score}
        </text>
        <text x={65} y={80} textAnchor="middle" fill={T.textMuted} style={{ fontSize: 11 }}>
          risk score
        </text>
      </svg>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em",
        color, background: `${color}18`, border: `1px solid ${color}40`,
        borderRadius: 6, padding: "3px 10px",
      }}>
        {label} risk
      </div>
    </div>
  );
}

function DimensionCard({
  title, icon: Icon, items, color,
}: {
  title: string;
  icon: React.ElementType;
  items: Array<{ label: string; value: string | number; color?: string; mono?: boolean }>;
  color?: string;
}) {
  const c = color ?? T.gold;
  return (
    <GlassCard glow={c} style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Icon size={14} color={c} />
        <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          {title}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => (
          <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: T.textMuted }}>{item.label}</span>
            <span style={{
              fontSize: 12, color: item.color ?? T.text, fontWeight: 500,
              fontFamily: item.mono ? "monospace" : "inherit",
            }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function AlertRow({ alert, index }: {
  alert: ReadinessData["alerts"][0];
  index: number;
}) {
  const color = alert.level === "critical" ? T.red : alert.level === "warning" ? T.amber : T.blue;
  const Icon  = alert.level === "critical" ? XCircle : AlertTriangle;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        display: "flex", gap: 12, padding: "10px 14px",
        background: `${color}0d`, border: `1px solid ${color}30`,
        borderRadius: 8, alignItems: "flex-start",
      }}
    >
      <Icon size={14} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: T.text, fontWeight: 500, marginBottom: 2 }}>{alert.msg}</div>
        <div style={{ fontSize: 10, color: T.textMuted }}>
          <span style={{ color, fontWeight: 600, textTransform: "uppercase", marginRight: 6 }}>{alert.area}</span>
          {alert.action}
        </div>
      </div>
    </motion.div>
  );
}

// ── Failed Webhooks Panel ─────────────────────────────────────────────────────

function FailedWebhooksPanel() {
  const [webhooks, setWebhooks] = useState<FailedWebhook[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ webhooks: FailedWebhook[] }>("/api/admin/failed-webhooks");
      setWebhooks(data.webhooks ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const retry = async (id: string) => {
    setActing(id);
    try {
      await apiPost(`/api/admin/failed-webhooks/${id}/retry`);
      await load();
    } catch { /* silent */ }
    setActing(null);
  };

  const dismiss = async (id: string) => {
    setActing(id);
    try {
      await apiPost(`/api/admin/failed-webhooks/${id}/dismiss`);
      await load();
    } catch { /* silent */ }
    setActing(null);
  };

  if (loading) return <div style={{ color: T.textMuted, fontSize: 12, padding: 16 }}>Loading…</div>;
  if (webhooks.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: T.green }}>
      <CheckCircle size={14} />
      <span style={{ fontSize: 12 }}>No failed webhooks — queue is clear</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {webhooks.map((wh) => {
        const color = wh.status === "exhausted" ? T.red : wh.status === "recovered" ? T.green : T.amber;
        return (
          <div key={wh.id} style={{
            display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px",
            background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 8,
            flexWrap: "wrap",
          }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontSize: 11, color: T.text, fontWeight: 500 }}>{wh.eventType}</div>
              <div style={{ fontSize: 10, color: T.textMuted, fontFamily: "monospace", marginTop: 1 }}>
                {wh.stripeEventId.slice(0, 24)}…
              </div>
              <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>
                {wh.attempts}/{wh.maxAttempts} attempts · {new Date(wh.createdAt).toLocaleString()}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, color, border: `1px solid ${color}40`,
                borderRadius: 4, padding: "2px 6px", textTransform: "uppercase",
              }}>
                {wh.status}
              </span>
              {wh.status !== "recovered" && wh.status !== "dismissed" && (
                <>
                  <button
                    onClick={() => retry(wh.id)}
                    disabled={acting === wh.id}
                    style={{
                      background: `${T.blue}18`, border: `1px solid ${T.blue}40`,
                      borderRadius: 5, color: T.blue, fontSize: 10, fontWeight: 600,
                      padding: "3px 8px", cursor: "pointer", opacity: acting === wh.id ? 0.5 : 1,
                    }}
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => dismiss(wh.id)}
                    disabled={acting === wh.id}
                    style={{
                      background: `${T.textMuted}10`, border: `1px solid ${T.textMuted}30`,
                      borderRadius: 5, color: T.textMuted, fontSize: 10, fontWeight: 600,
                      padding: "3px 8px", cursor: "pointer", opacity: acting === wh.id ? 0.5 : 1,
                    }}
                  >
                    Dismiss
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Kill Switch Status ────────────────────────────────────────────────────────

function KillSwitchRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 11, color: T.textMuted }}>{label}</span>
      <span style={{
        fontSize: 9, fontWeight: 700,
        color:       enabled ? T.green   : T.red,
        background:  enabled ? `${T.green}15`  : `${T.red}15`,
        border:     `1px solid ${enabled ? T.green : T.red}40`,
        borderRadius: 4, padding: "2px 7px", textTransform: "uppercase",
      }}>
        {enabled ? "ON" : "OFF"}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LaunchReadiness() {
  const [, navigate]  = useLocation();
  const [data,   setData]   = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await apiGet<ReadinessData>("/api/admin/launch-readiness");
      setData(d);
      setLastRefresh(new Date());
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    timerRef.current = setInterval(() => void load(), 30_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load]);

  const fmtCents = (c: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: T.textMuted, fontSize: 13 }}>Running readiness checks…</div>
      </div>
    );
  }

  const d = data;
  const criticalAlerts = d?.alerts.filter((a) => a.level === "critical") ?? [];
  const warningAlerts  = d?.alerts.filter((a) => a.level !== "critical") ?? [];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter','SF Pro Display',sans-serif" }}>

      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: `${T.bg}ee`, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`,
        padding: "12px 24px",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <button onClick={() => navigate("/operations")} style={{
          background: "transparent", border: `1px solid ${T.border}`,
          borderRadius: 8, color: T.textMuted, fontSize: 11,
          padding: "6px 12px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <ArrowLeft size={12} /> Back
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.gold, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.06em" }}>
            Pre-Launch Readiness
          </div>
          <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Financial · Security · Devices · Operations
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {lastRefresh && (
            <span style={{ fontSize: 10, color: T.textMuted }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button onClick={() => { setLoading(true); void load(); }} style={{
            background: "transparent", border: `1px solid ${T.border}`,
            borderRadius: 6, color: T.textMuted, fontSize: 10,
            padding: "5px 10px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <RefreshCw size={10} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ padding: "24px", maxWidth: 1100 }}>

        {/* ── Risk gauge + alert summary ── */}
        <div style={{ display: "flex", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
          <GlassCard glow={d?.riskLabel === "low" ? T.green : d?.riskLabel === "moderate" ? T.blue : d?.riskLabel === "elevated" ? T.amber : T.red}
            style={{ padding: "24px 32px", display: "flex", alignItems: "center", gap: 32, flexShrink: 0 }}>
            {d && <RiskGauge score={d.riskScore} label={d.riskLabel} />}
            <div>
              <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
                System Status
              </div>
              <div style={{ fontSize: 13, color: T.text, marginBottom: 4 }}>
                {d?.riskLabel === "low"      ? "✓ All systems nominal — safe to deploy" :
                 d?.riskLabel === "moderate" ? "⚠ Minor issues detected — review before launch" :
                 d?.riskLabel === "elevated" ? "⚠ Significant issues require attention" :
                 "✗ Critical issues must be resolved before launch"}
              </div>
              <div style={{ fontSize: 10, color: T.textMuted }}>
                {criticalAlerts.length} critical · {warningAlerts.length} warnings
              </div>
            </div>
          </GlassCard>

          {/* Quick launch checklist */}
          <GlassCard style={{ padding: "20px 24px", flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>
              Launch Checklist
            </div>
            {[
              { label: "Payments enabled",       pass: d?.paymentHealth.paymentsEnabled ?? false },
              { label: "No exhausted webhooks",  pass: (d?.paymentHealth.failedWebhooks.exhausted ?? 0) === 0 },
              { label: "No stuck tabs",          pass: (d?.paymentHealth.stuckTabs ?? 0) === 0 },
              { label: "Device health ≥ 70%",    pass: (d?.devices.healthPct ?? 0) >= 70 },
              { label: "No stale heartbeats",    pass: (d?.devices.staleHeartbeats ?? 0) === 0 },
              { label: "Rewards enabled",        pass: d?.security.rewardsEnabled ?? false },
            ].map(({ label, pass }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                {pass
                  ? <CheckCircle size={12} color={T.green} />
                  : <XCircle    size={12} color={T.red}   />
                }
                <span style={{ fontSize: 11, color: pass ? T.text : T.textMuted }}>{label}</span>
              </div>
            ))}
          </GlassCard>
        </div>

        {/* ── Alerts ── */}
        {(d?.alerts.length ?? 0) > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
              Active Alerts
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {d!.alerts.map((alert, i) => (
                <AlertRow key={i} alert={alert} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* ── Dimension cards grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, marginBottom: 24 }}>
          {/* Payment Health */}
          <DimensionCard
            title="Payment Health"
            icon={CreditCard}
            color={d?.paymentHealth.paymentsEnabled ? T.green : T.red}
            items={[
              { label: "Payments enabled",       value: d?.paymentHealth.paymentsEnabled ? "Yes" : "NO", color: d?.paymentHealth.paymentsEnabled ? T.green : T.red },
              { label: "Failed webhooks",        value: `${d?.paymentHealth.failedWebhooks.pending ?? 0} pending / ${d?.paymentHealth.failedWebhooks.exhausted ?? 0} exhausted`, color: (d?.paymentHealth.failedWebhooks.exhausted ?? 0) > 0 ? T.red : T.textMuted },
              { label: "Stuck tabs",             value: d?.paymentHealth.stuckTabs ?? 0,       color: (d?.paymentHealth.stuckTabs ?? 0) > 0 ? T.amber : T.green },
              { label: "Open tabs",              value: d?.paymentHealth.openTabs ?? 0 },
              { label: "Paid today",             value: fmtCents(d?.paymentHealth.paidTodayCents ?? 0), color: T.green },
              { label: "Stripe events (24h)",    value: d?.paymentHealth.stripeActivityLast24h ?? 0 },
              { label: "Venues connected",       value: `${d?.paymentHealth.venueConnect.onboarded ?? 0}/${d?.paymentHealth.venueConnect.total ?? 0}` },
            ]}
          />

          {/* Security */}
          <DimensionCard
            title="Security"
            icon={Lock}
            color={T.purple}
            items={[
              { label: "Audit events (1h)",     value: d?.security.auditActivityLastHour ?? 0 },
              { label: "AI enabled",            value: d?.security.aiEnabled ? "Yes" : "Off", color: d?.security.aiEnabled ? T.green : T.amber },
              { label: "Rewards enabled",       value: d?.security.rewardsEnabled ? "Yes" : "Off", color: d?.security.rewardsEnabled ? T.green : T.amber },
            ]}
          />

          {/* Device Health */}
          <DimensionCard
            title="Device Health"
            icon={Monitor}
            color={d && d.devices.healthPct >= 70 ? T.green : T.amber}
            items={[
              { label: "Health",              value: `${d?.devices.healthPct ?? 0}%`,           color: (d?.devices.healthPct ?? 0) >= 70 ? T.green : T.amber },
              { label: "Online",              value: d?.devices.online ?? 0,                    color: T.green },
              { label: "Offline",             value: d?.devices.offline ?? 0,                   color: (d?.devices.offline ?? 0) > 0 ? T.red : T.textMuted },
              { label: "Stale heartbeats",    value: d?.devices.staleHeartbeats ?? 0,           color: (d?.devices.staleHeartbeats ?? 0) > 0 ? T.amber : T.textMuted },
              { label: "Total registered",    value: d?.devices.total ?? 0 },
            ]}
          />

          {/* Fulfillment */}
          <DimensionCard
            title="Fulfillment Queue"
            icon={Activity}
            color={T.blue}
            items={[
              { label: "Pending tasks",   value: d?.fulfillment.pending ?? 0, color: (d?.fulfillment.pending ?? 0) > 10 ? T.amber : T.textMuted },
              { label: "In progress",     value: d?.fulfillment.active ?? 0,  color: T.blue },
              { label: "Ready to serve",  value: d?.fulfillment.ready ?? 0,   color: T.green },
            ]}
          />

          {/* Operations */}
          <DimensionCard
            title="Operations"
            icon={Layers}
            color={T.gold}
            items={[
              { label: "Open support tickets", value: d?.operations.openSupportTickets ?? 0, color: (d?.operations.openSupportTickets ?? 10) > 10 ? T.amber : T.textMuted },
            ]}
          />

          {/* Kill Switches */}
          <GlassCard glow={T.amber} style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Zap size={14} color={T.amber} />
              <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Kill Switches
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(d?.security.killSwitches ?? {}).map(([key, enabled]) => (
                <KillSwitchRow key={key} label={key} enabled={enabled} />
              ))}
              {Object.keys(d?.security.killSwitches ?? {}).length === 0 && (
                <div style={{ fontSize: 11, color: T.textMuted }}>No kill switches configured</div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* ── Failed Webhook Recovery Queue ── */}
        <GlassCard style={{ padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={14} color={T.gold} />
              <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Webhook Recovery Queue
              </span>
            </div>
            <a href="/axiom-pay" style={{
              fontSize: 10, color: T.gold, textDecoration: "none",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              View Axiom Pay <ExternalLink size={10} />
            </a>
          </div>
          <FailedWebhooksPanel />
        </GlassCard>

      </div>
    </div>
  );
}
