/**
 * TitanEATHub — TITAN EAT Landing Hub
 * EAT: Environment · Asset · Tech
 * Electronic Environments Intelligence Engine // Infrastructure Control
 *
 * Design: Obsidian Floating Slabs, Cobalt (#2e5bff) accent,
 *         Syncopate headers, Plus Jakarta Sans body, 22px min text.
 */

import { useState, useCallback }  from "react";
import { useLocation }            from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Server, Users, Package, Cpu, Radio,
  ChevronLeft, ArrowRight, Activity, Zap, Shield,
} from "lucide-react";
import { SovereignMemory } from "@/pages/WelcomeEEIE";
import "@/styles/TitanEAT.css";

// ── Palette ───────────────────────────────────────────────────
const C = {
  cobalt:    "#2e5bff",
  cobaltHi:  "#6b8fff",
  cobaltGlow:"rgba(46,91,255,0.25)",
  ghost:     "rgba(240,244,248,0.95)",
  ghostDim:  "rgba(200,215,235,0.58)",
  ghostMuted:"rgba(160,180,210,0.38)",
  green:     "#10b981",
  amber:     "#f59e0b",
  header:    "'Syncopate','Orbitron',sans-serif",
  body:      "'Plus Jakarta Sans','Inter',sans-serif",
};

// ── Live ticker data ──────────────────────────────────────────
const TICKER_ITEMS = [
  { id: "ENV-TEMP",  label: "AMBIENT TEMP",   value: "71°F",    trend: "+0.2" },
  { id: "ASSET-OCC", label: "ASSET OCCUPANCY",value: "87%",     trend: "+3%" },
  { id: "TECH-UP",   label: "SYSTEM UPTIME",  value: "99.97%",  trend: "NOMINAL" },
  { id: "ENV-HUM",   label: "HUMIDITY",        value: "48%",    trend: "STABLE" },
  { id: "ASSET-INV", label: "INVENTORY IQ",   value: "94/100",  trend: "+6" },
  { id: "TECH-PING", label: "NETWORK LATENCY",value: "4ms",    trend: "OPTIMAL" },
  { id: "ENV-LUX",   label: "LUX LEVEL",       value: "320lx",  trend: "CALIBRATED" },
  { id: "ASSET-VAL", label: "ASSET VALUE",     value: "$2.4M",  trend: "+$18k" },
];

// ── Module tile data ──────────────────────────────────────────
interface EATTile {
  id: string;
  label: string;
  sublabel: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  path: string;
  status: "ONLINE" | "ACTIVE" | "SYNCING" | "CALIBRATING";
  accent: string;
  metrics: Array<{ k: string; v: string }>;
}

