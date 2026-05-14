/**
 * DataIntelligenceTab — Visual Analytics Dashboard + AI Insights + Optimizations
 *
 * Panels:
 *   1. KPI Overview strip (sessions, views, purchases, conversion, upsell, loyalty)
 *   2. Session Funnel bars
 *   3. Top Products table
 *   4. Flavor & Strength profile charts
 *   5. Hourly activity heatmap
 *   6. AI Insights cards
 *   7. Optimization recommendations
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }          from "framer-motion";
import {
  Brain, TrendingUp, RefreshCw, Zap, BarChart3,
  ShoppingBag, Eye, MousePointerClick, ArrowUpRight,
  AlertTriangle, Info, Sparkles, DollarSign, Clock,
} from "lucide-react";

// ── colour tokens ──────────────────────────────────────────────────────────────
const G  = (a: number) => `rgba(212,139,0,${a})`;
const W  = (a: number) => `rgba(255,255,255,${a})`;
const D  = (a: number) => `rgba(0,0,0,${a})`;

// ── helpers ───────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const t = localStorage.getItem("smokecraft_token") ?? localStorage.getItem("axiom_token") ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${t}` };
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: authHeaders(), ...opts });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

function fmtCents(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function pct(n: number) { return `${n}%`; }

// ── sub-types ─────────────────────────────────────────────────────────────────

interface Overview {
  analytics: Record<string, number>;
  revenue:   Record<string, number>;
}

interface Product { product_id: string; views: number; selections: number; purchases: number; }
interface Flavor  { flavor: string;   count: number; }
interface Strength{ strength: string; count: number; }
interface Hourly  { hour: number;     events: number; }
interface Funnel  { started: number; engaged: number; selected: number; converted: number; upsold: number; }

interface AiInsight {
  id?: string;
  insightType: string; title: string; summary: string; severity: string;
}

interface OptRec {
  type: string; priority: "HIGH"|"MEDIUM"|"LOW";
  title: string; action: string; expectedImpact: string;
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 p-4 rounded-xl"
      style={{ background: W(0.025), border: `1px solid ${W(0.07)}` }}>
      <div className="flex items-center gap-2" style={{ color: G(0.5) }}>
        {icon}
        <span className="text-[9px] uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="font-serif text-2xl" style={{ color: "rgba(220,200,165,0.9)", fontWeight: 300 }}>
        {value}
      </p>
      {sub && <p className="text-[9px]" style={{ color: W(0.3) }}>{sub}</p>}
    </div>
  );
}

// ── Severity badge ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    OPPORTUNITY: { bg: "rgba(52,211,153,0.08)", color: "rgba(52,211,153,0.8)",  icon: <ArrowUpRight size={10} /> },
    ALERT:       { bg: "rgba(239,68,68,0.08)",  color: "rgba(239,68,68,0.75)", icon: <AlertTriangle size={10} /> },
    INFO:        { bg: W(0.04),                 color: W(0.45),               icon: <Info size={10} /> },
  };
  const s = map[severity] ?? map["INFO"]!;
  return (
    <span className="inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      {s.icon}{severity}
    </span>
  );
}

// ── Priority badge ────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const color = priority === "HIGH" ? "rgba(239,68,68,0.7)" : priority === "MEDIUM" ? G(0.65) : W(0.35);
  return (
    <span className="text-[8px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full"
      style={{ background: `${color.slice(0,-4)}0.1)`, color, border: `1px solid ${color.slice(0,-4)}0.25)` }}>
      {priority}
    </span>
  );
}

// ── Bar chart row ─────────────────────────────────────────────────────────────

function BarRow({ label, value, max, color = G(0.6) }: {
  label: string; value: number; max: number; color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] w-24 shrink-0 truncate" style={{ color: W(0.5) }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: W(0.07) }}>
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }} />
      </div>
      <span className="text-[10px] w-6 text-right shrink-0" style={{ color: W(0.35) }}>{value}</span>
    </div>
  );
}

// ── Funnel step ───────────────────────────────────────────────────────────────

function FunnelStep({ label, count, max, icon }: {
  label: string; count: number; max: number; icon: React.ReactNode;
}) {
  const width = max > 0 ? Math.max(20, Math.round((count / max) * 100)) : 20;
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: G(0.08), color: G(0.6) }}>{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px]" style={{ color: W(0.5) }}>{label}</span>
          <span className="text-[10px] font-medium" style={{ color: "rgba(210,190,155,0.8)" }}>{count}</span>
        </div>
        <div className="h-2 rounded-full" style={{ background: W(0.06) }}>
          <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg,${G(0.4)},${G(0.7)})` }}
            initial={{ width: 0 }} animate={{ width: `${width}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }} />
        </div>
      </div>
    </div>
  );
}

// ── Heatmap cell ──────────────────────────────────────────────────────────────

function HeatCell({ hour, events, max }: { hour: number; events: number; max: number }) {
  const intensity = max > 0 ? events / max : 0;
  const h = hour < 12 ? `${hour || 12}am` : hour === 12 ? "12pm" : `${hour - 12}pm`;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-7 h-7 rounded-md flex items-center justify-center text-[8px]"
        style={{ background: `rgba(212,139,0,${intensity * 0.7 + 0.04})`, color: W(intensity > 0.5 ? 0.8 : 0.3) }}>
        {events > 0 ? events : ""}
      </div>
      <span className="text-[7px]" style={{ color: W(0.2) }}>{h}</span>
    </div>
  );
}

// ── Panel tabs ────────────────────────────────────────────────────────────────

type Panel = "overview" | "insights" | "optimizations" | "products" | "market";

// ── Main Component ────────────────────────────────────────────────────────────

export function DataIntelligenceTab() {
  const [panel,       setPanel]       = useState<Panel>("overview");
  const [period,      setPeriod]      = useState(30);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const [overview,   setOverview]   = useState<Overview | null>(null);
  const [products,   setProducts]   = useState<Product[]>([]);
  const [flavors,    setFlavors]    = useState<Flavor[]>([]);
  const [strengths,  setStrengths]  = useState<Strength[]>([]);
  const [hourly,     setHourly]     = useState<Hourly[]>([]);
  const [funnel,     setFunnel]     = useState<Funnel | null>(null);
  const [insights,   setInsights]   = useState<AiInsight[]>([]);
  const [optRecs,    setOptRecs]    = useState<OptRec[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const q = `?days=${period}`;
    try {
      const [ov, tp, fl, st, hr, fn] = await Promise.all([
        apiFetch<Overview>(`/api/data-intelligence/overview${q}`),
        apiFetch<{ topProducts: Product[] }>(`/api/data-intelligence/top-products${q}`),
        apiFetch<{ flavors: Flavor[] }>(`/api/data-intelligence/flavors${q}`),
        apiFetch<{ strengths: Strength[] }>(`/api/data-intelligence/strengths${q}`),
        apiFetch<{ hourly: Hourly[] }>(`/api/data-intelligence/hourly${q}`),
        apiFetch<{ funnel: Funnel }>(`/api/data-intelligence/funnel${q}`),
      ]);
      setOverview(ov);
      setProducts(tp.topProducts ?? []);
      setFlavors(fl.flavors ?? []);
      setStrengths(st.strengths ?? []);
      setHourly(hr.hourly ?? []);
      setFunnel(fn.funnel ?? null);
    } catch (e) {
      setError("Some panels require the ANALYTICS feature — contact NOVEE OS support to upgrade.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  const loadInsights = useCallback(async () => {
    try {
      const [ins, opt] = await Promise.all([
        apiFetch<{ insights: AiInsight[] }>("/api/data-intelligence/insights"),
        apiFetch<{ recommendations: OptRec[] }>("/api/data-intelligence/optimizations"),
      ]);
      setInsights(ins.insights ?? []);
      setOptRecs(opt.recommendations ?? []);
    } catch { /* feature-gated, silently skip */ }
  }, []);

  useEffect(() => { load(); loadInsights(); }, [load, loadInsights]);

  async function refreshInsights() {
    setRefreshing(true);
    try {
      const res = await apiFetch<{ insights: AiInsight[] }>("/api/data-intelligence/insights/refresh", { method: "POST" });
      setInsights(res.insights ?? []);
    } catch { /* gated */ } finally { setRefreshing(false); }
  }

  // ── Data shortcuts ────────────────────────────────────────────────────────

  const a = overview?.analytics ?? {};
  const r = overview?.revenue   ?? {};

  const totalSessions  = Number(a["total_sessions"]     ?? 0);
  const productViews   = Number(a["product_views"]      ?? 0);
  const purchases      = Number(a["purchases"]          ?? 0);
  const upsells        = Number(a["upsells"]            ?? 0);
  const loyaltyUses    = Number(a["loyalty_uses"]       ?? 0);
  const convRate       = Number(a["conversion_rate"]    ?? 0);
  const upsellRate     = Number(a["upsell_rate"]        ?? 0);
  const totalRevCents  = Number(r["total_revenue_cents"]?? 0);
  const avgOrderCents  = Number(r["avg_order_cents"]    ?? 0);

  const maxHourly    = Math.max(...hourly.map(h => h.events), 1);
  const maxProduct   = Math.max(...products.map(p => p.purchases), 1);
  const maxFlavor    = Math.max(...flavors.map(f => f.count), 1);
  const maxStrength  = Math.max(...strengths.map(s => s.count), 1);
  const funnelMax    = funnel ? funnel.started : 1;

  // Fill missing hours 0-23
  const hourMap = new Map(hourly.map(h => [h.hour, h.events]));
  const allHours: Hourly[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, events: hourMap.get(i) ?? 0 }));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
            Data Intelligence
          </h2>
          <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: G(0.4) }}>
            NOVEE OS · Behavioral Analytics Engine
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period picker */}
          <select value={period} onChange={e => setPeriod(+e.target.value)}
            className="px-3 py-1.5 rounded-lg text-[10px] bg-transparent outline-none"
            style={{ background: D(0.2), border: `1px solid ${W(0.1)}`, color: W(0.6) }}>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <motion.button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-[0.12em]"
            style={{ background: G(0.08), border: `1px solid ${G(0.2)}`, color: G(0.7) }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Panel tabs */}
      <div className="flex gap-1 p-1 rounded-lg overflow-x-auto" style={{ background: D(0.2) }}>
        {(["overview","insights","optimizations","products","market"] as Panel[]).map(p => (
          <button key={p} onClick={() => setPanel(p)}
            className="flex-shrink-0 px-3 py-1.5 rounded-md text-[10px] uppercase tracking-[0.1em] transition-all"
            style={{
              background: panel === p ? G(0.12)        : "transparent",
              color:      panel === p ? G(0.85)        : W(0.35),
              border:     panel === p ? `1px solid ${G(0.25)}` : "1px solid transparent",
            }}>
            {p === "overview" ? "Overview" : p === "insights" ? "AI Insights" :
             p === "optimizations" ? "Optimizations" : p === "products" ? "Products" : "Market Report"}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "rgba(239,68,68,0.7)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <motion.div className="w-8 h-8 rounded-full border-2"
            animate={{ rotate: 360 }}
            style={{ borderColor: G(0.15), borderTopColor: G(0.6) }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
      ) : (
        <AnimatePresence mode="wait">

          {/* ── Overview panel ──────────────────────────────────────────── */}
          {panel === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} className="space-y-6">

              {/* KPI grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard icon={<BarChart3 size={11} />}  label="Sessions"   value={totalSessions} />
                <KpiCard icon={<Eye size={11} />}         label="Views"     value={productViews} />
                <KpiCard icon={<ShoppingBag size={11} />} label="Purchases" value={purchases} />
                <KpiCard icon={<TrendingUp size={11} />}  label="Conversion" value={pct(convRate)} sub="view → purchase" />
                <KpiCard icon={<Zap size={11} />}          label="Upsells"   value={upsells} sub={`${pct(upsellRate)} rate`} />
                <KpiCard icon={<Sparkles size={11} />}    label="Loyalty"   value={loyaltyUses} sub="redemptions" />
                <KpiCard icon={<DollarSign size={11} />}  label="Revenue"   value={fmtCents(totalRevCents)} sub={`last ${period}d`} />
                <KpiCard icon={<DollarSign size={11} />}  label="Avg Order" value={fmtCents(avgOrderCents)} />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {/* Session funnel */}
                <div className="rounded-xl p-5" style={{ background: W(0.025), border: `1px solid ${W(0.06)}` }}>
                  <p className="text-[9px] uppercase tracking-[0.2em] mb-4" style={{ color: G(0.45) }}>
                    Session Funnel
                  </p>
                  {funnel ? (
                    <div className="space-y-3">
                      <FunnelStep label="Sessions Started" count={funnel.started}   max={funnelMax} icon={<BarChart3 size={13} />} />
                      <FunnelStep label="Products Viewed"  count={funnel.engaged}   max={funnelMax} icon={<Eye size={13} />} />
                      <FunnelStep label="Item Selected"    count={funnel.selected}  max={funnelMax} icon={<MousePointerClick size={13} />} />
                      <FunnelStep label="Purchased"        count={funnel.converted} max={funnelMax} icon={<ShoppingBag size={13} />} />
                      <FunnelStep label="Upsell Accepted"  count={funnel.upsold}    max={funnelMax} icon={<ArrowUpRight size={13} />} />
                    </div>
                  ) : <p className="text-xs text-center py-6" style={{ color: W(0.25) }}>No funnel data yet</p>}
                </div>

                {/* Hourly heatmap */}
                <div className="rounded-xl p-5" style={{ background: W(0.025), border: `1px solid ${W(0.06)}` }}>
                  <p className="text-[9px] uppercase tracking-[0.2em] mb-4" style={{ color: G(0.45) }}>
                    Activity by Hour
                  </p>
                  <div className="grid grid-cols-12 gap-1">
                    {allHours.map(h => (
                      <HeatCell key={h.hour} hour={h.hour} events={h.events} max={maxHourly} />
                    ))}
                  </div>
                  <p className="text-[8px] mt-3 text-center" style={{ color: W(0.2) }}>
                    Darker = more activity
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Products panel ──────────────────────────────────────────── */}
          {panel === "products" && (
            <motion.div key="products" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} className="space-y-5">

              {/* Top products */}
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${W(0.06)}` }}>
                <div className="px-5 py-3 text-[9px] uppercase tracking-[0.2em]"
                  style={{ background: W(0.025), color: G(0.45), borderBottom: `1px solid ${W(0.05)}` }}>
                  Top Products by Purchases (last {period}d)
                </div>
                {products.length === 0 ? (
                  <p className="py-10 text-center text-xs" style={{ color: W(0.25) }}>
                    No product purchase events logged yet — try the recommendation kiosk
                  </p>
                ) : (
                  <div className="divide-y" style={{ borderColor: W(0.04) }}>
                    {products.map((p, i) => (
                      <div key={p.product_id} className="px-5 py-3 flex items-center gap-4">
                        <span className="text-[10px] font-medium w-5 shrink-0" style={{ color: G(0.4) }}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: "rgba(210,190,155,0.85)" }}>
                            {p.product_id}
                          </p>
                          <div className="flex gap-3 mt-0.5">
                            <span className="text-[9px]" style={{ color: W(0.3) }}>{p.views} views</span>
                            <span className="text-[9px]" style={{ color: W(0.3) }}>{p.selections} selected</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium" style={{ color: G(0.8) }}>{p.purchases}</p>
                          <p className="text-[9px]" style={{ color: W(0.3) }}>purchased</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {/* Flavor trends */}
                <div className="rounded-xl p-5" style={{ background: W(0.025), border: `1px solid ${W(0.06)}` }}>
                  <p className="text-[9px] uppercase tracking-[0.2em] mb-4" style={{ color: G(0.45) }}>Flavor Profiles</p>
                  {flavors.length === 0
                    ? <p className="text-xs text-center py-4" style={{ color: W(0.25) }}>No flavor data yet — pass metadata.flavor in events</p>
                    : <div className="space-y-2.5">{flavors.map(f => (
                        <BarRow key={f.flavor} label={f.flavor} value={f.count} max={maxFlavor} color={G(0.65)} />
                      ))}</div>
                  }
                </div>

                {/* Strength trends */}
                <div className="rounded-xl p-5" style={{ background: W(0.025), border: `1px solid ${W(0.06)}` }}>
                  <p className="text-[9px] uppercase tracking-[0.2em] mb-4" style={{ color: G(0.45) }}>Strength Profiles</p>
                  {strengths.length === 0
                    ? <p className="text-xs text-center py-4" style={{ color: W(0.25) }}>No strength data yet — pass metadata.strength in events</p>
                    : <div className="space-y-2.5">{strengths.map(s => (
                        <BarRow key={s.strength} label={s.strength} value={s.count} max={maxStrength} color="rgba(167,139,250,0.7)" />
                      ))}</div>
                  }
                </div>
              </div>
            </motion.div>
          )}

          {/* ── AI Insights panel ────────────────────────────────────────── */}
          {panel === "insights" && (
            <motion.div key="insights" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} className="space-y-4">

              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: W(0.4) }}>
                  Insights generated from your real behavioral data — no AI guesswork.
                </p>
                <motion.button onClick={refreshInsights} disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-[0.12em]"
                  style={{ background: G(0.07), border: `1px solid ${G(0.2)}`, color: G(0.65) }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Brain size={10} className={refreshing ? "animate-pulse" : ""} />
                  {refreshing ? "Analyzing…" : "Refresh Insights"}
                </motion.button>
              </div>

              {insights.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-4"
                  style={{ border: `1px solid ${W(0.06)}`, borderRadius: 16 }}>
                  <Brain size={28} style={{ color: G(0.3) }} />
                  <div className="text-center">
                    <p className="text-sm" style={{ color: W(0.45) }}>No insights yet</p>
                    <p className="text-xs mt-1" style={{ color: W(0.25) }}>
                      Requires ADVANCED_ANALYTICS feature or more event data (log at least 10 sessions)
                    </p>
                  </div>
                  <motion.button onClick={refreshInsights}
                    className="px-4 py-2 rounded-lg text-xs"
                    style={{ background: G(0.1), border: `1px solid ${G(0.25)}`, color: G(0.75) }}
                    whileHover={{ scale: 1.02 }}>
                    Generate Now
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((ins, i) => (
                    <motion.div key={ins.id ?? i}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-5 rounded-xl space-y-2"
                      style={{
                        background: ins.severity === "ALERT" ? "rgba(239,68,68,0.04)"
                          : ins.severity === "OPPORTUNITY" ? "rgba(52,211,153,0.04)" : W(0.025),
                        border: `1px solid ${ins.severity === "ALERT" ? "rgba(239,68,68,0.15)"
                          : ins.severity === "OPPORTUNITY" ? "rgba(52,211,153,0.15)" : W(0.06)}`,
                      }}>
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm font-medium" style={{ color: "rgba(210,190,155,0.9)" }}>
                          {ins.title}
                        </h4>
                        <SeverityBadge severity={ins.severity} />
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: W(0.45) }}>
                        {ins.summary}
                      </p>
                      <p className="text-[8px] uppercase tracking-[0.15em]" style={{ color: W(0.2) }}>
                        {ins.insightType.replace(/_/g, " ")}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Optimizations panel ──────────────────────────────────────── */}
          {panel === "optimizations" && (
            <motion.div key="optimizations" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} className="space-y-4">

              <p className="text-xs" style={{ color: W(0.4) }}>
                Ranked action recommendations based on your venue's behavioral data.
              </p>

              {optRecs.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3"
                  style={{ border: `1px solid ${W(0.06)}`, borderRadius: 16 }}>
                  <Zap size={28} style={{ color: G(0.3) }} />
                  <p className="text-sm" style={{ color: W(0.35) }}>
                    Requires ADVANCED_ANALYTICS feature + event data
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {optRecs.map((rec, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-5 rounded-xl space-y-3"
                      style={{ background: D(0.15), border: `1px solid ${G(0.1)}` }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <PriorityBadge priority={rec.priority} />
                            <span className="text-[8px] uppercase tracking-[0.12em]" style={{ color: W(0.25) }}>
                              {rec.type}
                            </span>
                          </div>
                          <h4 className="text-sm" style={{ color: "rgba(210,190,155,0.9)" }}>{rec.title}</h4>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: W(0.5) }}>{rec.action}</p>
                      <div className="flex items-start gap-2 p-2.5 rounded-lg"
                        style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.1)" }}>
                        <ArrowUpRight size={11} style={{ color: "rgba(52,211,153,0.7)", marginTop: 1, flexShrink: 0 }} />
                        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(52,211,153,0.65)" }}>
                          {rec.expectedImpact}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Market Report panel ──────────────────────────────────────── */}
          {panel === "market" && (
            <MarketReportPanel />
          )}

        </AnimatePresence>
      )}
    </div>
  );
}

// ── Market Report sub-panel ───────────────────────────────────────────────────

function MarketReportPanel() {
  const [region,   setRegion]   = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [report,   setReport]   = useState<{ topCategories: unknown[]; flavorTrends: unknown[]; conversionBenchmarks: Record<string,number>; generatedAt: string } | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function loadReport() {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch<{ success: boolean; report: typeof report }>(
        `/api/data-intelligence/market-report?region=${region}&category=${category}`
      );
      setReport(res.report);
    } catch {
      setError("Market reports require the NETWORK_INSIGHTS feature.");
    } finally { setLoading(false); }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <p className="text-xs" style={{ color: W(0.4) }}>
        Aggregated, anonymous market intelligence — safe for distributor sharing. No raw user data.
      </p>

      <div className="flex flex-wrap gap-3">
        <select value={region} onChange={e => setRegion(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs bg-transparent"
          style={{ background: D(0.2), border: `1px solid ${W(0.1)}`, color: W(0.65) }}>
          {["ALL","NORTHEAST","SOUTHEAST","MIDWEST","WEST","INTERNATIONAL"].map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs bg-transparent"
          style={{ background: D(0.2), border: `1px solid ${W(0.1)}`, color: W(0.65) }}>
          {["ALL","cigar","spirits","beer","vape"].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <motion.button onClick={loadReport} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs uppercase tracking-[0.15em]"
          style={{ background: `linear-gradient(135deg,${G(0.2)},${G(0.1)})`, border: `1px solid ${G(0.35)}`, color: G(0.8) }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <TrendingUp size={11} className={loading ? "animate-pulse" : ""} />
          {loading ? "Generating…" : "Generate Report"}
        </motion.button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-xs"
          style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "rgba(239,68,68,0.7)" }}>
          {error}
        </div>
      )}

      {report && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[9px] uppercase tracking-[0.15em]" style={{ color: G(0.4) }}>
              Market Report — {region} / {category}
            </p>
            <p className="text-[9px]" style={{ color: W(0.25) }}>
              Generated {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl" style={{ background: W(0.025), border: `1px solid ${W(0.06)}` }}>
              <p className="text-[9px] uppercase tracking-[0.2em] mb-3" style={{ color: G(0.45) }}>Platform Benchmarks</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color: W(0.4) }}>Avg Conversion Rate</span>
                  <span style={{ color: G(0.8) }}>{report.conversionBenchmarks.platform_avg_conversion}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: W(0.4) }}>Avg Upsell Rate</span>
                  <span style={{ color: G(0.8) }}>{report.conversionBenchmarks.platform_avg_upsell}%</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl" style={{ background: W(0.025), border: `1px solid ${W(0.06)}` }}>
              <p className="text-[9px] uppercase tracking-[0.2em] mb-3" style={{ color: G(0.45) }}>Top Categories</p>
              {(report.topCategories as Array<{ category: string; total: number }>).slice(0, 5).map((c) => (
                <div key={c.category} className="flex justify-between text-xs py-0.5">
                  <span style={{ color: W(0.45) }}>{c.category}</span>
                  <span style={{ color: W(0.65) }}>{c.total} purchases</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl" style={{ background: W(0.025), border: `1px solid ${W(0.06)}` }}>
            <p className="text-[9px] uppercase tracking-[0.2em] mb-3" style={{ color: G(0.45) }}>Top Flavor Trends</p>
            <div className="flex flex-wrap gap-2">
              {(report.flavorTrends as Array<{ flavor: string; total: number }>).map((f) => (
                <span key={f.flavor} className="px-2 py-1 rounded-full text-[10px]"
                  style={{ background: G(0.08), color: G(0.7), border: `1px solid ${G(0.2)}` }}>
                  {f.flavor} ({f.total})
                </span>
              ))}
              {report.flavorTrends.length === 0 && (
                <p className="text-xs" style={{ color: W(0.25) }}>No flavor data yet — events need metadata.flavor</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
