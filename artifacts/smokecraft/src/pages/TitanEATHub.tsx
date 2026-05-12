/**
 * TitanEATHub — TITAN EAT V2.2026.0
 * EAT: Environment · Asset · Tech
 * Sovereign Intelligence & Infrastructure Control
 *
 * Engine modules wired:
 *  • EATBridge        — audio + environment link calls
 *  • EATSovereignLedger — live 22px audit trail
 *  • SovereignOverride  — ghost mode + lockdown overlay
 *  • EATMeshResilience  — offline queue + heal-sync badge
 */

import { useState, useCallback, useEffect } from "react";
import { useLocation }                        from "wouter";
import { motion, AnimatePresence }            from "framer-motion";
import {
  ChevronLeft, ArrowRight, Shield, Activity, Zap, Cpu,
  Package, Users, Radio, Wifi, Music, Database, ToggleRight,
  Eye, CloudOff, Link2, CheckCircle2, Circle,
  Thermometer, AlertTriangle, RefreshCw, WifiOff,
} from "lucide-react";
import { SovereignMemory } from "@/pages/WelcomeEEIE";
import {
  EATBridge,
  EATSovereignLedger,
  EATMeshResilience,
  SovereignOverride,
  type LedgerPacket,
} from "@/lib/EATBridge";
import "@/styles/TitanEAT.css";

/* ── Palette ───────────────────────────────────────────────── */
const C = {
  cobalt:    "#2e5bff",
  cobaltHi:  "#6b8fff",
  cobaltGlow:"rgba(46,91,255,0.25)",
  violet:    "#6e2eff",
  violetHi:  "#9b6fff",
  ghost:     "rgba(240,244,248,0.95)",
  ghostDim:  "rgba(200,215,235,0.58)",
  ghostMuted:"rgba(160,180,210,0.38)",
  green:     "#10b981",
  greenHi:   "#34d399",
  amber:     "#f59e0b",
  amberHi:   "#fbbf24",
  red:       "#ef4444",
  redHi:     "#f87171",
  header:    "'Syncopate','Orbitron',sans-serif",
  body:      "'Plus Jakarta Sans','Inter',sans-serif",
};

/* ── EAT Index Ticker ──────────────────────────────────────── */
const TICKER_ITEMS = [
  { label: "AMBIENT TEMP",    value: "71°F",   trend: "+0.2"    },
  { label: "ASSET OCCUPANCY", value: "87%",    trend: "+3%"     },
  { label: "SYSTEM UPTIME",   value: "99.97%", trend: "NOMINAL" },
  { label: "HUMIDITY",        value: "48%",    trend: "STABLE"  },
  { label: "INVENTORY IQ",    value: "94/100", trend: "+6"      },
  { label: "NETWORK LATENCY", value: "4ms",    trend: "OPTIMAL" },
  { label: "LUX LEVEL",       value: "320lx",  trend: "CALIBRATED" },
  { label: "ASSET VALUE",     value: "$2.4M",  trend: "+$18k"   },
  { label: "MESH NODES",      value: "12/12",  trend: "SYNCED"  },
  { label: "DMX CHANNELS",    value: "512",    trend: "ACTIVE"  },
];

/* ── Initial Ledger (pre-session history) ─────────────────── */
const INITIAL_LEDGER: LedgerPacket[] = [
  { id: "h1", timestamp: "10:42:18", user: "MGR. HARRIS",   event: "Linked HVAC — Zone 3",              zone: "VIP LOUNGE",  status: "SECURE" },
  { id: "h2", timestamp: "10:39:05", user: "MGR. HARRIS",   event: "Vendor invite: Boisset Collection", zone: "ASSET VAULT", status: "SECURE" },
  { id: "h3", timestamp: "10:31:44", user: "ADMIN SANTOS",  event: "SSID security updated",             zone: "NETWORK",     status: "REMOTE" },
  { id: "h4", timestamp: "10:28:12", user: "MGR. HARRIS",   event: "Spotify linked to Audio Gateway",   zone: "AUDIO",       status: "SECURE" },
  { id: "h5", timestamp: "10:15:00", user: "SYSTEM",        event: "Heal-Sync — 11 packets restored",   zone: "MESH CORE",   status: "LOCAL"  },
  { id: "h6", timestamp: "09:58:33", user: "ADMIN SANTOS",  event: "DMX Scene: Cigar Lounge Evening",   zone: "ENVIRONMENT", status: "SECURE" },
];

/* ── Universal Command Core — Init Nodes ───────────────────── */
type LinkState = "LINKED" | "PENDING" | "OFFLINE";

interface InitNode {
  id:       string;
  label:    string;
  icon:     React.ComponentType<{ size?: number; color?: string }>;
  subs:     string[];
  accent:   string;
  desc:     string;
  sector:   string;
  bridgeFn: () => Promise<void>;
}

/* ── Infrastructure Module Tiles ──────────────────────────── */
interface EATTile {
  id: string; label: string; sublabel: string; desc: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  path: string; status: "ONLINE" | "ACTIVE" | "SYNCING" | "CALIBRATING";
  accent: string; metrics: Array<{ k: string; v: string }>;
}

