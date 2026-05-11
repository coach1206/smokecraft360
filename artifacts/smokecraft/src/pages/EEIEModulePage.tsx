/**
 * EEIEModulePage — /eeie/:module
 * Sovereign-style wrapper for individual EEIE module routes.
 * Renders the real module component when available; shows a premium
 * "module online" placeholder for stubs.
 */

import { useState }              from "react";
import { useParams, useLocation } from "wouter";
import { motion }                 from "framer-motion";
import {
  Activity, Users, Star, Image, Grid3x3, Truck,
  Server, Building2, Radio, Package, Brain,
  Thermometer, Zap, Shield, ChevronLeft,
  CheckCircle2, Cpu,
} from "lucide-react";
import "@/styles/Sovereign.css";
import "@/styles/eeie-motion.css";
import { buildTheme }            from "./eeie/shared";
import { StaffCockpit }          from "./eeie/StaffCockpit";
import { MoodSensorTab }         from "./eeie/MoodSensor";
import { VisualIntelligenceTab } from "./eeie/VisualIntelligence";
import { DataBrainTab }              from "./eeie/DataBrain";
import { CommerceIntelligenceTab }  from "./eeie/CommerceIntelligence";
import { AIPanel }               from "./eeie/AIPanel";

// ── Sovereign blue color system (outer shell only) ────────────
const S = {
  bg:       "#050A14",
  border:   "rgba(0,128,255,0.14)",
  silver:   "#7BA8CC",
  muted:    "rgba(180,210,250,0.50)",
  dim:      "rgba(140,175,220,0.24)",
  blue:     "#0080FF",
  blueHi:   "#22AAFF",
  green:    "#22c55e",
  mono:     "'JetBrains Mono','Courier New',monospace",
  serif:    "'Cormorant Garamond',serif",
};

// Use the EEIE dark theme for all sub-module components
const T = buildTheme(true);

// ── Module registry ───────────────────────────────────────────
const MODULE_META: Record<string, {
  icon: React.ElementType;
  label: string;
  desc: string;
  accent: string;
  status: string;
}> = {
  "staff-cockpit":      { icon: Users,      label: "STAFF COCKPIT",       accent: S.blue,    status: "ACTIVE",    desc: "Wait-staff command layer: active tables, guest profiles, cigar matching, drink pairing, food pairing, visual selling, and POS handoff." },
  "guest-experience":   { icon: Star,       label: "GUEST EXPERIENCE",    accent: "#00C8FF",  status: "ACTIVE",    desc: "Guest session management, taste profiling, mood intelligence, and personalized experience delivery." },
  "media-library":      { icon: Image,      label: "MEDIA LIBRARY",       accent: "#60A5FA",  status: "READY",     desc: "Upload, link, approve, and manage images for cigars, drinks, food, desserts, specials, and pairing bundles." },
  "product-wall":       { icon: Grid3x3,    label: "PRODUCT WALL",        accent: S.blueHi,  status: "LIVE",      desc: "Luxury visual selling wall with cigar, liquor, cocktail, food, dessert, and bundle images." },
  "distributors":       { icon: Truck,      label: "DISTRIBUTOR LIBRARY", accent: "#38BDF8",  status: "SYNCING",   desc: "Connect distributor catalogs, import CSVs, map cigar and liquor products, and generate restock intelligence." },
  "back-of-house":      { icon: Server,     label: "BACK-OF-HOUSE SYNC",  accent: "#00C8FF",  status: "CONNECTED", desc: "Connect bar, kitchen, cigar inventory, manager controls, event bus, and commerce infrastructure." },
  "venue-intelligence": { icon: Building2,  label: "VENUE INTELLIGENCE",  accent: S.blue,    status: "LIVE",      desc: "Real-time venue analytics: occupancy, revenue, staff performance, and ambient intelligence systems." },
  "sensory-engine":     { icon: Radio,      label: "SENSORY ENGINE",      accent: "#A78BFA",  status: "SENSING",   desc: "Venue mood, service pressure, color-state intelligence, haptics, and sensor-aware recommendations." },
  "commerce-health":    { icon: Package,    label: "COMMERCE HEALTH",     accent: "#34D399",  status: "NOMINAL",   desc: "POS integration, payment health, revenue forecasting, margin tracking, and inventory integrity." },
  "ai-assistant":       { icon: Brain,      label: "AI ASSISTANT",        accent: "#A78BFA",  status: "ONLINE",    desc: "Real-time staff guidance, pairing explanations, inventory warnings, mood interpretation, and next-best actions." },
  "mood-sensor":        { icon: Thermometer,label: "MOOD SENSOR",         accent: "#00C8FF",  status: "SENSING",   desc: "Live venue mood, service pressure, color-state intelligence, haptics, and sensor-aware recommendations." },
  "event-bus":          { icon: Activity,   label: "EVENT BUS",           accent: "#F59E0B",  status: "LIVE",      desc: "Live event stream: order events, mood changes, inventory alerts, staff actions, and system signals." },
  "founder-control":    { icon: Shield,     label: "FOUNDER CONTROL",     accent: "#ef4444",  status: "SECURED",   desc: "Founder-level overrides: feature flags, kill switches, revenue levers, and system governance." },
  "master-operations":  { icon: Zap,        label: "MASTER OPERATIONS",   accent: "#D4AF37",  status: "ACTIVE",    desc: "Operational layer: staff management, venue oversight, inventory, reconciliation, and analytics." },
  "command-center":     { icon: Cpu,        label: "EEIE INTELLIGENCE HUB", accent: S.blueHi, status: "LIVE",     desc: "Full EEIE intelligence dashboard: all modules, tabs, and real-time venue telemetry." },
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: S.green, LIVE: S.green, ONLINE: S.green, READY: S.blue,
  SYNCING: "#F59E0B", CONNECTED: S.green, NOMINAL: S.green,
  SENSING: "#00C8FF", SECURED: "#ef4444",
};

