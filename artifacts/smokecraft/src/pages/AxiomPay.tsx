/**
 * AxiomPay — Payments + Tabs + Fulfillment + Stripe Connect admin dashboard.
 * Route: /axiom-pay
 * Role: manager, venue_owner, super_admin
 *
 * Tabs:
 *   Overview    — live KPIs: open tabs, revenue pending, paid today, fulfillment queue
 *   Open Tabs   — table of all open tabs for this venue, per-tab drill-down
 *   Fulfillment — live bartender/server queue with status controls
 *   Stripe Connect — venue Connect onboarding status + payout history
 *   Refund Center — close/void/refund tab actions
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence }                  from "framer-motion";
import { useLocation }                              from "wouter";
import {
  ArrowLeft, CreditCard, Layers, Zap, BarChart3, RefreshCw,
  ExternalLink, CheckCircle, AlertTriangle, Clock, ChevronRight,
  DollarSign, Users, Activity, Wifi, ShieldOff,
} from "lucide-react";
import { AxEmptyState, AxLoadingState } from "../components/ax";

// ── design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:        "#F5F2ED",
  surface:   "rgba(26,26,27,0.06)",
  border:    "rgba(212,139,0,0.18)",
  gold:      "#D48B00",
  goldBright:"#D48B00",
  text:      "rgba(26,26,27,0.90)",
  textMuted: "rgba(240,232,212,0.48)",
  green:     "#34d399",
  amber:     "#f59e0b",
  red:       "#ef4444",
  blue:      "#60a5fa",
  purple:    "#a78bfa",
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

async function apiPost<T = any>(path: string, body: unknown): Promise<T> {
  const token = localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token") ?? "";
  const res = await fetch(path, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function apiPatch<T = any>(path: string, body: unknown): Promise<T> {
  const token = localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token") ?? "";
  const res = await fetch(path, {
    method:  "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

// ── Small components ──────────────────────────────────────────────────────────

function GlassCard({
  children, style, glow,
}: { children: React.ReactNode; style?: React.CSSProperties; glow?: string }) {
  return (
    <div style={{
      background: T.surface,
      border:     `1px solid ${T.border}`,
      borderRadius: 12,
      backdropFilter: "blur(12px)",
      boxShadow: glow
        ? `0 0 20px ${glow}22, inset 0 1px 0 rgba(26,26,27,0.08)`
        : "inset 0 1px 0 rgba(26,26,27,0.08)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: T.green, closed: T.textMuted, voided: T.red,
    paid: T.green, unpaid: T.amber, authorized: T.blue, refunded: T.purple,
    pending: T.amber, claimed: T.blue, preparing: T.blue,
    ready: T.green, delivered: T.textMuted, cancelled: T.red,
    ACTIVE: T.green, STANDBY: T.amber, complete: T.green,
  };
  const color = map[status] ?? T.textMuted;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, color, letterSpacing: "0.1em",
      background: `${color}18`, border: `1px solid ${color}44`,
      borderRadius: 4, padding: "2px 6px", textTransform: "uppercase",
    }}>
      {status}
    </span>
  );
}

function KpiCard({ label, value, unit, color, delta }: {
  label: string; value: string | number; unit?: string; color?: string; delta?: string;
}) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);
  const numVal = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
  const isNum = !isNaN(numVal) && typeof value === "number";

  useEffect(() => {
    if (!isNum) return;
    const start = Date.now();
    const dur   = 800;
    const tick  = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      setDisplay(Math.round(p * numVal));
      if (p < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [numVal, isNum]);

  const c = color ?? T.gold;
  return (
    <GlassCard glow={c} style={{ padding: "18px 20px", position: "relative", overflow: "hidden" }}>
      <motion.div
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 4, repeat: Infinity }}
        style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at 50% 0%, ${c}10 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: c, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1 }}>
        {unit === "$" ? "$" : ""}{isNum ? display.toLocaleString() : value}{unit === "%" ? "%" : ""}
      </div>
      {delta && (
        <div style={{ fontSize: 11, color: delta.startsWith("+") ? T.green : T.red, marginTop: 4 }}>
          {delta}
        </div>
      )}
    </GlassCard>
  );
}

// ── Tab indicator ─────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview",  label: "Overview",        icon: BarChart3   },
  { id: "tabs",      label: "Open Tabs",       icon: Layers      },
  { id: "queue",     label: "Fulfillment",     icon: Activity    },
  { id: "connect",   label: "Stripe Connect",  icon: CreditCard  },
  { id: "refunds",   label: "Refund Center",   icon: RefreshCw   },
];

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ venueId }: { venueId: string | null }) {
  const [tabSummary,  setTabSummary]  = useState<any>(null);
  const [fqMetrics,   setFqMetrics]   = useState<any>(null);
  const [connectInfo, setConnectInfo] = useState<any>(null);
  const [loading,     setLoading]     = useState(true);

  const load = useCallback(async () => {
    try {
      const [ts, fq] = await Promise.all([
        apiGet("/api/tabs/admin/summary"),
        apiGet("/api/fulfillment/admin/metrics"),
      ]);
      setTabSummary(ts);
      setFqMetrics(fq);
      if (venueId) {
        const ci = await apiGet(`/api/stripe-connect/status/${venueId}`).catch(() => null);
        setConnectInfo(ci);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [venueId]);

  useEffect(() => { void load(); }, [load]);

  const pendingDollars = Math.round((tabSummary?.pendingRevenueCents ?? 0) / 100);
  const paidDollars    = Math.round((tabSummary?.paidTodayCents ?? 0) / 100);

  if (!loading && !tabSummary && !fqMetrics) {
    return (
      <AxEmptyState
        icon={ShieldOff}
        title="Authentication Required"
        body="Sign in as manager, venue_owner, or super_admin to access the payments overview."
        color={T.gold}
      />
    );
  }

  return (
    <div>
      {/* KPI grid — 3-col primary metrics */}
      {loading ? (
        <AxLoadingState rows={0} columns={3} rowHeight={96} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
          <KpiCard label="Open Tabs"       value={tabSummary?.openTabs ?? 0}     color={T.gold}   delta="+live" />
          <KpiCard label="Revenue Pending" value={pendingDollars}                 unit="$" color={T.amber} delta="authorized" />
          <KpiCard label="Paid Today"      value={paidDollars}                    unit="$" color={T.green} delta="+confirmed" />
        </div>
      )}

      {/* Secondary metrics — fulfillment */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          <KpiCard label="Queue Pending"   value={fqMetrics?.pending ?? 0}        color={T.blue}   delta="awaiting staff" />
          <KpiCard label="Queue Active"    value={fqMetrics?.active ?? 0}         color={T.purple} delta="in progress" />
          <KpiCard label="Delivered Today" value={fqMetrics?.deliveredToday ?? 0} color={T.green}  delta="fulfilled" />
        </div>
      )}

      {/* Stripe Connect status */}
      <GlassCard style={{ padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>
          Stripe Connect Status
        </div>
        {connectInfo ? (
          <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Account</div>
              <div style={{ fontSize: 12, color: T.text, fontFamily: "monospace" }}>
                {connectInfo.accountId ?? "Not configured"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Status</div>
              <StatusBadge status={connectInfo.onboarded ? "ACTIVE" : "STANDBY"} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Charges</div>
              <StatusBadge status={connectInfo.chargesEnabled ? "ACTIVE" : "STANDBY"} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Platform Fee</div>
              <span style={{ fontSize: 12, color: T.gold }}>
                {((parseInt(connectInfo.platformFeeBps ?? "500", 10)) / 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ) : (
          <div style={{ color: T.textMuted, fontSize: 11 }}>
            {venueId ? "Loading Connect status…" : "Connect a Stripe account via venue settings to enable payouts"}
          </div>
        )}
      </GlassCard>

      {/* Fulfillment breakdown */}
      {fqMetrics && (
        <GlassCard style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>
            Fulfillment Health
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {Object.entries(fqMetrics.byStatus ?? {}).map(([s, cnt]) => (
              <div key={s}>
                <div style={{ fontSize: 11, color: T.textMuted }}>{s}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.text, fontFamily: "'Cormorant Garamond', serif" }}>
                  {String(cnt)}
                </div>
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: T.textMuted }}>Avg Fulfillment</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.gold, fontFamily: "'Cormorant Garamond', serif" }}>
                {fqMetrics.avgFulfillmentMs ? `${Math.round(fqMetrics.avgFulfillmentMs / 60_000)}m` : "—"}
              </div>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ── Open Tabs tab ─────────────────────────────────────────────────────────────

function OpenTabsTab({ venueId }: { venueId: string | null }) {
  const [tabs, setTabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!venueId) { setLoading(false); return; }
    try {
      const data = await apiGet(`/api/tabs/venue/${venueId}`);
      setTabs(data.tabs ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, [venueId]);

  useEffect(() => { void load(); const t = setInterval(load, 20_000); return () => clearInterval(t); }, [load]);

  const fmtCents = (c: number) => `$${(c / 100).toFixed(2)}`;

  if (!venueId) return (
    <div style={{ padding: 40, textAlign: "center", color: T.textMuted, fontSize: 13 }}>
      No venue selected. Log in as venue_owner to see tabs.
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: T.textMuted }}>
          {tabs.length} open tab{tabs.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => load()}
          style={{
            background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6,
            color: T.textMuted, fontSize: 11, padding: "4px 12px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          <RefreshCw size={10} /> Refresh
        </button>
      </div>

      {loading ? (
        Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{ height: 60, background: T.surface, borderRadius: 10, marginBottom: 8 }} />
        ))
      ) : tabs.length === 0 ? (
        <GlassCard style={{ padding: 32, textAlign: "center" as const }}>
          <div style={{ color: T.textMuted, fontSize: 13 }}>No open tabs at this venue</div>
        </GlassCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tabs.map((tab, i) => (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <GlassCard style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color: T.text, fontWeight: 500, marginBottom: 2 }}>
                      Tab {tab.id.slice(0, 8)}…
                      {tab.tableNumber && <span style={{ color: T.textMuted, marginLeft: 8 }}>Table {tab.tableNumber}</span>}
                    </div>
                    <div style={{ fontSize: 10, color: T.textMuted }}>
                      Opened {new Date(tab.openedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 16, color: T.gold, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>
                      {fmtCents(tab.totalCents)}
                    </span>
                    <StatusBadge status={tab.paymentStatus} />
                    <StatusBadge status={tab.status} />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Fulfillment Queue tab ─────────────────────────────────────────────────────

const FQ_STATUS_ORDER = ["pending","claimed","preparing","ready","delivered","cancelled"] as const;
const FQ_TRANSITIONS: Record<string, string | null> = {
  pending:   "claimed",
  claimed:   "preparing",
  preparing: "ready",
  ready:     "delivered",
  delivered: null,
  cancelled: null,
};

function FulfillmentTab({ venueId }: { venueId: string | null }) {
  const [tasks,   setTasks]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!venueId) { setLoading(false); return; }
    try {
      const data = await apiGet(`/api/fulfillment/${venueId}?status=pending`);
      const data2 = await apiGet(`/api/fulfillment/${venueId}?status=claimed`);
      const data3 = await apiGet(`/api/fulfillment/${venueId}?status=preparing`);
      const data4 = await apiGet(`/api/fulfillment/${venueId}?status=ready`);
      setTasks([
        ...(data.tasks ?? []),
        ...(data2.tasks ?? []),
        ...(data3.tasks ?? []),
        ...(data4.tasks ?? []),
      ]);
    } catch { /* silent */ }
    setLoading(false);
  }, [venueId]);

  useEffect(() => { void load(); const t = setInterval(load, 10_000); return () => clearInterval(t); }, [load]);

  const advance = async (taskId: string, currentStatus: string) => {
    const next = FQ_TRANSITIONS[currentStatus];
    if (!next) return;
    setUpdating(taskId);
    try {
      await apiPatch(`/api/fulfillment/${taskId}/status`, { status: next });
      await load();
    } catch { /* silent */ }
    setUpdating(null);
  };

  const STATUS_COLOR: Record<string, string> = {
    pending: T.amber, claimed: T.blue, preparing: T.blue,
    ready: T.green, delivered: T.textMuted, cancelled: T.red,
  };

  if (!venueId) return (
    <div style={{ padding: 40, textAlign: "center", color: T.textMuted, fontSize: 13 }}>
      No venue selected.
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: T.textMuted }}>{tasks.length} active tasks</span>
        <button onClick={() => load()} style={{
          background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6,
          color: T.textMuted, fontSize: 11, padding: "4px 12px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <RefreshCw size={10} /> Refresh
        </button>
      </div>

      {loading ? (
        Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{ height: 56, background: T.surface, borderRadius: 10, marginBottom: 8 }} />
        ))
      ) : tasks.length === 0 ? (
        <GlassCard style={{ padding: 32, textAlign: "center" as const }}>
          <CheckCircle size={24} color={T.green} style={{ marginBottom: 8 }} />
          <div style={{ color: T.green, fontSize: 13 }}>Queue clear — all fulfilled</div>
        </GlassCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.map((task, i) => {
            const next = FQ_TRANSITIONS[task.status];
            const color = STATUS_COLOR[task.status] ?? T.textMuted;
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <GlassCard glow={color} style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>
                        {task.productName}
                        {task.quantity > 1 && <span style={{ color: T.textMuted, marginLeft: 6 }}>×{task.quantity}</span>}
                      </div>
                      <div style={{ fontSize: 10, color: T.textMuted }}>
                        {task.queueType === "bar" ? "Bar" : "Floor"} · {task.craftType ?? "general"}
                        {task.tableNumber && ` · Table ${task.tableNumber}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <StatusBadge status={task.status} />
                    {next && (
                      <button
                        onClick={() => advance(task.id, task.status)}
                        disabled={updating === task.id}
                        style={{
                          background: `${color}18`, border: `1px solid ${color}44`,
                          borderRadius: 6, color, fontSize: 10, padding: "4px 10px",
                          cursor: "pointer", fontWeight: 600,
                          opacity: updating === task.id ? 0.5 : 1,
                        }}
                      >
                        → {next}
                      </button>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Stripe Connect tab ────────────────────────────────────────────────────────

function StripeConnectTab({ venueId }: { venueId: string | null }) {
  const [status,  setStatus]  = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  const load = useCallback(async () => {
    if (!venueId) { setLoading(false); return; }
    try {
      const [s, p] = await Promise.all([
        apiGet(`/api/stripe-connect/status/${venueId}`),
        apiGet(`/api/stripe-connect/payouts/${venueId}`),
      ]);
      setStatus(s);
      setPayouts(p.payouts ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, [venueId]);

  useEffect(() => { void load(); }, [load]);

  const startOnboard = async () => {
    if (!venueId) return;
    setOnboarding(true);
    try {
      const data = await apiPost(`/api/stripe-connect/onboard/${venueId}`, {});
      if (data.url) window.open(data.url, "_blank");
    } catch (err: any) {
      alert(`Onboarding error: ${err.message}`);
    }
    setOnboarding(false);
  };

  const fmtCents = (c: number, cur: string = "usd") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(c / 100);

  return (
    <div>
      <GlassCard style={{ padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>
          Connect Account
        </div>

        {loading ? (
          <div style={{ height: 80, background: T.surface, borderRadius: 8 }} />
        ) : !status?.accountId ? (
          <div>
            <div style={{ fontSize: 13, color: T.text, marginBottom: 12 }}>
              This venue is not yet connected to Stripe. Set up a Connect account to accept payments with automatic splits.
            </div>
            <button
              onClick={startOnboard}
              disabled={onboarding || !venueId}
              style={{
                background: `linear-gradient(135deg, ${T.gold}, ${T.goldBright})`,
                border: "none", borderRadius: 8, color: "#F5F2ED",
                fontSize: 12, fontWeight: 700, padding: "10px 20px",
                cursor: onboarding ? "wait" : "pointer",
                opacity: onboarding ? 0.7 : 1,
              }}
            >
              {onboarding ? "Opening Stripe…" : "Begin Stripe Connect Onboarding →"}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { label: "Account ID",   value: status.accountId,                          mono: true  },
                { label: "Charges",      value: status.chargesEnabled ? "Enabled" : "Pending", color: status.chargesEnabled ? T.green : T.amber },
                { label: "Payouts",      value: status.payoutsEnabled ? "Enabled" : "Pending", color: status.payoutsEnabled ? T.green : T.amber },
                { label: "Platform Fee", value: `${((parseInt(status.platformFeeBps ?? "500", 10)) / 100).toFixed(1)}%`, color: T.gold },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 3 }}>{s.label}</div>
                  <div style={{
                    fontSize: 12, color: (s as any).color ?? T.text,
                    fontFamily: (s as any).mono ? "monospace" : "inherit",
                  }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {!status.onboarded && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button
                  onClick={startOnboard}
                  disabled={onboarding}
                  style={{
                    background: `${T.amber}18`, border: `1px solid ${T.amber}44`,
                    borderRadius: 6, color: T.amber, fontSize: 11, fontWeight: 600,
                    padding: "6px 14px", cursor: "pointer",
                  }}
                >
                  Complete Onboarding →
                </button>
              </div>
            )}

            {status.requirements?.length > 0 && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: `${T.amber}10`, borderRadius: 8, border: `1px solid ${T.amber}30` }}>
                <AlertTriangle size={14} color={T.amber} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 11, color: T.amber, fontWeight: 600, marginBottom: 4 }}>Action Required</div>
                  {status.requirements.map((r: string) => (
                    <div key={r} style={{ fontSize: 10, color: T.textMuted }}>{r}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Payout history */}
      {payouts.length > 0 && (
        <GlassCard style={{ padding: "18px 22px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>
            Recent Payouts
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {payouts.map((p: any) => (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 0", borderBottom: "1px solid rgba(26,26,27,0.06)",
              }}>
                <div>
                  <div style={{ fontSize: 11, color: T.text }}>{fmtCents(p.amount, p.currency)}</div>
                  <div style={{ fontSize: 10, color: T.textMuted }}>
                    Arrives {new Date(p.arrivalDate).toLocaleDateString()}
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ── Refund Center tab ─────────────────────────────────────────────────────────

function RefundCenterTab({ venueId }: { venueId: string | null }) {
  const [tabs, setTabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!venueId) { setLoading(false); return; }
    try {
      const data = await apiGet(`/api/tabs/venue/${venueId}`);
      setTabs(data.tabs ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, [venueId]);

  useEffect(() => { void load(); }, [load]);

  const doVoid = async (tabId: string) => {
    setActing(tabId);
    try {
      await apiPost(`/api/tabs/${tabId}/void`, {});
      setMsg({ id: tabId, text: "Tab voided successfully", ok: true });
      await load();
    } catch (err: any) {
      setMsg({ id: tabId, text: err.message, ok: false });
    }
    setActing(null);
  };

  const doRefund = async (tabId: string) => {
    setActing(tabId);
    try {
      await apiPost(`/api/tabs/${tabId}/refund`, { reason: "requested_by_customer" });
      setMsg({ id: tabId, text: "Refund issued to Stripe", ok: true });
      await load();
    } catch (err: any) {
      setMsg({ id: tabId, text: err.message, ok: false });
    }
    setActing(null);
  };

  const fmtCents = (c: number) => `$${(c / 100).toFixed(2)}`;

  return (
    <div>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            padding: "10px 16px", borderRadius: 8, marginBottom: 12,
            background: msg.ok ? `${T.green}18` : `${T.red}18`,
            border: `1px solid ${msg.ok ? T.green : T.red}44`,
            fontSize: 12, color: msg.ok ? T.green : T.red,
          }}
        >
          {msg.text}
        </motion.div>
      )}

      {!venueId ? (
        <div style={{ padding: 40, textAlign: "center", color: T.textMuted, fontSize: 13 }}>
          No venue selected.
        </div>
      ) : loading ? (
        Array.from({ length: 3 }, (_, i) => (
          <div key={i} style={{ height: 60, background: T.surface, borderRadius: 10, marginBottom: 8 }} />
        ))
      ) : tabs.length === 0 ? (
        <GlassCard style={{ padding: 32, textAlign: "center" as const }}>
          <div style={{ color: T.textMuted, fontSize: 13 }}>No open tabs — nothing to void or refund</div>
        </GlassCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tabs.map((tab, i) => (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <GlassCard style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const }}>
                <div>
                  <div style={{ fontSize: 12, color: T.text }}>
                    Tab {tab.id.slice(0, 8)}…
                    {tab.tableNumber && <span style={{ color: T.textMuted, marginLeft: 8 }}>Table {tab.tableNumber}</span>}
                  </div>
                  <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>
                    {fmtCents(tab.totalCents)} · {tab.paymentStatus}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {tab.paymentStatus === "unpaid" && (
                    <button
                      onClick={() => doVoid(tab.id)}
                      disabled={acting === tab.id}
                      style={{
                        background: `${T.amber}18`, border: `1px solid ${T.amber}44`,
                        borderRadius: 6, color: T.amber, fontSize: 10, fontWeight: 600,
                        padding: "5px 12px", cursor: "pointer",
                        opacity: acting === tab.id ? 0.5 : 1,
                      }}
                    >
                      Void Tab
                    </button>
                  )}
                  {tab.paymentStatus === "paid" && (
                    <button
                      onClick={() => doRefund(tab.id)}
                      disabled={acting === tab.id}
                      style={{
                        background: `${T.red}18`, border: `1px solid ${T.red}44`,
                        borderRadius: 6, color: T.red, fontSize: 10, fontWeight: 600,
                        padding: "5px 12px", cursor: "pointer",
                        opacity: acting === tab.id ? 0.5 : 1,
                      }}
                    >
                      Issue Refund
                    </button>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AxiomPay() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [venueId, setVenueId]     = useState<string | null>(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]!));
        setVenueId(payload.venueId ?? null);
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter', 'SF Pro Display', sans-serif" }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: `${T.bg}ee`, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`,
        padding: "12px 24px",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <button
          onClick={() => navigate("/operations")}
          style={{
            background: "transparent", border: `1px solid ${T.border}`,
            borderRadius: 8, color: T.textMuted, fontSize: 11,
            padding: "6px 12px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <ArrowLeft size={12} /> Back
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.gold, fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.06em" }}>
            Axiom Pay
          </div>
          <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Payments · Tabs · Fulfillment · Connect
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} />
          <span style={{ fontSize: 10, color: T.green, fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 0,
        borderBottom: `1px solid ${T.border}`,
        padding: "0 24px",
        overflowX: "auto",
      }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "12px 18px",
              border: "none", borderBottom: activeTab === id ? `2px solid ${T.gold}` : "2px solid transparent",
              background: "transparent", cursor: "pointer",
              fontSize: 12, fontWeight: activeTab === id ? 600 : 400,
              color: activeTab === id ? T.gold : T.textMuted,
              whiteSpace: "nowrap",
              transition: "color 0.15s",
            }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "24px 24px", maxWidth: 1100 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === "overview"  && <OverviewTab   venueId={venueId} />}
            {activeTab === "tabs"      && <OpenTabsTab   venueId={venueId} />}
            {activeTab === "queue"     && <FulfillmentTab venueId={venueId} />}
            {activeTab === "connect"   && <StripeConnectTab venueId={venueId} />}
            {activeTab === "refunds"   && <RefundCenterTab venueId={venueId} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
