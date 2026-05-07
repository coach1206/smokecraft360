/**
 * InsightsTab — "Brand Insights" section of the Partner Dashboard.
 *
 * Sections:
 *   FilterBar         — time range / category / venue controls
 *   Conversion Funnel — sessions → selections → orders metric cards
 *   Trending Now      — velocity-scored rising products
 *   Rankings          — top selected + top skipped side-by-side
 *   Flavor Trends     — Recharts horizontal bar chart
 *   Top Pairings      — spirit + food pairings ranked list
 *   Brand Performance — table with shown/selected/ordered + rates
 *   Product Deep-Dive — full per-product breakdown table
 *   Future-Ready panel
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }           from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Flame, Filter,
  ChevronDown, ArrowUpRight, Download, Lock, Megaphone,
  Award, SkipForward, Wine, Utensils, Zap,
} from "lucide-react";
import {
  fetchInsights, fetchDistributors, fetchCampaigns, fetchCampaignPerformance,
  type InsightsData, type Distributor, type Campaign, type CampaignPerformance,
} from "@/services/api";

// ── Types / consts ─────────────────────────────────────────────────────────────
type TimeRange = "7d" | "30d" | "90d" | "all";
type Category  = "all" | "cigar" | "alcohol";

const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: "7d",  label: "7 days"  },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "all", label: "All time" },
];

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all",     label: "All"     },
  { id: "cigar",   label: "Cigars"  },
  { id: "alcohol", label: "Spirits" },
];

const GOLD     = "rgba(212,139,0,1)";
const GOLD_DIM = "rgba(212,139,0,0.45)";
const WARM     = "rgba(180,155,100,0.55)";

// ── Main component ─────────────────────────────────────────────────────────────

export function InsightsTab() {
  const [data,         setData]        = useState<InsightsData | null>(null);
  const [distributors, setDistributors]= useState<Distributor[]>([]);
  const [loading,      setLoading]     = useState(true);
  const [error,        setError]       = useState<string | null>(null);

  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [category,  setCategory]  = useState<Category>("all");
  const [venueId,   setVenueId]   = useState<string>("");
  const [perfOpen,  setPerfOpen]  = useState(false);

  // Campaign insights
  const [campaigns,     setCampaigns]     = useState<Campaign[]>([]);
  const [campaignPerfs, setCampaignPerfs] = useState<Map<string, CampaignPerformance>>(new Map());
  const [campLoading,   setCampLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchInsights({
        timeRange,
        category: category === "all" ? undefined : category,
        venueId:  venueId || undefined,
      });
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, [timeRange, category, venueId]);

  const loadCampaigns = useCallback(async () => {
    setCampLoading(true);
    try {
      const camps = await fetchCampaigns();
      setCampaigns(camps);
      const perfs = await Promise.all(
        camps.map((c) => fetchCampaignPerformance(c.id).then((p) => [c.id, p] as const).catch(() => null)),
      );
      const perfMap = new Map<string, CampaignPerformance>();
      for (const entry of perfs) {
        if (entry) perfMap.set(entry[0], entry[1]);
      }
      setCampaignPerfs(perfMap);
    } catch { /* non-critical */ } finally {
      setCampLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDistributors().then((d) => setDistributors(d)).catch(() => {});
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => { load(); }, [load]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* Filter Bar */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap gap-3 items-center p-4 rounded-xl"
          style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.09)" }}>
          <Filter size={12} style={{ color: WARM }} />

          {/* Time range */}
          <div className="flex gap-1">
            {TIME_RANGES.map((tr) => (
              <button key={tr.id} onClick={() => setTimeRange(tr.id)}
                className="px-3 py-1 rounded-full text-[9px] uppercase tracking-[0.14em] transition-all"
                style={timeRange === tr.id
                  ? { background: "rgba(212,139,0,0.15)", border: "1px solid rgba(212,139,0,0.35)", color: "rgba(212,139,0,0.9)" }
                  : { border: "1px solid rgba(26,26,27,0.09)", color: "rgba(180,155,100,0.45)" }
                }>{tr.label}</button>
            ))}
          </div>

          <div className="w-px h-4" style={{ background: "rgba(26,26,27,0.10)" }} />

          {/* Category */}
          <div className="flex gap-1">
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className="px-3 py-1 rounded-full text-[9px] uppercase tracking-[0.14em] transition-all"
                style={category === c.id
                  ? { background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.3)", color: "rgba(212,139,0,0.85)" }
                  : { border: "1px solid rgba(26,26,27,0.09)", color: "rgba(180,155,100,0.45)" }
                }>{c.label}</button>
            ))}
          </div>

          {loading && (
            <motion.div className="ml-auto w-4 h-4 rounded-full border"
              style={{ borderColor: "rgba(212,139,0,0.2)", borderTopColor: "rgba(212,139,0,0.7)" }}
              animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          )}
        </div>
      </motion.div>

      {error && (
        <div className="p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
          <p className="text-sm" style={{ color: "rgba(239,68,68,0.75)" }}>{error}</p>
        </div>
      )}

      {data && (
        <AnimatePresence mode="wait">
          <motion.div key={`${timeRange}-${category}`} className="space-y-8"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

            {/* ── Conversion Funnel ─────────────────────────────────────── */}
            <Section title="Conversion Funnel" subtitle="Recommendation sessions → selections → orders">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FunnelCard
                  label="Discovery Sessions"
                  value={data.conversionFunnel.sessions}
                  sub="Recommendations shown"
                  icon={<Flame size={16} style={{ color: GOLD_DIM }} />}
                />
                <FunnelCard
                  label="Products Selected"
                  value={data.conversionFunnel.selected}
                  sub={`${data.conversionFunnel.selectRate}% of sessions`}
                  icon={<Award size={16} style={{ color: GOLD_DIM }} />}
                  highlight
                />
                <FunnelCard
                  label="Orders Placed"
                  value={data.conversionFunnel.ordered}
                  sub={`${data.conversionFunnel.orderRate}% of selections`}
                  icon={<ArrowUpRight size={16} style={{ color: GOLD_DIM }} />}
                />
                <div className="p-4 rounded-xl flex flex-col justify-center items-center"
                  style={{ background: "rgba(212,139,0,0.07)", border: "1px solid rgba(212,139,0,0.2)" }}>
                  <p className="text-3xl font-serif" style={{ color: GOLD, fontWeight: 300 }}>
                    {data.conversionFunnel.selectRate}%
                  </p>
                  <p className="text-[9px] uppercase tracking-[0.2em] mt-1 text-center" style={{ color: WARM }}>
                    Session → Selection Rate
                  </p>
                  <FunnelBar
                    segments={[
                      { pct: 100, color: "rgba(212,139,0,0.25)" },
                      { pct: data.conversionFunnel.selectRate, color: "rgba(212,139,0,0.7)" },
                    ]}
                  />
                </div>
              </div>
            </Section>

            {/* ── Trending Now ──────────────────────────────────────────── */}
            {data.trending.length > 0 && (
              <Section title="Trending Now" subtitle="Rising velocity — recent 7-day vs prior 7-day">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {data.trending.slice(0, 4).map((t, i) => (
                    <motion.div key={t.productId}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}>
                      <TrendCard item={t} />
                    </motion.div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Rankings: Selected + Skipped ──────────────────────────── */}
            <div className="grid md:grid-cols-2 gap-6">
              <Section title="Most Selected" subtitle="By product_selected events" compact>
                <RankList items={data.topSelected} valueLabel="selections" accentColor={GOLD} />
              </Section>
              <Section title="Most Skipped" subtitle="By swipe_left events" compact>
                <RankList items={data.topSkipped} valueLabel="skips" accentColor="rgba(239,120,80,0.7)" />
              </Section>
            </div>

            {/* ── Flavor Trends (Recharts bar chart) ───────────────────── */}
            {data.flavorTrends.length > 0 && (
              <Section title="Flavor Trends" subtitle="Most requested flavor notes from user preference sessions">
                <FlavorChart data={data.flavorTrends} />
              </Section>
            )}

            {/* ── Time Series Sparkline ─────────────────────────────────── */}
            {data.timeSeries.length > 1 && (
              <Section title="Activity Over Time" subtitle="Total events per day (last 14 days)">
                <TimeSeriesChart data={data.timeSeries} />
              </Section>
            )}

            {/* ── Top Pairings + Food ───────────────────────────────────── */}
            <div className="grid md:grid-cols-2 gap-6">
              <Section title="Top Spirit Pairings" subtitle="Most pairing_selected events" compact
                icon={<Wine size={12} style={{ color: GOLD_DIM }} />}>
                <RankList items={data.topPairings} valueLabel="pairings" accentColor="rgba(120,180,212,0.65)" />
              </Section>
              <Section title="Top Food Pairings" subtitle="Most food_selected events" compact
                icon={<Utensils size={12} style={{ color: GOLD_DIM }} />}>
                <RankList items={data.topFood} valueLabel="selections" accentColor="rgba(120,200,120,0.65)" />
              </Section>
            </div>

            {/* ── Brand Performance ─────────────────────────────────────── */}
            {data.brandPerformance.length > 0 && (
              <Section title="Brand Performance"
                subtitle="Shown (recommendations) → Selected → Ordered per brand">
                <BrandPerfTable brands={data.brandPerformance} />
              </Section>
            )}

            {/* ── Product Deep-Dive ─────────────────────────────────────── */}
            <Section
              title="Product Performance"
              subtitle="Full event breakdown per product"
              action={
                <button onClick={() => setPerfOpen((p) => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-[0.14em] transition-all"
                  style={{ border: "1px solid rgba(26,26,27,0.11)", color: "rgba(180,155,100,0.5)" }}>
                  {perfOpen ? "Collapse" : "Expand"} <ChevronDown size={10}
                    style={{ transform: perfOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
              }>
              <AnimatePresence>
                {perfOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                    <ProductPerfTable products={data.productPerformance} />
                  </motion.div>
                )}
              </AnimatePresence>
              {!perfOpen && (
                <p className="text-xs italic text-center py-4" style={{ color: "rgba(180,155,100,0.3)" }}>
                  Click "Expand" to view per-product analytics
                </p>
              )}
            </Section>

            {/* ── Campaign Performance ──────────────────────────────────── */}
            <CampaignInsightsSection
              campaigns={campaigns}
              perfs={campaignPerfs}
              loading={campLoading}
            />

            {/* ── Future Ready Panel ────────────────────────────────────── */}
            <FuturePanel />

          </motion.div>
        </AnimatePresence>
      )}

      {!data && !loading && !error && (
        <div className="py-20 text-center">
          <p className="text-sm italic" style={{ color: "rgba(180,155,100,0.35)" }}>No insight data yet — run some recommendations first</p>
        </div>
      )}
    </div>
  );
}

// ── Chart components ───────────────────────────────────────────────────────────

function FlavorChart({ data }: { data: { flavor: string; count: number }[] }) {
  const max = data[0]?.count ?? 1;
  const chartData = data.map((d) => ({ ...d, fill: `rgba(212,139,0,${0.35 + (d.count / max) * 0.6})` }));

  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="rgba(26,26,27,0.06)" />
          <XAxis type="number" tick={{ fontSize: 9, fill: "rgba(180,155,100,0.4)" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="flavor" width={72}
            tick={{ fontSize: 10, fill: "rgba(200,180,145,0.7)", fontFamily: "serif" }}
            axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "hsl(22 18% 7%)", border: "1px solid rgba(212,139,0,0.2)",
              borderRadius: 8, fontSize: 11, color: "rgba(220,200,165,0.9)",
            }}
            cursor={{ fill: "rgba(212,139,0,0.05)" }}
            formatter={(v: number) => [`${v} sessions`, "Count"]}
          />
          <Bar dataKey="count" radius={[0, 3, 3, 0]}>
            {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TimeSeriesChart({ data }: { data: { day: string; count: number }[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: d.day.slice(5), // MM-DD
  }));

  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="rgba(212,139,0,0.35)" />
              <stop offset="95%" stopColor="rgba(212,139,0,0.02)" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(26,26,27,0.06)" />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "rgba(180,155,100,0.4)" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: "hsl(22 18% 7%)", border: "1px solid rgba(212,139,0,0.2)",
              borderRadius: 8, fontSize: 11, color: "rgba(220,200,165,0.9)",
            }}
            cursor={{ stroke: "rgba(212,139,0,0.3)", strokeWidth: 1 }}
            formatter={(v: number) => [`${v} events`, "Activity"]}
          />
          <Area type="monotone" dataKey="count" stroke="rgba(212,139,0,0.7)" strokeWidth={1.5}
            fill="url(#areaGold)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Rank list ──────────────────────────────────────────────────────────────────

function RankList({ items, valueLabel, accentColor }: {
  items: { productId: string; name: string; count: number; tier?: string }[];
  valueLabel: string;
  accentColor: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs italic py-4 text-center" style={{ color: "rgba(180,155,100,0.3)" }}>No data yet</p>;
  }
  const max = items[0]?.count ?? 1;

  return (
    <div className="space-y-2.5">
      {items.slice(0, 8).map((item, i) => (
        <div key={item.productId}>
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[9px] w-4 text-right flex-shrink-0" style={{ color: "rgba(180,155,100,0.3)" }}>{i + 1}</span>
              <span className="font-serif text-xs truncate" style={{ color: "rgba(210,190,155,0.82)" }}>{item.name}</span>
              {item.tier && (
                <span className="text-[7px] uppercase tracking-wider px-1 py-0.5 rounded flex-shrink-0"
                  style={{ background: "rgba(26,26,27,0.06)", color: "rgba(180,155,100,0.4)" }}>
                  {item.tier}
                </span>
              )}
            </div>
            <span className="text-[10px] flex-shrink-0 ml-2 font-serif" style={{ color: accentColor }}>
              {item.count} <span style={{ fontSize: 8, color: "rgba(180,155,100,0.4)" }}>{valueLabel}</span>
            </span>
          </div>
          <div className="h-0.5 rounded-full overflow-hidden ml-6" style={{ background: "rgba(26,26,27,0.07)" }}>
            <motion.div className="h-full rounded-full"
              initial={{ width: 0 }} animate={{ width: `${(item.count / max) * 100}%` }}
              transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.04 }}
              style={{ background: accentColor }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Brand performance table ────────────────────────────────────────────────────

function BrandPerfTable({ brands }: { brands: NonNullable<InsightsData["brandPerformance"]> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(26,26,27,0.08)" }}>
            {["Brand", "Category", "Shown", "Selected", "Ordered", "Select Rate", "Order Rate"].map((h) => (
              <th key={h} className="text-left pb-2 pr-4 text-[8px] uppercase tracking-[0.18em]"
                style={{ color: "rgba(180,155,100,0.4)", fontWeight: 400 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {brands.map((b, i) => (
            <motion.tr key={b.brandId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
              style={{ borderBottom: "1px solid rgba(26,26,27,0.05)" }}>
              <td className="py-2.5 pr-4 font-serif" style={{ color: "rgba(220,200,165,0.85)" }}>{b.name}</td>
              <td className="py-2.5 pr-4">
                <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(212,139,0,0.07)", color: "rgba(212,139,0,0.6)" }}>{b.category}</span>
              </td>
              <td className="py-2.5 pr-4" style={{ color: "rgba(180,155,100,0.65)" }}>{b.shown.toLocaleString()}</td>
              <td className="py-2.5 pr-4" style={{ color: "rgba(200,180,145,0.75)" }}>{b.selected.toLocaleString()}</td>
              <td className="py-2.5 pr-4" style={{ color: "rgba(212,139,0,0.75)" }}>{b.ordered.toLocaleString()}</td>
              <RateCell rate={b.selectRate} />
              <RateCell rate={b.orderRate} />
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RateCell({ rate }: { rate: number }) {
  const color = rate >= 20 ? "rgba(100,200,120,0.75)" : rate >= 8 ? "rgba(212,139,0,0.75)" : "rgba(180,155,100,0.45)";
  return (
    <td className="py-2.5 pr-4">
      <div className="flex items-center gap-2">
        <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: "rgba(26,26,27,0.07)" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(rate, 100)}%`, background: color }} />
        </div>
        <span style={{ color, fontSize: 10 }}>{rate}%</span>
      </div>
    </td>
  );
}

// ── Product performance table ──────────────────────────────────────────────────

function ProductPerfTable({ products }: { products: NonNullable<InsightsData["productPerformance"]> }) {
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(26,26,27,0.08)" }}>
            {["Product", "Cat", "Views", "← Skip", "Select →", "Selected", "Ordered", "Conv%"].map((h) => (
              <th key={h} className="text-left pb-2 pr-3 text-[8px] uppercase tracking-[0.16em]"
                style={{ color: "rgba(180,155,100,0.4)", fontWeight: 400 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={p.productId} style={{ borderBottom: "1px solid rgba(26,26,27,0.05)" }}>
              <td className="py-2 pr-3 font-serif max-w-[140px] truncate" style={{ color: "rgba(210,190,155,0.82)" }}>{p.name}</td>
              <td className="py-2 pr-3">
                <span className="text-[7px] uppercase tracking-wider px-1 py-0.5 rounded"
                  style={{ background: "rgba(26,26,27,0.06)", color: "rgba(180,155,100,0.45)" }}>
                  {p.category.slice(0, 3)}
                </span>
              </td>
              <td className="py-2 pr-3" style={{ color: "rgba(180,155,100,0.55)" }}>{p.views}</td>
              <td className="py-2 pr-3" style={{ color: "rgba(239,120,80,0.65)" }}>{p.swipeLeft}</td>
              <td className="py-2 pr-3" style={{ color: "rgba(100,200,120,0.65)" }}>{p.swipeRight}</td>
              <td className="py-2 pr-3" style={{ color: "rgba(212,139,0,0.75)" }}>{p.selected}</td>
              <td className="py-2 pr-3" style={{ color: "rgba(212,139,0,0.9)" }}>{p.ordered}</td>
              <td className="py-2 pr-3">
                <span style={{
                  color: p.conversionRate >= 20 ? "rgba(100,200,120,0.8)" : p.conversionRate >= 5 ? "rgba(212,139,0,0.75)" : "rgba(180,155,100,0.4)",
                  fontSize: 10,
                }}>{p.conversionRate}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Trend card ─────────────────────────────────────────────────────────────────

function TrendCard({ item }: { item: NonNullable<InsightsData["trending"]>[number] }) {
  const isNew  = item.priorCount === 0;
  const isUp   = item.velocity  > 0;
  const isFlat = item.velocity === 0;

  const color  = isNew || isUp ? "rgba(100,200,120,0.75)" : isFlat ? "rgba(180,155,100,0.5)" : "rgba(239,120,80,0.65)";
  const Icon   = isNew || isUp ? TrendingUp : isFlat ? Minus : TrendingDown;
  const velTxt = isNew ? "New" : `${item.velocity > 0 ? "+" : ""}${item.velocity}%`;

  return (
    <div className="p-3.5 rounded-xl"
      style={{
        background: isNew || isUp ? "rgba(100,200,120,0.04)" : "rgba(26,26,27,0.04)",
        border: `1px solid ${isNew || isUp ? "rgba(100,200,120,0.15)" : "rgba(26,26,27,0.09)"}`,
      }}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-[8px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded"
          style={{ background: "rgba(26,26,27,0.06)", color: "rgba(180,155,100,0.45)" }}>
          {item.category}
        </span>
        <div className="flex items-center gap-1">
          <Icon size={11} style={{ color }} />
          <span className="text-[9px] font-medium" style={{ color }}>{velTxt}</span>
        </div>
      </div>
      <p className="font-serif text-sm leading-snug" style={{ color: "rgba(220,200,165,0.88)", fontWeight: 300 }}>
        {item.name}
      </p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[8px]" style={{ color: "rgba(180,155,100,0.4)" }}>
          {item.recentCount} recent
        </span>
        {item.priorCount > 0 && (
          <span className="text-[8px]" style={{ color: "rgba(180,155,100,0.3)" }}>
            · {item.priorCount} prior
          </span>
        )}
      </div>
    </div>
  );
}

// ── Misc sub-components ────────────────────────────────────────────────────────

function FunnelCard({ label, value, sub, icon, highlight }: {
  label: string; value: number; sub: string; icon: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className="p-4 rounded-xl"
      style={{
        background: highlight ? "rgba(212,139,0,0.07)" : "rgba(26,26,27,0.04)",
        border: highlight ? "1px solid rgba(212,139,0,0.22)" : "1px solid rgba(26,26,27,0.08)",
      }}>
      <div className="flex items-center justify-between mb-2">{icon}
        <span className="text-[8px] uppercase tracking-[0.18em]" style={{ color: "rgba(180,155,100,0.4)" }}>{label}</span>
      </div>
      <p className="text-3xl font-serif" style={{ color: highlight ? GOLD : "rgba(210,190,155,0.85)", fontWeight: 300 }}>
        {value.toLocaleString()}
      </p>
      <p className="text-[9px] mt-1" style={{ color: "rgba(180,155,100,0.45)" }}>{sub}</p>
    </div>
  );
}

function FunnelBar({ segments }: { segments: { pct: number; color: string }[] }) {
  return (
    <div className="relative w-full mt-3 space-y-1.5">
      {segments.map((s, i) => (
        <div key={i} className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(26,26,27,0.07)" }}>
          <motion.div className="h-full rounded-full"
            initial={{ width: 0 }} animate={{ width: `${s.pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.15 }}
            style={{ background: s.color }} />
        </div>
      ))}
    </div>
  );
}

function Section({ title, subtitle, children, compact, action, icon }: {
  title: string; subtitle?: string; children: React.ReactNode;
  compact?: boolean; action?: React.ReactNode; icon?: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      <div className={`rounded-xl ${compact ? "p-4" : "p-5"}`}
        style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.07)" }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              {icon}
              <h3 className="font-serif text-base" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>{title}</h3>
            </div>
            {subtitle && (
              <p className="text-[8px] uppercase tracking-[0.18em] mt-0.5" style={{ color: "rgba(180,155,100,0.38)" }}>{subtitle}</p>
            )}
          </div>
          {action}
        </div>
        {children}
      </div>
    </motion.div>
  );
}

// ── Campaign Insights Section ──────────────────────────────────────────────────

interface CampaignRow {
  id:            string;
  name:          string;
  status:        string;
  active:        boolean;
  impressions:   number;
  clicks:        number;
  conversions:   number;
  ctr:           number;
  cvr:           number;
  budgetCents:   number | null;
  productCount:  number;
  roiLabel:      string | null;
}

function CampaignInsightsSection({
  campaigns, perfs, loading,
}: {
  campaigns: Campaign[];
  perfs:     Map<string, CampaignPerformance>;
  loading:   boolean;
}) {
  const rows: CampaignRow[] = campaigns.map((c) => {
    const p = perfs.get(c.id);
    const impressions  = p?.performance.impressions  ?? 0;
    const clicks       = p?.performance.clicks       ?? 0;
    const conversions  = p?.performance.conversions  ?? 0;
    const ctr          = p?.performance.ctr          ?? 0;
    const cvr          = p?.performance.cvr          ?? 0;
    const productCount = p?.performance.productCount ?? c.productCount ?? 0;

    // Basic ROI: clicks per $100 budget (if budget set)
    const budgetCents = c.budgetCents ?? null;
    let roiLabel: string | null = null;
    if (budgetCents && budgetCents > 0 && impressions > 0) {
      const cpm = Math.round((budgetCents / 100) / (impressions / 1000));
      roiLabel = `$${cpm} CPM`;
    }

    return { id: c.id, name: c.name, status: c.status, active: c.active,
             impressions, clicks, conversions, ctr, cvr, budgetCents, productCount, roiLabel };
  }).sort((a, b) => b.impressions - a.impressions);

  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const totalClicks      = rows.reduce((s, r) => s + r.clicks,      0);
  const totalConversions = rows.reduce((s, r) => s + r.conversions, 0);
  const activeCamps      = rows.filter((r) => r.active).length;
  const maxImpressions   = rows[0]?.impressions ?? 1;

  const STATUS_COLORS: Record<string, string> = {
    active:    "rgba(100,200,120,0.75)",
    draft:     "rgba(180,155,100,0.5)",
    paused:    "rgba(212,139,0,0.7)",
    completed: "rgba(130,150,212,0.65)",
    cancelled: "rgba(239,90,80,0.55)",
  };

  return (
    <Section
      title="Campaign Performance"
      subtitle="Sponsored placement attribution — impressions · clicks · conversions · ROI"
      icon={<Megaphone size={13} style={{ color: GOLD_DIM }} />}
    >
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <motion.div className="w-6 h-6 rounded-full border-2"
            style={{ borderColor: "rgba(212,139,0,0.15)", borderTopColor: "rgba(212,139,0,0.6)" }}
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="py-10 text-center">
          <Megaphone size={28} className="mx-auto mb-3" style={{ color: "rgba(212,139,0,0.18)" }} />
          <p className="text-xs italic" style={{ color: "rgba(180,155,100,0.35)" }}>
            No campaigns yet — create one in the Campaigns tab to start tracking placement performance
          </p>
        </div>
      ) : (
        <div className="space-y-5">

          {/* ── Aggregate KPIs ───────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Active Campaigns", value: activeCamps,                        gold: true  },
              { label: "Total Impressions", value: totalImpressions.toLocaleString(), gold: false },
              { label: "Total Clicks",      value: totalClicks.toLocaleString(),      gold: false },
              { label: "Conversions",       value: totalConversions.toLocaleString(), gold: true  },
            ].map(({ label, value, gold }) => (
              <div key={label} className="p-3 rounded-xl"
                style={{
                  background: gold ? "rgba(212,139,0,0.05)" : "rgba(26,26,27,0.04)",
                  border:     gold ? "1px solid rgba(212,139,0,0.18)" : "1px solid rgba(26,26,27,0.08)",
                }}>
                <p className="text-2xl font-serif" style={{ color: gold ? GOLD : "rgba(210,190,155,0.82)", fontWeight: 300 }}>
                  {value}
                </p>
                <p className="text-[8px] uppercase tracking-[0.18em] mt-0.5" style={{ color: "rgba(180,155,100,0.4)" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* ── Per-campaign bar chart of impressions ────────────────────── */}
          {rows.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[8px] uppercase tracking-[0.2em]" style={{ color: "rgba(180,155,100,0.4)" }}>
                Impressions by campaign
              </p>
              {rows.slice(0, 6).map((r, i) => (
                <div key={r.id}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: STATUS_COLORS[r.status] ?? GOLD_DIM }} />
                      <span className="font-serif text-xs truncate" style={{ color: "rgba(210,190,155,0.82)" }}>
                        {r.name}
                      </span>
                      {r.active && (
                        <span className="text-[7px] uppercase tracking-wider px-1 py-0.5 rounded flex-shrink-0"
                          style={{ background: "rgba(100,200,120,0.08)", border: "1px solid rgba(100,200,120,0.2)", color: "rgba(100,200,120,0.65)" }}>
                          Live
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      {r.roiLabel && (
                        <span className="text-[8px]" style={{ color: "rgba(212,139,0,0.6)" }}>{r.roiLabel}</span>
                      )}
                      <span className="text-[10px] font-serif" style={{ color: GOLD_DIM }}>
                        {r.impressions.toLocaleString()}
                        <span className="text-[8px] ml-1" style={{ color: "rgba(180,155,100,0.35)" }}>imp</span>
                      </span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(26,26,27,0.07)" }}>
                    <motion.div className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${maxImpressions > 0 ? (r.impressions / maxImpressions) * 100 : 0}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.06 }}
                      style={{ background: r.active
                        ? "linear-gradient(90deg, rgba(180,130,30,0.7), rgba(212,139,0,0.85))"
                        : "rgba(180,155,100,0.25)"
                      }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Attribution table ─────────────────────────────────────────── */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(26,26,27,0.08)" }}>
                  {["Campaign", "Status", "Products", "Impressions", "Clicks", "CTR", "Orders", "CVR", "CPM"].map((h) => (
                    <th key={h} className="text-left pb-2 pr-3 text-[8px] uppercase tracking-[0.16em]"
                      style={{ color: "rgba(180,155,100,0.4)", fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <motion.tr key={r.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    style={{ borderBottom: "1px solid rgba(26,26,27,0.05)" }}>
                    <td className="py-2.5 pr-3 font-serif max-w-[150px] truncate"
                      style={{ color: "rgba(220,200,165,0.85)" }}>{r.name}</td>
                    <td className="py-2.5 pr-3">
                      <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `${STATUS_COLORS[r.status] ?? GOLD_DIM}18`,
                          border: `1px solid ${STATUS_COLORS[r.status] ?? GOLD_DIM}40`,
                          color: STATUS_COLORS[r.status] ?? GOLD_DIM,
                        }}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3" style={{ color: "rgba(180,155,100,0.55)" }}>{r.productCount}</td>
                    <td className="py-2.5 pr-3" style={{ color: "rgba(200,180,145,0.7)" }}>{r.impressions.toLocaleString()}</td>
                    <td className="py-2.5 pr-3" style={{ color: "rgba(200,180,145,0.75)" }}>{r.clicks.toLocaleString()}</td>
                    <td className="py-2.5 pr-3">
                      <span style={{
                        color: r.ctr >= 10 ? "rgba(100,200,120,0.8)" : r.ctr >= 3 ? "rgba(212,139,0,0.75)" : "rgba(180,155,100,0.45)",
                        fontSize: 10,
                      }}>{r.ctr}%</span>
                    </td>
                    <td className="py-2.5 pr-3" style={{ color: "rgba(212,139,0,0.8)" }}>{r.conversions}</td>
                    <td className="py-2.5 pr-3">
                      <span style={{
                        color: r.cvr >= 10 ? "rgba(100,200,120,0.8)" : r.cvr >= 2 ? "rgba(212,139,0,0.75)" : "rgba(180,155,100,0.4)",
                        fontSize: 10,
                      }}>{r.cvr}%</span>
                    </td>
                    <td className="py-2.5 pr-3" style={{ color: "rgba(212,139,0,0.55)", fontSize: 10 }}>
                      {r.roiLabel ?? <span style={{ color: "rgba(180,155,100,0.25)" }}>—</span>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </Section>
  );
}

function FuturePanel() {
  const features = [
    { icon: <Lock size={14} />,      label: "Paid Brand Access",    desc: "Grant distributors tiered insight access with subscription gating" },
    { icon: <Download size={14} />,  label: "Exportable Reports",   desc: "One-click CSV / PDF export of all insight data by date range" },
    { icon: <Megaphone size={14} />, label: "Campaign Attribution", desc: "Track impression → selection → order attribution per campaign" },
    { icon: <Zap size={14} />,       label: "Predictive Trends",    desc: "ML-scored trend signals across flavor, category, and region" },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
      <div className="rounded-xl p-5 relative overflow-hidden"
        style={{ background: "rgba(180,130,30,0.03)", border: "1px solid rgba(212,139,0,0.12)" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 90% 20%, rgba(212,139,0,0.05), transparent 55%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-serif text-base" style={{ color: "rgba(230,210,175,0.8)", fontWeight: 300 }}>Roadmap</h3>
            <span className="text-[8px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.18)", color: "rgba(212,139,0,0.5)" }}>
              Coming Soon
            </span>
          </div>
          <p className="text-[10px] mb-5" style={{ color: "rgba(180,155,100,0.45)" }}>
            Features planned to make insights commercially valuable to brands and distributors
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {features.map((f) => (
              <div key={f.label} className="flex gap-3 p-3 rounded-lg"
                style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.07)" }}>
                <div className="flex-shrink-0 mt-0.5" style={{ color: GOLD_DIM }}>{f.icon}</div>
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: "rgba(210,190,155,0.75)" }}>{f.label}</p>
                  <p className="text-[9px] leading-relaxed" style={{ color: "rgba(180,155,100,0.4)" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
