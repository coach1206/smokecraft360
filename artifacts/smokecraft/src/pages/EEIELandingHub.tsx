/**
 * EEIELandingHub — /eeie-command
 * Sovereign Command Center visual language + Apple/Tesla metallic-blue upgrade.
 * Structure: top command rail → hero section label → featured card → module grid → status rail.
 * No tabs. No sidebar. Pure command-center navigation hub.
 */

import { useLocation }       from "wouter";
import { motion }            from "framer-motion";
import {
  Activity, Users, Star, Image, Grid3x3, Truck,
  Server, Building2, Radio, Package, Brain,
  Thermometer, Zap, Shield, ChevronLeft, ChevronRight,
  ArrowRight,
} from "lucide-react";
import "@/styles/Sovereign.css";
import "@/styles/eeie-motion.css";

// ── Approved EEIE color system: navy shell + white glass cards ─
const C = {
  bg:       "#061426",
  surface:  "#FFFFFF",
  cardAlt:  "#EEF7FF",
  blue:     "#087BFF",
  blueHi:   "#17A8FF",
  cyan:     "#41D9FF",
  ice:      "#D8EEFF",
  silver:   "#7BA8CC",
  muted:    "rgba(180,210,250,0.55)",
  cardText: "rgba(11,30,52,0.62)",
  dim:      "rgba(140,175,220,0.30)",
  border:   "rgba(34,126,255,0.20)",
  borderHi: "rgba(0,136,255,0.55)",
  green:    "#18C98B",
  red:      "#E94B5A",
  amber:    "#F6A623",
  purple:   "#8B5CF6",
  mono:     "'JetBrains Mono','Courier New',monospace",
  serif:    "'Cormorant Garamond',serif",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: C.green, LIVE: C.green, ONLINE: C.green, READY: C.blue,
  SYNCING: C.amber, CONNECTED: C.green, NOMINAL: C.green,
  SENSING: C.cyan, SECURED: C.red, CALIBRATING: C.purple,
};

// ── Tile data model ──────────────────────────────────────────
interface Tile {
  icon: React.ElementType;
  label: string;
  desc: string;
  path: string;
  accent: string;
  status: string;
  images: string[];
  previewType: "grid" | "single" | "strip";
}