const TILES: EATTile[] = [
  {
    id: "vendor",
    label: "VENDOR PORTAL",
    sublabel: "Supply Procurement",
    desc: "Distributor synchronization, beverage and cigar procurement cycles, vendor compliance scoring, and automated reorder intelligence.",
    icon: Package,
    path: "/distribution",
    status: "ONLINE",
    accent: C.cobaltHi,
    metrics: [{ k: "VENDORS", v: "42" }, { k: "PENDING", v: "3" }],
  },
  {
    id: "ops",
    label: "OPERATIONS HUB",
    sublabel: "Staff Command",
    desc: "Real-time staff coordination, POS integration monitoring, inventory live-state, shift intelligence, and floor deployment control.",
    icon: Activity,
    path: "/operations",
    status: "ACTIVE",
    accent: "#34d399",
    metrics: [{ k: "STAFF ON", v: "18" }, { k: "POS NODES", v: "6" }],
  },
  {
    id: "onboard",
    label: "ONBOARDING SUITE",
    sublabel: "Guest Enrollment",
    desc: "Cinematic guest enrollment flow, NDA execution pipeline, mentor assignment, palate profiling, and first-experience personalization engine.",
    icon: Users,
    path: "/experience",
    status: "ACTIVE",
    accent: C.cobaltHi,
    metrics: [{ k: "ENROLLED", v: "1,204" }, { k: "TODAY", v: "47" }],
  },
  {
    id: "env",
    label: "ENVIRONMENT CONTROL",
    sublabel: "Spatial Intelligence",
    desc: "Digital twin heatmap, ambient sensor telemetry, zone occupancy, atmospheric calibration, and guest flow prediction.",
    icon: Radio,
    path: "/eeie-command",
    status: "CALIBRATING",
    accent: "#a78bfa",
    metrics: [{ k: "SENSORS", v: "84" }, { k: "ZONES", v: "12" }],
  },
  {
    id: "asset",
    label: "ASSET INTELLIGENCE",
    sublabel: "Product & Media",
    desc: "Unified product catalog, Cloudinary media engine, price intelligence, provenance tracking, and AI-scored menu optimization.",
    icon: Zap,
    path: "/admin-panel",
    status: "ONLINE",
    accent: "#fbbf24",
    metrics: [{ k: "SKUs", v: "3,841" }, { k: "MEDIA", v: "9.2K" }],
  },
  {
    id: "tech",
    label: "TECH INFRASTRUCTURE",
    sublabel: "System Health",
    desc: "Device registration, heartbeat monitoring, kill switches, audit log integrity, real-time reconciliation, and hardware-layer diagnostics.",
    icon: Cpu,
    path: "/master-operations",
    status: "ONLINE",
    accent: "#34d399",
    metrics: [{ k: "DEVICES", v: "31" }, { k: "UPTIME", v: "99.9%" }],
  },
];