const TILES: EATTile[] = [
  { id: "vendor",  label: "VENDOR PORTAL",       sublabel: "Supply Procurement",
    desc: "Distributor sync, beverage and cigar procurement, vendor compliance scoring, automated reorder intelligence.",
    icon: Package,  path: "/distribution",    status: "ONLINE",       accent: C.cobaltHi,
    metrics: [{ k: "VENDORS", v: "42" }, { k: "PENDING", v: "3" }] },
  { id: "ops",     label: "OPERATIONS HUB",      sublabel: "Staff Command",
    desc: "Real-time staff coordination, POS integration, inventory live-state, shift intelligence, floor deployment.",
    icon: Activity, path: "/operations",      status: "ACTIVE",       accent: C.greenHi,
    metrics: [{ k: "STAFF ON", v: "18" }, { k: "POS NODES", v: "6" }] },
  { id: "onboard", label: "ONBOARDING SUITE",    sublabel: "Guest Enrollment",
    desc: "Cinematic enrollment flow, NDA pipeline, mentor assignment, palate profiling, first-experience personalization.",
    icon: Users,    path: "/experience",      status: "ACTIVE",       accent: C.cobaltHi,
    metrics: [{ k: "ENROLLED", v: "1,204" }, { k: "TODAY", v: "47" }] },
  { id: "env",     label: "ENVIRONMENT CONTROL", sublabel: "Spatial Intelligence",
    desc: "Digital twin heatmap, ambient sensor telemetry, zone occupancy, atmospheric calibration, guest flow prediction.",
    icon: Radio,    path: "/eeie-command",    status: "CALIBRATING",  accent: "#a78bfa",
    metrics: [{ k: "SENSORS", v: "84" }, { k: "ZONES", v: "12" }] },
  { id: "asset",   label: "ASSET INTELLIGENCE",  sublabel: "Product & Media",
    desc: "Unified product catalog, Cloudinary media engine, price intelligence, provenance tracking, AI menu optimization.",
    icon: Zap,      path: "/admin-panel",     status: "ONLINE",       accent: C.amberHi,
    metrics: [{ k: "SKUs", v: "3,841" }, { k: "MEDIA", v: "9.2K" }] },
  { id: "tech",    label: "TECH INFRASTRUCTURE", sublabel: "System Health",
    desc: "Device registration, heartbeat monitoring, kill switches, audit integrity, reconciliation, hardware diagnostics.",
    icon: Cpu,      path: "/master-operations", status: "ONLINE",     accent: C.greenHi,
    metrics: [{ k: "DEVICES", v: "31" }, { k: "UPTIME", v: "99.9%" }] },
];

/* ════════════════════════════════════════════════════════════
   INIT NODE CARD
   ════════════════════════════════════════════════════════════ */
