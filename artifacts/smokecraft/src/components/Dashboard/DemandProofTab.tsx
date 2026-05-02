/**
 * DemandProofTab — Revenue Proof & Demand Intelligence Panel.
 *
 * Sections:
 *   Summary KPIs      — total demand, orders, conversion rate, missed sales
 *   Insight Statements — auto-generated natural-language proof lines
 *   Missing Sales      — "You Are Missing Sales" alert panel
 *   Top Demanded       — cigars + alcohol demand scores side-by-side
 *   Trending Flavors   — flavor preference bar chart
 *   Opportunities      — cross-venue distributor opportunity engine
 *   Export             — copy JSON / copy text summary
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence }                  from "framer-motion";
import {
  TrendingUp, AlertTriangle, ShoppingCart, BarChart3,
  Copy, Check, RefreshCw, Flame, Zap, ArrowUpRight,
  DollarSign, Target, Download, ExternalLink,
} from "lucide-react";
import {
  fetchDemandProof, fetchDemandOpportunities, fetchDemandInsights,
  type DemandProof, type DemandOpportunity, type DemandInsights, type MissingDemandItem,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

// ── Constants ──────────────────────────────────────────────────────────────────

const GOLD     = "rgba(212,175,55,1)";
const GOLD_DIM = "rgba(212,175,55,0.45)";
const GOLD_MID = "rgba(212,175,55,0.65)";

const URGENCY: Record<string, { bg: string; border: string; color: string; label: string }> = {
  high:   { bg: "rgba(239,90,80,0.07)",   border: "rgba(239,90,80,0.25)",   color: "rgba(239,100,90,0.88)", label: "Urgent"  },
  medium: { bg: "rgba(212,175,55,0.07)",  border: "rgba(212,175,55,0.25)",  color: "rgba(212,175,55,0.85)", label: "Notable" },
  low:    { bg: "rgba(130,150,212,0.06)", border: "rgba(130,150,212,0.2)",  color: "rgba(130,150,212,0.7)", label: "Watch"   },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, sub, gold, warning, format = "number",
}: {
  icon: React.ReactNode; label: string; value: number;
  sub?: string; gold?: boolean; warning?: boolean;
  format?: "number" | "percent";
}) {
  const display = format === "percent" ? `${value}%` : value.toLocaleString();
  return (
    <div className="p-4 rounded-xl"
      style={{
        background: gold    ? "rgba(212,175,55,0.05)"
                  : warning ? "rgba(239,90,80,0.05)"
                  : "rgba(255,255,255,0.025)",
        border:     gold    ? "1px solid rgba(212,175,55,0.18)"
                  : warning ? "1px solid rgba(239,90,80,0.2)"
                  : "1px solid rgba(255,255,255,0.06)",
      }}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: gold ? GOLD_DIM : warning ? "rgba(239,90,80,0.6)" : "rgba(180,155,100,0.5)" }}>
          {icon}
        </span>
        <p className="text-[8px] uppercase tracking-[0.2em]" style={{ color: "rgba(180,155,100,0.4)" }}>{label}</p>
      </div>
      <p className="text-3xl font-serif" style={{ color: gold ? GOLD : warning ? "rgba(239,100,90,0.85)" : "rgba(210,190,155,0.82)", fontWeight: 300 }}>
        {display}
      </p>
      {sub && <p className="text-[8px] mt-1" style={{ color: "rgba(180,155,100,0.35)" }}>{sub}</p>}
    </div>
  );
}

function Panel({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <div className="rounded-xl p-5"
      style={{
        background: gold ? "rgba(212,175,55,0.03)" : "rgba(255,255,255,0.025)",
        border:     gold ? "1px solid rgba(212,175,55,0.15)" : "1px solid rgba(255,255,255,0.07)",
      }}>
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon && <span style={{ color: GOLD_DIM }}>{icon}</span>}
      <div>
        <h3 className="font-serif text-base" style={{ color: "rgba(220,200,165,0.88)", fontWeight: 300 }}>{title}</h3>
        {subtitle && <p className="text-[8px] uppercase tracking-[0.18em] mt-0.5" style={{ color: "rgba(180,155,100,0.38)" }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function ScoreBar({ name, category, score, maxScore, selections, oosRequests, orders, inStock, i }: {
  name: string; category: string; score: number; maxScore: number;
  selections: number; oosRequests: number; orders: number; inStock: boolean; i: number;
}) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
      className="py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] tabular-nums w-4 text-right flex-shrink-0"
            style={{ color: "rgba(180,155,100,0.3)" }}>{i + 1}</span>
          <div className="min-w-0">
            <span className="font-serif text-xs truncate block" style={{ color: "rgba(210,190,155,0.82)" }}>{name}</span>
            <span className="text-[7px] uppercase tracking-[0.12em]" style={{ color: "rgba(180,155,100,0.35)" }}>{category}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          {!inStock && (
            <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "rgba(239,80,80,0.7)" }}>
              No Stock
            </span>
          )}
          <div className="text-right">
            <p className="text-sm font-serif" style={{ color: GOLD_MID, fontWeight: 300 }}>{score}</p>
            <p className="text-[7px] uppercase tracking-[0.1em]" style={{ color: "rgba(180,155,100,0.3)" }}>score</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <motion.div className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.05 }}
            style={{ background: "linear-gradient(90deg, rgba(180,130,30,0.7), rgba(212,175,55,0.9))" }}
          />
        </div>
        <div className="flex gap-2 flex-shrink-0 text-[7px]" style={{ color: "rgba(180,155,100,0.4)" }}>
          {selections > 0 && <span>{selections}sel</span>}
          {oosRequests > 0 && <span style={{ color: "rgba(239,80,80,0.55)" }}>{oosRequests}req</span>}
          {orders > 0 && <span style={{ color: GOLD_DIM }}>{orders}ord</span>}
        </div>
      </div>
    </motion.div>
  );
}

function FlavorBar({ flavor, count, max, i }: { flavor: string; count: number; max: number; i: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] capitalize" style={{ color: "rgba(210,190,155,0.75)" }}>{flavor}</span>
        <span className="text-[9px]" style={{ color: GOLD_DIM }}>{count}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <motion.div className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(count / max) * 100}%` }}
          transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.05 }}
          style={{ background: "linear-gradient(90deg, rgba(180,130,30,0.6), rgba(212,175,55,0.85))" }}
        />
      </div>
    </div>
  );
}

function InsightCard({ text, i }: { text: string; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.08 }}
      className="flex items-start gap-3 px-4 py-3 rounded-xl"
      style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.1)" }}>
      <Zap size={11} className="flex-shrink-0 mt-0.5" style={{ color: GOLD_DIM }} />
      <p className="text-xs" style={{ color: "rgba(210,190,155,0.8)" }}>{text}</p>
    </motion.div>
  );
}

function MissedSalesRow({ name, category, score, oosRequests, i }: {
  name: string; category: string; score: number; oosRequests: number; i: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
      className="flex items-center justify-between px-4 py-3 rounded-xl"
      style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
      <div className="min-w-0">
        <p className="font-serif text-xs truncate" style={{ color: "rgba(210,190,155,0.82)" }}>{name}</p>
        <p className="text-[8px] uppercase tracking-[0.12em] mt-0.5" style={{ color: "rgba(180,155,100,0.38)" }}>{category}</p>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
        <div className="text-right">
          <p className="text-xs font-serif" style={{ color: "rgba(239,100,90,0.8)" }}>{oosRequests}</p>
          <p className="text-[7px] uppercase tracking-[0.1em]" style={{ color: "rgba(180,155,100,0.3)" }}>requests</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-serif" style={{ color: GOLD_DIM }}>{score}</p>
          <p className="text-[7px] uppercase tracking-[0.1em]" style={{ color: "rgba(180,155,100,0.3)" }}>demand</p>
        </div>
      </div>
    </motion.div>
  );
}

function OpportunityCard({ opp, i }: { opp: DemandOpportunity; i: number }) {
  const style = URGENCY[opp.urgency] ?? URGENCY.low;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
      className="flex items-start justify-between gap-4 p-4 rounded-xl"
      style={{ background: style.bg, border: `1px solid ${style.border}` }}>
      <div className="flex items-start gap-3 min-w-0">
        <ArrowUpRight size={14} className="flex-shrink-0 mt-0.5" style={{ color: style.color }} />
        <div className="min-w-0">
          <p className="text-xs" style={{ color: "rgba(210,190,155,0.85)" }}>{opp.statement}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ background: `${style.color}18`, border: `1px solid ${style.border}`, color: style.color }}>
              {style.label}
            </span>
            <span className="text-[7px]" style={{ color: "rgba(180,155,100,0.4)" }}>
              {opp.totalRequests} total request{opp.totalRequests !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── CopyButton ─────────────────────────────────────────────────────────────────

function CopyButton({ getValue, label }: { getValue: () => string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(getValue());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  };
  return (
    <motion.button
      onClick={handle}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] uppercase tracking-[0.15em]"
      style={{
        background: copied ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.04)",
        border: copied ? "1px solid rgba(212,175,55,0.3)" : "1px solid rgba(255,255,255,0.08)",
        color: copied ? "rgba(212,175,55,0.8)" : "rgba(180,155,100,0.5)",
      }}
      whileHover={{ borderColor: "rgba(212,175,55,0.3)", color: "rgba(212,175,55,0.7)", background: "rgba(212,175,55,0.06)" }}
      whileTap={{ scale: 0.97 }}>
      {copied ? <><Check size={10} />Copied!</> : <><Copy size={10} />{label}</>}
    </motion.button>
  );
}

// ── MissingDemandRow ───────────────────────────────────────────────────────────

function MissingDemandRow({ item, i }: { item: MissingDemandItem; i: number }) {
  const ago = (() => {
    try {
      const ms = Date.now() - new Date(item.lastRequestedAt).getTime();
      const h  = Math.floor(ms / 3_600_000);
      const d  = Math.floor(h / 24);
      if (d > 1)  return `${d}d ago`;
      if (h > 0)  return `${h}h ago`;
      return "Recently";
    } catch { return ""; }
  })();
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
      className="flex items-center justify-between px-4 py-3 rounded-xl"
      style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
      <div className="min-w-0">
        <p className="font-serif text-xs truncate" style={{ color: "rgba(210,190,155,0.85)" }}>{item.productName}</p>
        <p className="text-[8px] uppercase tracking-[0.12em] mt-0.5" style={{ color: "rgba(180,155,100,0.38)" }}>
          {item.category} · last {ago}
        </p>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
        <div className="text-right">
          <p className="text-sm font-serif" style={{ color: "rgba(239,100,90,0.85)" }}>{item.requestCount}</p>
          <p className="text-[7px] uppercase tracking-[0.1em]" style={{ color: "rgba(180,155,100,0.3)" }}>requests</p>
        </div>
        {item.trendScore > 0 && (
          <div className="text-right">
            <p className="text-xs font-serif" style={{ color: GOLD_DIM }}>{Math.round(item.trendScore * 100)}</p>
            <p className="text-[7px] uppercase tracking-[0.1em]" style={{ color: "rgba(180,155,100,0.3)" }}>trend</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── RequestedRow ───────────────────────────────────────────────────────────────

function RequestedRow({ name, category, score, views, selections, orders, i }: {
  name: string; category: string; score: number; views: number;
  selections: number; orders: number; i: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
      className="flex items-center gap-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-[9px] tabular-nums w-4 text-right flex-shrink-0" style={{ color: "rgba(180,155,100,0.3)" }}>
        {i + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-xs truncate" style={{ color: "rgba(210,190,155,0.82)" }}>{name}</p>
        <p className="text-[7px] uppercase tracking-[0.1em]" style={{ color: "rgba(180,155,100,0.32)" }}>{category}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 text-[7px]" style={{ color: "rgba(180,155,100,0.4)" }}>
        {views > 0      && <span>{views}v</span>}
        {selections > 0 && <span>{selections}sel</span>}
        {orders > 0     && <span style={{ color: GOLD_DIM }}>{orders}ord</span>}
      </div>
      <div className="text-right flex-shrink-0 w-10">
        <p className="text-xs font-serif" style={{ color: GOLD_MID, fontWeight: 300 }}>{Math.round(score)}</p>
        <p className="text-[7px] uppercase tracking-[0.08em]" style={{ color: "rgba(180,155,100,0.28)" }}>pts</p>
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DemandProofTab() {
  const { user }      = useAuth();
  const [proof,       setProof]     = useState<DemandProof | null>(null);
  const [opps,        setOpps]      = useState<DemandOpportunity[]>([]);
  const [insights,    setInsights]  = useState<DemandInsights | null>(null);
  const [loading,     setLoading]   = useState(true);
  const [error,       setError]     = useState<string | null>(null);

  const venueId = user?.venueId ?? undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, o, ins] = await Promise.all([
        fetchDemandProof(venueId),
        fetchDemandOpportunities(),
        fetchDemandInsights(venueId).catch(() => null),
      ]);
      setProof(p);
      setOpps(o.opportunities);
      setInsights(ins);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load demand data");
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div>
          <motion.div className="w-10 h-10 rounded-full mx-auto mb-4 border-2"
            style={{ borderColor: "rgba(212,175,55,0.2)", borderTopColor: "rgba(212,175,55,0.7)" }}
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          <p className="text-[9px] uppercase tracking-[0.28em] text-center"
            style={{ color: "rgba(180,155,100,0.4)" }}>Compiling proof data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <BarChart3 size={28} className="mx-auto mb-3" style={{ color: "rgba(180,155,100,0.2)" }} />
        <p className="text-xs mb-4" style={{ color: "rgba(239,68,68,0.6)" }}>{error}</p>
        <button onClick={load} className="text-[9px] uppercase tracking-[0.18em] px-4 py-2 rounded-lg"
          style={{ background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.2)", color: "rgba(212,175,55,0.65)" }}>
          Retry
        </button>
      </div>
    );
  }

  if (!proof) return null;

  const maxCigarScore  = Math.max(...proof.topDemandedCigars.map((d) => d.score), 1);
  const maxAlcScore    = Math.max(...proof.topDemandedAlcohol.map((d) => d.score), 1);
  const maxFlavor      = Math.max(...proof.trendingFlavors.map((f) => f.count), 1);

  const exportJson = () => JSON.stringify(proof, null, 2);
  const exportText = () => {
    const lines = [
      `SmokeCraft 360 — Demand Proof Report`,
      `Generated: ${new Date(proof.generatedAt).toLocaleString()}`,
      ``,
      `SUMMARY`,
      `  Total demand signals: ${proof.summary.totalDemandSignals}`,
      `  Total orders: ${proof.summary.totalOrders}`,
      `  Conversion rate: ${proof.summary.conversionRate}%`,
      `  Missed sales (no inventory): ${proof.summary.missedSalesCount}`,
      ``,
      `INSIGHT STATEMENTS`,
      ...proof.insightStatements.map((s) => `  • ${s}`),
      ``,
      `TOP DEMANDED CIGARS`,
      ...proof.topDemandedCigars.slice(0, 5).map((d, i) =>
        `  ${i + 1}. ${d.productName} — score ${d.score} (${d.selections} sel, ${d.oosRequests} req, ${d.orders} orders)`
      ),
      ``,
      `TOP DEMANDED SPIRITS`,
      ...proof.topDemandedAlcohol.slice(0, 5).map((d, i) =>
        `  ${i + 1}. ${d.productName} — score ${d.score} (${d.selections} sel, ${d.oosRequests} req, ${d.orders} orders)`
      ),
      ``,
      `MISSED SALES OPPORTUNITIES`,
      ...proof.missedSales.slice(0, 5).map((d) =>
        `  • ${d.productName} — ${d.oosRequests} requests, demand score ${d.score}`
      ),
    ];
    return lines.join("\n");
  };

  return (
    <AnimatePresence>
      <motion.div key="demand-proof" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
              Demand Proof
            </h2>
            <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: "rgba(180,155,100,0.4)" }}>
              Real customer demand · missed revenue · distributor proof
            </p>
          </div>
          <div className="flex items-center gap-2">
            {proof.generatedAt && (
              <p className="text-[8px]" style={{ color: "rgba(180,155,100,0.3)" }}>
                {new Date(proof.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <motion.button onClick={load}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] uppercase tracking-[0.15em]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(180,155,100,0.5)" }}
              whileHover={{ borderColor: "rgba(212,175,55,0.3)", color: "rgba(212,175,55,0.7)" }}
              whileTap={{ scale: 0.96 }}>
              <RefreshCw size={10} />Refresh
            </motion.button>
          </div>
        </div>

        {/* ── KPI row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={<TrendingUp size={14} />} label="Demand Signals"     value={proof.summary.totalDemandSignals}  gold />
          <KpiCard icon={<ShoppingCart size={14} />} label="Total Orders"     value={proof.summary.totalOrders}         gold />
          <KpiCard icon={<Target size={14} />}      label="Conversion Rate"   value={proof.summary.conversionRate}      format="percent"
            sub={`${proof.summary.totalOrders} orders / ${proof.summary.totalDemandSignals} signals`} />
          <KpiCard icon={<AlertTriangle size={14} />} label="Missed Sales"    value={proof.summary.missedSalesCount}    warning={proof.summary.missedSalesCount > 0} />
        </div>

        {/* ── Insight Statements ────────────────────────────────────────────── */}
        {(insights?.insightStatements ?? proof.insightStatements).length > 0 && (
          <Panel gold>
            <SectionHeader title="Customer Demand Insights" subtitle="Auto-generated from real platform data" icon={<Zap size={13} />} />
            <div className="space-y-2">
              {(insights?.insightStatements ?? proof.insightStatements).map((text, i) => (
                <InsightCard key={i} text={text} i={i} />
              ))}
            </div>
          </Panel>
        )}

        {/* ── Customer Demand: Most Requested Products ──────────────────────── */}
        {insights && insights.topRequestedProducts.length > 0 && (
          <Panel>
            <SectionHeader
              title="Most Selected Items"
              subtitle="Ranked by weighted demand score — views, selections, orders"
              icon={<TrendingUp size={13} />}
            />
            <div>
              {insights.topRequestedProducts.slice(0, 10).map((p, i) => (
                <RequestedRow
                  key={p.productId}
                  name={p.productName}
                  category={p.category}
                  score={p.score}
                  views={p.views}
                  selections={p.selections}
                  orders={p.orders}
                  i={i}
                />
              ))}
            </div>
          </Panel>
        )}

        {/* ── Missing Inventory (persisted missingDemand table) ─────────────── */}
        {insights && insights.topMissingProducts.length > 0 && (
          <Panel>
            <SectionHeader
              title="Missing Inventory"
              subtitle="High demand items not stocked — from persistent request log"
              icon={<AlertTriangle size={13} />}
            />
            <div className="space-y-2">
              {insights.topMissingProducts.map((item, i) => (
                <MissingDemandRow key={item.productId} item={item} i={i} />
              ))}
            </div>
            <p className="text-[8px] mt-3" style={{ color: "rgba(180,155,100,0.3)" }}>
              Request counts are persisted — they survive server restarts and accumulate over time.
            </p>
          </Panel>
        )}

        {/* ── Missed Sales Alert (from demand score engine) ─────────────────── */}
        {proof.missedSales.length > 0 && (
          <Panel>
            <SectionHeader
              title="You Are Missing Sales"
              subtitle="Demand score engine — products with demand but no supply"
              icon={<AlertTriangle size={13} />}
            />
            <div className="space-y-2">
              {proof.missedSales.slice(0, 8).map((item, i) => (
                <MissedSalesRow
                  key={item.productId}
                  name={item.productName}
                  category={item.category}
                  score={item.score}
                  oosRequests={item.oosRequests}
                  i={i}
                />
              ))}
            </div>
          </Panel>
        )}

        {/* ── Top Demanded: Cigars + Alcohol ────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-4">

          <Panel>
            <SectionHeader title="Top Demanded — Cigars" subtitle="By weighted demand score" icon={<Flame size={13} />} />
            {proof.topDemandedCigars.length === 0
              ? <p className="text-xs italic py-4 text-center" style={{ color: "rgba(180,155,100,0.3)" }}>
                  No cigar demand data yet
                </p>
              : proof.topDemandedCigars.slice(0, 8).map((d, i) => (
                  <ScoreBar key={d.productId} i={i}
                    name={d.productName} category={d.category}
                    score={d.score} maxScore={maxCigarScore}
                    selections={d.selections} oosRequests={d.oosRequests}
                    orders={d.orders} inStock={d.inStock}
                  />
                ))
            }
          </Panel>

          <Panel>
            <SectionHeader title="Top Demanded — Spirits" subtitle="By weighted demand score" icon={<Flame size={13} />} />
            {proof.topDemandedAlcohol.length === 0
              ? <p className="text-xs italic py-4 text-center" style={{ color: "rgba(180,155,100,0.3)" }}>
                  No spirits demand data yet
                </p>
              : proof.topDemandedAlcohol.slice(0, 8).map((d, i) => (
                  <ScoreBar key={d.productId} i={i}
                    name={d.productName} category={d.category}
                    score={d.score} maxScore={maxAlcScore}
                    selections={d.selections} oosRequests={d.oosRequests}
                    orders={d.orders} inStock={d.inStock}
                  />
                ))
            }
          </Panel>
        </div>

        {/* ── Trending Flavors ──────────────────────────────────────────────── */}
        {proof.trendingFlavors.length > 0 && (
          <Panel>
            <SectionHeader title="Trending Flavor Profiles" subtitle="Most requested tasting notes across all sessions" icon={<BarChart3 size={13} />} />
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
              {proof.trendingFlavors.slice(0, 12).map((f, i) => (
                <FlavorBar key={f.flavor} flavor={f.flavor} count={f.count} max={maxFlavor} i={i} />
              ))}
            </div>
            {proof.categoryDistribution && (
              <div className="flex gap-4 mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                {[
                  { label: "Cigars", value: proof.categoryDistribution.cigar, color: GOLD_MID },
                  { label: "Spirits", value: proof.categoryDistribution.alcohol, color: "rgba(130,150,212,0.7)" },
                ].map((cat) => (
                  <div key={cat.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                    <p className="text-[9px] uppercase tracking-[0.15em]" style={{ color: "rgba(180,155,100,0.45)" }}>
                      {cat.label} <span style={{ color: cat.color }}>{cat.value}%</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* ── Distributor Opportunities ─────────────────────────────────────── */}
        {opps.length > 0 && (
          <Panel>
            <SectionHeader
              title="Distributor Opportunities"
              subtitle="Cross-venue demand signals — products with no supply available"
              icon={<ExternalLink size={13} />}
            />
            <div className="space-y-2">
              {opps.slice(0, 8).map((opp, i) => (
                <OpportunityCard key={opp.productId} opp={opp} i={i} />
              ))}
            </div>
            {opps.length === 0 && (
              <p className="text-xs italic py-2 text-center" style={{ color: "rgba(180,155,100,0.3)" }}>
                Opportunities appear once out-of-stock demand builds across venues
              </p>
            )}
          </Panel>
        )}

        {/* ── Export / Share ────────────────────────────────────────────────── */}
        <Panel>
          <SectionHeader title="Export & Share" subtitle="Copy demand proof for distributor meetings" icon={<Download size={13} />} />
          <div className="flex flex-wrap gap-3">
            <CopyButton getValue={exportText} label="Copy Text Summary" />
            <CopyButton getValue={exportJson} label="Copy JSON Data" />
          </div>
          <p className="text-[8px] mt-3" style={{ color: "rgba(180,155,100,0.3)" }}>
            Paste into emails, pitch decks, or distributor proposals to prove real customer demand.
          </p>
        </Panel>

        {/* ── Future-ready ─────────────────────────────────────────────────── */}
        <div className="rounded-xl p-5 text-center"
          style={{ background: "rgba(212,175,55,0.02)", border: "1px dashed rgba(212,175,55,0.1)" }}>
          <DollarSign size={18} className="mx-auto mb-2" style={{ color: "rgba(212,175,55,0.2)" }} />
          <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "rgba(180,155,100,0.3)" }}>
            Future: scheduled PDF reports · email delivery · brand portal sharing · ROI calculator
          </p>
        </div>

      </motion.div>
    </AnimatePresence>
  );
}
