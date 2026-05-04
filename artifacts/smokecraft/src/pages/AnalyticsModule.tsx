import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, TrendingUp, Brain, AlertTriangle, Gift, Award, Package, ArrowUpRight, ArrowDownRight, Plus, Minus } from "lucide-react";
import { usePosContext } from "@/contexts/PosContext";
import { useCommandCenter } from "@/contexts/CommandCenterContext";
import { useVenueContext } from "@/contexts/VenueContext";
import ConfirmModal from "@/components/ConfirmModal";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";

const AI_INSIGHTS = [
  { icon: TrendingUp, text: "Push premium cigars tonight — Arturo Fuente trending 40% above average", priority: "high" as const },
  { icon: AlertTriangle, text: "Cohiba Behike 52 running low — only 5 remaining, restock recommended", priority: "critical" as const },
  { icon: Brain, text: "Customers trending toward whiskey pairings — consider a spirit flight promo", priority: "medium" as const },
  { icon: Gift, text: "Reward program driving 22% larger average orders — increase threshold to $75?", priority: "low" as const },
  { icon: Award, text: "Top seller today: Macallan 18 — feature it on the main kiosk display", priority: "medium" as const },
];

const priorityColors = { critical: "#ef4444", high: "#f59e0b", medium: "#5b8def", low: "#34d399" };

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
  const totalOrders = pos.orders.length + 47;
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const rewardsTriggered = pos.orders.filter(o => o.rewardApplied).length + 8;

  const topProducts = [...pos.products]
    .sort((a, b) => (b.stock < a.stock ? -1 : 1))
    .slice(0, 5)
    .map((p, i) => ({ ...p, sold: [24, 18, 15, 12, 9][i] ?? 5 }));

  return (
    <BackgroundLayer image={getBackground("analytics")} style={{ height: "100dvh", display: "flex", flexDirection: "column", color: "#e8e0c8", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,8,6,0.8)", backdropFilter: "blur(8px)", flexShrink: 0 }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,224,200,0.5)", cursor: "pointer" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#8b5cf6" }}>Analytics & Insights</div>
          <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>Revenue intelligence & AI brain</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {([["overview", "Overview"], ["stock", "Stock Movements"]] as const).map(([key, label]) => (
            <motion.button key={key} whileTap={{ scale: 0.95 }} onClick={() => setTab(key)}
              style={{
                padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: tab === key ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${tab === key ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)"}`,
                color: tab === key ? "#8b5cf6" : "rgba(232,224,200,0.5)",
              }}>
              {label}
            </motion.button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {tab === "overview" && (
          <>
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
          </>
        )}

        {tab === "stock" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Package size={18} color="#d4af37" />
              <span style={{ fontSize: 15, fontWeight: 700, color: "#e8e0c8" }}>Stock Movements</span>
              <span style={{ fontSize: 12, color: "rgba(232,224,200,0.35)", marginLeft: "auto" }}>
                {pos.inventoryLog.length} entries
              </span>
            </div>

            <div style={{
              padding: 16, borderRadius: 14, marginBottom: 16,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,224,200,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                Manual Stock Adjustment
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)", marginBottom: 4 }}>Product</div>
                  <select
                    value={adjustProduct ?? ""}
                    onChange={e => { setAdjustProduct(e.target.value || null); setAdjustError(null); }}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13,
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "#e8e0c8", outline: "none",
                    }}
                  >
                    <option value="" style={{ background: "#1a1714" }}>Select product...</option>
                    {pos.products.map(p => (
                      <option key={p.id} value={p.id} style={{ background: "#1a1714" }}>
                        {p.name} (stock: {p.stock})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ width: 120 }}>
                  <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)", marginBottom: 4 }}>Quantity</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAdjustDelta(d => d - 1)}
                      style={{
                        width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", cursor: "pointer",
                      }}>
                      <Minus size={14} />
                    </motion.button>
                    <span style={{
                      minWidth: 40, textAlign: "center", fontSize: 16, fontWeight: 700,
                      color: adjustDelta > 0 ? "#34d399" : adjustDelta < 0 ? "#ef4444" : "#e8e0c8",
                    }}>
                      {adjustDelta > 0 ? "+" : ""}{adjustDelta}
                    </span>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAdjustDelta(d => d + 1)}
                      style={{
                        width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399", cursor: "pointer",
                      }}>
                      <Plus size={14} />
                    </motion.button>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)", marginBottom: 4 }}>Reason</div>
                  <input
                    value={adjustReason}
                    onChange={e => setAdjustReason(e.target.value)}
                    placeholder="e.g. restock, damaged, count correction"
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13,
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "#e8e0c8", outline: "none",
                    }}
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
                      setAdjustProduct(null);
                      setAdjustDelta(0);
                      setAdjustReason("");
                      setAdjustError(null);
                    }
                  }}
                  disabled={!adjustProduct || adjustDelta === 0}
                  style={{
                    padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: (!adjustProduct || adjustDelta === 0) ? "rgba(212,175,55,0.1)" : "linear-gradient(135deg, #d4af37, #a98828)",
                    color: (!adjustProduct || adjustDelta === 0) ? "rgba(212,175,55,0.3)" : "#0a0806",
                    border: "none", cursor: (!adjustProduct || adjustDelta === 0) ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Apply
                </motion.button>
              </div>
              <AnimatePresence>
                {adjustError && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    style={{ marginTop: 8, fontSize: 12, color: "#ef4444" }}>
                    {adjustError}
                  </motion.div>
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

            {pos.inventoryLog.length === 0 ? (
              <div style={{
                padding: 40, textAlign: "center", borderRadius: 14,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <Package size={32} color="rgba(232,224,200,0.15)" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 14, color: "rgba(232,224,200,0.3)" }}>No stock movements yet</div>
                <div style={{ fontSize: 12, color: "rgba(232,224,200,0.2)", marginTop: 4 }}>Add items to cart or process orders to see inventory changes</div>
              </div>
            ) : (
              <div style={{
                borderRadius: 14, overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 80px 80px 70px 1fr 120px",
                  gap: 0, padding: "10px 14px",
                  background: "rgba(255,255,255,0.04)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 11, fontWeight: 600, color: "rgba(232,224,200,0.4)",
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
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      style={{
                        display: "grid", gridTemplateColumns: "1fr 80px 80px 70px 1fr 120px",
                        gap: 0, padding: "10px 14px", alignItems: "center",
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                        background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                      }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#e8e0c8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.productName}
                      </div>
                      <div style={{ textAlign: "center", fontSize: 13, color: "rgba(232,224,200,0.5)" }}>
                        {entry.beforeStock}
                      </div>
                      <div style={{ textAlign: "center", fontSize: 13, color: "rgba(232,224,200,0.5)" }}>
                        {entry.afterStock}
                      </div>
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                        fontSize: 13, fontWeight: 700,
                        color: isIncrease ? "#34d399" : "#ef4444",
                      }}>
                        {isIncrease ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {isIncrease ? "+" : ""}{delta}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(232,224,200,0.4)" }}>
                        {REASON_LABELS[entry.reason] ?? entry.reason}
                      </div>
                      <div style={{ textAlign: "right", fontSize: 11, color: "rgba(232,224,200,0.3)" }}>
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
            if (ok) {
              setPendingConfirm(null);
              setAdjustProduct(null);
              setAdjustDelta(0);
              setAdjustReason("");
              setAdjustError(null);
            } else {
              setPendingConfirm(null);
              setAdjustError("Access denied — only Owner or Manager can approve large adjustments");
            }
          }
        }}
        onCancel={() => setPendingConfirm(null)}
      />
    </BackgroundLayer>
  );
}
