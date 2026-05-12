/**
 * EEIELandingHub — /eeie-command
 * Sovereign Command Center visual language + Apple/Tesla metallic-blue upgrade.
 * Structure: top command rail → hero section label → featured card → module grid → status rail.
 * No tabs. No sidebar. Pure command-center navigation hub.
 */

import { useState }          from "react";
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

// ── Sovereign Stealth Theme — Obsidian + Ghost White + Electric Cyan ──
const SovereignTheme = {
  background: "radial-gradient(circle at top, #0f172a 0%, #010409 100%)",
  panel:      "linear-gradient(145deg, rgba(15,23,42,0.92) 0%, rgba(2,6,23,1) 100%)",
  textPrimary:"rgba(240,244,248,0.85)",   // Ghost White
  accent:     "#00d4ff",                  // Electric Cyan
  border:     "rgba(255,255,255,0.05)",   // Ice-Silver ghost stroke
};

const C = {
  bg:       "#010409",                        // Obsidian Black
  surface:  "rgba(15,23,42,0.92)",            // Deep Vault Navy glass
  cardAlt:  "rgba(10,15,29,0.95)",
  blue:     "#1E8FFF",
  blueHi:   "#4DAAFF",
  cyan:     "#00D4FF",
  ice:      "rgba(240,244,248,0.97)",          // Ghost White bright
  silver:   "rgba(240,244,248,0.75)",          // Ghost White secondary
  muted:    "rgba(200,215,235,0.55)",          // Ghost White muted
  cardText: "rgba(240,244,248,0.85)",          // Ghost White body
  dim:      "rgba(180,200,230,0.38)",          // Ghost White dim
  border:   "rgba(255,255,255,0.05)",          // Ice-Silver ghost stroke
  borderHi: "rgba(255,255,255,0.12)",
  green:    "#18C98B",
  red:      "#E94B5A",
  amber:    "#F6A623",
  purple:   "#A78BFA",
  mono:     "'JetBrains Mono','Courier New',monospace",
  serif:    "'Cormorant Garamond',serif",
};
// keep SovereignTheme accessible for explicit overrides
void SovereignTheme;

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

