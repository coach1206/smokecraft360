import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, Brain, AlertTriangle, Gift, Award } from "lucide-react";
import { usePosContext } from "@/contexts/PosContext";
import { useCommandCenter } from "@/contexts/CommandCenterContext";

const AI_INSIGHTS = [
  { icon: TrendingUp, text: "Push premium cigars tonight — Arturo Fuente trending 40% above average", priority: "high" as const },
  { icon: AlertTriangle, text: "Cohiba Behike 52 running low — only 5 remaining, restock recommended", priority: "critical" as const },
  { icon: Brain, text: "Customers trending toward whiskey pairings — consider a spirit flight promo", priority: "medium" as const },
  { icon: Gift, text: "Reward program driving 22% larger average orders — increase threshold to $75?", priority: "low" as const },
  { icon: Award, text: "Top seller today: Macallan 18 — feature it on the main kiosk display", priority: "medium" as const },
];

const priorityColors = { critical: "#ef4444", high: "#f59e0b", medium: "#5b8def", low: "#34d399" };

export default function AnalyticsModule() {
  const [, navigate] = useLocation();
  const pos = usePosContext();
  const cc = useCommandCenter();

  const totalRevenue = cc.hourlyRevenue.reduce((s, h) => s + h.amount, 0) + pos.orders.reduce((s, o) => s + o.total, 0);
  const maxHourly = Math.max(...cc.hourlyRevenue.map(h => h.amount), 1);
  const lowStockProducts = pos.products.filter(p => p.stock <= 5);
  const totalOrders = pos.orders.length + 47;
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const rewardsTriggered = pos.orders.filter(o => o.rewardApplied).length + 8;

  const topProducts = [...pos.products]
    .sort((a, b) => (b.stock < a.stock ? -1 : 1))
    .slice(0, 5)
    .map((p, i) => ({ ...p, sold: [24, 18, 15, 12, 9][i] ?? 5 }));

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #1a1714 0%, #0f0d0a 100%)", color: "#e8e0c8", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,8,6,0.8)", backdropFilter: "blur(8px)", flexShrink: 0 }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,224,200,0.5)", cursor: "pointer" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#8b5cf6" }}>Analytics & Insights</div>
          <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>Revenue intelligence & AI brain</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Revenue", value: `$${totalRevenue.toLocaleString()}`, color: "#d4af37" },
            { label: "Orders", value: `${totalOrders}`, color: "#5b8def" },
            { label: "Avg Order", value: `$${avgOrder}`, color: "#34d399" },
            { label: "Rewards", value: `${rewardsTriggered}`, color: "#f59e0b" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{
                padding: "16px", borderRadius: 14,
                background: "rgba(255,255,255,0.03)", border: `1px solid ${stat.color}20`,
                textAlign: "center",
              }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ padding: "16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,224,200,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Revenue by Hour</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140 }}>
              {cc.hourlyRevenue.map((h, i) => (
                <motion.div key={h.hour}
                  initial={{ height: 0 }} animate={{ height: `${(h.amount / maxHourly) * 100}%` }}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                  style={{
                    flex: 1, borderRadius: "4px 4px 0 0", minHeight: 4,
                    background: `linear-gradient(180deg, #d4af37, #d4af3740)`,
                    position: "relative",
                  }}
                  title={`${h.hour}: $${h.amount}`}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              {cc.hourlyRevenue.map(h => (
                <div key={h.hour} style={{ flex: 1, fontSize: 8, color: "rgba(232,224,200,0.25)", textAlign: "center", overflow: "hidden" }}>
                  {h.hour.replace("am", "").replace("pm", "p")}
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: "16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,224,200,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Top Selling Products</div>
            {topProducts.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(232,224,200,0.25)", width: 16 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#e8e0c8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 3 }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(p.sold / 24) * 100}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                      style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #d4af37, #d4af3780)" }} />
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "rgba(232,224,200,0.4)", flexShrink: 0 }}>{p.sold} sold</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ padding: "16px", borderRadius: 14, background: "linear-gradient(145deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))", border: "1px solid rgba(139,92,246,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Brain size={16} color="#8b5cf6" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.1em" }}>AI Revenue Brain</span>
            </div>
            {AI_INSIGHTS.map((insight, i) => {
              const Icon = insight.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                  style={{
                    display: "flex", gap: 10, padding: "10px 12px", marginBottom: 8,
                    borderRadius: 10, background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${priorityColors[insight.priority]}15`,
                  }}>
                  <Icon size={16} color={priorityColors[insight.priority]} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 12, color: "rgba(232,224,200,0.6)", lineHeight: 1.5 }}>{insight.text}</div>
                </motion.div>
              );
            })}
          </div>

          <div style={{ padding: "16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,224,200,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
              Low Stock Alerts
            </div>
            {lowStockProducts.length === 0 ? (
              <div style={{ fontSize: 13, color: "rgba(232,224,200,0.3)", padding: 20, textAlign: "center" }}>All products well stocked</div>
            ) : (
              lowStockProducts.map(p => (
                <div key={p.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px", marginBottom: 8, borderRadius: 10,
                  background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#e8e0c8" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>{p.category}</div>
                  </div>
                  <div style={{
                    padding: "4px 10px", borderRadius: 8,
                    background: p.stock <= 3 ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                    color: p.stock <= 3 ? "#ef4444" : "#f59e0b",
                    fontSize: 12, fontWeight: 700,
                  }}>{p.stock} left</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
