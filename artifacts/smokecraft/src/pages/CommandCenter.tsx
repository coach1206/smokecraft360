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
import LiveKpi from "@/components/LiveKpi";

const C = {
  bg:        "#F5F2EB",
  header:    "rgba(245,242,235,0.96)",
  border:    "rgba(0,0,0,0.08)",
  text:      "#1A1410",
  muted:     "rgba(26,20,16,0.45)",
  dim:       "rgba(26,20,16,0.28)",
  gold:      "#9A7820",
  card:      "#FFFFFF",
  cardBorder:"rgba(0,0,0,0.09)",
  back:      "#FFFFFF",
  backBorder:"rgba(0,0,0,0.1)",
};

const TILES = [
  { id: "smokecraft", title: "SmokeCraft", desc: "Launch cigar experience", color: "#e85d26", route: "/smokecraft", dataKey: "smokecraft" as const, image: "/images/cigar.png" },
  { id: "brewcraft", title: "BrewCraft", desc: "Beer experience", color: "#f59e0b", route: "/brewcraft", dataKey: "brewcraft" as const, image: "/images/scenes/social.jpg" },
  { id: "pourcraft", title: "PourCraft", desc: "Spirits experience", color: "#a78bfa", route: "/pourcraft", dataKey: "pourcraft" as const, image: "/images/whiskey.png" },
  { id: "vapecraft", title: "VapeCraft", desc: "Vape experience", color: "#06b6d4", route: "/vapecraft", dataKey: "vapecraft" as const, image: "/images/scenes/bold.jpg" },
  { id: "orders", title: "Orders", desc: "Revenue Terminal", color: "#9A7820", route: "/orders", dataKey: "orders" as const, image: "/images/scenes/reflective.jpg" },
  { id: "inventory", title: "Inventory", desc: "Stock control", color: "#5b8def", route: "/inventory", dataKey: "inventory" as const, image: "/images/cigar2.png" },
  { id: "rewards", title: "Rewards", desc: "Loyalty & rewards", color: "#34d399", route: "/rewards", dataKey: "rewards" as const, image: "/images/scenes/relaxed.jpg" },
  { id: "experiences", title: "Experiences", desc: "Craft engine", color: "#f59e0b", route: "/experiences", dataKey: "experiences" as const, image: "/images/cigar1.png" },
  { id: "presence",     title: "Presence",     desc: "VIP arrival & recognition", color: "#34d399", route: "/presence",     dataKey: "campaigns" as const, image: "/images/scenes/relaxed.jpg" },
  { id: "intelligence", title: "Intelligence", desc: "Automated triggers", color: "#c9a84c", route: "/intelligence", dataKey: "campaigns" as const, image: "/images/scenes/reflective.jpg" },
  { id: "revenue", title: "Revenue Engine", desc: "Growth automation", color: "#ec4899", route: "/revenue", dataKey: "campaigns" as const, image: "/images/scenes/social.jpg" },
  { id: "campaigns", title: "Campaigns", desc: "Promotions", color: "#a855f7", route: "/campaigns", dataKey: "campaigns" as const, image: "/images/lounge-bg.jpg" },
  { id: "analytics", title: "Analytics", desc: "Revenue & insights", color: "#8b5cf6", route: "/analytics", dataKey: "analytics" as const, image: "/images/cigar3.png" },
  { id: "vendors", title: "Vendors", desc: "Suppliers & restock", color: "#06b6d4", route: "/vendors", dataKey: "vendors" as const, image: "/images/cigar4.png" },
  { id: "devices", title: "Devices", desc: "Device control", color: "#f97316", route: "/devices", dataKey: "devices" as const, image: "/images/scenes/bold.jpg" },
  { id: "staff", title: "Staff", desc: "Team management", color: "#a78bfa", route: "/staff", dataKey: "staff" as const, image: "/images/scenes/social.jpg" },
  { id: "settings", title: "Settings", desc: "System & security", color: "#64748b", route: "/settings", dataKey: "settings" as const, image: "/images/scenes/relaxed.jpg" },
  { id: "designer", title: "Designer", desc: "Signature customizer", color: "#9A7820", route: "/designer", dataKey: "designer" as const, image: "/images/cigar.png" },
  { id: "competition", title: "Compete", desc: "Craft tournaments", color: "#9A7820", route: "/competition", dataKey: "competition" as const, image: "/images/scenes/reflective.jpg" },
  { id: "craft-hub",   title: "Craft Hub",    desc: "All 360 experiences",  color: "#06b6d4", route: "/craft-hub",   dataKey: "craft-hub" as const,   image: "/images/smoke/smoke_lounge.png" },
  { id: "governance",      title: "Governance",      desc: "RBAC · Kill Switches",  color: "#ef4444", route: "/governance",      dataKey: "governance" as const,      image: "/images/scenes/reflective.jpg" },
  { id: "central-command", title: "Central Command", desc: "Remote ops · OTA · Fleet",       color: "#60a5fa", route: "/central-command", dataKey: "central-command" as const, image: "/images/scenes/bold.jpg" },
  { id: "environment",          title: "Environment",   desc: "Atmosphere · Energy · Reaction",    color: "#a78bfa", route: "/environment",            dataKey: "environment" as const,          image: "/images/scenes/reflective.jpg" },
  { id: "enterprise-intel",    title: "Intel",         desc: "Enterprise Intelligence · Analytics", color: "#34d399", route: "/enterprise-intelligence", dataKey: "enterprise-intel" as const,     image: "/images/scenes/bold.jpg" },
  { id: "master-ops",          title: "Master Ops",    desc: "Unified operational command center",  color: "#c9a84c", route: "/operations",              dataKey: "master-ops" as const,           image: "/images/scenes/reflective.jpg" },
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
      case "designer": return "Band · Box · Preview";
      case "competition": return "Live now";
      case "craft-hub":  return "4 modules · 18 scenes";
      case "governance":      return "RBAC · Audit · Switches";
      case "central-command": return "OTA · Fleet · Remote";
      case "environment":       return "Atmosphere · Energy · VIP";
      case "enterprise-intel": return "9 intelligence layers";
      default: return "";
    }
  }

  const { getBackground } = useVenueContext();
  const engagement = useEngagementContext();
  const statusColor = cc.systemStatus === "operational" ? "#22c55e" : cc.systemStatus === "degraded" ? "#f59e0b" : "#ef4444";

  return (
    <BackgroundLayer image={getBackground("dashboard")} style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", borderBottom: `1px solid ${C.border}`,
        background: C.header, backdropFilter: "blur(12px)", flexShrink: 0,
        boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: C.back, border: `1px solid ${C.backBorder}`, color: C.muted, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.gold }}>Command Hub</div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {pos.currentUser ? `${pos.currentUser.name} · ${pos.currentUser.role}` : "Axiom OS"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.gold }}>
              <LiveKpi value={todayRevenue} prefix="$" live liveColor={C.gold} duration={1200} style={{ fontSize: 18, fontWeight: 700, color: C.gold }} />
            </div>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em" }}>Revenue</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
              <LiveKpi value={cc.activeGuests} live liveColor="#22c55e" duration={900} style={{ fontSize: 18, fontWeight: 700, color: C.text }} />
            </div>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em" }}>Guests</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
              <LiveKpi value={pos.orders.length} live liveColor="#5b8def" duration={800} style={{ fontSize: 18, fontWeight: 700, color: C.text }} />
            </div>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em" }}>Orders</div>
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
              cursor: "pointer", minHeight: 44,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor }} />
            <span style={{ fontSize: 11, color: statusColor, textTransform: "capitalize", fontWeight: 600 }}>{cc.systemStatus}</span>
          </motion.button>
        </div>
      </div>

      {/* ── Tile grid ── */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px 20px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 12, alignContent: "start",
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
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
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
                background: `linear-gradient(135deg, rgba(8,6,4,0.62) 0%, rgba(8,6,4,0.38) 50%, ${tile.color}22 100%)`,
                pointerEvents: "none",
              }} />
              {(tile.id === "smokecraft" || tile.id === "brewcraft" || tile.id === "pourcraft" || tile.id === "vapecraft") && (
                <div style={{
                  position: "absolute", top: 10, right: 12,
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: tile.color,
                  background: "rgba(8,6,4,0.72)",
                  border: `1px solid ${tile.color}55`,
                  padding: "2px 8px", borderRadius: 999,
                }}>🔥 Trending</div>
              )}
              <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#F5E7C8", marginBottom: 2, textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>{tile.title}</div>
                <div style={{ fontSize: 11, color: "rgba(210,190,155,0.75)", marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.85)" }}>{tile.desc}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: tile.color, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{data}</div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: "10px 20px", borderTop: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 10, color: C.dim, textTransform: "uppercase",
        letterSpacing: "0.15em", flexShrink: 0, background: C.header,
      }}>
        <span><Activity size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />Experience Commerce OS · Command Hub</span>
        <span>Powered by Axiom OS</span>
      </div>

      <SystemStatusPanel open={statusOpen} onClose={() => setStatusOpen(false)} />
    </BackgroundLayer>
  );
}