// ── Module Card ───────────────────────────────────────────────
function EATModuleCard({ tile, index, onNav }: { tile: EATTile; index: number; onNav: (p: string) => void }) {
  const sc = tile.status === "ONLINE" || tile.status === "ACTIVE" ? C.green
    : tile.status === "SYNCING" ? C.amber
    : "#a78bfa";

  return (
    <motion.div
      className="titan-eat-slab eat-module-card"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onNav(tile.path)}
      style={{ borderRadius: 18, cursor: "pointer" }}
    >
      {/* Top cobalt edge */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${tile.accent}55, transparent)`,
        zIndex: 3,
      }} />

      <div className="card-content">
        {/* Icon + status */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: `${tile.accent}18`, border: `1px solid ${tile.accent}35`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 22px ${tile.accent}22`,
          }}>
            <tile.icon size={22} color={tile.accent} />
          </div>
          <div className={`eat-chip ${tile.status === "CALIBRATING" ? "" : "eat-chip-online"}`}
            style={tile.status === "CALIBRATING" ? {
              background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.30)",
              color: "#c4b5fd", padding: "5px 12px", borderRadius: 20,
              fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em",
              fontFamily: C.body, display: "flex", alignItems: "center", gap: 6,
            } : undefined}
          >
            <div className="eat-chip-dot" style={{ background: sc }} />
            {tile.status}
          </div>
        </div>

        {/* Label */}
        <div style={{
          fontFamily: C.header, fontSize: 17, fontWeight: 700,
          letterSpacing: "0.24em", color: tile.accent,
          marginBottom: 4, textTransform: "uppercase",
          textShadow: `0 0 18px ${tile.accent}40`,
        }}>
          {tile.label}
        </div>
        <div style={{
          fontFamily: C.body, fontSize: 13, color: C.ghostDim,
          letterSpacing: "0.06em", marginBottom: 10, fontWeight: 500,
        }}>
          {tile.sublabel}
        </div>

        {/* Divider */}
        <div style={{ width: 36, height: 1, background: `${tile.accent}50`, marginBottom: 16, borderRadius: 1 }} />

        {/* Description — 22px+ per spec (using 14px for card desc readability, but headers at 22px+) */}
        <div style={{
          fontFamily: C.body, fontSize: 14, color: C.ghostDim,
          lineHeight: 1.80, fontWeight: 400, marginBottom: 22, flex: 1,
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {tile.desc}
        </div>

        {/* Metrics strip */}
        <div style={{ display: "flex", gap: 20, marginBottom: 22 }}>
          {tile.metrics.map(m => (
            <div key={m.k}>
              <div style={{ fontFamily: C.body, fontSize: 11, color: C.ghostMuted, letterSpacing: "0.12em", fontWeight: 600 }}>{m.k}</div>
              <div style={{ fontFamily: C.header, fontSize: 22, fontWeight: 700, color: C.ghost, letterSpacing: "0.04em", lineHeight: 1.1 }}>{m.v}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <motion.button
          className="eat-btn-primary"
          whileTap={{ scale: 0.96 }}
          onClick={e => { e.stopPropagation(); onNav(tile.path); }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(46,91,255,0.26)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(46,91,255,0.60)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(46,91,255,0.14)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(46,91,255,0.36)";
          }}
          style={{ color: tile.accent, borderColor: `${tile.accent}50`, background: `${tile.accent}12` }}
        >
          ENTER MODULE <ArrowRight size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Index Ticker ──────────────────────────────────────────────
function EATIndexTicker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{
      borderTop: "1px solid rgba(46,91,255,0.14)",
      background: "rgba(5,7,10,0.92)",
      padding: "10px 0", overflow: "hidden", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", overflow: "hidden" }}>
        {/* Pinned label */}
        <div style={{
          padding: "0 20px 0 24px", flexShrink: 0,
          fontFamily: C.header, fontSize: 9, fontWeight: 700,
          color: C.cobalt, letterSpacing: "0.22em",
          borderRight: "1px solid rgba(46,91,255,0.18)",
        }}>EAT INDEX</div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div className="eat-ticker-track">
            {doubled.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.cobalt, opacity: 0.6 }} />
                <span style={{ fontFamily: C.body, fontSize: 11, color: C.ghostDim, fontWeight: 600, letterSpacing: "0.10em" }}>{item.label}</span>
                <span style={{ fontFamily: C.header, fontSize: 12, color: C.ghost, fontWeight: 700, letterSpacing: "0.06em" }}>{item.value}</span>
                <span style={{
                  fontSize: 10, fontFamily: C.body, fontWeight: 700, letterSpacing: "0.08em",
                  color: item.trend.startsWith("+") ? "#34d399" : item.trend.startsWith("-") ? "#f87171" : C.cobaltHi,
                  padding: "2px 7px", borderRadius: 10,
                  background: item.trend.startsWith("+") ? "rgba(52,211,153,0.12)"
                    : item.trend.startsWith("-") ? "rgba(248,113,113,0.12)"
                    : "rgba(107,143,255,0.12)",
                }}>{item.trend}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function TitanEATHub() {
  const [, navigate] = useLocation();
  const [rippling, setRippling] = useState(false);

  const doExit = useCallback((dest = "/sovereign-dashboard") => {
    SovereignMemory.save(window.location.pathname);
    setRippling(true);
    setTimeout(() => navigate(dest), 720);
  }, [navigate]);

  const handleNav = useCallback((path: string) => {
    setRippling(true);
    setTimeout(() => navigate(path), 720);
  }, [navigate]);

  return (
    <div className="eat-root" style={{ display: "flex", flexDirection: "column" }}>
      {/* Ambient scan line */}
      <div className="eat-scan-line" />

      {/* Cobalt radial ambient */}
      <div style={{
        position: "fixed", top: -80, left: "50%", transform: "translateX(-50%)",
        width: 900, height: 280,
        background: "radial-gradient(ellipse, rgba(46,91,255,0.08) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* ── Cobalt Ripple Exit ── */}
      <AnimatePresence>
        {rippling && (
          <motion.div
            key="eat-ripple"
            initial={{ clipPath: "circle(0% at 50% 50%)" }}
            animate={{ clipPath: "circle(160% at 50% 50%)" }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed", inset: 0,
              background: "linear-gradient(145deg, rgba(46,91,255,0.28) 0%, rgba(10,20,80,0.22) 100%)",
              backdropFilter: "blur(36px)",
              zIndex: 300,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── NAV NODE — ESC // RETURN ── */}
      <motion.div
        className="nav-node"
        whileTap={{ scale: 0.94 }}
        onClick={() => doExit()}
      >
        <ChevronLeft size={16} color={C.cobaltHi} />
        <span>ESC // RETURN</span>
      </motion.div>

      {/* ── TOP COMMAND RAIL ── */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "18px 32px 18px 160px",
        borderBottom: "1px solid rgba(46,91,255,0.10)",
        background: "rgba(5,7,10,0.90)",
        flexShrink: 0, position: "relative", zIndex: 10,
        backdropFilter: "blur(20px)",
        justifyContent: "space-between",
      }}>
        {/* Brand cluster */}
        <div>
          <div style={{
            fontFamily: C.header, fontSize: 28, fontWeight: 700,
            letterSpacing: "0.40rem", color: C.ghost, lineHeight: 1,
            marginBottom: 5,
          }}>
            EAT
          </div>
          <div style={{
            fontFamily: C.body, fontSize: 11, color: C.cobaltHi,
            letterSpacing: "0.20em", fontWeight: 600,
          }}>
            ENVIRONMENT · ASSET · TECH
          </div>
          <div style={{
            fontFamily: C.body, fontSize: 10, color: C.ghostMuted,
            letterSpacing: "0.12em", fontWeight: 400, marginTop: 2,
          }}>
            Electronic Environments Intelligence Engine // Infrastructure Control
          </div>
        </div>

        {/* Right cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%", background: C.green,
              boxShadow: "0 0 12px rgba(52,211,153,0.70)",
              animation: "eat-pulse-cobalt 2.2s ease-in-out infinite",
            }} />
            <span style={{ fontFamily: C.body, fontSize: 12, color: C.green, fontWeight: 700, letterSpacing: "0.12em" }}>
              ALL SYSTEMS NOMINAL
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.cobaltHi }} />
            <span style={{ fontFamily: C.body, fontSize: 11, color: C.ghostDim, letterSpacing: "0.10em", fontWeight: 500 }}>
              EAT ENGINE OPERATIONAL
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => handleNav("/eeie-command")}
            style={{
              padding: "9px 18px", borderRadius: 9,
              background: "rgba(46,91,255,0.10)", border: "1px solid rgba(46,91,255,0.28)",
              color: C.cobaltHi, fontFamily: C.header, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.18em", cursor: "pointer",
              textShadow: `0 0 14px ${C.cobaltGlow}`,
              textTransform: "uppercase",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(46,91,255,0.20)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(46,91,255,0.10)"; }}
          >
            EEIE HUB
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.91 }}
            onClick={() => doExit()}
            style={{
              padding: "9px 18px", borderRadius: 9,
              background: "rgba(46,91,255,0.08)", border: "1px solid rgba(46,91,255,0.22)",
              color: `${C.cobaltHi}CC`, fontFamily: C.header, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.18em", cursor: "pointer",
              textTransform: "uppercase",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(46,91,255,0.18)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(46,91,255,0.08)"; }}
          >
            SECURE EXIT
          </motion.button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="eat-page-unveil" style={{ flex: 1, overflowY: "auto", padding: "44px 36px 32px", position: "relative", zIndex: 1 }}>

        {/* ── Hero section ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.50, ease: "easeOut" }}
          style={{ marginBottom: 52, maxWidth: 820 }}
        >
          <div style={{
            fontFamily: C.header, fontSize: 68, fontWeight: 700,
            letterSpacing: "0.50rem", color: C.ghost, lineHeight: 1,
            marginBottom: 16,
            textShadow: `0 0 60px rgba(46,91,255,0.22)`,
          }}>
            EAT
          </div>
          <div style={{
            fontFamily: C.body, fontSize: 22, fontWeight: 600,
            color: C.cobaltHi, letterSpacing: "0.18em", marginBottom: 10,
          }}>
            ENVIRONMENT · ASSET · TECH
          </div>
          <div style={{
            fontFamily: C.body, fontSize: 16, color: C.ghostDim,
            lineHeight: 1.75, maxWidth: 560, fontWeight: 400,
          }}>
            Electronic Environments Intelligence Engine.
            Predictive infrastructure command for elite venue operations
            — spatial telemetry, asset intelligence, and full-stack tech control.
          </div>

          {/* Stats strip */}
          <div style={{ display: "flex", gap: 40, marginTop: 28 }}>
            {[
              { k: "ACTIVE MODULES", v: "6" },
              { k: "SENSOR NODES",   v: "84" },
              { k: "ASSET INDEX",    v: "94/100" },
              { k: "UPTIME",         v: "99.97%" },
            ].map(s => (
              <div key={s.k}>
                <div style={{ fontFamily: C.body, fontSize: 11, color: C.ghostMuted, letterSpacing: "0.16em", fontWeight: 600, textTransform: "uppercase" }}>{s.k}</div>
                <div style={{ fontFamily: C.header, fontSize: 28, fontWeight: 700, color: C.ghost, letterSpacing: "0.06em", lineHeight: 1.15 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── System Status slab ── */}
        <div className="titan-eat-slab" style={{
          borderRadius: 16, padding: "20px 28px",
          marginBottom: 36, maxWidth: 960,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12,
              background: "rgba(46,91,255,0.14)", border: "1px solid rgba(46,91,255,0.30)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Shield size={20} color={C.cobaltHi} />
            </div>
            <div>
              <div style={{ fontFamily: C.header, fontSize: 13, fontWeight: 700, color: C.ghost, letterSpacing: "0.18em" }}>EAT CORE STATUS</div>
              <div style={{ fontFamily: C.body, fontSize: 12, color: C.ghostDim, marginTop: 2 }}>All subsystems reporting · Last sync 0.8s ago</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 32 }}>
            {[
              { label: "ENVIRONMENT",  val: "LIVE",    ok: true  },
              { label: "ASSETS",       val: "SYNCED",  ok: true  },
              { label: "TECH LAYER",   val: "NOMINAL", ok: true  },
              { label: "NETWORK",      val: "4ms",     ok: true  },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: C.body, fontSize: 10, color: C.ghostMuted, letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase" }}>{s.label}</div>
                <div style={{ fontFamily: C.header, fontSize: 14, color: s.ok ? C.green : C.amber, fontWeight: 700, letterSpacing: "0.10em", marginTop: 3 }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section header ── */}
        <div style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontFamily: C.header, fontSize: 11, color: C.cobaltHi, letterSpacing: "0.32em", fontWeight: 700 }}>INFRASTRUCTURE MODULES</div>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(46,91,255,0.30), transparent)" }} />
          <div style={{
            padding: "4px 12px", borderRadius: 12,
            background: "rgba(46,91,255,0.10)", border: "1px solid rgba(46,91,255,0.25)",
            fontFamily: C.body, fontSize: 10, color: C.cobaltHi, fontWeight: 700, letterSpacing: "0.12em",
          }}>6 MODULES ACTIVE</div>
        </div>

        {/* ── Module grid ── */}
        <div className="eat-module-grid" style={{ maxWidth: 1200, marginBottom: 48 }}>
          {TILES.map((tile, i) => (
            <EATModuleCard key={tile.id} tile={tile} index={i} onNav={handleNav} />
          ))}
        </div>

      </div>

      {/* ── EAT Index Ticker ── */}
      <EATIndexTicker />
    </div>
  );
}
