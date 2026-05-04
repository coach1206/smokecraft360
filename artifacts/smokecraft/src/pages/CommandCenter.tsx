import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, ShoppingCart, Package, Gift, Sparkles, BarChart3,
  Truck, Monitor, Users, Settings, Megaphone, Activity, Layers,
} from "lucide-react";
import { usePosContext } from "@/contexts/PosContext";
import { useCommandCenter, POS_MODE_INFO } from "@/contexts/CommandCenterContext";

const TILES = [
  { id: "orders", title: "Orders", desc: "Live POS terminal", icon: ShoppingCart, color: "#d4af37", route: "/pos", dataKey: "orders" as const },
  { id: "inventory", title: "Inventory", desc: "Stock control", icon: Package, color: "#5b8def", route: "/pos", dataKey: "inventory" as const },
  { id: "rewards", title: "Rewards", desc: "Loyalty & rewards", icon: Gift, color: "#34d399", route: "/pos", dataKey: "rewards" as const },
  { id: "experiences", title: "Experiences", desc: "Craft engine", icon: Sparkles, color: "#f59e0b", route: "/experiences", dataKey: "experiences" as const },
  { id: "campaigns", title: "Campaigns", desc: "Promotions", icon: Megaphone, color: "#ec4899", route: "/analytics", dataKey: "campaigns" as const },
  { id: "analytics", title: "Analytics", desc: "Revenue & insights", icon: BarChart3, color: "#8b5cf6", route: "/analytics", dataKey: "analytics" as const },
  { id: "vendors", title: "Vendors", desc: "Suppliers & restock", icon: Truck, color: "#06b6d4", route: "/vendors", dataKey: "vendors" as const },
  { id: "devices", title: "Devices", desc: "Device control", icon: Monitor, color: "#f97316", route: "/devices", dataKey: "devices" as const },
  { id: "staff", title: "Staff", desc: "Team management", icon: Users, color: "#a78bfa", route: "/staff", dataKey: "staff" as const },
  { id: "settings", title: "Settings", desc: "System & security", icon: Settings, color: "#64748b", route: "/settings", dataKey: "settings" as const },
] as const;

export default function CommandCenter() {
  const [, navigate] = useLocation();
  const pos = usePosContext();
  const cc = useCommandCenter();

  const todayRevenue = cc.hourlyRevenue.reduce((s, h) => s + h.amount, 0) + pos.orders.reduce((s, o) => s + o.total, 0);
  const onlineDevices = cc.devices.filter(d => d.status === "online").length;
  const lowStock = pos.products.filter(p => p.stock <= 5).length;

  function tileData(key: typeof TILES[number]["dataKey"]): string {
    switch (key) {
      case "orders": return `${pos.orders.length} today`;
      case "inventory": return lowStock > 0 ? `${lowStock} low stock` : "All stocked";
      case "rewards": return `${pos.orders.filter(o => o.rewardApplied).length} triggered`;
      case "experiences": return "4 active";
      case "campaigns": return "2 running";
      case "analytics": return `$${todayRevenue.toLocaleString()}`;
      case "vendors": return `${cc.vendors.length} vendors`;
      case "devices": return `${onlineDevices}/${cc.devices.length} online`;
      case "staff": return `${cc.staff.filter(s => s.status === "active").length} active`;
      case "settings": return cc.systemStatus;
      default: return "";
    }
  }

  const statusColor = cc.systemStatus === "operational" ? "#34d399" : cc.systemStatus === "degraded" ? "#f59e0b" : "#ef4444";

  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "column",
      background: "linear-gradient(180deg, #1a1714 0%, #0f0d0a 100%)",
      color: "#e8e0c8", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(10,8,6,0.8)", backdropFilter: "blur(8px)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,224,200,0.5)", cursor: "pointer" }}>
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#d4af37" }}>Command Center</div>
            <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>
              {pos.currentUser ? `${pos.currentUser.name} · ${pos.currentUser.role}` : "Craft Central"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#d4af37" }}>${todayRevenue.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: "rgba(232,224,200,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Revenue</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e0c8" }}>{cc.activeGuests}</div>
            <div style={{ fontSize: 10, color: "rgba(232,224,200,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Guests</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e0c8" }}>{pos.orders.length}</div>
            <div style={{ fontSize: 10, color: "rgba(232,224,200,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Orders</div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 16,
            background: `${POS_MODE_INFO[cc.posMode].color}12`,
            border: `1px solid ${POS_MODE_INFO[cc.posMode].color}30`,
          }}>
            <Layers size={11} color={POS_MODE_INFO[cc.posMode].color} />
            <span style={{ fontSize: 10, fontWeight: 600, color: POS_MODE_INFO[cc.posMode].color }}>{POS_MODE_INFO[cc.posMode].label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
            <span style={{ fontSize: 11, color: statusColor, textTransform: "capitalize" }}>{cc.systemStatus}</span>
          </div>
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: "auto", padding: "16px 20px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 14, alignContent: "start",
      }}>
        {TILES.map((tile, i) => {
          const Icon = tile.icon;
          const data = tileData(tile.dataKey);
          return (
            <motion.button
              key={tile.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(tile.route)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "20px 18px",
                background: "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                border: `1px solid ${tile.color}30`,
                borderRadius: 16, cursor: "pointer",
                position: "relative", overflow: "hidden",
                minHeight: 90, textAlign: "left",
              }}
            >
              <div style={{
                position: "absolute", inset: 0,
                background: `radial-gradient(circle at 20% 50%, ${tile.color}15, transparent 60%)`,
                pointerEvents: "none",
              }} />
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: `${tile.color}12`, border: `1px solid ${tile.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}>
                <Icon size={24} color={tile.color} strokeWidth={1.5} />
              </div>
              <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#e8e0c8", marginBottom: 2 }}>{tile.title}</div>
                <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)", marginBottom: 4 }}>{tile.desc}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: tile.color }}>{data}</div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div style={{
        padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 10, color: "rgba(232,224,200,0.2)", textTransform: "uppercase",
        letterSpacing: "0.15em", flexShrink: 0,
      }}>
        <span><Activity size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />Craft Command Center v1.0</span>
        <span>Powered by 360 Enterprise Services</span>
      </div>
    </div>
  );
}
