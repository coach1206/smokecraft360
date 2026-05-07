import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAxiomStore } from "@/store/axiomStore";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, TrendingUp, Brain, AlertTriangle, Gift, Award, Package, ArrowUpRight, ArrowDownRight, Plus, Minus, Zap } from "lucide-react";
import LiveKpi from "@/components/LiveKpi";
import { usePosContext } from "@/contexts/PosContext";
import { useCommandCenter } from "@/contexts/CommandCenterContext";
import { useVenueContext } from "@/contexts/VenueContext";
import ConfirmModal from "@/components/ConfirmModal";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";

const priorityColors = { critical: "#ef4444", high: "#f59e0b", medium: "#5b8def", low: "#22c55e" };

function SvgGauge({ pct, color, label, sub }: { pct: number; color: string; label: string; sub: string }) {
  const R = 36, CIRC = 2 * Math.PI * R;
  const filled = Math.max(0, Math.min(1, pct / 100)) * CIRC;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 96, height: 96 }}>
        <svg width={96} height={96} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={48} cy={48} r={R} fill="none" stroke="rgba(26,26,27,0.08)" strokeWidth={7} />
          <motion.circle cx={48} cy={48} r={R} fill="none"
            stroke={color} strokeWidth={7} strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRC}`}
            initial={{ strokeDasharray: `0 ${CIRC}` }}
            animate={{ strokeDasharray: `${filled} ${CIRC}` }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
        </div>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: `radial-gradient(circle at 50% 50%, ${color}08 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(26,26,27,0.82)", letterSpacing: "0.04em" }}>{label}</div>
        <div style={{ fontSize: 10, color: "rgba(107,94,78,0.65)", marginTop: 2 }}>{sub}</div>
      </div>
    </motion.div>
  );
}

const C = {
  header:    "linear-gradient(180deg, #12100E 0%, #EFEBE0ee 100%)",
  border:    "rgba(212,139,0,0.12)",
  text:      "#1A1A1B",
  muted:     "#6B5E4E",
  dim:       "rgba(107,94,78,0.52)",
  gold:      "#D48B00",
  card:      "rgba(26,26,27,0.06)",
  cardSoft:  "rgba(255,255,255,0.028)",
  rowAlt:    "rgba(26,26,27,0.04)",
  rowBorder: "rgba(212,139,0,0.08)",
  back:      "#2A2A2A",
  backBorder:"rgba(212,139,0,0.18)",
  inputBg:   "#181512",
  inputBorder:"rgba(212,139,0,0.18)",
  accent:    "#A78BFA",
  bg:        "#F5F2ED",
};

type AnalyticsTab = "overview" | "stock";

const REASON_LABELS: Record<string, string> = {
  "cart.add": "Added to cart",
  "cart.remove": "Removed from cart",
  "cart.reduce": "Cart qty reduced",
  "cart.clear": "Cart cleared",
  "payment.failed": "Payment failed",
  "retry.failed": "Retry failed",
  "checkout.retry": "Checkout retry",
  "order.refunded": "Order refunded",
  "manual.adjustment": "Manual adjustment",
  "manual.adjustment.confirmed": "Manual (confirmed)",
};