// ── StatusRing — animated SVG gauge ─────────────────────────
function StatusRing({ value, label, color = "#00D4FF", delay = 0 }: { value: number; label: string; color?: string; delay?: number }) {
  const r = 32;
  const circ = 2 * Math.PI * r; // ≈201
  return (
    <div style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="80" height="80" style={{ transform: "rotate(-90deg)", position: "absolute", top: 0, left: 0 }}>
        <circle cx="40" cy="40" r={r} stroke="rgba(255,255,255,0.07)" strokeWidth="5" fill="transparent" />
        <motion.circle
          cx="40" cy="40" r={r} stroke={color} strokeWidth="5" fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (circ * value) / 100 }}
          transition={{ duration: 1.6, ease: "easeOut", delay }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div style={{ position: "absolute", textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", fontFamily: "'Orbitron',sans-serif", lineHeight: 1 }}>{value}%</div>
        <div style={{ fontSize: 7, color: "rgba(200,220,255,0.45)", letterSpacing: "0.10em", marginTop: 3, fontFamily: "'Inter',sans-serif" }}>{label}</div>
      </div>
    </div>
  );
}

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

// ── Live Activity Rail data ──────────────────────────────────
const LIVE_EVENTS = [
  { time: "10:42", msg: "Order fulfilled — Macallan 25 delivered to Table 7",              color: "#18C98B" },
  { time: "10:41", msg: "New guest: Michael R. checked in at Cigar Lounge",                color: "#00D4FF" },
  { time: "10:40", msg: "Environmental adjusted: Humidity increased in Wine Cellar",        color: "#4DAAFF" },
  { time: "10:39", msg: "VIP arrival: John D. — Private Room reserved",                    color: "#A78BFA" },
  { time: "10:38", msg: "Pairing created: Golden Old Fashioned × AS Wagyu",               color: "#F6A623" },
  { time: "10:37", msg: "Inventory alert: Cohiba Behike 56 — Only 3 left in stock",        color: "#F6A623" },
  { time: "10:35", msg: "Feedback received: Guest rated experience 5/5",                   color: "#18C98B" },
  { time: "10:32", msg: "New pairing — Dom Perignon P2 × Cohiba Behike 56",               color: "#18C98B" },
];

function LiveActivityRail() {
  const doubled = [...LIVE_EVENTS, ...LIVE_EVENTS];
  return (
    <div style={{
      background: "rgba(4,8,20,0.97)",
      borderBottom: "1px solid rgba(0,212,255,0.14)",
      height: 36, display: "flex", alignItems: "center",
      flexShrink: 0, position: "relative", zIndex: 9, overflow: "hidden",
    }}>
      {/* LIVE badge — anchored left */}
      <div style={{
        padding: "0 16px 0 28px", flexShrink: 0, display: "flex", alignItems: "center", gap: 7,
        borderRight: "1px solid rgba(0,212,255,0.14)",
      }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00D4FF", boxShadow: "0 0 7px #00D4FF" }} />
        <span style={{ fontSize: 8, color: "#00D4FF", fontFamily: "'Orbitron',sans-serif", fontWeight: 700, letterSpacing: "0.18em" }}>LIVE ACTIVITY</span>
      </div>
      {/* Scrolling events */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div className="eeie-ticker-scroll" style={{ display: "flex", gap: 48, alignItems: "center", whiteSpace: "nowrap" }}>
          {doubled.map((ev, i) => (
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 7, color: "rgba(120,160,220,0.55)", fontFamily: "'Inter',sans-serif", fontWeight: 600 }}>{ev.time}</span>
              <div style={{ width: 3, height: 3, borderRadius: "50%", background: ev.color, boxShadow: `0 0 5px ${ev.color}`, flexShrink: 0 }} />
              <span style={{ fontSize: 8, color: "rgba(210,230,255,0.82)", fontFamily: "'Inter',sans-serif" }}>{ev.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── VenueNode — table node with radial pulse + table number label ─
type NodeStatus = "platinum" | "pressure" | "active" | "empty";
function VenueNode({ x, y, status, tableNumber, delay = 0 }: { x: number; y: number; status: NodeStatus; tableNumber: number; delay?: number }) {
  const glowColor = status === "platinum" ? "#ffffff" : status === "pressure" ? "#ffaa00" : status === "active" ? "#00d4ff" : "rgba(80,110,170,0.28)";
  const dur = status === "platinum" ? 1.3 : status === "pressure" ? 1.7 : 2.2;
  return (
    <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)" }}>
      <span style={{
        position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)",
        fontSize: 7, fontWeight: 700, color: "rgba(0,212,255,0.45)",
        letterSpacing: "0.14em", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono','Courier New',monospace",
      }}>NODE-{tableNumber}</span>
      {status !== "empty" && (
        <motion.div
          animate={{ scale: [1, 2.0, 1], opacity: [0.20, 0.55, 0.20] }}
          transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay }}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          }}
        />
      )}
      <div style={{
        width: 8, height: 8, borderRadius: "50%", position: "relative", zIndex: 1,
        background: status === "empty" ? "rgba(80,110,170,0.30)" : "#ffffff",
        boxShadow: status !== "empty" ? `0 0 10px ${glowColor}, 0 0 22px ${glowColor}55` : "none",
      }} />
    </div>
  );
}

// ── Venue Blueprint Heatmap ──────────────────────────────────
const BP_ZONES = [
  { id: "cigar",   label: "CIGAR LOUNGE", lx: 17, ly: 22, w: "28%", h: "44%", pct: 78, color: "#F6A623" },
  { id: "whiskey", label: "WHISKEY BAR",  lx: 48, ly: 22, w: "22%", h: "29%", pct: 88, color: "#00D4FF" },
  { id: "vip",     label: "VIP ROOM",     lx: 73, ly: 22, w: "14%", h: "44%", pct: 42, color: "#A78BFA" },
  { id: "kitchen", label: "KITCHEN",      lx: 48, ly: 55, w: "22%", h: "30%", pct: 95, color: "#E94B5A" },
  { id: "dining",  label: "DINING ROOM",  lx: 17, ly: 70, w: "28%", h: "23%", pct: 65, color: "#4DAAFF" },
];
const BP_NODES: { x: number; y: number; status: NodeStatus; t: number; delay?: number }[] = [
  { x: 22, y: 35, status: "active",   t: 1,  delay: 0    },
  { x: 30, y: 35, status: "platinum", t: 2,  delay: 0.3  },
  { x: 22, y: 50, status: "active",   t: 3,  delay: 0.6  },
  { x: 30, y: 50, status: "active",   t: 4,  delay: 0.1  },
  { x: 38, y: 42, status: "empty",    t: 5,  delay: 0    },
  { x: 54, y: 30, status: "pressure", t: 6,  delay: 0.4  },
  { x: 62, y: 30, status: "active",   t: 7,  delay: 0.2  },
  { x: 58, y: 42, status: "active",   t: 8,  delay: 0.5  },
  { x: 78, y: 35, status: "active",   t: 9,  delay: 0.2  },
  { x: 82, y: 50, status: "empty",    t: 10, delay: 0    },
  { x: 54, y: 65, status: "pressure", t: 11, delay: 0.3  },
  { x: 62, y: 65, status: "pressure", t: 12, delay: 0.6  },
  { x: 22, y: 79, status: "active",   t: 13, delay: 0.1  },
  { x: 30, y: 79, status: "empty",    t: 14, delay: 0    },
  { x: 38, y: 79, status: "active",   t: 15, delay: 0.4  },
];

function VenueBlueprint() {
  return (
    <div className="sovereign-card hardware-shimmer" style={{
      marginBottom: 22, maxWidth: 960, padding: 0, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--glass-stroke)",
        padding: "13px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ice-silver)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>Spatial Intelligence Studio</div>
          <div style={{ padding: "2px 9px", borderRadius: 12, background: "rgba(0,212,255,0.13)", border: "1px solid rgba(0,212,255,0.28)" }}>
            <span style={{ fontSize: 8, color: "var(--electric-cyan)", fontWeight: 700, letterSpacing: "0.12em", fontFamily: "'Orbitron',sans-serif" }}>LIVE</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {[{ l: "PLATINUM", c: "#ffffff" }, { l: "PRESSURE", c: "#ffaa00" }, { l: "ACTIVE", c: "#00d4ff" }, { l: "EMPTY", c: "rgba(100,140,200,0.45)" }].map(({ l, c }) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: c, boxShadow: c !== "rgba(100,140,200,0.45)" ? `0 0 6px ${c}` : "none" }} />
              <span style={{ fontSize: 7, color: "rgba(120,160,220,0.55)", letterSpacing: "0.10em", fontFamily: "'Inter',sans-serif" }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Blueprint canvas */}
        <div style={{
          flex: 1, position: "relative", height: 280,
          background: `radial-gradient(ellipse at 50% 50%, rgba(0,80,150,0.12) 0%, transparent 70%),
                       repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(0,200,255,0.05) 20px),
                       repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(0,200,255,0.05) 20px)`,
          borderRadius: 10, border: "1px solid rgba(0,200,255,0.10)",
        }}>
          {/* Zone outlines */}
          {BP_ZONES.map(z => (
            <motion.div key={z.id}
              animate={{ borderColor: [`${z.color}40`, `${z.color}90`, `${z.color}40`] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              style={{
                position: "absolute", left: `${z.lx}%`, top: `${z.ly}%`, width: z.w, height: z.h,
                border: `1px solid ${z.color}60`, borderRadius: 6,
                background: `${z.color}07`,
                boxShadow: `inset 0 0 20px ${z.color}06, 0 0 12px ${z.color}18`,
              }}
            >
              <div style={{
                position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
                textAlign: "center", whiteSpace: "nowrap",
              }}>
                <div style={{ fontSize: 6.5, color: z.color, fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.12em", opacity: 0.85 }}>{z.label}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.60)", fontFamily: "'Orbitron',sans-serif", fontWeight: 700, marginTop: 1 }}>{z.pct}%</div>
              </div>
            </motion.div>
          ))}
          {/* Table nodes */}
          {BP_NODES.map(n => (
            <VenueNode key={n.t} x={n.x} y={n.y} status={n.status} tableNumber={n.t} delay={n.delay} />
          ))}
        </div>

        {/* Zone stat cards */}
        <div style={{ width: 158, display: "flex", flexDirection: "column", gap: 9, flexShrink: 0 }}>
          {BP_ZONES.map((z, i) => (
            <div key={z.id} style={{ background: `${z.color}0B`, border: `1px solid ${z.color}25`, borderRadius: 9, padding: "10px 12px" }}>
              <div style={{ fontSize: 7, color: z.color, fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.10em", marginBottom: 3 }}>{z.label}</div>
              <div className="data-value" style={{ fontSize: 20, lineHeight: 1 }}>{z.pct}%</div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, marginTop: 7, overflow: "hidden" }}>
                <motion.div
                  animate={{ width: `${z.pct}%` }} initial={{ width: 0 }}
                  transition={{ duration: 1.4, ease: "easeOut", delay: 0.25 + i * 0.10 }}
                  style={{ height: "100%", background: z.color, borderRadius: 2, boxShadow: `0 0 6px ${z.color}` }}
                />
              </div>
              <div style={{ fontSize: 7, color: "rgba(150,180,220,0.50)", marginTop: 5, fontFamily: "'Inter',sans-serif" }}>
                {z.pct >= 90 ? "At capacity" : z.pct > 70 ? "High activity" : z.pct > 50 ? "Moderate" : "Light traffic"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sovereign Index financial ticker data ────────────────────
const SOVEREIGN_INDEX = [
  { label: "SOVEREIGN INDEX", value: "1,243.7", change: "+2.34%", up: true },
  { label: "MACALLAN 25",     value: "$2,450",  change: "+1.8%",  up: true },
  { label: "LOUIS XIII",      value: "$4,850",  change: "+0.7%",  up: true },
  { label: "DOM PERIGNON P2", value: "$1,250",  change: "+0.9%",  up: true },
  { label: "COHIBA BEHIKE 56",value: "$850",    change: "+3.2%",  up: true },
  { label: "WAGYU A5",        value: "$220",    change: "-0.4%",  up: false },
  { label: "BALVENIE 21",     value: "$380",    change: "+1.1%",  up: true },
  { label: "SESSION REVENUE", value: "$12,840", change: "+4.2%",  up: true },
];

// ── Pairing Intelligence data ────────────────────────────────
const PAIRINGS = [
  {
    id: "p1",
    name: "Macallan 25",
    pairedWith: "Cohiba Behike 56",
    confidence: 94,
    price: 2450,
    category: "WHISKY + CIGAR",
    accent: "#F6A623",
    waveColor: "#F6A623",
  },
  {
    id: "p2",
    name: "Dom Perignon P2",
    pairedWith: "A5 Wagyu Tartare",
    confidence: 91,
    price: 1250,
    category: "CHAMPAGNE + CUISINE",
    accent: "#00D4FF",
    waveColor: "#00D4FF",
  },
  {
    id: "p3",
    name: "Louis XIII",
    pairedWith: "Arturo Fuente OpusX",
    confidence: 88,
    price: 4850,
    category: "COGNAC + CIGAR",
    accent: "#A78BFA",
    waveColor: "#A78BFA",
  },
];

function ProductWaveform({ color }: { color: string }) {
  const points = [4,12,7,18,11,5,15,20,19,8,23,16,27,6,31,14,35,9,39,17,43,4,47,13,51,7];
  const pairs: [number,number][] = [];
  for (let i = 0; i < points.length; i += 2) pairs.push([points[i], points[i+1]]);
  return (
    <svg viewBox="0 0 55 24" style={{ width: "100%", height: 60, display: "block", opacity: 0.8 }}>
      <motion.polyline
        points={pairs.map(([x,y]) => `${x},${y}`).join(" ")}
        fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 5px ${color})` }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      />
    </svg>
  );
}

function ProductIntelligenceCard({ p }: { p: typeof PAIRINGS[number] }) {
  const [confirmed, setConfirmed] = useState(false);
  const handleAdd = () => {
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 1200);
  };
  return (
    <div className="sovereign-card hardware-shimmer" style={{
      padding: 0, overflow: "hidden", display: "flex", flexDirection: "column",
      flex: "1 1 260px", minWidth: 0,
    }}>
      {/* Waveform zone */}
      <div style={{
        background: `linear-gradient(160deg, ${p.accent}12 0%, rgba(2,6,23,0.85) 100%)`,
        borderBottom: `1px solid ${p.accent}22`, padding: "18px 20px 14px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: "60%", opacity: 0.18,
          background: `radial-gradient(circle at right top, ${p.accent}, transparent)`, height: "100%" }} />
        <div style={{ fontSize: 7, color: p.accent, fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.16em", marginBottom: 6 }}>
          {p.category}
        </div>
        <ProductWaveform color={p.waveColor} />
      </div>

      {/* Card body */}
      <div style={{ padding: "16px 20px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f4f8", fontFamily: "'Inter',sans-serif", letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: 4 }}>
          {p.name}
        </div>
        <div style={{ fontSize: 11, color: "rgba(180,210,255,0.55)", fontFamily: "'Inter',sans-serif", marginBottom: 12, fontStyle: "italic" }}>
          paired with {p.pairedWith}
        </div>

        {/* Confidence bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 8, color: "rgba(150,180,220,0.55)", fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.10em" }}>CONFIDENCE</span>
            <span style={{ fontSize: 11, color: "var(--electric-cyan)", fontFamily: "'Orbitron',sans-serif", fontWeight: 700 }}>{p.confidence}%</span>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
            <motion.div
              animate={{ width: `${p.confidence}%` }} initial={{ width: 0 }}
              transition={{ duration: 1.3, ease: "easeOut", delay: 0.4 }}
              style={{ height: "100%", background: `linear-gradient(90deg, ${p.accent}, var(--electric-cyan))`, borderRadius: 2, boxShadow: `0 0 8px ${p.accent}` }}
            />
          </div>
        </div>

        {/* Price + CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, marginTop: "auto" }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#f0f4f8", fontFamily: "'Inter',sans-serif", letterSpacing: "-0.02em" }}>
            ${p.price.toLocaleString()}
          </span>
          <motion.button
            whileTap={{ scale: 0.90, y: 2 }}
            onClick={handleAdd}
            className="btn-press"
            style={{
              padding: "9px 18px", borderRadius: 7,
              background: confirmed ? "rgba(0,212,255,0.28)" : "rgba(255,255,255,0.94)",
              color: confirmed ? "#00d4ff" : "#020617",
              fontSize: 9, fontWeight: 800, fontFamily: "'Orbitron',sans-serif",
              letterSpacing: "0.14em", cursor: "pointer",
              border: confirmed ? "1px solid rgba(0,212,255,0.60)" : "none",
              boxShadow: confirmed ? "0 0 20px rgba(0,212,255,0.45)" : "0 2px 8px rgba(0,0,0,0.35)",
              transition: "background 0.2s, color 0.2s, box-shadow 0.2s, border 0.2s",
            }}
          >
            {confirmed ? "SECURED" : "ADD TO VAULT"}
          </motion.button>
        </div>
      </div>
    </div>
  );
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
      className={`${cardClass} hardware-shimmer`}
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
      minHeight: "100dvh",
      background: "radial-gradient(circle at top, #0f172a 0%, #010409 100%)",
      color: C.ice,
      fontFamily: C.mono, display: "flex", flexDirection: "column",
      overflow: "hidden", position: "relative",
    }}>
      {/* Atmospheric overhead glass sheen — ghost white horizontal gradient */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 120,
        background: "linear-gradient(180deg, rgba(240,244,248,0.04) 0%, transparent 100%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      {/* Ambient deep cyan — barely visible ambient node in center */}
      <div className="eeie-ambient-glow" style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 900, height: 220,
        background: "radial-gradient(ellipse, rgba(0,212,255,0.07) 0%, rgba(0,80,180,0.04) 50%, transparent 75%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      {/* Corner obsidian depth shadow */}
      <div style={{
        position: "fixed", top: -60, right: -60, width: 340, height: 340,
        background: "radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 65%)",
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

      {/* ── LIVE ACTIVITY RAIL ── */}
      <LiveActivityRail />

      {/* ── BODY ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "36px 32px 24px", position: "relative", zIndex: 1 }}>

        {/* ── SOVEREIGN OPERATIONS BLOCK — featured section ── */}
        <div style={{
          background: "linear-gradient(165deg,rgba(15,26,53,0.98) 0%,rgba(6,11,25,0.98) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14, overflow: "hidden", marginBottom: 22, maxWidth: 960,
          boxShadow: "inset 0 1px 2px rgba(255,255,255,0.05), 0 24px 48px rgba(0,0,0,0.55)",
        }}>
          {/* Header bar */}
          <div style={{
            background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: `${C.blue}22`, border: `1px solid ${C.blue}38`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 14px ${C.blue}25`,
              }}>
                <Activity size={16} color={C.blueHi} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#f8fafc", fontFamily: "'Inter',sans-serif", letterSpacing: "-0.01em", textTransform: "uppercase" }}>
                  EEIE Intelligence Hub
                </div>
                <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.20em", marginTop: 1 }}>
                  INTELLIGENCE › COMMAND › LIVE NODES
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: `${C.green}14`, border: `1px solid ${C.green}32` }}>
                <div className="pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: C.green }} />
                <span style={{ fontSize: 7, color: C.green, fontWeight: 700, letterSpacing: "0.16em", fontFamily: "'Orbitron',sans-serif" }}>LIVE</span>
              </div>
              <motion.button
                whileHover={{ boxShadow: `0 0 20px ${C.blue}50` }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/eeie/command-center")}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 16px", borderRadius: 8,
                  background: `${C.blue}20`, border: `1px solid ${C.blue}40`,
                  color: C.blueHi, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
                  cursor: "pointer", fontFamily: "'Orbitron',sans-serif",
                  transition: "background 0.18s",
                }}
              >
                ENTER HUB <ChevronRight size={12} />
              </motion.button>
            </div>
          </div>

          {/* Content: description + status rings */}
          <div style={{ padding: "24px 28px", display: "flex", alignItems: "center", gap: 36 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.85, fontFamily: "'Inter',sans-serif", fontWeight: 300 }}>
                Full intelligence dashboard: venue health, sensory layers, commerce health, AI predictions,
                event bus, staff cockpit, guest experience, media library, distributor sync, and back-of-house operations.
              </div>
              <div style={{ display: "flex", gap: 18, marginTop: 18 }}>
                {[
                  { label: "ALL NODES ONLINE", color: C.green },
                  { label: "TOKEN VALID", color: C.blueHi },
                  { label: "ENGINE OPERATIONAL", color: C.cyan },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                    <span style={{ fontSize: 8, color: item.color, letterSpacing: "0.12em", fontFamily: "'Orbitron',sans-serif", fontWeight: 700 }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
              <StatusRing value={98} label="UPTIME" color={C.green} delay={0.2} />
              <StatusRing value={100} label="NODES" color={C.cyan} delay={0.4} />
              <StatusRing value={99} label="INTEGRITY" color={C.blueHi} delay={0.6} />
            </div>
          </div>
        </div>

        {/* ── VENUE BLUEPRINT ── */}
        <VenueBlueprint />

        {/* ── MODULE GRID SECTION HEADER ── */}
        <div style={{
          background: "linear-gradient(165deg,rgba(15,26,53,0.95) 0%,rgba(6,11,25,0.95) 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "12px 12px 0 0", borderBottom: "none",
          maxWidth: 960,
        }}>
          <div style={{
            background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "13px 22px", display: "flex", alignItems: "center", justifyContent: "space-between",
            borderRadius: "12px 12px 0 0",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#f8fafc", fontFamily: "'Inter',sans-serif", letterSpacing: "-0.01em", textTransform: "uppercase" }}>
                Intelligence Modules
              </div>
              <div style={{ padding: "2px 9px", borderRadius: 12, background: `${C.blue}18`, border: `1px solid ${C.blue}32` }}>
                <span style={{ fontSize: 8, color: C.blueHi, fontWeight: 700, letterSpacing: "0.12em", fontFamily: "'Orbitron',sans-serif" }}>{MODULE_TILES.length} ACTIVE</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green }} />
              <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.16em", fontFamily: "'Inter',sans-serif" }}>SELECT DESTINATION</span>
            </div>
          </div>
        </div>

        {/* ── MODULE GRID ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))",
          gap: 16, maxWidth: 960,
          background: "linear-gradient(165deg,rgba(10,18,40,0.60) 0%,rgba(5,9,20,0.60) 100%)",
          border: "1px solid rgba(255,255,255,0.07)", borderTop: "none",
          borderRadius: "0 0 12px 12px", padding: 16,
        }}>
          {MODULE_TILES.map((tile, i) => (
            <EEIEModuleCard key={tile.label} tile={tile} index={i} onNavigate={navigate} />
          ))}
        </div>

        {/* ── PAIRING INTELLIGENCE SECTION ── */}
        <div style={{ marginTop: 28, maxWidth: 960 }}>
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "12px 12px 0 0", borderBottom: "none",
            padding: "13px 22px", display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#f8fafc", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>
                Pairing Intelligence
              </div>
              <div style={{ padding: "2px 9px", borderRadius: 12, background: "rgba(246,166,35,0.13)", border: "1px solid rgba(246,166,35,0.28)" }}>
                <span style={{ fontSize: 8, color: "#F6A623", fontWeight: 700, letterSpacing: "0.12em", fontFamily: "'Orbitron',sans-serif" }}>AI CURATED</span>
              </div>
            </div>
            <span style={{ fontSize: 8, color: "rgba(120,160,220,0.50)", letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif" }}>TOP CONFIDENCE PAIRINGS · TONIGHT</span>
          </div>
          <div style={{
            background: "linear-gradient(165deg,rgba(10,18,40,0.60) 0%,rgba(5,9,20,0.60) 100%)",
            border: "1px solid rgba(255,255,255,0.07)", borderTop: "none",
            borderRadius: "0 0 12px 12px", padding: 16,
            display: "flex", gap: 14, flexWrap: "wrap",
          }}>
            {PAIRINGS.map(p => <ProductIntelligenceCard key={p.id} p={p} />)}
          </div>
        </div>
      </div>

      {/* ── SOVEREIGN INDEX FINANCIAL TICKER ── */}
      <div style={{
        borderTop: "1px solid rgba(0,212,255,0.14)",
        background: "rgba(3,6,16,0.99)",
        height: 40, display: "flex", alignItems: "center",
        flexShrink: 0, position: "relative", zIndex: 10, overflow: "hidden",
      }}>
        {/* Fixed left badge */}
        <div style={{
          padding: "0 16px 0 28px", flexShrink: 0,
          borderRight: "1px solid rgba(0,212,255,0.14)",
          display: "flex", alignItems: "center", gap: 7, height: "100%",
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#F6A623", boxShadow: "0 0 7px #F6A623" }} />
          <span style={{ fontSize: 8, color: "#F6A623", fontFamily: "'Orbitron',sans-serif", fontWeight: 700, letterSpacing: "0.16em" }}>SOVEREIGN INDEX</span>
        </div>
        {/* Scrolling financial strip */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div className="eeie-financial-scroll" style={{ display: "flex", gap: 0, alignItems: "center", whiteSpace: "nowrap" }}>
            {[...SOVEREIGN_INDEX, ...SOVEREIGN_INDEX].map((item, i) => (
              <div key={i} style={{
                display: "inline-flex", alignItems: "center", gap: 10, flexShrink: 0,
                padding: "0 24px", borderRight: "1px solid rgba(255,255,255,0.06)", height: 40,
              }}>
                <span style={{ fontSize: 8, color: "rgba(160,190,240,0.55)", fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.10em" }}>{item.label}</span>
                <span style={{ fontSize: 13, color: "#f0f4ff", fontFamily: "'Orbitron',sans-serif", fontWeight: 700, letterSpacing: "0.03em" }}>{item.value}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, fontFamily: "'Inter',sans-serif",
                  color: item.up ? "#18C98B" : "#E94B5A",
                  padding: "2px 7px", borderRadius: 5,
                  background: item.up ? "rgba(24,201,139,0.10)" : "rgba(233,75,90,0.10)",
                  border: `1px solid ${item.up ? "rgba(24,201,139,0.22)" : "rgba(233,75,90,0.22)"}`,
                }}>{item.change}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Fixed right: timestamp */}
        <div style={{
          padding: "0 22px", flexShrink: 0,
          borderLeft: "1px solid rgba(0,212,255,0.10)",
          fontSize: 7, color: "rgba(100,140,200,0.45)", letterSpacing: "0.16em",
          fontFamily: "'Inter',sans-serif",
        }}>
          EEIE TITAN V · v3.0.0
        </div>
      </div>
    </div>
  );
}