// ── Module-specific placeholder ───────────────────────────────
function ModulePlaceholder({ meta }: { meta: typeof MODULE_META[string] }) {
  const Icon = meta.icon;
  const sc = STATUS_COLORS[meta.status] ?? S.silver;
  const SYSTEMS = [
    "INTELLIGENCE LAYER", "DATA STREAM",
    "SENSOR ARRAY",       "ANALYTICS ENGINE",
    "REAL-TIME FEED",     "AI ADVISORY",
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: 48 }}>
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="eeie-sensor-ring eeie-active-breathe"
        style={{
          width: 96, height: 96, borderRadius: 26,
          background: `${meta.accent}18`, border: `1px solid ${meta.accent}35`,
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28,
          boxShadow: `0 0 48px ${meta.accent}20`,
        }}
      >
        <Icon size={42} color={meta.accent} />
      </motion.div>

      <div className={`eeie-chip-${meta.status.toLowerCase()}`} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "5px 14px", borderRadius: 20,
        background: `${sc}14`, border: `1px solid ${sc}30`, marginBottom: 20,
      }}>
        <div className="eeie-status-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: sc }} />
        <span style={{ fontSize: 8, color: sc, fontWeight: 700, letterSpacing: "0.20em" }}>MODULE {meta.status}</span>
      </div>

      <div style={{ fontSize: 28, color: meta.accent, fontFamily: S.serif, letterSpacing: "0.16em", fontWeight: 300, marginBottom: 12, textAlign: "center" }}>
        {meta.label}
      </div>
      <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.8, maxWidth: 520, textAlign: "center", marginBottom: 44 }}>
        {meta.desc}
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 32px",
        padding: "24px 32px", background: `${meta.accent}07`,
        border: `1px solid ${meta.accent}18`, borderRadius: 14, maxWidth: 480, width: "100%",
      }}>
        {SYSTEMS.map((sys) => (
          <div key={sys} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={11} color={meta.accent} />
            <span style={{ fontSize: 8, color: S.silver, letterSpacing: "0.14em" }}>{sys}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, fontSize: 9, color: S.dim, letterSpacing: "0.20em" }}>
        FULL MODULE INTERFACE · IN-VENUE DEPLOYMENT
      </div>
    </div>
  );
}

// ── AI Assistant wrapper (full-page) ─────────────────────────
function AIAssistantPage() {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      flex: 1, display: "flex", background: T.bg, overflowY: "auto",
      padding: 24, justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 500 }}>
        <AIPanel T={T} open={open} onClose={() => setOpen(false)} />
      </div>
    </div>
  );
}

