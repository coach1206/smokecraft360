/**
 * InventoryIntelligenceTab — Predictive Inventory & Demand Intelligence.
 *
 * Sections:
 *   KPI row          — top sellers count, low stock alerts, demand requests, out of stock
 *   Restock Now      — urgency-ranked restock suggestions
 *   Top Sellers      — most ordered products with trend score
 *   High Demand      — items guests requested that aren't in inventory
 *   Low Stock        — items running low (quantity 1–3)
 *   Out of Stock     — fully depleted items
 *   Trending Flavors — flavor preference heat from user sessions
 *   Trending Categories — cigar vs alcohol preference split
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }           from "framer-motion";
import {
  Package, TrendingUp, AlertTriangle, ShoppingCart,
  ArrowUpRight, RefreshCw, Brain, Flame, Star, XCircle,
} from "lucide-react";
import {
  fetchVenueIntelligence,
  type VenueIntelligence,
  type IntelligenceRestockSuggestion,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const GOLD     = "rgba(212,139,0,1)";
const GOLD_DIM = "rgba(212,139,0,0.45)";

const URGENCY_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
  high:   { bg: "rgba(239,90,80,0.07)",  border: "rgba(239,90,80,0.25)",  color: "rgba(239,100,90,0.85)", label: "Urgent" },
  medium: { bg: "rgba(212,139,0,0.07)", border: "rgba(212,139,0,0.25)", color: "rgba(212,139,0,0.85)", label: "Soon"   },
  low:    { bg: "rgba(130,150,212,0.06)", border: "rgba(130,150,212,0.2)", color: "rgba(130,150,212,0.7)", label: "Plan"   },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, gold, warning }: {
  icon: React.ReactNode; label: string; value: number; gold?: boolean; warning?: boolean;
}) {
  return (
    <div className="p-4 rounded-xl"
      style={{
        background: gold    ? "rgba(212,139,0,0.05)"
                  : warning ? "rgba(239,90,80,0.05)"
                  : "rgba(26,26,27,0.04)",
        border:   gold    ? "1px solid rgba(212,139,0,0.18)"
                : warning ? "1px solid rgba(239,90,80,0.2)"
                : "1px solid rgba(26,26,27,0.08)",
      }}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: gold ? GOLD_DIM : warning ? "rgba(239,90,80,0.6)" : "rgba(180,155,100,0.5)" }}>
          {icon}
        </span>
        <p className="text-[8px] uppercase tracking-[0.2em]" style={{ color: "rgba(180,155,100,0.4)" }}>{label}</p>
      </div>
      <p className="text-3xl font-serif" style={{ color: gold ? GOLD : warning ? "rgba(239,100,90,0.85)" : "rgba(210,190,155,0.82)", fontWeight: 300 }}>
        {value}
      </p>
    </div>
  );
}

function SectionHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {icon && <span style={{ color: GOLD_DIM }}>{icon}</span>}
      <div>
        <h3 className="font-serif text-base" style={{ color: "rgba(220,200,165,0.88)", fontWeight: 300 }}>{title}</h3>
        {subtitle && <p className="text-[8px] uppercase tracking-[0.18em] mt-0.5" style={{ color: "rgba(180,155,100,0.38)" }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function RestockCard({ suggestion, i }: { suggestion: IntelligenceRestockSuggestion; i: number }) {
  const style = URGENCY_STYLES[suggestion.urgency] ?? URGENCY_STYLES.low;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.06 }}
      className="flex items-start gap-4 p-4 rounded-xl"
      style={{ background: style.bg, border: `1px solid ${style.border}` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-serif text-sm truncate" style={{ color: "rgba(220,200,165,0.88)" }}>
            {suggestion.productName}
          </p>
          <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: `${style.color}18`, border: `1px solid ${style.border}`, color: style.color }}>
            {style.label}
          </span>
          <span className="text-[7px] uppercase tracking-[0.12em] flex-shrink-0"
            style={{ color: "rgba(180,155,100,0.35)" }}>
            {suggestion.category}
          </span>
        </div>
        <p className="text-[10px]" style={{ color: "rgba(180,155,100,0.55)" }}>{suggestion.reason}</p>
      </div>
      <ArrowUpRight size={14} style={{ color: style.color, flexShrink: 0, marginTop: 2 }} />
    </motion.div>
  );
}

function ProductListRow({ name, category, metric, metricLabel, trendScore, i }: {
  name: string; category: string; metric: number; metricLabel: string; trendScore: number; i: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
      className="flex items-center justify-between py-2.5"
      style={{ borderBottom: "1px solid rgba(26,26,27,0.06)" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs tabular-nums w-4 text-right flex-shrink-0" style={{ color: "rgba(180,155,100,0.3)" }}>
          {i + 1}
        </span>
        <div className="min-w-0">
          <p className="font-serif text-xs truncate" style={{ color: "rgba(210,190,155,0.82)" }}>{name}</p>
          <p className="text-[8px] uppercase tracking-[0.12em] mt-0.5" style={{ color: "rgba(180,155,100,0.35)" }}>{category}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
        {trendScore > 0 && (
          <div className="flex items-center gap-1">
            <Flame size={9} style={{ color: trendScore >= 2 ? "rgba(239,100,60,0.7)" : "rgba(212,139,0,0.55)" }} />
            <span className="text-[8px]" style={{ color: trendScore >= 2 ? "rgba(239,100,60,0.7)" : "rgba(212,139,0,0.55)" }}>
              {trendScore >= 2 ? "Hot" : "Trending"}
            </span>
          </div>
        )}
        <div className="text-right">
          <p className="text-sm font-serif" style={{ color: GOLD_DIM, fontWeight: 300 }}>{metric}</p>
          <p className="text-[7px] uppercase tracking-[0.1em]" style={{ color: "rgba(180,155,100,0.3)" }}>{metricLabel}</p>
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
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(26,26,27,0.07)" }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(count / max) * 100}%` }}
          transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.05 }}
          style={{ background: "linear-gradient(90deg, rgba(180,130,30,0.6), rgba(212,139,0,0.85))" }}
        />
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.09)" }}>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-xs italic py-4 text-center" style={{ color: "rgba(180,155,100,0.3)" }}>{message}</p>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function InventoryIntelligenceTab() {
  const { user } = useAuth();
  const [data,    setData]    = useState<VenueIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // For super_admin without a venueId we use a placeholder to get cross-venue data
  const venueId = user?.venueId ?? "default";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchVenueIntelligence(venueId);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load intelligence data");
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
            style={{ borderColor: "rgba(212,139,0,0.2)", borderTopColor: "rgba(212,139,0,0.7)" }}
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          <p className="text-[9px] uppercase tracking-[0.28em] text-center" style={{ color: "rgba(180,155,100,0.4)" }}>
            Analysing inventory…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <Brain size={28} className="mx-auto mb-3" style={{ color: "rgba(180,155,100,0.2)" }} />
        <p className="text-xs" style={{ color: "rgba(239,68,68,0.6)" }}>{error}</p>
        <button onClick={load} className="mt-4 text-[9px] uppercase tracking-[0.18em] px-4 py-2 rounded-lg"
          style={{ background: "rgba(212,139,0,0.07)", border: "1px solid rgba(212,139,0,0.2)", color: "rgba(212,139,0,0.65)" }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const maxFlavor = Math.max(...data.trendingFlavors.map((f) => f.count), 1);

  const highSuggestions    = data.restockSuggestions.filter((s) => s.urgency === "high");
  const nonHighSuggestions = data.restockSuggestions.filter((s) => s.urgency !== "high");

  return (
    <AnimatePresence>
      <motion.div
        key="intelligence"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >

        {/* ── Header row ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
              Inventory Intelligence
            </h2>
            <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: "rgba(180,155,100,0.4)" }}>
              Demand signals · predictive restocking · stock health
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data.generatedAt && (
              <p className="text-[8px]" style={{ color: "rgba(180,155,100,0.3)" }}>
                Updated {new Date(data.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <motion.button onClick={load}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] uppercase tracking-[0.15em]"
              style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: "rgba(180,155,100,0.5)" }}
              whileHover={{ borderColor: "rgba(212,139,0,0.3)", color: "rgba(212,139,0,0.7)" }}
              whileTap={{ scale: 0.96 }}>
              <RefreshCw size={10} />Refresh
            </motion.button>
          </div>
        </div>

        {/* ── KPI row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={<Star size={14} />}          label="Top Sellers"      value={data.topSellers.length}         gold />
          <KpiCard icon={<AlertTriangle size={14} />} label="Low Stock"        value={data.lowStock.length}           warning={data.lowStock.length > 0} />
          <KpiCard icon={<ShoppingCart size={14} />}  label="Demand Requests"  value={data.highDemandMissing.reduce((s, d) => s + d.requestCount, 0)} gold />
          <KpiCard icon={<XCircle size={14} />}       label="Out of Stock"     value={data.outOfStock.length}         warning={data.outOfStock.length > 0} />
        </div>

        {/* ── Restock suggestions ────────────────────────────────────────── */}
        {data.restockSuggestions.length > 0 && (
          <Panel>
            <SectionHeader
              title="Restock Suggestions"
              subtitle="AI-generated based on demand, orders, and trend signals"
              icon={<Brain size={14} />}
            />
            <div className="space-y-2">
              {highSuggestions.map((s, i) => (
                <RestockCard key={s.productId} suggestion={s} i={i} />
              ))}
              {nonHighSuggestions.map((s, i) => (
                <RestockCard key={s.productId} suggestion={s} i={highSuggestions.length + i} />
              ))}
            </div>
          </Panel>
        )}

        {/* ── Main grid: Top Sellers + High Demand Missing ───────────────── */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Top Sellers */}
          <Panel>
            <SectionHeader
              title="Top Sellers"
              subtitle="Most ordered at this venue"
              icon={<TrendingUp size={13} />}
            />
            {data.topSellers.length === 0 ? (
              <EmptyState message="No order data yet — orders will appear here once guests start ordering" />
            ) : (
              <div>
                {data.topSellers.slice(0, 8).map((p, i) => (
                  <ProductListRow
                    key={p.productId}
                    name={p.name}
                    category={p.category}
                    metric={p.orderCount ?? 0}
                    metricLabel="orders"
                    trendScore={p.trendScore}
                    i={i}
                  />
                ))}
              </div>
            )}
          </Panel>

          {/* High Demand Missing */}
          <Panel>
            <SectionHeader
              title="High Demand — Not Stocked"
              subtitle="Items guests requested that aren't in your inventory"
              icon={<ShoppingCart size={13} />}
            />
            {data.highDemandMissing.length === 0 ? (
              <EmptyState message="No demand requests yet — guests can tap 'Request This Item' on out-of-stock recommendations" />
            ) : (
              <div>
                {data.highDemandMissing.slice(0, 8).map((p, i) => (
                  <ProductListRow
                    key={p.productId}
                    name={p.productName}
                    category={p.category}
                    metric={p.requestCount}
                    metricLabel="requests"
                    trendScore={p.trendScore}
                    i={i}
                  />
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* ── Low Stock + Out of Stock ───────────────────────────────────── */}
        {(data.lowStock.length > 0 || data.outOfStock.length > 0) && (
          <div className="grid md:grid-cols-2 gap-4">

            {/* Low Stock */}
            {data.lowStock.length > 0 && (
              <Panel>
                <SectionHeader
                  title="Low Stock Alert"
                  subtitle="Quantity 1–3 remaining"
                  icon={<AlertTriangle size={13} />}
                />
                <div className="space-y-2">
                  {data.lowStock.map((item, i) => (
                    <motion.div key={item.productId}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{ background: "rgba(212,139,0,0.04)", border: "1px solid rgba(212,139,0,0.12)" }}>
                      <div className="min-w-0">
                        <p className="text-xs font-serif truncate" style={{ color: "rgba(210,190,155,0.82)" }}>{item.name}</p>
                        <p className="text-[8px] uppercase tracking-[0.12em]" style={{ color: "rgba(180,155,100,0.38)" }}>{item.category}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: item.quantity === 1 ? "rgba(239,90,80,0.7)" : "rgba(212,139,0,0.6)" }} />
                        <span className="text-sm font-serif" style={{ color: item.quantity === 1 ? "rgba(239,100,90,0.8)" : GOLD_DIM }}>
                          {item.quantity}
                        </span>
                        <span className="text-[8px]" style={{ color: "rgba(180,155,100,0.35)" }}>left</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Panel>
            )}

            {/* Out of Stock */}
            {data.outOfStock.length > 0 && (
              <Panel>
                <SectionHeader
                  title="Out of Stock"
                  subtitle="Currently unavailable to guests"
                  icon={<XCircle size={13} />}
                />
                <div className="space-y-2">
                  {data.outOfStock.map((item, i) => (
                    <motion.div key={item.productId}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
                      <XCircle size={12} style={{ color: "rgba(239,68,68,0.45)", flexShrink: 0 }} />
                      <div className="min-w-0">
                        <p className="text-xs font-serif truncate" style={{ color: "rgba(200,175,145,0.75)" }}>{item.name}</p>
                        <p className="text-[8px] uppercase tracking-[0.12em]" style={{ color: "rgba(180,155,100,0.35)" }}>{item.category}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* ── Top Viewed + Trending Flavors ──────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Top Viewed */}
          <Panel>
            <SectionHeader
              title="Most Viewed"
              subtitle="Highest recommendation impressions"
              icon={<Package size={13} />}
            />
            {data.topViewed.length === 0 ? (
              <EmptyState message="Impressions will appear here as guests use the recommendation engine" />
            ) : (
              <div>
                {data.topViewed.slice(0, 7).map((p, i) => (
                  <ProductListRow
                    key={p.productId}
                    name={p.name}
                    category={p.category}
                    metric={p.viewCount ?? 0}
                    metricLabel="views"
                    trendScore={p.trendScore}
                    i={i}
                  />
                ))}
              </div>
            )}
          </Panel>

          {/* Trending Flavors */}
          <Panel>
            <SectionHeader
              title="Trending Flavors"
              subtitle="Most requested tasting notes from recent sessions"
              icon={<Flame size={13} />}
            />
            {data.trendingFlavors.length === 0 ? (
              <EmptyState message="Flavor trends appear as guests run recommendations" />
            ) : (
              <div className="space-y-3">
                {data.trendingFlavors.slice(0, 8).map((f, i) => (
                  <FlavorBar key={f.flavor} flavor={f.flavor} count={f.count} max={maxFlavor} i={i} />
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* ── Trending Categories ─────────────────────────────────────────── */}
        {data.trendingCategories.length > 0 && (
          <Panel>
            <SectionHeader
              title="Category Trends"
              subtitle="Cigar vs spirits preference split from guest sessions"
              icon={<TrendingUp size={13} />}
            />
            <div className="flex gap-4">
              {data.trendingCategories.map((cat) => {
                const total = data.trendingCategories.reduce((s, c) => s + c.count, 0);
                const pct   = total > 0 ? Math.round((cat.count / total) * 100) : 0;
                const isCigar = cat.category === "cigar";
                return (
                  <div key={cat.category} className="flex-1 p-4 rounded-xl text-center"
                    style={{
                      background: isCigar ? "rgba(212,139,0,0.05)" : "rgba(130,150,212,0.05)",
                      border:     isCigar ? "1px solid rgba(212,139,0,0.15)" : "1px solid rgba(130,150,212,0.15)",
                    }}>
                    <p className="text-3xl font-serif mb-1"
                      style={{ color: isCigar ? GOLD_DIM : "rgba(130,150,212,0.7)", fontWeight: 300 }}>
                      {pct}%
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.2em]"
                      style={{ color: isCigar ? "rgba(212,139,0,0.45)" : "rgba(130,150,212,0.5)" }}>
                      {cat.category}
                    </p>
                    <p className="text-[8px] mt-0.5" style={{ color: "rgba(180,155,100,0.35)" }}>
                      {cat.count} sessions
                    </p>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {/* ── Future Ready notice ─────────────────────────────────────────── */}
        <div className="rounded-xl p-5 text-center"
          style={{ background: "rgba(212,139,0,0.02)", border: "1px dashed rgba(212,139,0,0.1)" }}>
          <Brain size={20} className="mx-auto mb-2" style={{ color: "rgba(212,139,0,0.2)" }} />
          <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "rgba(180,155,100,0.3)" }}>
            Future: automated restock alerts · distributor integration · demand forecasting
          </p>
        </div>

      </motion.div>
    </AnimatePresence>
  );
}