// Verified Unsplash IDs — all confirmed 200 OK
const U = (id: string, w = 400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;

const MODULE_TILES: Tile[] = [
  {
    icon: Users, label: "STAFF COCKPIT",
    desc: "Wait-staff command: active tables, guest taste profiles, AI cigar & drink matching, pairing showcase, script generator, and POS handoff.",
    path: "/eeie/staff-cockpit", accent: C.blue, status: "ACTIVE",
    images: [U("1603575448878-868a20723f5d"), U("1585494156145-1c60a4fe952b"), U("1604079628040-94301bb21b91")],
    previewType: "grid",
  },
  {
    icon: Star, label: "GUEST EXPERIENCE",
    desc: "Guest session management, taste profiling, mood intelligence, and personalized experience delivery.",
    path: "/eeie/guest-experience", accent: C.cyan, status: "ACTIVE",
    images: [U("1582562124811-c09040d0a901", 600)],
    previewType: "single",
  },
  {
    icon: Image, label: "MEDIA LIBRARY",
    desc: "Upload, approve, and manage visuals for cigars, spirits, food, desserts, specials, hardware, and bundles.",
    path: "/eeie/media-library", accent: "#60A5FA", status: "READY",
    images: [U("1527281400683-1aae777175f8"), U("1488459716781-31db52582fe9"), U("1565608087341-404b25492fee")],
    previewType: "grid",
  },
  {
    icon: Grid3x3, label: "PRODUCT WALL",
    desc: "Luxury visual selling wall — featured cigars, whiskey, cocktails, food, desserts, bundles, and VIP recommendations.",
    path: "/eeie/product-wall", accent: C.blueHi, status: "LIVE",
    images: [U("1604079628040-94301bb21b91"), U("1569529465841-dfecdab7503b"), U("1488459716781-31db52582fe9")],
    previewType: "grid",
  },
  {
    icon: Truck, label: "DISTRIBUTOR LIBRARY",
    desc: "Connect distributor catalogs, import CSVs, map cigar and liquor products, and generate restock intelligence.",
    path: "/eeie/distributors", accent: "#38BDF8", status: "SYNCING",
    images: [U("1572116469696-31de0f17cc34", 600)],
    previewType: "single",
  },
  {
    icon: Server, label: "BACK-OF-HOUSE SYNC",
    desc: "Visual system relationships: bar, kitchen, humidor, cigar inventory, manager controls, event bus, and sensor health.",
    path: "/eeie/back-of-house", accent: C.cyan, status: "CONNECTED",
    images: [U("1514362545857-3bc16c4c7d1b", 600)],
    previewType: "single",
  },
  {
    icon: Building2, label: "VENUE INTELLIGENCE",
    desc: "Real-time venue analytics: occupancy, revenue, staff performance, ambient intelligence, and learning loop.",
    path: "/eeie/venue-intelligence", accent: C.blue, status: "LIVE",
    images: [U("1565608087341-404b25492fee"), U("1529543544282-ea669407fca3"), U("1501594907352-04cda38ebc29")],
    previewType: "grid",
  },
  {
    icon: Radio, label: "SENSORY ENGINE",
    desc: "Venue mood, zone energy, heatmap, temperature, humidity, air quality, occupancy, and service pressure.",
    path: "/eeie/sensory-engine", accent: C.purple, status: "SENSING",
    images: [U("1529543544282-ea669407fca3", 600)],
    previewType: "single",
  },
  {
    icon: Package, label: "COMMERCE HEALTH",
    desc: "POS adapters, Toast / Square / Clover / Stripe, order handoffs, revenue lift, bundle conversion, and manual mode.",
    path: "/eeie/commerce-health", accent: "#34D399", status: "NOMINAL",
    images: [U("1488459716781-31db52582fe9", 600)],
    previewType: "single",
  },
  {
    icon: Brain, label: "AI ASSISTANT",
    desc: "Real-time staff guidance, pairing explanations, inventory warnings, mood interpretation, and next-best actions.",
    path: "/eeie/ai-assistant", accent: C.purple, status: "ONLINE",
    images: [U("1501594907352-04cda38ebc29", 600)],
    previewType: "single",
  },
  {
    icon: Thermometer, label: "MOOD SENSOR",
    desc: "Live venue mood, guest mood, zone energy, recommendation sensitivity, and color-state intelligence.",
    path: "/eeie/mood-sensor", accent: C.cyan, status: "SENSING",
    images: [U("1582562124811-c09040d0a901", 600)],
    previewType: "single",
  },
  {
    icon: Activity, label: "EVENT BUS",
    desc: "Live event stream: order events, mood changes, inventory alerts, staff actions, and system signals.",
    path: "/eeie/event-bus", accent: C.amber, status: "LIVE",
    images: [U("1569529465841-dfecdab7503b", 600)],
    previewType: "single",
  },
  {
    icon: Shield, label: "FOUNDER CONTROL",
    desc: "Founder-level overrides: feature flags, kill switches, revenue levers, dual theme system, and system governance.",
    path: "/eeie/founder-control", accent: C.red, status: "SECURED",
    images: [U("1603575448878-868a20723f5d", 600)],
    previewType: "single",
  },
  {
    icon: Zap, label: "MASTER OPERATIONS",
    desc: "Operational layer: staff management, venue oversight, inventory, reconciliation, analytics, and hardware status.",
    path: "/eeie/master-operations", accent: C.blueHi, status: "ACTIVE",
    images: [U("1565608087341-404b25492fee"), U("1527281400683-1aae777175f8"), U("1603575448878-868a20723f5d")],
    previewType: "grid",
  },
];

const STATUS_RAIL = [
  { label: "SESSION",    value: "ACTIVE",     color: C.green  },
  { label: "TOKEN",      value: "VALID",       color: C.green  },
  { label: "NODES",      value: "ALL ONLINE",  color: C.green  },
  { label: "INTEGRITY",  value: "100%",        color: C.blue   },
  { label: "EVENT BUS",  value: "LIVE",        color: C.green  },
  { label: "DIST SYNC",  value: "SYNCING",     color: C.amber  },
  { label: "MEDIA LIB",  value: "READY",       color: C.blue   },
  { label: "BOH",        value: "CONNECTED",   color: C.green  },
  { label: "KIOSK LOCK", value: "ABSOLUTE",    color: C.red    },
];

// ── Fallback image tile ───────────────────────────────────────
function FallbackImageTile({ tile }: { tile: Tile }) {
  const Icon = tile.icon;
  return (
    <div className="eeie-image-shimmer" style={{
      height: 118,
      background: `linear-gradient(135deg,${tile.accent}10 0%,${tile.accent}04 100%)`,
      borderBottom: `1px solid ${tile.accent}18`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
      flexShrink: 0,
    }}>
      {/* Grid pattern overlay */}
      <svg
        width="100%" height="100%"
        style={{ position: "absolute", inset: 0, opacity: 0.10 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id={`grid-${tile.label}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={tile.accent} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${tile.label})`} />
      </svg>
      {/* Corner radial glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at center,${tile.accent}18 0%,transparent 70%)`,
        pointerEvents: "none",
      }} />
      {/* Icon silhouette */}
      <div style={{
        width: 54, height: 54, borderRadius: 16,
        background: `${tile.accent}16`, border: `1px solid ${tile.accent}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 28px ${tile.accent}20`,
        position: "relative",
      }}>
        <Icon size={24} color={tile.accent} />
      </div>
      {/* previewType label */}
      <div style={{
        position: "absolute", bottom: 8, right: 10,
        fontSize: 7, color: `${tile.accent}60`,
        fontFamily: C.mono, letterSpacing: "0.16em",
      }}>
        {tile.previewType.toUpperCase()} VIEW
      </div>
    </div>
  );
}

// ── Image strip (when images exist) ──────────────────────────
function ImageStrip({ images, accent, previewType }: { images: string[]; accent: string; previewType: Tile["previewType"] }) {
  if (previewType === "grid") {
    return (
      <div className="eeie-image-shimmer" style={{
        height: 118,
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(images.length, 3)},1fr)`,
        gap: 2, borderBottom: `1px solid ${accent}18`, flexShrink: 0,
      }}>
        {images.slice(0, 3).map((src, i) => (
          <img
            key={i} src={src} alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="eeie-image-shimmer" style={{
      height: 118, borderBottom: `1px solid ${accent}18`, flexShrink: 0, overflow: "hidden",
    }}>
      <img
        src={images[0]} alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}

// ── Event logging ─────────────────────────────────────────────
function logEEIEEvent(module: string, route: string) {
  void fetch("/api/eeie/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "module_navigate", module, route }),
  });
}

// ── EEIEModuleCard ────────────────────────────────────────────
function EEIEModuleCard({
  tile, index, onNavigate,
}: { tile: Tile; index: number; onNavigate: (p: string) => void }) {
  const sc = STATUS_COLORS[tile.status] ?? C.silver;
  const hasImages = tile.images.length > 0;

  const cardClass = [
    "eeie-module-card eeie-live-card eeie-hover-lift",
    (tile.status === "ACTIVE" || tile.status === "LIVE" || tile.status === "ONLINE")
      ? "eeie-active-breathe" : "eeie-machine-pulse",
    (tile.status === "SECURED") ? "eeie-warning-pulse" : "",
    (tile.label === "AI ASSISTANT") ? "eeie-ai-breathing" : "",
  ].filter(Boolean).join(" ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.030, duration: 0.36 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => { logEEIEEvent(tile.label, tile.path); onNavigate(tile.path); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); logEEIEEvent(tile.label, tile.path); onNavigate(tile.path); } }}
      role="button"
      tabIndex={0}
      className={cardClass}
      style={{
        background: C.surface,
        border: `1.5px solid ${C.border}`,
        borderRadius: 14,
        cursor: "pointer",
        display: "flex", flexDirection: "column",
        boxShadow: "0 4px 24px rgba(8,35,74,0.10), 0 0 0 1px rgba(34,126,255,0.06)",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `${tile.accent}40`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
    >
      {/* Top metallic edge shimmer */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg,transparent,${tile.accent}35,transparent)`,
        zIndex: 2,
      }} />

      {/* ── Image area ── */}
      {hasImages
        ? <ImageStrip images={tile.images} accent={tile.accent} previewType={tile.previewType} />
        : <FallbackImageTile tile={tile} />
      }

      {/* ── Card body ── */}
      <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Icon + status row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${tile.accent}14`, border: `1px solid ${tile.accent}22`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <tile.icon size={17} color={tile.accent} />
          </div>
          <div className={`eeie-chip-${tile.status.toLowerCase()}`} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "3px 8px", borderRadius: 20,
            background: `${sc}12`, border: `1px solid ${sc}28`,
          }}>
            <div className="eeie-status-pulse" style={{ width: 4, height: 4, borderRadius: "50%", background: sc }} />
            <span style={{ fontSize: 6, color: sc, fontWeight: 700, letterSpacing: "0.18em" }}>{tile.status}</span>
          </div>
        </div>

        {/* Label */}
        <div style={{
          fontSize: 12, color: tile.accent, fontFamily: C.serif,
          letterSpacing: "0.12em", marginBottom: 7, fontWeight: 500,
        }}>
          {tile.label}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 10, color: C.cardText, lineHeight: 1.65, marginBottom: 16, flex: 1,
          display: "-webkit-box", WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {tile.desc}
        </div>

        {/* ── Large CTA button ── */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={e => { e.stopPropagation(); onNavigate(tile.path); }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            width: "100%", padding: "11px 0",
            borderRadius: 9,
            background: `${tile.accent}16`,
            border: `1px solid ${tile.accent}38`,
            color: tile.accent,
            fontSize: 10, fontWeight: 700, letterSpacing: "0.16em",
            cursor: "pointer", fontFamily: C.mono,
            transition: "background 0.18s, border-color 0.18s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${tile.accent}28`;
            (e.currentTarget as HTMLButtonElement).style.borderColor = `${tile.accent}60`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${tile.accent}16`;
            (e.currentTarget as HTMLButtonElement).style.borderColor = `${tile.accent}38`;
          }}
        >
          ENTER MODULE <ArrowRight size={12} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function EEIELandingHub() {
  const [, navigate] = useLocation();

  return (
    <div style={{
      minHeight: "100dvh", background: C.bg, color: C.ice,
      fontFamily: C.mono, display: "flex", flexDirection: "column",
      overflow: "hidden", position: "relative",
    }}>
      {/* Ambient blue glow — living drift animation */}
      <div className="eeie-ambient-glow" style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 1000, height: 260,
        background: "radial-gradient(ellipse,rgba(0,128,255,0.09) 0%,transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      {/* Corner accent glow */}
      <div style={{
        position: "fixed", top: -80, right: -80, width: 400, height: 400,
        background: "radial-gradient(circle,rgba(0,200,255,0.04) 0%,transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      {/* Scan line */}
      <div className="scan-line" />

      {/* ── TOP COMMAND RAIL ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: "14px 28px",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(5,10,20,0.97)",
        flexShrink: 0, position: "relative", zIndex: 10,
      }}>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => navigate("/sovereign-dashboard")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 13px", borderRadius: 8,
            background: `${C.blue}0C`, border: `1px solid ${C.border}`,
            color: C.silver, fontSize: 9, cursor: "pointer",
            letterSpacing: "0.16em", flexShrink: 0, fontFamily: C.mono,
          }}
        >
          <ChevronLeft size={12} /> BACK
        </motion.button>

        {/* Icon badge */}
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${C.blue}18`, border: `1px solid ${C.blue}30`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Activity size={17} color={C.blueHi} />
        </div>

        {/* Brand */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.blueHi, fontFamily: C.serif, letterSpacing: "0.13em" }}>
            EEIE COMMAND CENTER
          </div>
          <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.20em" }}>
            EXPERIENCE ENHANCEMENT INTELLIGENCE ENGINE · NOVEE OS · TITAN V
          </div>
        </div>

        {/* Right cluster */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <div className="pulse pulse-delay-1" style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
          <span style={{ fontSize: 9, color: C.green, fontWeight: 700, letterSpacing: "0.12em" }}>SOVEREIGN ACTIVE</span>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.blueHi }} />
            <span style={{ fontSize: 8, color: C.silver, letterSpacing: "0.12em" }}>EEIE ENGINE OPERATIONAL</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => navigate("/sovereign-dashboard")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 13px", borderRadius: 8,
              background: `${C.blue}0C`, border: `1px solid ${C.border}`,
              color: C.muted, fontSize: 8, fontWeight: 700,
              letterSpacing: "0.12em", cursor: "pointer", fontFamily: C.mono,
            }}
          >
            SOVEREIGN HUB
          </motion.button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "36px 32px 24px", position: "relative", zIndex: 1 }}>

        {/* Section label */}
        <div style={{ fontSize: 8, color: `${C.blue}70`, letterSpacing: "0.28em", marginBottom: 26, textTransform: "uppercase" }}>
          EEIE INTELLIGENCE MODULES · SELECT DESTINATION
        </div>

        {/* ── FEATURED CARD ── */}
        <motion.div
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.986 }}
          onClick={() => navigate("/eeie/command-center")}
          className="eeie-live-card eeie-soft-glow"
          style={{
            background: "linear-gradient(135deg,rgba(0,128,255,0.16) 0%,rgba(0,80,200,0.08) 100%)",
            border: `1px solid ${C.borderHi}`,
            borderRadius: 18, padding: "30px 28px",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 26,
            marginBottom: 20, position: "relative", overflow: "hidden", maxWidth: 960,
          }}
        >
          {/* Corner radial */}
          <div style={{
            position: "absolute", top: 0, right: 0, width: 220, height: 220,
            background: "radial-gradient(circle,rgba(0,170,255,0.14),transparent)",
            borderRadius: "0 18px 0 100%", pointerEvents: "none",
          }} />
          {/* Animated top edge hero shimmer */}
          <div className="eeie-hero-shimmer" />

          {/* Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: 17,
            background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            boxShadow: `0 0 30px ${C.blue}50`,
          }}>
            <Activity size={28} color="#fff" />
          </div>

          {/* Text */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 22, color: C.blueHi, fontFamily: C.serif, letterSpacing: "0.14em", fontWeight: 300 }}>
                EEIE INTELLIGENCE HUB
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 9px", borderRadius: 20,
                background: `${C.green}14`, border: `1px solid ${C.green}30`,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green }} />
                <span style={{ fontSize: 7, color: C.green, fontWeight: 700, letterSpacing: "0.18em" }}>LIVE</span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
              Full intelligence dashboard: venue health, sensory layers, commerce health, AI predictions, event bus,
              staff cockpit, guest experience, media library, distributor sync, and back-of-house operations.
            </div>
          </div>

          <ChevronRight size={24} color={C.blueHi} style={{ flexShrink: 0 }} />
        </motion.div>

        {/* ── MODULE GRID ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 16, maxWidth: 960 }}>
          {MODULE_TILES.map((tile, i) => (
            <EEIEModuleCard key={tile.label} tile={tile} index={i} onNavigate={navigate} />
          ))}
        </div>

        {/* Session footer strip */}
        <div style={{
          marginTop: 36, padding: "14px 20px", borderRadius: 10,
          background: `${C.blue}06`, border: `1px solid ${C.border}`,
          maxWidth: 580, display: "flex", alignItems: "center", gap: 12,
        }}>
          <div className="sovereign-breath" style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
          <div style={{ fontSize: 9, color: C.dim, lineHeight: 1.8 }}>
            SESSION ACTIVE · TOKEN VALID · ALL NODES ONLINE · EEIE TITAN V ENGINE OPERATIONAL
          </div>
        </div>
      </div>

      {/* ── BOTTOM STATUS RAIL ── */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        background: "rgba(5,10,20,0.97)",
        padding: "10px 32px",
        display: "flex", alignItems: "center",
        flexShrink: 0, overflowX: "auto", position: "relative", zIndex: 10,
      }}>
        <div className="eeie-rail-progress" />
        {STATUS_RAIL.map((item, i) => (
          <div key={item.label} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "0 16px",
            borderRight: i < STATUS_RAIL.length - 1 ? `1px solid ${C.border}` : "none",
            flexShrink: 0,
          }}>
            <div className={`eeie-tel-dot eeie-tel-dot-${i + 1}`} style={{ width: 5, height: 5, borderRadius: "50%", background: item.color }} />
            <span style={{ fontSize: 7, color: C.dim, letterSpacing: "0.14em" }}>{item.label}</span>
            <span style={{ fontSize: 7, color: item.color, fontWeight: 700, letterSpacing: "0.12em" }}>{item.value}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 7, color: C.dim, letterSpacing: "0.18em", flexShrink: 0, paddingLeft: 16 }}>
          EEIE TITAN V · v3.0.0 · 360 ENTERPRISES SERVICES LLC
        </div>
      </div>
    </div>
  );
}
