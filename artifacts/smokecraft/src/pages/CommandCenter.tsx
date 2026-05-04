import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, Activity, Layers,
} from "lucide-react";
import { usePosContext } from "@/contexts/PosContext";
import { useCommandCenter, POS_MODE_INFO } from "@/contexts/CommandCenterContext";
import { useVenueContext } from "@/contexts/VenueContext";
import { useEngagementContext } from "@/contexts/EngagementContext";
import SystemStatusPanel from "@/components/SystemStatusPanel";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";

const TILES = [
  { id: "smokecraft", title: "SmokeCraft", desc: "Launch cigar experience", color: "#e85d26", route: "/smokecraft", dataKey: "smokecraft" as const, image: "/images/cigar.png" },
  { id: "brewcraft", title: "BrewCraft", desc: "Beer experience", color: "#f59e0b", route: "/brewcraft", dataKey: "brewcraft" as const, image: "/images/scenes/social.jpg" },
  { id: "pourcraft", title: "PourCraft", desc: "Spirits experience", color: "#a78bfa", route: "/pourcraft", dataKey: "pourcraft" as const, image: "/images/whiskey.png" },
  { id: "vapecraft", title: "VapeCraft", desc: "Vape experience", color: "#06b6d4", route: "/vapecraft", dataKey: "vapecraft" as const, image: "/images/scenes/bold.jpg" },
  { id: "orders", title: "Orders", desc: "Live POS terminal", color: "#d4af37", route: "/pos", dataKey: "orders" as const, image: "/images/scenes/reflective.jpg" },
  { id: "inventory", title: "Inventory", desc: "Stock control", color: "#5b8def", route: "/pos", dataKey: "inventory" as const, image: "/images/cigar2.png" },
  { id: "rewards", title: "Rewards", desc: "Loyalty & rewards", color: "#34d399", route: "/pos", dataKey: "rewards" as const, image: "/images/scenes/relaxed.jpg" },
  { id: "experiences", title: "Experiences", desc: "Craft engine", color: "#f59e0b", route: "/experiences", dataKey: "experiences" as const, image: "/images/cigar1.png" },
  { id: "campaigns", title: "Campaigns", desc: "Promotions", color: "#ec4899", route: "/analytics", dataKey: "campaigns" as const, image: "/images/lounge-bg.jpg" },
  { id: "analytics", title: "Analytics", desc: "Revenue & insights", color: "#8b5cf6", route: "/analytics", dataKey: "analytics" as const, image: "/images/cigar3.png" },
  { id: "vendors", title: "Vendors", desc: "Suppliers & restock", color: "#06b6d4", route: "/vendors", dataKey: "vendors" as const, image: "/images/cigar4.png" },
  { id: "devices", title: "Devices", desc: "Device control", color: "#f97316", route: "/devices", dataKey: "devices" as const, image: "/images/scenes/bold.jpg" },
  { id: "staff", title: "Staff", desc: "Team management", color: "#a78bfa", route: "/staff", dataKey: "staff" as const, image: "/images/scenes/social.jpg" },
  { id: "settings", title: "Settings", desc: "System & security", color: "#64748b", route: "/settings", dataKey: "settings" as const, image: "/images/scenes/relaxed.jpg" },
] as const;

export default function CommandCenter() {
  const [, navigate] = useLocation();
  const pos = usePosContext();
  const cc = useCommandCenter();
  const [statusOpen, setStatusOpen] = useState(false);

  const todayRevenue = cc.hourlyRevenue.reduce((s, h) => s + h.amount, 0) + pos.orders.reduce((s, o) => s + o.total, 0);
  const onlineDevices = cc.devices.filter(d => d.status === "online").length;
  const lowStock = pos.products.filter(p => p.stock <= 5).length;

  function tileData(key: typeof TILES[number]["dataKey"]): string {
    switch (key) {
      case "smokecraft": return "Cigar wizard";
      case "brewcraft": return "Beer pairing";
      case "pourcraft": return "Spirit pairing";
      case "vapecraft": return "Vape flow";
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

  const { getBackground } = useVenueContext();
  const engagement = useEngagementContext();
  const statusColor = cc.systemStatus === "operational" ? "#34d399" : cc.systemStatus === "degraded" ? "#f59e0b" : "#ef4444";

  return (
    <BackgroundLayer image={getBackground("dashboard")} style={{ height: "100dvh", display: "flex", flexDirection: "column", color: "#e8e0c8", overflow: "hidden" }}>
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
            <div style={{ fontSize: 18, fontWeight: 700, color: "#d4af37" }}>Command Hub</div>
            <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>
              {pos.currentUser ? `${pos.currentUser.name} · ${pos.currentUser.role}` : "Axiom OS"}
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
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setStatusOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 16,
              background: `${statusColor}12`,
              border: `1px solid ${statusColor}30`,
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
            <span style={{ fontSize: 11, color: statusColor, textTransform: "capitalize", fontWeight: 600 }}>{cc.systemStatus}</span>
          </motion.button>
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: "auto", padding: "16px 20px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 14, alignContent: "start",
      }}>
        {TILES.map((tile, i) => {
          const data = tileData(tile.dataKey);
          return (
            <motion.button
              key={tile.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { engagement.trackAction("navigate", { tile: tile.id }); navigate(tile.route); }}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "20px 18px",
                background: "transparent",
                border: `1px solid ${tile.color}30`,
                borderRadius: 16, cursor: "pointer",
                position: "relative", overflow: "hidden",
                minHeight: 90, textAlign: "left",
              }}
            >
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: `url(${tile.image})`,
                backgroundSize: "cover", backgroundPosition: "center",
                pointerEvents: "none",
              }} />
              <div style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(135deg, rgba(10,8,6,0.45) 0%, rgba(10,8,6,0.6) 50%, ${tile.color}25 100%)`,
                pointerEvents: "none",
              }} />
              <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 2, textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{tile.title}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 4, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{tile.desc}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: tile.color, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{data}</div>
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
        <span><Activity size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />Axiom OS · Command Hub v1.0</span>
        <span>Powered by Axiom OS</span>
      </div>

      <SystemStatusPanel open={statusOpen} onClose={() => setStatusOpen(false)} />
    </BackgroundLayer>
  );
}