// ── Module content router ─────────────────────────────────────
function ModuleContent({ module, meta }: { module: string; meta: typeof MODULE_META[string] }) {
  if (module === "staff-cockpit") {
    return <div style={{ flex: 1, overflowY: "auto", background: T.bg }}><StaffCockpit T={T} /></div>;
  }
  if (module === "mood-sensor") {
    return <div style={{ flex: 1, overflowY: "auto", background: T.bg }}><MoodSensorTab T={T} /></div>;
  }
  if (module === "product-wall" || module === "guest-experience" || module === "venue-intelligence") {
    return <div style={{ flex: 1, overflowY: "auto", background: T.bg }}><VisualIntelligenceTab T={T} /></div>;
  }
  if (module === "commerce-health") {
    return (
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ padding: "20px 24px" }}>
          <CommerceIntelligenceTab T={T} />
        </div>
      </div>
    );
  }
  if (module === "media-library" || module === "distributors" || module === "back-of-house"
    || module === "event-bus" || module === "sensory-engine") {
    return <div style={{ flex: 1, overflowY: "auto", background: T.bg }}><DataBrainTab T={T} /></div>;
  }
  if (module === "ai-assistant") {
    return <AIAssistantPage />;
  }
  return <div style={{ flex: 1, display: "flex", flexDirection: "column" }}><ModulePlaceholder meta={meta} /></div>;
}

// ── Main ──────────────────────────────────────────────────────
export default function EEIEModulePage() {
  const params = useParams<{ module: string }>();
  const [, navigate] = useLocation();
  const module = params.module ?? "command-center";
  const meta = MODULE_META[module] ?? MODULE_META["command-center"];
  const Icon = meta.icon;
  const sc = STATUS_COLORS[meta.status] ?? S.silver;

  return (
    <div style={{
      minHeight: "100dvh", background: S.bg, color: "#D8EEFF",
      fontFamily: S.mono, display: "flex", flexDirection: "column",
      overflow: "hidden", position: "relative",
    }}>
      {/* Ambient accent glow */}
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 800, height: 200,
        background: `radial-gradient(ellipse,${meta.accent}08 0%,transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />
      <div className="scan-line" />

      {/* ── TOP RAIL ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: "14px 28px",
        borderBottom: `1px solid ${S.border}`,
        background: "rgba(5,10,20,0.97)",
        flexShrink: 0, position: "relative", zIndex: 10,
      }}>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => navigate("/eeie-command")}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 8,
            background: `${S.blue}0C`, border: `1px solid ${S.border}`,
            color: S.silver, fontSize: 9, cursor: "pointer",
            letterSpacing: "0.16em", flexShrink: 0, fontFamily: S.mono,
          }}
        >
          <ChevronLeft size={12} /> EEIE HUB
        </motion.button>

        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${meta.accent}18`, border: `1px solid ${meta.accent}30`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={16} color={meta.accent} />
        </div>

        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: meta.accent, fontFamily: S.serif, letterSpacing: "0.13em" }}>
            {meta.label}
          </div>
          <div style={{ fontSize: 8, color: S.dim, letterSpacing: "0.18em" }}>
            EEIE MODULE · EXPERIENCE ENHANCEMENT INTELLIGENCE ENGINE
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <div className="pulse pulse-delay-1" style={{ width: 6, height: 6, borderRadius: "50%", background: S.green }} />
          <span style={{ fontSize: 9, color: S.green, fontWeight: 700, letterSpacing: "0.12em" }}>SOVEREIGN ACTIVE</span>
        </div>
      </div>

      {/* ── MODULE CONTENT ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 1 }}>
        <ModuleContent module={module} meta={meta} />
      </div>

      {/* ── STATUS RAIL ── */}
      <div style={{
        borderTop: `1px solid ${S.border}`,
        background: "rgba(5,10,20,0.97)",
        padding: "9px 28px",
        display: "flex", alignItems: "center",
        flexShrink: 0, position: "relative", zIndex: 10,
      }}>
        <div className="eeie-rail-progress" />
        {[
          { label: "MODULE",   value: meta.status, color: sc },
          { label: "SESSION",  value: "ACTIVE",     color: S.green },
          { label: "ENGINE",   value: "TITAN V",    color: S.blue },
        ].map((item, i, arr) => (
          <div key={item.label} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "0 16px",
            borderRight: i < arr.length - 1 ? `1px solid ${S.border}` : "none", flexShrink: 0,
          }}>
            <div className={`eeie-tel-dot eeie-tel-dot-${i + 1}`} style={{ width: 5, height: 5, borderRadius: "50%", background: item.color }} />
            <span style={{ fontSize: 7, color: S.dim, letterSpacing: "0.14em" }}>{item.label}</span>
            <span style={{ fontSize: 7, color: item.color, fontWeight: 700, letterSpacing: "0.12em" }}>{item.value}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 7, color: S.dim, letterSpacing: "0.18em" }}>
          EEIE TITAN V · 360 ENTERPRISES SERVICES LLC
        </div>
      </div>
    </div>
  );
}
