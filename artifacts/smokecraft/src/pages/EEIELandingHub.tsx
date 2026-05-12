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
  Server, Building2, Radio, Package, Brain, Heart,
  Thermometer, Zap, Shield, ChevronLeft, ChevronRight,
  ArrowRight,
} from "lucide-react";
import "@/styles/Sovereign.css";
import "@/styles/eeie-motion.css";

// ── Titan V Engine — Navy Glass + White contrast system ─────────
const C = {
  bg:       "#071828",              // deep navy blue
  surface:  "rgba(14,48,115,0.90)", // medium navy glass — clearly lighter than bg
  cardAlt:  "rgba(16,55,128,0.85)", // slightly lifted navy glass
  blue:     "#1E8FFF",
  blueHi:   "#4DAAFF",
  cyan:     "#00D4FF",
  ice:      "rgba(240,248,255,0.97)",  // near-white
  silver:   "rgba(190,220,255,0.80)",  // light blue-white secondary
  muted:    "rgba(145,190,245,0.60)",  // mid-tone labels
  cardText: "rgba(220,238,255,0.92)",  // bright readable body text
  dim:      "rgba(120,170,225,0.48)",  // dim labels
  border:   "rgba(50,150,255,0.40)",   // vivid electric blue border
  borderHi: "rgba(80,190,255,0.70)",
  green:    "#18C98B",
  red:      "#E94B5A",
  amber:    "#F6A623",
  purple:   "#A78BFA",
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
  previewType: "bars" | "wave" | "grid" | "flow" | "neural" | "scan";
}

