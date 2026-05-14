import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Activity, Layers, Lock,
} from "lucide-react";
import { usePosContext } from "@/contexts/PosContext";
import { useCommandCenter, POS_MODE_INFO } from "@/contexts/CommandCenterContext";
import { useEngagementContext } from "@/contexts/EngagementContext";
import SystemStatusPanel from "@/components/SystemStatusPanel";
import LiveKpi from "@/components/LiveKpi";
import { useVenueContext } from "@/contexts/VenueContext";
import { useKernelMode } from "@/contexts/KernelModeContext";
import { playSwitch }      from "@/lib/audioEngine";

// ── Ambient particles ──────────────────────────────────────────────────────────

const CC_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i, x: Math.random() * 100, y: Math.random() * 100,
  r: 0.8 + Math.random() * 1.8, dur: 9 + Math.random() * 14,
  del: Math.random() * 10, op: 0.04 + Math.random() * 0.10,
}));

function CCParticles() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      {CC_PARTICLES.map(p => (
        <motion.div key={p.id}
          style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.r * 2, height: p.r * 2, borderRadius: "50%", background: C.gold, opacity: p.op }}
          animate={{ y: [0, -26, 8, -16, 0], x: [0, 9, -7, 12, 0], opacity: [p.op, p.op * 2.2, p.op * 0.35, p.op * 1.7, p.op] }}
          transition={{ duration: p.dur, delay: p.del, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

const C = {
  bg:        "#F5F2ED",
  header:    "rgba(18,16,14,0.97)",
  border:    "rgba(212,139,0,0.12)",
  text:      "#1A1A1B",
  muted:     "rgba(26,26,27,0.48)",
  dim:       "rgba(26,26,27,0.30)",
  gold:      "#D48B00",
  card:      "rgba(26,26,27,0.06)",
  cardBorder:"rgba(212,139,0,0.14)",
  back:      "#2A2A2A",
  backBorder:"rgba(212,139,0,0.18)",
};

const TILES = [
  { id: "smokecraft", title: "SmokeCraft", desc: "Launch cigar experience", color: "#e85d26", route: "/smokecraft", dataKey: "smokecraft" as const, image: "/images/cigar.png" },
  { id: "brewcraft", title: "BrewCraft", desc: "Beer experience", color: "#f59e0b", route: "/brewcraft", dataKey: "brewcraft" as const, image: "/images/scenes/social.jpg" },
  { id: "pourcraft", title: "PourCraft", desc: "Spirits experience", color: "#a78bfa", route: "/pourcraft", dataKey: "pourcraft" as const, image: "/images/whiskey.png" },
  { id: "vapecraft", title: "VapeCraft", desc: "Vape experience", color: "#a855f7", route: "/vapecraft", dataKey: "vapecraft" as const, image: "/images/vape/vape_modern.png" },
  { id: "orders", title: "Orders", desc: "Revenue Terminal", color: "#9A7820", route: "/orders", dataKey: "orders" as const, image: "/images/scenes/reflective.jpg" },
  { id: "inventory", title: "Inventory", desc: "Stock control", color: "#5b8def", route: "/inventory", dataKey: "inventory" as const, image: "/images/cigar2.png" },
  { id: "rewards", title: "Rewards", desc: "Loyalty & rewards", color: "#34d399", route: "/rewards", dataKey: "rewards" as const, image: "/images/scenes/relaxed.jpg" },
  { id: "experiences", title: "Experiences", desc: "Craft engine", color: "#f59e0b", route: "/experiences", dataKey: "experiences" as const, image: "/images/cigar1.png" },
  { id: "presence",     title: "Presence",     desc: "VIP arrival & recognition", color: "#34d399", route: "/presence",     dataKey: "campaigns" as const, image: "/images/scenes/relaxed.jpg" },
  { id: "intelligence", title: "Intelligence", desc: "Automated triggers", color: "#D48B00", route: "/intelligence", dataKey: "campaigns" as const, image: "/images/scenes/reflective.jpg" },
  { id: "revenue", title: "Revenue Engine", desc: "Growth automation", color: "#ec4899", route: "/revenue", dataKey: "campaigns" as const, image: "/images/scenes/social.jpg" },
  { id: "campaigns", title: "Campaigns", desc: "Promotions", color: "#a855f7", route: "/campaigns", dataKey: "campaigns" as const, image: "/images/lounge-bg.jpg" },
  { id: "analytics", title: "Analytics", desc: "Revenue & insights", color: "#8b5cf6", route: "/analytics", dataKey: "analytics" as const, image: "/images/cigar3.png" },
  { id: "vendors", title: "Vendors", desc: "Suppliers & restock", color: "#06b6d4", route: "/vendors", dataKey: "vendors" as const, image: "/images/cigar4.png" },
  { id: "devices", title: "Devices", desc: "Device control", color: "#f97316", route: "/devices", dataKey: "devices" as const, image: "/images/scenes/bold.jpg" },
  { id: "staff", title: "Staff", desc: "Team management", color: "#a78bfa", route: "/staff", dataKey: "staff" as const, image: "/images/scenes/social.jpg" },
  { id: "settings", title: "Settings", desc: "System & security", color: "#64748b", route: "/settings", dataKey: "settings" as const, image: "/images/scenes/relaxed.jpg" },
  { id: "designer", title: "Designer", desc: "Signature customizer", color: "#9A7820", route: "/designer", dataKey: "designer" as const, image: "/images/cigar.png", sovereignOnly: true },
  { id: "craft-hub",   title: "Craft Hub",    desc: "All 360 experiences",  color: "#06b6d4", route: "/craft-hub",   dataKey: "craft-hub" as const,   image: "/images/smoke/smoke_selection.png" },
  { id: "governance",      title: "Governance",      desc: "RBAC · Kill Switches",  color: "#ef4444", route: "/governance",      dataKey: "governance" as const,      image: "/images/scenes/reflective.jpg" },
  { id: "central-command", title: "Central Command", desc: "Remote ops · OTA · Fleet",       color: "#60a5fa", route: "/central-command", dataKey: "central-command" as const, image: "/images/scenes/bold.jpg" },
  { id: "environment",          title: "Environment",   desc: "Atmosphere · Energy · Reaction",    color: "#a78bfa", route: "/environment",            dataKey: "environment" as const,          image: "/images/scenes/reflective.jpg" },
  { id: "enterprise-intel",    title: "Intel",         desc: "Enterprise Intelligence · Analytics", color: "#34d399", route: "/enterprise-intelligence", dataKey: "enterprise-intel" as const,     image: "/images/scenes/bold.jpg" },
  { id: "master-ops",          title: "Master Ops",    desc: "Unified operational command center",  color: "#D48B00", route: "/operations",              dataKey: "master-ops" as const,           image: "/images/scenes/reflective.jpg" },
] as const;

export default function CommandCenter() {
  const [, navigate] = useLocation();
  const pos = usePosContext();
  const cc = useCommandCenter();
  const { mode } = useKernelMode();
  const [statusOpen, setStatusOpen] = useState(false);
  const [lockedTooltip, setLockedTooltip] = useState<string | null>(null);

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
      case "craft-hub":  return "4 modules · 18 scenes";
      case "governance":      return "RBAC · Audit · Switches";
      case "central-command": return "OTA · Fleet · Remote";
      case "environment":       return "Atmosphere · Energy · VIP";
      case "enterprise-intel": return "9 intelligence layers";
      default: return "";
    }
  }

  useVenueContext();
  const engagement = useEngagementContext();
  const statusColor = cc.systemStatus === "operational" ? "#22c55e" : cc.systemStatus === "degraded" ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#F5F2ED", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,139,0,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <CCParticles />
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", borderBottom: `1px solid rgba(212,139,0,0.14)`,
        background: C.header, backdropFilter: "blur(20px)", flexShrink: 0,
        boxShadow: "inset 0 1px 0 rgba(26,26,27,0.09), inset 0 -1px 0 rgba(26,26,27,0.06), 0 1px 0 rgba(212,139,0,0.12), 0 8px 32px rgba(26,26,27,0.22)",
        position: "relative", zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: C.back, border: `1px solid ${C.backBorder}`, color: "rgba(212,139,0,0.80)", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.gold }}>Command Hub</div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {pos.currentUser ? `${pos.currentUser.name} · ${pos.currentUser.role}` : "NOVEE OS"}
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
        position: "relative", zIndex: 1,
      }}>
        {TILES.map((tile, i) => {
          const data = tileData(tile.dataKey);
          const isLocked = "sovereignOnly" in tile && tile.sovereignOnly && mode === "essential";
          const showTooltip = lockedTooltip === tile.id;
          return (
            <div key={tile.id} style={{ position: "relative" }}>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: "easeOut", delay: Math.min(i * 0.03, 0.3) }}
                whileHover={isLocked ? {} : {
                  scale: 1.025, y: -4,
                  boxShadow: `0 16px 48px rgba(26,26,27,0.32), 0 4px 12px rgba(26,26,27,0.18), 0 0 0 1px ${tile.color}44, inset 0 1px 0 rgba(26,26,27,0.16)`,
                }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (isLocked) {
                    setLockedTooltip(showTooltip ? null : tile.id);
                    return;
                  }
                  playSwitch();
                  engagement.trackAction("navigate", { tile: tile.id });
                  navigate(tile.route);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "20px 18px", width: "100%",
                  background: isLocked ? "rgba(22,16,10,0.07)" : "rgba(22,16,10,0.11)",
                  border: `1px solid ${isLocked ? "rgba(26,26,27,0.12)" : "rgba(26,26,27,0.18)"}`,
                  borderRadius: 18, cursor: isLocked ? "default" : "pointer",
                  position: "relative", overflow: "hidden",
                  minHeight: 90, textAlign: "left",
                  opacity: isLocked ? 0.55 : 1,
                  boxShadow: "0 4px 20px rgba(26,26,27,0.22), 0 1px 4px rgba(26,26,27,0.08), inset 0 1px 0 rgba(26,26,27,0.11), inset 0 -1px 0 rgba(26,26,27,0.04)",
                }}
              >
                <div style={{
                  position: "absolute", inset: 0,
                  backgroundImage: `url(${tile.image})`,
                  backgroundSize: "cover", backgroundPosition: "center",
                  pointerEvents: "none",
                  filter: isLocked ? "grayscale(60%)" : "none",
                }} />
                <div style={{
                  position: "absolute", inset: 0,
                  background: isLocked
                    ? "linear-gradient(160deg, rgba(18,14,8,0.82) 0%, rgba(18,14,8,0.65) 100%)"
                    : `linear-gradient(160deg, rgba(18,14,8,0.70) 0%, rgba(18,14,8,0.40) 60%, ${tile.color}55 100%)`,
                  pointerEvents: "none",
                }} />
                {(tile.id === "smokecraft" || tile.id === "brewcraft" || tile.id === "pourcraft" || tile.id === "vapecraft") && (
                  <div style={{
                    position: "absolute", top: 10, right: 12,
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: tile.color,
                    background: "rgba(18,14,8,0.84)",
                    border: `1px solid ${tile.color}55`,
                    padding: "2px 8px", borderRadius: 999,
                  }}>🔥 Trending</div>
                )}
                {isLocked && (
                  <div style={{
                    position: "absolute", top: 10, right: 12,
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#D48B00",
                    background: "rgba(18,14,8,0.90)",
                    border: "1px solid rgba(212,139,0,0.45)",
                    padding: "3px 8px", borderRadius: 999,
                    backdropFilter: "blur(8px)",
                  }}>
                    <Lock size={9} strokeWidth={2.5} color="#D48B00" />
                    Sovereign Required
                  </div>
                )}
                <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: isLocked ? "rgba(245,235,220,0.55)" : "rgba(245,235,220,0.96)", marginBottom: 3, textShadow: "0 1px 6px rgba(0,0,0,0.75)" }}>{tile.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(245,235,220,0.60)", marginBottom: 5, textShadow: "0 1px 4px rgba(0,0,0,0.70)" }}>{tile.desc}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isLocked ? "rgba(212,139,0,0.45)" : tile.color, textShadow: "0 1px 4px rgba(26,26,27,0.40)" }}>{data}</div>
                </div>
              </motion.button>

              <AnimatePresence>
                {showTooltip && (
                  <motion.div
                    key="tooltip"
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
                      transform: "translateX(-50%)",
                      background: "rgba(18,14,8,0.96)",
                      border: "1px solid rgba(212,139,0,0.40)",
                      borderRadius: 10, padding: "8px 14px",
                      fontSize: 12, fontWeight: 600,
                      color: "#D48B00", whiteSpace: "nowrap",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.40)",
                      backdropFilter: "blur(12px)",
                      pointerEvents: "none", zIndex: 20,
                    }}
                  >
                    Upgrade to Sovereign to unlock Designer
                    <div style={{
                      position: "absolute", top: "100%", left: "50%",
                      transform: "translateX(-50%)",
                      width: 0, height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderTop: "6px solid rgba(212,139,0,0.40)",
                    }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: "10px 20px", borderTop: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 11, color: C.dim, textTransform: "uppercase",
        letterSpacing: "0.15em", flexShrink: 0, background: C.header,
        position: "relative", zIndex: 10,
      }}>
        <span><Activity size={11} style={{ marginRight: 5, verticalAlign: "middle" }} />Experience Commerce OS · Command Hub</span>
        <span>Powered by NOVEE OS</span>
      </div>

      <SystemStatusPanel open={statusOpen} onClose={() => setStatusOpen(false)} />
    </div>
  );
}