export default function AnalyticsModule() {
  const [, navigate] = useLocation();
  const pos = usePosContext();
  const cc = useCommandCenter();
  const { getBackground } = useVenueContext();
  const [tab, setTab] = useState<AnalyticsTab>("overview");
  const [adjustProduct, setAdjustProduct] = useState<string | null>(null);
  const [adjustDelta, setAdjustDelta] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<{ productId: string; delta: number; reason: string } | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const totalRevenue = cc.hourlyRevenue.reduce((s, h) => s + h.amount, 0) + pos.orders.reduce((s, o) => s + o.total, 0);
  const maxHourly = Math.max(...cc.hourlyRevenue.map(h => h.amount), 1);
  const lowStockProducts = pos.products.filter(p => p.stock <= 5);
  const totalOrders = pos.orders.length;
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const rewardsTriggered = pos.orders.filter(o => o.rewardApplied).length;

  const dynamicInsights = useMemo(() => {
    type Priority = keyof typeof priorityColors;
    const insights: Array<{ icon: typeof Brain; text: string; priority: Priority }> = [];
    const outOfStock  = pos.products.filter(p => p.stock === 0);
    const lowStock    = pos.products.filter(p => p.stock > 0 && p.stock <= 5);
    const orderCount  = pos.orders.length;
    const rewardCount = pos.orders.filter(o => o.rewardApplied).length;
    const revenue     = pos.orders.reduce((s, o) => s + o.total, 0);
    const avg         = orderCount > 0 ? revenue / orderCount : 0;

    if (outOfStock.length > 0) {
      insights.push({ icon: Package, text: `${outOfStock.length} product${outOfStock.length > 1 ? "s" : ""} out of stock — update inventory to restore kiosk availability`, priority: "critical" });
    }
    if (lowStock.length > 0) {
      insights.push({ icon: AlertTriangle, text: `${lowStock[0].name} running low — ${lowStock[0].stock} remaining, restock recommended`, priority: "critical" });
    }
    if (orderCount > 0 && avg > 40) {
      insights.push({ icon: TrendingUp, text: `Average order $${avg.toFixed(0)} — above $40 target. Consider premium upsell prompts at the kiosk reveal`, priority: "high" });
    }
    if (rewardCount > 0) {
      const pct = Math.round((rewardCount / orderCount) * 100);
      insights.push({ icon: Gift, text: `Reward program active — ${pct}% of orders qualifying for loyalty discount`, priority: orderCount > 5 ? "medium" : "low" });
    }
    const topCigar = [...pos.products]
      .filter(p => p.category === "cigar" && p.stock > 5)
      .sort((a, b) => b.stock - a.stock)[0];
    if (topCigar) {
      insights.push({ icon: Award, text: `Feature ${topCigar.name} on the main kiosk display — strong availability (${topCigar.stock} in stock)`, priority: "medium" });
    }
    if (insights.length === 0) {
      insights.push({ icon: Brain, text: orderCount === 0 ? "No orders yet — system is live and ready for guests" : "All systems operational — no immediate action required", priority: "low" });
    }
    return insights;
  }, [pos.products, pos.orders]);

  const peakHour = useMemo(() => {
    if (!cc.hourlyRevenue.length) return null;
    return cc.hourlyRevenue.reduce((best, h) => h.amount > best.amount ? h : best, cc.hourlyRevenue[0]);
  }, [cc.hourlyRevenue]);

  const revenueStory = useMemo(() => {
    const stories: string[] = [];
    if (totalRevenue > 0) stories.push(`$${totalRevenue.toLocaleString()} generated this session`);
    if (peakHour && peakHour.amount > 0) stories.push(`Busiest hour: ${peakHour.hour} with $${peakHour.amount.toLocaleString()}`);
    const cigarOrders = pos.orders.filter(o => o.items.some(i => i.product.category === "cigar"));
    if (cigarOrders.length > 0 && totalOrders > 0) {
      const pct = Math.round((cigarOrders.length / totalOrders) * 100);
      stories.push(`Cigar pairings drove ${pct}% of orders`);
    }
    if (avgOrder > 0) stories.push(`${avgOrder > 40 ? "Above" : "Near"} target — $${avgOrder} average order value`);
    return stories;
  }, [totalRevenue, peakHour, pos.orders, totalOrders, avgOrder]);

  const soldCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const order of pos.orders) {
      if (order.status === "failed" || order.status === "refunded") continue;
      for (const item of order.items) {
        counts[item.product.id] = (counts[item.product.id] ?? 0) + item.quantity;
      }
    }
    return counts;
  }, [pos.orders]);

  const topProducts = useMemo(() =>
    [...pos.products]
      .map(p => ({ ...p, sold: soldCounts[p.id] ?? 0 }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5),
    [pos.products, soldCounts],
  );

  const axiom = useAxiomStore();
  const occupancyPct   = axiom.occupancy;
  const revLiftPct     = totalRevenue > 0 ? Math.min(100, Math.round(totalRevenue / 10)) : 62;
  const sentimentPct   = 74;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg, color: C.text }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 24px", borderBottom: `1px solid rgba(212,139,0,0.10)`, background: C.header, backdropFilter: "blur(16px)", flexShrink: 0, boxShadow: "0 1px 0 rgba(212,139,0,0.06), 0 4px 20px rgba(26,26,27,0.06)" }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: C.back, border: `1px solid ${C.backBorder}`, color: C.muted, cursor: "pointer", boxShadow: "0 2px 8px rgba(26,26,27,0.06)" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.accent }}>Analytics & Insights</div>
          <div style={{ fontSize: 13, color: C.muted }}>Revenue intelligence & AI brain</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {([["overview", "Overview"], ["stock", "Stock Movements"]] as const).map(([key, label]) => (
            <motion.button key={key} whileTap={{ scale: 0.95 }} onClick={() => setTab(key)}
              style={{
                padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: tab === key ? "rgba(167,139,250,0.15)" : C.back,
                border: `1px solid ${tab === key ? "rgba(167,139,250,0.4)" : C.border}`,
                color: tab === key ? C.accent : C.muted,
              }}>
              {label}
            </motion.button>
          ))}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/analytics/swipe-intelligence")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "rgba(212,139,0,0.10)",
              border: "1px solid rgba(212,139,0,0.30)",
              color: "#D48B00",
            }}
          >
            <Brain size={13} /> Swipe IQ
          </motion.button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {tab === "overview" && (
          <>
            {/* ── Circular Gauges ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              style={{
                display: "flex", justifyContent: "space-around", alignItems: "center",
                padding: "22px 24px", marginBottom: 20, borderRadius: 18,
                background: "rgba(255,255,255,0.028)",
                border: "1px solid rgba(212,139,0,0.09)",
                boxShadow: "0 4px 24px rgba(26,26,27,0.04)",
              }}>
              <SvgGauge pct={occupancyPct}  color="#D48B00" label="Occupancy"     sub="Venue capacity fill" />
              <div style={{ width: 1, height: 80, background: "rgba(212,139,0,0.08)" }} />
              <SvgGauge pct={revLiftPct}    color="#5b8def" label="Revenue Lift"   sub="Session vs baseline" />
              <div style={{ width: 1, height: 80, background: "rgba(212,139,0,0.08)" }} />
              <SvgGauge pct={sentimentPct}  color="#22c55e" label="Sentiment"      sub="Guest satisfaction" />
            </motion.div>

            {/* ── KPI Strip ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              {([
                { label: "Revenue",   value: totalRevenue,     prefix: "$", color: C.gold,    live: true  },
                { label: "Orders",    value: totalOrders,      prefix: "",  color: "#5b8def", live: true  },
                { label: "Avg Order", value: avgOrder,         prefix: "$", color: "#22c55e", live: false },
                { label: "Rewards",   value: rewardsTriggered, prefix: "",  color: "#f59e0b", live: false },
              ] as const).map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  style={{
                    padding: "16px", borderRadius: 14, background: C.card,
                    border: `1px solid ${stat.color}18`,
                    textAlign: "center",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
                  }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>
                    <LiveKpi value={stat.value} prefix={stat.prefix} live={stat.live} liveColor={stat.color} duration={1200 - i * 80} style={{ fontSize: 24, fontWeight: 700, color: stat.color }} />
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* ── Revenue Story strip ── */}
            {revenueStory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                style={{
                  marginBottom: 20, padding: "12px 18px", borderRadius: 12,
                  background: `linear-gradient(90deg, ${C.gold}08, rgba(91,141,239,0.06))`,
                  border: `1px solid ${C.gold}22`,
                  display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
                  boxShadow: "0 1px 4px rgba(26,26,27,0.02)",
                }}
              >
                <Zap size={13} color={C.gold} style={{ flexShrink: 0 }} />
                {revenueStory.map((s, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: C.text }}>{s}</span>
                    {i < revenueStory.length - 1 && <span style={{ color: C.dim, fontSize: 12 }}>·</span>}
                  </span>
                ))}
              </motion.div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Revenue by Hour */}
              <div style={{ padding: "16px", borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Revenue by Hour</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140 }}>
                  {cc.hourlyRevenue.map((h, i) => (
                    <motion.div key={h.hour}
                      initial={{ height: 0 }} animate={{ height: `${(h.amount / maxHourly) * 100}%` }}
                      transition={{ delay: i * 0.04, duration: 0.4 }}
                      style={{ flex: 1, borderRadius: "4px 4px 0 0", minHeight: 4, background: `linear-gradient(180deg, ${C.gold}, ${C.gold}40)`, position: "relative" }}
                      title={`${h.hour}: $${h.amount}`}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  {cc.hourlyRevenue.map(h => (
                    <div key={h.hour} style={{ flex: 1, fontSize: 8, color: C.dim, textAlign: "center", overflow: "hidden" }}>
                      {h.hour.replace("am", "").replace("pm", "p")}
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Selling Products */}
              <div style={{ padding: "16px", borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Top Selling Products</div>
                {topProducts.map((p, i) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.dim, width: 16 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      <div style={{ height: 4, borderRadius: 2, background: "rgba(0,0,0,0.06)", marginTop: 3 }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(p.sold / 24) * 100}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                          style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${C.gold}, ${C.gold}80)` }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{p.sold} sold</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* AI Revenue Brain */}
              <div style={{ padding: "16px", borderRadius: 14, background: C.card, border: `1px solid ${C.accent}20`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Brain size={16} color={C.accent} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>AI Revenue Brain</span>
                </div>
                {dynamicInsights.map((insight, i) => {
                  const Icon = insight.icon;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                      style={{
                        display: "flex", gap: 10, padding: "10px 12px", marginBottom: 8,
                        borderRadius: 10, background: C.cardSoft,
                        border: `1px solid ${priorityColors[insight.priority]}20`,
                      }}>
                      <Icon size={16} color={priorityColors[insight.priority]} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{insight.text}</div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Low Stock Alerts */}
              <div style={{ padding: "16px", borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
                  Low Stock Alerts
                </div>
                {lowStockProducts.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.muted, padding: 20, textAlign: "center" }}>All products well stocked</div>
                ) : (
                  lowStockProducts.map(p => (
                    <div key={p.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 12px", marginBottom: 8, borderRadius: 10,
                      background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.18)",
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{p.category}</div>
                      </div>
                      <div style={{
                        padding: "4px 10px", borderRadius: 8,
                        background: p.stock <= 3 ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                        color: p.stock <= 3 ? "#ef4444" : "#f59e0b",
                        fontSize: 12, fontWeight: 700,
                      }}>{p.stock} left</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {tab === "stock" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Package size={18} color={C.gold} />
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Stock Movements</span>
              <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
                {pos.inventoryLog.length} entries
              </span>
            </div>

            {/* Manual Adjustment Panel */}
            <div style={{ padding: 16, borderRadius: 14, marginBottom: 16, background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                Manual Stock Adjustment
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Product</div>
                  <select
                    value={adjustProduct ?? ""}
                    onChange={e => { setAdjustProduct(e.target.value || null); setAdjustError(null); }}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13,
                      background: C.inputBg, border: `1px solid ${C.inputBorder}`,
                      color: C.text, outline: "none",
                    }}
                  >
                    <option value="">Select product...</option>
                    {pos.products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (stock: {p.stock})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ width: 120 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Quantity</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAdjustDelta(d => d - 1)}
                      style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", cursor: "pointer" }}>
                      <Minus size={14} />
                    </motion.button>
                    <span style={{ minWidth: 40, textAlign: "center", fontSize: 16, fontWeight: 700, color: adjustDelta > 0 ? "#22c55e" : adjustDelta < 0 ? "#ef4444" : C.text }}>
                      {adjustDelta > 0 ? "+" : ""}{adjustDelta}
                    </span>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAdjustDelta(d => d + 1)}
                      style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", cursor: "pointer" }}>
                      <Plus size={14} />
                    </motion.button>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Reason</div>
                  <input
                    value={adjustReason}
                    onChange={e => setAdjustReason(e.target.value)}
                    placeholder="e.g. restock, damaged, count correction"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13, background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text, outline: "none" }}
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (!adjustProduct || adjustDelta === 0) return;
                    const result = pos.manualStockAdjust(adjustProduct, adjustDelta, adjustReason || "manual.adjustment");
                    if (result.error) {
                      setAdjustError(result.error);
                    } else if (result.needsConfirmation) {
                      setPendingConfirm({ productId: adjustProduct, delta: adjustDelta, reason: adjustReason || "manual.adjustment" });
                    } else {
                      setAdjustProduct(null); setAdjustDelta(0); setAdjustReason(""); setAdjustError(null);
                    }
                  }}
                  disabled={!adjustProduct || adjustDelta === 0}
                  style={{
                    padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: (!adjustProduct || adjustDelta === 0) ? "rgba(154,120,32,0.08)" : `linear-gradient(135deg, ${C.gold}, #7A5F14)`,
                    color: (!adjustProduct || adjustDelta === 0) ? `${C.gold}60` : "#1A1A1B",
                    border: "none", cursor: (!adjustProduct || adjustDelta === 0) ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap", boxShadow: (!adjustProduct || adjustDelta === 0) ? "none" : "0 2px 8px rgba(154,120,32,0.25)",
                  }}
                >
                  Apply
                </motion.button>
              </div>
              <AnimatePresence>
                {adjustError && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    style={{ marginTop: 8, fontSize: 12, color: "#ef4444" }}>{adjustError}</motion.div>
                )}
                {Math.abs(adjustDelta) > 10 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    style={{ marginTop: 8, fontSize: 12, color: "#f59e0b", display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={13} />
                    Large adjustment ({Math.abs(adjustDelta)} units) — requires Owner or Manager confirmation
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Inventory Log Table */}
            {pos.inventoryLog.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <Package size={32} color={C.dim} style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 14, color: C.muted }}>No stock movements yet</div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>Add items to cart or process orders to see inventory changes</div>
              </div>
            ) : (
              <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 80px 80px 70px 1fr 120px",
                  gap: 0, padding: "10px 14px",
                  background: C.cardSoft, borderBottom: `1px solid ${C.border}`,
                  fontSize: 11, fontWeight: 600, color: C.muted,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  <div>Product</div>
                  <div style={{ textAlign: "center" }}>Before</div>
                  <div style={{ textAlign: "center" }}>After</div>
                  <div style={{ textAlign: "center" }}>Change</div>
                  <div>Reason</div>
                  <div style={{ textAlign: "right" }}>Time</div>
                </div>
                {pos.inventoryLog.slice(0, 50).map((entry, i) => {
                  const delta = entry.afterStock - entry.beforeStock;
                  const isIncrease = delta > 0;
                  return (
                    <motion.div key={entry.id}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                      style={{
                        display: "grid", gridTemplateColumns: "1fr 80px 80px 70px 1fr 120px",
                        gap: 0, padding: "10px 14px", alignItems: "center",
                        borderBottom: `1px solid ${C.rowBorder}`,
                        background: i % 2 === 0 ? C.rowAlt : C.card,
                      }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.productName}
                      </div>
                      <div style={{ textAlign: "center", fontSize: 13, color: C.muted }}>{entry.beforeStock}</div>
                      <div style={{ textAlign: "center", fontSize: 13, color: C.muted }}>{entry.afterStock}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, fontSize: 13, fontWeight: 700, color: isIncrease ? "#22c55e" : "#ef4444" }}>
                        {isIncrease ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {isIncrease ? "+" : ""}{delta}
                      </div>
                      <div style={{ fontSize: 12, color: C.muted }}>{REASON_LABELS[entry.reason] ?? entry.reason}</div>
                      <div style={{ textAlign: "right", fontSize: 11, color: C.dim }}>
                        {new Date(entry.timestamp).toLocaleTimeString()} — {entry.userId}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!pendingConfirm}
        title="Large Stock Adjustment"
        message={pendingConfirm ? `This adjustment changes ${Math.abs(pendingConfirm.delta)} units. Only Owner or Manager can approve large adjustments (>10 units). Proceed?` : ""}
        confirmLabel="Approve Adjustment"
        danger={false}
        onConfirm={() => {
          if (pendingConfirm) {
            const ok = pos.confirmLargeAdjustment(pendingConfirm.productId, pendingConfirm.delta, pendingConfirm.reason);
            if (!ok) setAdjustError("Adjustment failed — check stock levels");
            else { setAdjustProduct(null); setAdjustDelta(0); setAdjustReason(""); setAdjustError(null); }
          }
          setPendingConfirm(null);
        }}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}