const MODULE_TILES: Tile[] = [
  { icon: Users,       label: "STAFF COCKPIT",       desc: "Wait-staff command: active tables, guest taste profiles, AI cigar & drink matching, pairing showcase, script generator, and POS handoff.",          path: "/eeie/staff-cockpit",      accent: C.blue,    status: "ACTIVE",    previewType: "bars"   },
  { icon: Star,        label: "GUEST EXPERIENCE",    desc: "Guest session management, taste profiling, mood intelligence, and personalized experience delivery.",                                                  path: "/eeie/guest-experience",   accent: C.cyan,    status: "ACTIVE",    previewType: "wave"   },
  { icon: Image,       label: "MEDIA LIBRARY",       desc: "Upload, approve, and manage visuals for cigars, spirits, food, desserts, specials, hardware, and bundles.",                                           path: "/eeie/media-library",      accent: "#60A5FA", status: "READY",     previewType: "grid"   },
  { icon: Grid3x3,     label: "PRODUCT WALL",        desc: "Luxury visual selling wall — featured cigars, whiskey, cocktails, food, desserts, bundles, and VIP recommendations.",                                 path: "/eeie/product-wall",       accent: C.blueHi,  status: "LIVE",      previewType: "grid"   },
  { icon: Truck,       label: "DISTRIBUTOR LIBRARY", desc: "Connect distributor catalogs, import CSVs, map cigar and liquor products, and generate restock intelligence.",                                        path: "/eeie/distributors",       accent: "#38BDF8", status: "SYNCING",   previewType: "flow"   },
  { icon: Server,      label: "BACK-OF-HOUSE SYNC",  desc: "Visual system relationships: bar, kitchen, humidor, cigar inventory, manager controls, event bus, and sensor health.",                                path: "/eeie/back-of-house",      accent: C.cyan,    status: "CONNECTED", previewType: "grid"   },
  { icon: Building2,   label: "VENUE INTELLIGENCE",  desc: "Real-time venue analytics: occupancy, revenue, staff performance, ambient intelligence, and learning loop.",                                          path: "/eeie/venue-intelligence", accent: C.blue,    status: "LIVE",      previewType: "bars"   },
  { icon: Radio,       label: "SENSORY ENGINE",      desc: "Venue mood, zone energy, heatmap, temperature, humidity, air quality, occupancy, and service pressure.",                                              path: "/eeie/sensory-engine",     accent: C.purple,  status: "SENSING",   previewType: "wave"   },
  { icon: Package,     label: "COMMERCE HEALTH",     desc: "POS adapters, Toast / Square / Clover / Stripe, order handoffs, revenue lift, bundle conversion, and manual mode.",                                   path: "/eeie/commerce-health",    accent: "#34D399", status: "NOMINAL",   previewType: "flow"   },
  { icon: Brain,       label: "AI ASSISTANT",        desc: "Real-time staff guidance, pairing explanations, inventory warnings, mood interpretation, and next-best actions.",                                     path: "/eeie/ai-assistant",       accent: C.purple,  status: "ONLINE",    previewType: "neural" },
  { icon: Thermometer, label: "MOOD SENSOR",         desc: "Live venue mood, guest mood, zone energy, recommendation sensitivity, and color-state intelligence.",                                                 path: "/eeie/mood-sensor",        accent: C.cyan,    status: "SENSING",   previewType: "wave"   },
  { icon: Activity,    label: "EVENT BUS",           desc: "Live event stream: order events, mood changes, inventory alerts, staff actions, and system signals.",                                                  path: "/eeie/event-bus",          accent: C.amber,   status: "LIVE",      previewType: "flow"   },
  { icon: Shield,      label: "FOUNDER CONTROL",     desc: "Founder-level overrides: feature flags, kill switches, revenue levers, dual theme system, and system governance.",                                    path: "/eeie/founder-control",    accent: C.red,     status: "SECURED",   previewType: "scan"   },
  { icon: Zap,         label: "MASTER OPERATIONS",   desc: "Operational layer: staff management, venue oversight, inventory, reconciliation, analytics, and hardware status.",                                     path: "/eeie/master-operations",  accent: C.blueHi,  status: "ACTIVE",    previewType: "bars"   },
  { icon: Package,     label: "VENDOR PORTAL",       desc: "Brand partner handoff portal: product submissions, media uploads, inventory status, venue assignments, placement purchases, and approval pipeline.",   path: "/vendor/dashboard",        accent: "#087BFF", status: "ACTIVE",    previewType: "flow"   },
  { icon: Heart,       label: "PULSE INTELLIGENCE",  desc: "Real-time telemetry hub: live mood equalizer, hardware telemetry, AI predictive forecast, and revenue funnel. Heartbeat view of the entire venue.",   path: "/novee/pulse",             accent: "#00C4E8", status: "LIVE",      previewType: "wave"   },
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

// ── TitanPreviewZone — animated dark glass preview, no external images ────────
const WAVE_HEIGHTS = [35, 55, 70, 45, 80, 60, 40, 75, 50, 65, 38, 72];

function TitanPreviewZone({ tile }: { tile: Tile }) {
  const { previewType, accent, label } = tile;
  const Icon = tile.icon;
  const slug  = label.replace(/\s+/g, "-").toLowerCase();

  return (
    <div style={{
      height: 112, flexShrink: 0, position: "relative", overflow: "hidden",
      background: `linear-gradient(160deg, ${accent}18 0%, rgba(4,14,38,0.92) 100%)`,
      borderBottom: `1px solid ${accent}35`,
    }}>
      {/* ── BARS pattern ── */}
      {previewType === "bars" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4, padding: "12px 16px 16px" }}>
          {WAVE_HEIGHTS.map((h, i) => (
            <motion.div
              key={i}
              animate={{ height: [`${h}%`, `${Math.max(15, h - 22)}%`, `${h}%`] }}
              transition={{ repeat: Infinity, duration: 1.4 + i * 0.12, ease: "easeInOut", delay: i * 0.08 }}
              style={{ flex: 1, borderRadius: "2px 2px 0 0", background: accent, opacity: 0.65 + (i % 3) * 0.15 }}
            />
          ))}
        </div>
      )}

      {/* ── WAVE pattern ── */}
      {previewType === "wave" && (
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} preserveAspectRatio="none">
          <defs>
            <linearGradient id={`wg-${slug}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={accent} stopOpacity="0" />
              <stop offset="30%" stopColor={accent} stopOpacity="0.7" />
              <stop offset="70%" stopColor={accent} stopOpacity="0.7" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d="M0,56 C40,30 80,80 120,56 C160,32 200,78 240,56 C280,34 320,76 360,56"
            stroke={`url(#wg-${slug})`} strokeWidth="2" fill="none"
            animate={{ d: ["M0,56 C40,30 80,80 120,56 C160,32 200,78 240,56 C280,34 320,76 360,56", "M0,64 C40,44 80,68 120,48 C160,28 200,72 240,50 C280,38 320,62 360,48", "M0,56 C40,30 80,80 120,56 C160,32 200,78 240,56 C280,34 320,76 360,56"] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          />
          <motion.path
            d="M0,72 C50,50 90,88 140,68 C190,48 230,82 280,64 C320,48 340,78 360,66"
            stroke={accent} strokeWidth="1" fill="none" opacity={0.25}
            animate={{ d: ["M0,72 C50,50 90,88 140,68 C190,48 230,82 280,64 C320,48 340,78 360,66", "M0,62 C50,42 90,78 140,58 C190,38 230,72 280,54 C320,38 340,68 360,56", "M0,72 C50,50 90,88 140,68 C190,48 230,82 280,64 C320,48 340,78 360,66"] }}
            transition={{ repeat: Infinity, duration: 3.0, ease: "easeInOut", delay: 0.5 }}
          />
          {/* Glow dot */}
          <motion.circle r="3" fill={accent}
            animate={{ cx: [0, 360], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
            cy={56}
          />
        </svg>
      )}

      {/* ── GRID pattern ── */}
      {previewType === "grid" && (
        <>
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.18 }}>
            <defs>
              <pattern id={`gp-${slug}`} width="22" height="22" patternUnits="userSpaceOnUse">
                <path d="M 22 0 L 0 0 0 22" fill="none" stroke={accent} strokeWidth="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#gp-${slug})`} />
          </svg>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, ${accent}14 0%, transparent 70%)` }} />
          {[...Array(4)].map((_, i) => (
            <motion.div key={i}
              animate={{ opacity: [0.15, 0.55, 0.15] }}
              transition={{ repeat: Infinity, duration: 2.0, delay: i * 0.5 }}
              style={{
                position: "absolute",
                left: `${20 + i * 22}%`, top: `${25 + (i % 2) * 28}%`,
                width: 6, height: 6, borderRadius: 1,
                background: accent,
              }}
            />
          ))}
        </>
      )}

      {/* ── FLOW pattern ── */}
      {previewType === "flow" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, padding: "14px 18px" }}>
          {[70, 48, 85, 32].map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <motion.div
                animate={{ width: [`${w * 0.6}%`, `${w}%`, `${w * 0.6}%`] }}
                transition={{ repeat: Infinity, duration: 1.8 + i * 0.3, ease: "easeInOut", delay: i * 0.2 }}
                style={{ height: 3, borderRadius: 2, background: `${accent}`, opacity: 0.5 + i * 0.1, flexShrink: 0 }}
              />
              <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1.8 + i * 0.3, ease: "easeInOut", delay: i * 0.2 + 0.8 }}
                style={{ width: 4, height: 4, borderRadius: "50%", background: accent, flexShrink: 0 }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── NEURAL pattern ── */}
      {previewType === "neural" && (
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {[[60,30],[160,55],[260,35],[60,85],[160,105],[260,80]].map(([cx, cy], i) => (
            <motion.circle key={i} cx={cx} cy={cy} r="4" fill={accent}
              animate={{ opacity: [0.2, 0.9, 0.2], r: [3, 5, 3] }}
              transition={{ repeat: Infinity, duration: 1.6 + i * 0.2, delay: i * 0.25 }}
            />
          ))}
          {[[60,30,160,55],[160,55,260,35],[60,85,160,105],[160,105,260,80],[60,30,60,85],[160,55,160,105],[260,35,260,80]].map(([x1,y1,x2,y2], i) => (
            <motion.line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={accent} strokeWidth="0.8"
              animate={{ opacity: [0.08, 0.4, 0.08] }}
              transition={{ repeat: Infinity, duration: 2.0, delay: i * 0.15 }}
            />
          ))}
        </svg>
      )}

      {/* ── SCAN pattern (secured/high-risk) ── */}
      {previewType === "scan" && (
        <>
          <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(0deg, transparent, transparent 10px, ${accent}06 11px)` }} />
          <motion.div
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
            style={{
              position: "absolute", left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, transparent, ${accent}80, transparent)`,
              boxShadow: `0 0 12px ${accent}`,
            }}
          />
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, ${accent}10 0%, transparent 70%)` }} />
        </>
      )}

      {/* Icon + label — always rendered on top */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, pointerEvents: "none" }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: "rgba(3,6,14,0.75)", border: `1px solid ${accent}35`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 20px ${accent}22`,
          backdropFilter: "blur(8px)",
        }}>
          <Icon size={18} color={accent} />
        </div>
      </div>

      {/* Pattern type badge — bottom right */}
      <div style={{
        position: "absolute", bottom: 7, right: 10,
        fontSize: 7, color: `${accent}55`, fontFamily: C.mono, letterSpacing: "0.16em",
      }}>
        {previewType.toUpperCase()} SIGNAL
      </div>
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
        background: `linear-gradient(160deg, rgba(255,255,255,0.06) 0%, ${C.surface} 30%)`,
        border: `1.5px solid ${C.border}`,
        borderRadius: 14,
        cursor: "pointer",
        display: "flex", flexDirection: "column",
        boxShadow: `0 4px 32px rgba(0,0,0,0.50), 0 0 0 1px ${tile.accent}18, inset 0 1px 0 rgba(255,255,255,0.08)`,
        backdropFilter: "blur(14px)",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `${tile.accent}45`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
    >
      {/* Top edge shimmer */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg,transparent,${tile.accent}40,transparent)`,
        zIndex: 2,
      }} />

      {/* ── Animated preview zone — no external images ── */}
      <TitanPreviewZone tile={tile} />

      {/* ── Card body ── */}
      <div style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Icon + status row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: `${tile.accent}22`, border: `1px solid ${tile.accent}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 16px ${tile.accent}30`,
          }}>
            <tile.icon size={19} color={tile.accent} />
          </div>
          <div className={`eeie-chip-${tile.status.toLowerCase()}`} style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 20,
            background: `${sc}18`, border: `1px solid ${sc}45`,
          }}>
            <div className="eeie-status-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: sc }} />
            <span style={{ fontSize: 8, color: sc, fontWeight: 700, letterSpacing: "0.16em", fontFamily: "'Orbitron',sans-serif" }}>{tile.status}</span>
          </div>
        </div>

        {/* Label — Orbitron, neon cyan */}
        <div style={{
          fontSize: 13, color: "#00f2ff", fontFamily: "'Orbitron',sans-serif",
          letterSpacing: "0.18em", marginBottom: 6, fontWeight: 700,
          textShadow: "0 0 20px rgba(0,242,255,0.45)",
          lineHeight: 1.3,
        }}>
          {tile.label}
        </div>
        {/* Accent divider */}
        <div style={{ width: 32, height: 1, background: `${tile.accent}65`, marginBottom: 10, borderRadius: 1 }} />

        {/* Description — Inter, readable size */}
        <div style={{
          fontSize: 12, color: C.cardText,
          fontFamily: "'Inter',sans-serif", fontWeight: 300,
          lineHeight: 1.75, letterSpacing: "0.02em",
          marginBottom: 18, flex: 1,
          display: "-webkit-box", WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {tile.desc}
        </div>

        {/* ── CTA button ── */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={e => { e.stopPropagation(); onNavigate(tile.path); }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "13px 0",
            borderRadius: 10,
            background: `${tile.accent}18`,
            border: `1px solid ${tile.accent}42`,
            color: tile.accent,
            fontSize: 10, fontWeight: 700, letterSpacing: "0.18em",
            cursor: "pointer", fontFamily: "'Orbitron',sans-serif",
            transition: "background 0.18s, border-color 0.18s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${tile.accent}30`;
            (e.currentTarget as HTMLButtonElement).style.borderColor = `${tile.accent}70`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${tile.accent}18`;
            (e.currentTarget as HTMLButtonElement).style.borderColor = `${tile.accent}42`;
          }}
        >
          ENTER MODULE <ArrowRight size={13} />
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
        background: "radial-gradient(ellipse,rgba(14,100,255,0.18) 0%,rgba(0,60,180,0.08) 50%,transparent 75%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      {/* Corner accent glow */}
      <div style={{
        position: "fixed", top: -80, right: -80, width: 400, height: 400,
        background: "radial-gradient(circle,rgba(0,150,255,0.10) 0%,transparent 65%)",
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