function InitNodeCard({ node, state, onToggle, index, syncing }: {
  node: InitNode; state: LinkState; onToggle: () => void;
  index: number; syncing: boolean;
}) {
  const isLinked  = state === "LINKED";
  const isPending = state === "PENDING";

  return (
    <motion.div
      className={`eat-slab ${isLinked ? "eat-slab-linked" : ""}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      onClick={onToggle}
      style={{ borderRadius: 16, cursor: syncing ? "wait" : "pointer" }}
    >
      {/* Accent top edge */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${node.accent}66, transparent)`, zIndex: 3,
      }} />

      <div style={{ position: "relative", zIndex: 2, padding: "22px 18px 18px" }}>
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${node.accent}1A`, border: `1px solid ${node.accent}35`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 14, boxShadow: `0 0 18px ${node.accent}20`,
        }}>
          <node.icon size={20} color={node.accent} />
        </div>

        {/* Label */}
        <div style={{
          fontFamily: C.header, fontSize: 11, fontWeight: 700,
          letterSpacing: "0.22em", color: node.accent, marginBottom: 4, textTransform: "uppercase",
        }}>{node.label}</div>
        <div style={{ fontFamily: C.body, fontSize: 11, color: C.ghostDim, lineHeight: 1.55, marginBottom: 14, fontWeight: 400 }}>
          {node.desc}
        </div>

        {/* Sub-options — 22px feedback text for linked state */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
          {node.subs.map(sub => (
            <div key={sub} style={{
              display: "flex", alignItems: "center", gap: 7,
              fontFamily: C.body, fontSize: 11,
              color: isLinked ? C.ghostDim : C.ghostMuted,
              letterSpacing: "0.06em", fontWeight: isLinked ? 500 : 400,
            }}>
              {isLinked
                ? <CheckCircle2 size={10} color={C.greenHi} />
                : <Circle size={10} color={C.ghostMuted} />}
              {sub}
            </div>
          ))}
        </div>

        {/* Status chip */}
        <div style={{ marginBottom: 12 }}>
          <div className={`eat-chip ${isLinked ? "eat-chip-online" : isPending ? "eat-chip-pending" : "eat-chip-offline"}`}>
            <div className="eat-chip-dot" style={{
              background: isLinked ? C.greenHi : isPending ? C.amberHi : "#f87171",
            }} />
            {syncing ? "SYNCING..." : state}
          </div>
        </div>

        {/* CTA */}
        <button
          disabled={syncing}
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className={`eat-btn-primary ${isLinked ? "eat-btn-linked" : ""}`}
          style={{
            fontFamily: C.header, fontSize: "0.62rem", letterSpacing: "0.20em",
            textTransform: "uppercase", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6, padding: "11px 0",
            borderRadius: 10, cursor: syncing ? "wait" : "pointer", width: "100%",
            opacity: syncing ? 0.6 : 1, transition: "all 0.20s",
          }}
        >
          {syncing ? <><RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }} /> SYNCING</> : isLinked ? <><CheckCircle2 size={11} /> LINKED</> : <><Link2 size={11} /> LINK NODE</>}
        </button>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   MODULE CARD
   ════════════════════════════════════════════════════════════ */
function EATModuleCard({ tile, index, onNav }: {
  tile: EATTile; index: number; onNav: (p: string) => void;
}) {
  const sc = tile.status === "ONLINE" || tile.status === "ACTIVE" ? C.green
    : tile.status === "SYNCING" ? C.amber : "#a78bfa";
  const chipBg = tile.status === "CALIBRATING"
    ? { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.30)", color: "#c4b5fd" }
    : { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.32)",  color: "#34d399" };

  return (
    <motion.div
      className="eat-slab eat-module-card"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.055, duration: 0.40, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onNav(tile.path)}
      style={{ borderRadius: 18, cursor: "pointer" }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${tile.accent}55, transparent)`, zIndex: 3,
      }} />

      <div className="card-content">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 13,
            background: `${tile.accent}18`, border: `1px solid ${tile.accent}35`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 22px ${tile.accent}22`,
          }}><tile.icon size={20} color={tile.accent} /></div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 11px", borderRadius: 20,
            background: chipBg.bg, border: `1px solid ${chipBg.border}`,
            fontFamily: C.body, fontSize: "0.68rem", fontWeight: 700,
            letterSpacing: "0.13em", color: chipBg.color, textTransform: "uppercase",
          }}>
            <div className="eat-chip-dot" style={{ background: sc }} />
            {tile.status}
          </div>
        </div>

        <div style={{ fontFamily: C.header, fontSize: 15, fontWeight: 700, letterSpacing: "0.22em", color: tile.accent, marginBottom: 3, textTransform: "uppercase", textShadow: `0 0 18px ${tile.accent}40` }}>{tile.label}</div>
        <div style={{ fontFamily: C.body, fontSize: 12, color: C.ghostDim, letterSpacing: "0.05em", marginBottom: 10, fontWeight: 500 }}>{tile.sublabel}</div>
        <div style={{ width: 32, height: 1, background: `${tile.accent}50`, marginBottom: 14, borderRadius: 1 }} />
        <div style={{ fontFamily: C.body, fontSize: 13, color: C.ghostDim, lineHeight: 1.75, fontWeight: 400, marginBottom: 20, flex: 1, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{tile.desc}</div>

        <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
          {tile.metrics.map(m => (
            <div key={m.k}>
              <div style={{ fontFamily: C.body, fontSize: 10, color: C.ghostMuted, letterSpacing: "0.12em", fontWeight: 600, textTransform: "uppercase" }}>{m.k}</div>
              <div className="data-22px" style={{ fontFamily: C.header, letterSpacing: "0.04em", lineHeight: 1.1 }}>{m.v}</div>
            </div>
          ))}
        </div>

        <motion.button
          className="eat-btn-primary"
          whileTap={{ scale: 0.96 }}
          onClick={e => { e.stopPropagation(); onNav(tile.path); }}
          style={{ color: tile.accent, borderColor: `${tile.accent}50`, background: `${tile.accent}12` }}
          onMouseEnter={e => { const b = e.currentTarget; b.style.background = `${tile.accent}22`; b.style.borderColor = `${tile.accent}70`; }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.background = `${tile.accent}12`; b.style.borderColor = `${tile.accent}50`; }}
        >
          ENTER MODULE <ArrowRight size={13} />
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   INDEX TICKER
   ════════════════════════════════════════════════════════════ */
function EATIndexTicker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{ borderTop: "1px solid rgba(46,91,255,0.14)", background: "rgba(5,7,10,0.94)", padding: "10px 0", overflow: "hidden", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", overflow: "hidden" }}>
        <div style={{ padding: "0 20px 0 24px", flexShrink: 0, fontFamily: C.header, fontSize: 9, fontWeight: 700, color: C.cobalt, letterSpacing: "0.22em", borderRight: "1px solid rgba(46,91,255,0.18)" }}>EAT INDEX</div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div className="eat-ticker-track">
            {doubled.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.cobalt, opacity: 0.6 }} />
                <span style={{ fontFamily: C.body, fontSize: 11, color: C.ghostDim, fontWeight: 600, letterSpacing: "0.10em" }}>{item.label}</span>
                <span style={{ fontFamily: C.header, fontSize: 12, color: C.ghost, fontWeight: 700, letterSpacing: "0.06em" }}>{item.value}</span>
                <span style={{
                  fontSize: 10, fontFamily: C.body, fontWeight: 700, letterSpacing: "0.08em",
                  color: item.trend.startsWith("+") ? C.greenHi : item.trend.startsWith("-") ? "#f87171" : C.cobaltHi,
                  padding: "2px 7px", borderRadius: 10,
                  background: item.trend.startsWith("+") ? "rgba(52,211,153,0.12)" : item.trend.startsWith("-") ? "rgba(248,113,113,0.12)" : "rgba(107,143,255,0.12)",
                }}>{item.trend}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════ */
export default function TitanEATHub() {
  const [, navigate] = useLocation();

  /* ── Page state ── */
  const [rippling,   setRippling]   = useState(false);
  const [isLockedDown, setIsLockedDown] = useState(false);
  const [ghostActive, setGhostActive]  = useState(true); // remote session active

  /* ── Mesh resilience ── */
  const [isOnline,    setIsOnline]    = useState(navigator.onLine);
  const [queueCount,  setQueueCount]  = useState(() => EATMeshResilience.getQueueLength());

  /* ── Ledger (live state) ── */
  const [ledgerEntries, setLedgerEntries] = useState<LedgerPacket[]>(INITIAL_LEDGER);

  const pushLedger = useCallback((packet: LedgerPacket) => {
    setLedgerEntries(prev => [packet, ...prev.slice(0, 7)]);
  }, []);

  /* ── Init node state ── */
  const [linkStates, setLinkStates] = useState<Record<string, LinkState>>({
    environment: "LINKED",
    audio:       "PENDING",
    assets:      "OFFLINE",
    network:     "LINKED",
    bridge:      "OFFLINE",
  });
  const [syncingNodes, setSyncingNodes] = useState<Set<string>>(new Set());

  /* ── Online / offline detection + Heal-Sync ── */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const count = EATMeshResilience.healSync();
      if (count > 0) {
        setQueueCount(0);
        pushLedger(EATSovereignLedger.recordEvent(
          "SYSTEM", `Heal-Sync — ${count} packets restored`, "MESH CORE"
        ));
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setQueueCount(EATMeshResilience.getQueueLength());
    };
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [pushLedger]);

  /* ── Build init nodes with bridge functions ── */
  const INIT_NODES: InitNode[] = [
    {
      id: "environment", label: "ENVIRONMENT",
      icon: Thermometer, accent: "#34d399", sector: "ENVIRONMENT",
      desc: "Link DMX lighting and HVAC climate control",
      subs: ["DMX / LUTRON", "HVAC CLIMATE", "ZONE SENSORS"],
      bridgeFn: () => EATBridge.updateEnvironment("lighting", 80).then(() => void 0),
    },
    {
      id: "audio", label: "AUDIO GATEWAY",
      icon: Music, accent: C.cobaltHi, sector: "AUDIO",
      desc: "Universal gateway for music and aux input",
      subs: ["APPLE MUSIC", "SPOTIFY", "PHYSICAL AUX"],
      bridgeFn: () => EATBridge.syncAudio("Spotify").then(() => void 0),
    },
    {
      id: "assets", label: "ASSET VAULT",
      icon: Database, accent: C.amberHi, sector: "ASSET VAULT",
      desc: "Invite vendors to the 4K macro-asset library",
      subs: ["VENDOR INVITE", "4K MACRO LIB", "MEDIA SYNC"],
      bridgeFn: () => Promise.resolve(),
    },
    {
      id: "network", label: "NETWORK",
      icon: Wifi, accent: "#a78bfa", sector: "NETWORK",
      desc: "Wi-Fi handshake and SSID security provisioning",
      subs: ["WI-FI HANDSHAKE", "SSID SECURITY", "MESH NODE"],
      bridgeFn: () => Promise.resolve(),
    },
    {
      id: "bridge", label: "EAT-BRIDGE",
      icon: ToggleRight, accent: C.amberHi, sector: "BRIDGE",
      desc: "Manual hardware relay for non-smart equipment",
      subs: ["RELAY A — AMBIENT", "RELAY B — BAR", "WIRING DIAGRAM"],
      bridgeFn: () => Promise.resolve(),
    },
  ];

  /* ── Toggle init node — calls bridge, records ledger ── */
  const toggleNode = useCallback(async (id: string) => {
    if (syncingNodes.has(id)) return;

    const current = linkStates[id];
    const next: LinkState = current === "OFFLINE" ? "PENDING"
      : current === "PENDING" ? "LINKED" : "OFFLINE";

    setLinkStates(prev => ({ ...prev, [id]: next }));

    const node = INIT_NODES.find(n => n.id === id)!;

    if (next === "LINKED") {
      // Mark syncing while bridge call resolves
      setSyncingNodes(prev => new Set([...prev, id]));
      try {
        if (!isOnline) {
          EATMeshResilience.localPersistence({
            category: id, value: 1, type: 'ENV_ADJUST',
          });
          setQueueCount(EATMeshResilience.getQueueLength());
        } else {
          await node.bridgeFn();
        }
        pushLedger(EATSovereignLedger.recordEvent(
          "MGR. ACTIVE", `${node.label} node linked — ${node.subs[0]}`, node.sector
        ));
      } finally {
        setSyncingNodes(prev => { const s = new Set(prev); s.delete(id); return s; });
      }
    } else {
      pushLedger(EATSovereignLedger.recordEvent(
        "MGR. ACTIVE", `${node.label} disconnected`, node.sector
      ));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkStates, syncingNodes, isOnline, pushLedger]);

  /* ── Ghost Mode ── */
  const handleGhostMode = useCallback(() => {
    const next = !ghostActive;
    setGhostActive(next);
    pushLedger(EATSovereignLedger.recordEvent(
      "SUPER ADMIN",
      next ? "Ghost Mode activated — Remote session open" : "Ghost Mode deactivated",
      "MASTER HUB"
    ));
  }, [ghostActive, pushLedger]);

  /* ── Emergency Lockdown ── */
  const handleLockdown = useCallback(() => {
    SovereignOverride.emergencyLockdown();
    pushLedger(EATSovereignLedger.recordEvent("SOVEREIGN", "EMERGENCY LOCKDOWN triggered", "ALL SECTORS"));
    setIsLockedDown(true);
  }, [pushLedger]);

  const handleReleaseLockdown = useCallback(() => {
    pushLedger(EATSovereignLedger.recordEvent("SOVEREIGN", "Lockdown released — Systems restored", "ALL SECTORS"));
    setIsLockedDown(false);
  }, [pushLedger]);

  /* ── Navigation ── */
  const doExit = useCallback((dest = "/sovereign-dashboard") => {
    SovereignMemory.save(window.location.pathname);
    setRippling(true);
    setTimeout(() => navigate(dest), 720);
  }, [navigate]);

  const handleNav = useCallback((path: string) => {
    setRippling(true);
    setTimeout(() => navigate(path), 720);
  }, [navigate]);

  const linkedCount = Object.values(linkStates).filter(s => s === "LINKED").length;

  return (
    <div className="eat-root" style={{ display: "flex", flexDirection: "column" }}>
      <div className="eat-scan-line" />

      {/* Ambient radials */}
      <div style={{ position: "fixed", top: -60, left: "50%", transform: "translateX(-50%)", width: 1000, height: 300, background: "radial-gradient(ellipse, rgba(46,91,255,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: 0, right: 0, width: 400, height: 400, background: "radial-gradient(ellipse at bottom right, rgba(110,46,255,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* ── Cobalt Ripple Exit ── */}
      <AnimatePresence>
        {rippling && (
          <motion.div
            key="eat-ripple"
            initial={{ clipPath: "circle(0% at 50% 50%)" }}
            animate={{ clipPath: "circle(160% at 50% 50%)" }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "fixed", inset: 0, background: "linear-gradient(145deg, rgba(46,91,255,0.28) 0%, rgba(10,20,80,0.22) 100%)", backdropFilter: "blur(36px)", zIndex: 300 }}
          />
        )}
      </AnimatePresence>

      {/* ── GAUSSIAN BLUR LOCKDOWN OVERLAY ── */}
      <AnimatePresence>
        {isLockedDown && (
          <motion.div
            key="lockdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0,
              backdropFilter: "blur(60px)", background: "rgba(5,7,10,0.94)",
              zIndex: 400, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 28,
            }}
          >
            {/* Pulsing violet perimeter */}
            <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(110,46,255,0.70)", pointerEvents: "none", animation: "ghost-border-pulse 0.9s ease-in-out infinite" }} />

            <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>
              <AlertTriangle size={52} color={C.redHi} />
            </motion.div>

            <div style={{ fontFamily: C.header, fontSize: 28, color: C.redHi, letterSpacing: "0.5rem", textAlign: "center" }}>
              GAUSSIAN BLUR LOCK ACTIVE
            </div>
            <div className="data-22px" style={{ color: C.ghostDim, letterSpacing: "0.10em", textAlign: "center" }}>
              SOVEREIGN LOCKDOWN IN EFFECT
            </div>
            <div style={{ fontFamily: C.body, fontSize: 14, color: C.ghostMuted, letterSpacing: "0.10em", textAlign: "center", lineHeight: 1.8 }}>
              All environment and asset controls suspended.<br />
              Biometric release required to restore access.
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleReleaseLockdown}
              style={{
                padding: "16px 52px", borderRadius: 12, marginTop: 8,
                background: "rgba(239,68,68,0.08)", border: "2px solid rgba(239,68,68,0.50)",
                fontFamily: C.header, fontSize: "0.75rem", fontWeight: 700,
                letterSpacing: "0.30em", color: C.redHi, cursor: "pointer", textTransform: "uppercase",
                transition: "background 0.18s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.18)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; }}
            >
              RELEASE LOCKDOWN
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Nav Node ── */}
      <motion.div className="nav-node" whileTap={{ scale: 0.94 }} onClick={() => doExit()}>
        <ChevronLeft size={15} color={C.cobaltHi} />
        <span>ESC // RETURN</span>
      </motion.div>

      {/* ── Command Rail ── */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "16px 32px 16px 168px",
        borderBottom: "1px solid rgba(46,91,255,0.10)",
        background: "rgba(5,7,10,0.92)",
        flexShrink: 0, position: "relative", zIndex: 10,
        backdropFilter: "blur(20px)", justifyContent: "space-between",
      }}>
        {/* Brand */}
        <div>
          <div style={{ fontFamily: C.header, fontSize: 26, fontWeight: 700, letterSpacing: "1.2rem", color: C.ghost, lineHeight: 1, marginBottom: 4 }}>EAT</div>
          <div style={{ fontFamily: C.header, fontSize: 9, color: C.cobaltHi, letterSpacing: "0.50rem", fontWeight: 700 }}>ENVIRONMENT • ASSET • TECH</div>
          <div style={{ fontFamily: C.body, fontSize: 9, color: C.ghostMuted, letterSpacing: "0.10em", marginTop: 2 }}>
            Sovereign Intelligence & Infrastructure Control // Total Command of Environment, Assets, and Telemetry
          </div>
        </div>

        {/* Right cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Mesh badge — reacts to online/offline */}
          <div className="eat-heal-sync" style={!isOnline ? { borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.10)", color: C.amberHi } : undefined}>
            {isOnline
              ? <div className="eat-heal-sync-ring" />
              : <WifiOff size={10} color={C.amberHi} />}
            {isOnline
              ? `LOCAL MESH · ${linkedCount}/5 LINKED`
              : `OFFLINE · ${queueCount} QUEUED`}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: isOnline ? C.greenHi : C.amberHi, boxShadow: `0 0 10px ${isOnline ? "rgba(52,211,153,0.70)" : "rgba(245,158,11,0.70)"}` }} />
            <span style={{ fontFamily: C.body, fontSize: 11, color: isOnline ? C.greenHi : C.amberHi, fontWeight: 700, letterSpacing: "0.10em" }}>
              {isOnline ? "NOMINAL" : "MESH OFFLINE"}
            </span>
          </div>

          <motion.button whileTap={{ scale: 0.93 }} onClick={() => handleNav("/eeie-command")}
            style={{ padding: "8px 16px", borderRadius: 9, background: "rgba(46,91,255,0.10)", border: "1px solid rgba(46,91,255,0.28)", color: C.cobaltHi, fontFamily: C.header, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", cursor: "pointer", textTransform: "uppercase" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(46,91,255,0.22)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(46,91,255,0.10)"; }}
          >EEIE HUB</motion.button>

          <motion.button whileTap={{ scale: 0.91 }} onClick={() => doExit()}
            style={{ padding: "8px 16px", borderRadius: 9, background: "rgba(46,91,255,0.08)", border: "1px solid rgba(46,91,255,0.20)", color: `${C.cobaltHi}BB`, fontFamily: C.header, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", cursor: "pointer", textTransform: "uppercase" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(46,91,255,0.18)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(46,91,255,0.08)"; }}
          >SECURE EXIT</motion.button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="eat-page-unveil" style={{ flex: 1, overflowY: "auto", padding: "36px 32px 28px", position: "relative", zIndex: 1 }}>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.48 }} style={{ marginBottom: 44 }}>
          <div style={{ fontFamily: C.header, fontSize: 72, fontWeight: 700, letterSpacing: "1.2rem", color: C.ghost, lineHeight: 1, marginBottom: 14, textShadow: "0 0 80px rgba(46,91,255,0.20)" }}>EAT</div>
          <div style={{ fontFamily: C.header, fontSize: 11, color: C.cobaltHi, letterSpacing: "0.50rem", marginBottom: 10, fontWeight: 700 }}>ENVIRONMENT • ASSET • TECH</div>
          <div style={{ fontFamily: C.body, fontSize: 15, color: C.ghostDim, lineHeight: 1.78, maxWidth: 580, fontWeight: 400, marginBottom: 28 }}>
            Sovereign Intelligence & Infrastructure Control. Total command of venue environment, assets, and full-stack telemetry — from a unified obsidian interface.
          </div>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            {[
              { k: "INIT NODES",   v: `${linkedCount}/5` },
              { k: "SENSOR NODES", v: "84"       },
              { k: "ASSET INDEX",  v: "94/100"   },
              { k: "UPTIME",       v: "99.97%"   },
            ].map(s => (
              <div key={s.k}>
                <div style={{ fontFamily: C.body, fontSize: 10, color: C.ghostMuted, letterSpacing: "0.16em", fontWeight: 600, textTransform: "uppercase" }}>{s.k}</div>
                <div className="data-22px" style={{ fontFamily: C.header, fontSize: 28, letterSpacing: "0.06em", lineHeight: 1.15 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ════ UNIVERSAL COMMAND CORE ════ */}
        <div className="eat-section-header" style={{ marginBottom: 12 }}>
          <div className="eat-section-label">UNIVERSAL COMMAND CORE</div>
          <div className="eat-section-line" />
          <div style={{ padding: "4px 12px", borderRadius: 12, background: "rgba(46,91,255,0.10)", border: "1px solid rgba(46,91,255,0.24)", fontFamily: C.body, fontSize: 10, color: C.cobaltHi, fontWeight: 700, letterSpacing: "0.12em", whiteSpace: "nowrap" }}>INITIALIZATION HUB</div>
        </div>
        <div style={{ fontFamily: C.body, fontSize: 13, color: C.ghostDim, marginBottom: 20, lineHeight: 1.65, maxWidth: 640 }}>
          Link the entire building from one view. Toggle each node — the bridge calls are wired and logged to the Ledger in real time.
        </div>

        <div className="eat-init-grid" style={{ marginBottom: 44 }}>
          {INIT_NODES.map((node, i) => (
            <InitNodeCard
              key={node.id} node={node} state={linkStates[node.id]}
              onToggle={() => toggleNode(node.id)} index={i}
              syncing={syncingNodes.has(node.id)}
            />
          ))}
        </div>

        {/* ════ LEDGER + GHOST PORTAL ════ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20, marginBottom: 44, alignItems: "start" }}>

          {/* THE LEDGER */}
          <div>
            <div className="eat-section-header" style={{ marginBottom: 16 }}>
              <div className="eat-section-label">THE LEDGER</div>
              <div className="eat-section-line" />
              <div style={{ fontFamily: C.body, fontSize: 10, color: C.ghostMuted, letterSpacing: "0.12em", fontWeight: 600, whiteSpace: "nowrap" }}>AUDIT TRAIL · 100% TIME-STAMPED</div>
            </div>

            <div className="eat-slab" style={{ borderRadius: 16, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 86px 100px 76px", padding: "12px 20px", borderBottom: "1px solid rgba(46,91,255,0.10)", background: "rgba(46,91,255,0.04)" }}>
                {["WHO", "WHAT", "WHEN", "SECTOR", "STATUS"].map(h => (
                  <div key={h} style={{ fontFamily: C.header, fontSize: 9, color: C.cobaltHi, letterSpacing: "0.20em", fontWeight: 700 }}>{h}</div>
                ))}
              </div>
              <AnimatePresence initial={false}>
                {ledgerEntries.map((e, i) => {
                  const statusColor =
                    e.status === "SECURE" ? C.greenHi :
                    e.status === "LOCAL"  ? C.amberHi : C.violetHi;
                  const statusBg =
                    e.status === "SECURE" ? "rgba(52,211,153,0.10)" :
                    e.status === "LOCAL"  ? "rgba(245,158,11,0.10)" : "rgba(110,46,255,0.12)";
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: -8, backgroundColor: "rgba(46,91,255,0.08)" }}
                      animate={{ opacity: 1, y: 0, backgroundColor: "rgba(0,0,0,0)" }}
                      transition={{ duration: 0.35 }}
                      style={{
                        display: "grid", gridTemplateColumns: "1fr 1.6fr 86px 100px 76px",
                        padding: "12px 20px",
                        borderBottom: i < ledgerEntries.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                        position: "relative", zIndex: 2, alignItems: "center",
                      }}
                    >
                      <div style={{ fontFamily: C.body, fontSize: 12, color: C.ghost, fontWeight: 600 }}>{e.user}</div>
                      <div style={{ fontFamily: C.body, fontSize: 12, color: C.ghostDim, paddingRight: 8 }}>{e.event}</div>
                      <div style={{ fontFamily: C.header, fontSize: 11, color: C.cobaltHi, letterSpacing: "0.06em" }}>{e.timestamp}</div>
                      <div style={{ fontFamily: C.body, fontSize: 10, color: C.ghostMuted, letterSpacing: "0.10em", fontWeight: 700, textTransform: "uppercase" }}>{e.zone}</div>
                      <div style={{
                        display: "inline-flex", alignItems: "center",
                        padding: "3px 8px", borderRadius: 20,
                        background: statusBg, border: `1px solid ${statusColor}40`,
                        fontFamily: C.header, fontSize: 8, fontWeight: 700,
                        letterSpacing: "0.14em", color: statusColor,
                      }}>{e.status}</div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* GHOST PORTAL */}
          <div>
            <div className="eat-section-header" style={{ marginBottom: 16 }}>
              <div className="eat-section-label" style={{ color: C.violetHi }}>GHOST PORTAL</div>
              <div className="eat-section-line" style={{ background: "linear-gradient(90deg, rgba(110,46,255,0.30), transparent)" }} />
            </div>

            <div className={`eat-slab eat-slab-master ${ghostActive ? "eat-slab-ghost" : ""}`} style={{ borderRadius: 16 }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(110,46,255,0.70), transparent)", zIndex: 3 }} />
              <div style={{ position: "relative", zIndex: 2, padding: "26px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 13, background: "rgba(110,46,255,0.14)", border: "1px solid rgba(110,46,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px rgba(110,46,255,0.25)" }}>
                    <Eye size={22} color={C.violetHi} />
                  </div>
                  <div>
                    <div style={{ fontFamily: C.header, fontSize: 13, fontWeight: 700, color: C.violetHi, letterSpacing: "0.22em" }}>SOVEREIGN GHOST</div>
                    <div style={{ fontFamily: C.body, fontSize: 11, color: C.ghostDim, marginTop: 2 }}>Super Admin Override Portal</div>
                  </div>
                </div>

                {ghostActive && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(110,46,255,0.10)", border: "1px solid rgba(110,46,255,0.30)", marginBottom: 18 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.violetHi, boxShadow: "0 0 12px rgba(110,46,255,0.80)" }} />
                    <span style={{ fontFamily: C.body, fontSize: 11, color: C.violetHi, fontWeight: 700, letterSpacing: "0.12em" }}>REMOTE SESSION ACTIVE</span>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
                  {[
                    { label: "Biometric handoff",      icon: Shield        },
                    { label: "Remote control access",  icon: Eye           },
                    { label: "Emergency lockdown",     icon: AlertTriangle },
                    { label: "Offline sync override",  icon: CloudOff      },
                  ].map(cap => (
                    <div key={cap.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <cap.icon size={11} color={C.violetHi} />
                      <span style={{ fontFamily: C.body, fontSize: 12, color: C.ghostDim }}>{cap.label}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    className="eat-btn-primary eat-btn-violet"
                    onClick={handleGhostMode}
                    style={{ fontFamily: C.header, fontSize: "0.62rem", letterSpacing: "0.20em", padding: "12px 0", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                  >
                    <Eye size={12} />
                    {ghostActive ? "DEACTIVATE GHOST" : "ENTER GHOST MODE"}
                  </button>
                  <button
                    onClick={handleLockdown}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px 0", borderRadius: 10, width: "100%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.28)", fontFamily: C.header, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.20em", color: C.redHi, cursor: "pointer", transition: "background 0.18s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.18)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; }}
                  >
                    <AlertTriangle size={12} /> EMERGENCY LOCKDOWN
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════ EAT CORE STATUS ════ */}
        <div className="eat-slab" style={{ borderRadius: 14, padding: "18px 26px", marginBottom: 36, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(46,91,255,0.14)", border: "1px solid rgba(46,91,255,0.30)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={18} color={C.cobaltHi} />
            </div>
            <div>
              <div style={{ fontFamily: C.header, fontSize: 12, fontWeight: 700, color: C.ghost, letterSpacing: "0.18em" }}>EAT CORE STATUS</div>
              <div style={{ fontFamily: C.body, fontSize: 11, color: C.ghostDim, marginTop: 2 }}>All subsystems reporting · Last sync 0.8s ago</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 30 }}>
            {[
              { label: "ENVIRONMENT", val: "LIVE",    color: C.greenHi  },
              { label: "ASSETS",      val: "SYNCED",  color: C.greenHi  },
              { label: "TECH LAYER",  val: "NOMINAL", color: C.greenHi  },
              { label: "NETWORK",     val: isOnline ? "LIVE" : "OFFLINE", color: isOnline ? C.greenHi : C.amberHi },
              { label: "GHOST",       val: ghostActive ? "ACTIVE" : "OFF", color: ghostActive ? C.violetHi : C.ghostMuted },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: C.body, fontSize: 9, color: C.ghostMuted, letterSpacing: "0.13em", fontWeight: 600, textTransform: "uppercase" }}>{s.label}</div>
                <div style={{ fontFamily: C.header, fontSize: 13, fontWeight: 700, letterSpacing: "0.09em", marginTop: 3, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ════ INFRASTRUCTURE MODULES ════ */}
        <div className="eat-section-header">
          <div className="eat-section-label">INFRASTRUCTURE MODULES</div>
          <div className="eat-section-line" />
          <div style={{ padding: "4px 12px", borderRadius: 12, background: "rgba(46,91,255,0.10)", border: "1px solid rgba(46,91,255,0.24)", fontFamily: C.body, fontSize: 10, color: C.cobaltHi, fontWeight: 700, letterSpacing: "0.12em", whiteSpace: "nowrap" }}>6 MODULES ACTIVE</div>
        </div>

        <div className="eat-module-grid" style={{ maxWidth: 1200, marginBottom: 48 }}>
          {TILES.map((tile, i) => (
            <EATModuleCard key={tile.id} tile={tile} index={i} onNav={handleNav} />
          ))}
        </div>

      </div>

      <EATIndexTicker />
    </div>
  );
}
