import React, { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NoveeGuestProfileProvider, useNoveeGuest } from "@/contexts/NoveeGuestProfileContext";
import type { Phase } from "@/contexts/NoveeGuestProfileContext";

// Lazy-load ported pages
const NoveeKioskBootSequence = lazy(() => import("@/pages/NoveeKioskBootSequence").then((m: any) => ({ default: m.default || m })));
const NoveeCraftPortalHome = lazy(() => import("@/pages/NoveeCraftPortalHome").then((m: any) => ({ default: m.default || m })));
const S1_InitGate = lazy(() => import("@/pages/S1_InitGate").then((m: any) => ({ default: m.S1_InitGate || m.default || m })));
const S2_TerroirMatrix = lazy(() => import("@/pages/S2_TerroirMatrix").then((m: any) => ({ default: m.S2_TerroirMatrix || m.default || m })));
const S3_FormulationLab = lazy(() => import("@/pages/S3_FormulationLab").then((m: any) => ({ default: m.S3_FormulationLab || m.default || m })));
const S4_DesignStudio = lazy(() => import("@/pages/S4_DesignStudio").then((m: any) => ({ default: m.S4_DesignStudio || m.default || m })));
const NoveeEATDashboard = lazy(() => import("@/pages/NoveeEATDashboard").then((m: any) => ({ default: m.default || m })));
const NoveeExecutiveCommandCenter = lazy(() => import("@/pages/NoveeExecutiveCommandCenter").then((m: any) => ({ default: m.default || m })));
const NoveeStaffPinGate = lazy(() => import("@/components/NoveeStaffPinGate").then(m => ({ default: m.NoveeStaffPinGate })));
import type { PinRole } from "@/components/NoveeStaffPinGate";

import { playClick } from "@/hooks/useNoveeAudio";
import { hapticClick } from "@/hooks/useNoveeHaptic";

const GOLD = "#D4AF37";
const G = GOLD;
const IMG = (n: string) => `${import.meta.env.BASE_URL}images/${n}`;

const PAGE_V = {
  enter: { opacity: 0, x: 40, scale: 0.96 },
  active: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -30, scale: 0.98 },
};
const PAGE_T = { type: "spring" as const, mass: 1.1, stiffness: 280, damping: 32, duration: 0.35 };
const EASE_CINEMA: [number, number, number, number] = [0.22, 1, 0.36, 1];

const S1_PHASES = new Set(["s1_demo", "s1_rules", "s1_leaderboard", "s1_mentor", "s1_seed", "s1_quiz", "s1_posgate"]);
const S2_PHASES = new Set(["s2_terroir", "s2_voucher"]);
const S3_PHASES = new Set(["s3_spiritquiz", "s3_sensorytrap", "s3_leafsliders"]);
const S4_PHASES = new Set(["s4_vitola", "s4_designstudio", "s4_results"]);
const SESSION_PHASES = new Set([...S1_PHASES, ...S2_PHASES, ...S3_PHASES, ...S4_PHASES]);

/* ─────────────────────────────────────────────
   NOVEE Navigation Context
───────────────────────────────────────────── */
interface NoveeNavCtx {
  navigate: (phase: Phase, pinLevel?: PinRole) => void;
  eatFlags: any;
  onFlagsChange: (f: any) => void;
  resetGuest: () => void;
}

const NoveeNavContext = React.createContext<NoveeNavCtx | null>(null);

function useNoveeNav(): NoveeNavCtx {
  const ctx = React.useContext(NoveeNavContext);
  if (!ctx) throw new Error("useNoveeNav: not inside NoveeNavContext.Provider");
  return ctx;
}

function StubView({ title, icon, sub }: { title: string; icon: string; sub: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontSize: 48, color: G }}>{icon}</div>
      <div style={{ fontSize: 36, fontWeight: 900, color: G, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.10em" }}>{title}</div>
      <div style={{ fontSize: 20, color: "rgba(240,232,212,0.45)", fontFamily: "'Inter',sans-serif", letterSpacing: "0.12em", textTransform: "uppercase" }}>{sub}</div>
    </div>
  );
}

function PairingView() {
  return <StubView title="PAIRING ENGINE" icon="⟡" sub="AI Sommelier · Flavor Intelligence" />;
}
function LoungeView() {
  return <StubView title="LOUNGE MODE" icon="◯" sub="Ambient Venue Controls" />;
}
function ProfileView() {
  const { navigate, resetGuest } = useNoveeNav();
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <div style={{ fontSize: 48, color: G }}>◈</div>
      <div style={{ fontSize: 36, fontWeight: 900, color: G, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.10em" }}>MY PROFILE</div>
      <div style={{ fontSize: 20, color: "rgba(240,232,212,0.45)", fontFamily: "'Inter',sans-serif", letterSpacing: "0.12em", textTransform: "uppercase" }}>Guest Identity & Session History</div>
      <motion.button type="button" onPointerDown={() => { resetGuest(); navigate("crafthub"); }} whileTap={{ scale: 0.96 }}
        style={{ marginTop: 20, padding: "16px 40px", background: "rgba(240,112,112,0.14)", border: "1px solid rgba(240,112,112,0.45)", borderRadius: 12, cursor: "pointer", fontSize: 20, fontWeight: 800, color: "#F07070", fontFamily: "'Inter',sans-serif", letterSpacing: "0.18em", textTransform: "uppercase" }}>
        CLEAR SESSION · RETURN TO CRAFTHUB
      </motion.button>
    </div>
  );
}
function SettingsView() {
  return <StubView title="SETTINGS" icon="⊹" sub="Kiosk Configuration" />;
}

const NAV_ITEMS = [
  { id: "crafthub",          label: "CraftHub",             abbr: "HUB", targetPhase: "crafthub" as Phase,          isActive: (p: string) => p === "crafthub" },
  { id: "smokecraft",        label: "SmokeCraft",           abbr: "SC",  targetPhase: "crafthub" as Phase,          isActive: (p: string) => SESSION_PHASES.has(p) },
  { id: "eat",               label: "E.A.T Intel",          abbr: "EAT", targetPhase: "eat_dashboard" as Phase,     pinLevel: "staff" as PinRole,      isActive: (p: string) => p === "eat_dashboard" },
  { id: "executive_command", label: "Command Center",       abbr: "EXC", targetPhase: "executive_command" as Phase, pinLevel: "management" as PinRole, isActive: (p: string) => p === "executive_command" },
  { id: "pairing",           label: "Pairing",              abbr: "PR",  targetPhase: "pairing_view" as Phase,      isActive: (p: string) => p === "pairing_view" },
  { id: "lounge",            label: "Lounge",               abbr: "LG",  targetPhase: "lounge_view" as Phase,       isActive: (p: string) => p === "lounge_view" },
  { id: "profile",           label: "My Profile",           abbr: "ME",  targetPhase: "profile_view" as Phase,      isActive: (p: string) => p === "profile_view" },
  { id: "settings",          label: "Settings",             abbr: "ST",  targetPhase: "settings_view" as Phase,     isActive: (p: string) => p === "settings_view" },
];

function OsNavBar() {
  const { profile }  = useNoveeGuest();
  const { navigate } = useNoveeNav();
  const { phase }    = profile;

  return (
    <div style={{
      width: "100%", flexShrink: 0, height: 62,
      background: "rgba(3,2,0,0.97)",
      backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
      borderBottom: `1px solid rgba(212,175,55,0.20)`,
      display: "flex", flexDirection: "row", alignItems: "center",
      position: "relative", zIndex: 200,
      paddingLeft: 12, paddingRight: 12, gap: 4,
    }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent 0%, ${GOLD}88 20%, ${GOLD} 50%, ${GOLD}88 80%, transparent 100%)`, boxShadow: `0 0 12px ${GOLD}44` }} />

      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10, paddingRight: 16, borderRight: "1px solid rgba(212,175,55,0.18)", marginRight: 8, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${GOLD}55 0%, rgba(0,0,0,0.70) 100%)`, border: `1.5px solid ${GOLD}99`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 18px ${GOLD}44` }}>
          <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 22, fontWeight: 700, color: GOLD, lineHeight: 1 }}>N</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: GOLD, fontFamily: "'Cormorant Garamond',Georgia,serif", letterSpacing: "0.06em" }}>NOVEE OS</span>
          <span style={{ fontSize: 9, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>Kiosk Edition</span>
        </div>
      </div>

      {NAV_ITEMS.map((item) => {
        const active  = item.isActive(phase);
        const enabled = item.targetPhase !== null;
        return (
          <motion.button key={item.id} type="button"
            onPointerDown={() => { if (enabled && item.targetPhase) navigate(item.targetPhase, item.pinLevel); }}
            whileTap={enabled ? { scale: 0.93 } : {}}
            animate={{ background: active ? `rgba(212,175,55,0.16)` : "transparent" }}
            transition={{ duration: 0.18 }}
            style={{
              border: `1.5px solid ${active ? GOLD + "66" : "rgba(255,255,255,0.09)"}`,
              borderRadius: 10, cursor: enabled ? "pointer" : "default",
              padding: "7px 14px",
              display: "flex", flexDirection: "row", alignItems: "center", gap: 8,
              fontFamily: "'Inter',sans-serif", opacity: enabled ? 1 : 0.38,
              position: "relative", flexShrink: 0,
              boxShadow: active ? `0 0 14px ${GOLD}33, inset 0 1px 0 ${GOLD}22` : "none",
              transition: "border-color 0.18s, box-shadow 0.18s",
            }}>
            {active && (
              <motion.div layoutId="nav-active-glow"
                style={{ position: "absolute", inset: 0, borderRadius: 10, background: `radial-gradient(ellipse at 50% 50%, ${GOLD}18 0%, transparent 70%)`, pointerEvents: "none" }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <div style={{ width: 30, height: 30, borderRadius: 7, background: active ? `rgba(212,175,55,0.28)` : "rgba(255,255,255,0.07)", border: `1px solid ${active ? GOLD + "77" : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.04em", color: active ? GOLD : "rgba(240,232,212,0.80)", fontFamily: "'Inter',sans-serif" }}>{item.abbr}</span>
            </div>
            <span style={{ fontSize: 12, letterSpacing: "0.08em", color: active ? GOLD : "rgba(240,232,212,0.70)", textTransform: "uppercase", fontWeight: active ? 800 : 600, whiteSpace: "nowrap" }}>{item.label}</span>
            {item.pinLevel && (
              <span style={{ fontSize: 8, color: item.pinLevel === "management" ? "#C87028" : `${GOLD}88`, letterSpacing: "0.08em" }}>
                {item.pinLevel === "management" ? "🔒" : "🔑"}
              </span>
            )}
            {active && (
              <div style={{ position: "absolute", bottom: -1, left: "20%", right: "20%", height: 2, background: GOLD, borderRadius: 2, boxShadow: `0 0 8px ${GOLD}` }} />
            )}
          </motion.button>
        );
      })}

      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 9, color: "rgba(212,175,55,0.30)", letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif", flexShrink: 0 }}>v2.4</span>
    </div>
  );
}

const RAIL_ITEMS = [
  { id: "crafthub",          label: "CraftHub",   abbr: "HUB", targetPhase: "crafthub" as Phase,          pinLevel: undefined,                    icon: "⊹", isActive: (p: string) => p === "crafthub" },
  { id: "smokecraft",        label: "SmokeCraft",  abbr: "SC",  targetPhase: "crafthub" as Phase,          pinLevel: undefined,                    icon: "◈", isActive: (p: string) => SESSION_PHASES.has(p) },
  { id: "eat",               label: "E.A.T Intel", abbr: "EAT", targetPhase: "eat_dashboard" as Phase,    pinLevel: "staff" as PinRole,           icon: "⊞", isActive: (p: string) => p === "eat_dashboard" },
  { id: "executive_command", label: "CMD Center",  abbr: "EXC", targetPhase: "executive_command" as Phase, pinLevel: "management" as PinRole,      icon: "⟡", isActive: (p: string) => p === "executive_command" },
  { id: "pairing",           label: "Pairing",     abbr: "PR",  targetPhase: "pairing_view" as Phase,     pinLevel: undefined,                    icon: "◆", isActive: (p: string) => p === "pairing_view" },
  { id: "lounge",            label: "Lounge",      abbr: "LG",  targetPhase: "lounge_view" as Phase,      pinLevel: undefined,                    icon: "◯", isActive: (p: string) => p === "lounge_view" },
];

function LeftRail() {
  const { profile }  = useNoveeGuest();
  const { navigate } = useNoveeNav();
  const { phase }    = profile;

  return (
    <div style={{
      width: 58, flexShrink: 0,
      background: "rgba(5,3,1,0.95)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      borderRight: `1px solid rgba(212,175,55,0.16)`,
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 20, paddingBottom: 20, gap: 6,
      position: "relative", zIndex: 100,
    }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 1, background: `linear-gradient(180deg, transparent 0%, ${GOLD}55 20%, ${GOLD}99 50%, ${GOLD}55 80%, transparent 100%)` }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(180deg, transparent 0px, rgba(255,255,255,0.012) 1px, transparent 2px, transparent 12px)`, pointerEvents: "none" }} />

      {RAIL_ITEMS.map((item) => {
        const active  = item.isActive(phase);
        return (
          <motion.button key={item.id} type="button"
            onPointerDown={() => navigate(item.targetPhase, item.pinLevel)}
            whileTap={{ scale: 0.90 }}
            animate={{ background: active ? `rgba(212,175,55,0.18)` : "rgba(255,255,255,0.02)", borderColor: active ? `${GOLD}77` : "rgba(255,255,255,0.08)", boxShadow: active ? `0 0 16px ${GOLD}33, inset 0 1px 0 ${GOLD}22` : "none" }}
            transition={{ duration: 0.20 }}
            style={{ width: 42, minHeight: 54, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 10, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px 4px", position: "relative" }}>
            {active && (
              <div style={{ position: "absolute", left: -1, top: "25%", bottom: "25%", width: 2, background: GOLD, borderRadius: "0 2px 2px 0", boxShadow: `0 0 8px ${GOLD}` }} />
            )}
            <span style={{ fontSize: 16, color: active ? GOLD : "rgba(212,175,55,0.45)", lineHeight: 1, filter: active ? `drop-shadow(0 0 6px ${GOLD}88)` : "none" }}>{item.icon}</span>
            <span style={{ fontSize: 7.5, fontWeight: 900, letterSpacing: "0.14em", color: active ? GOLD : "rgba(212,175,55,0.35)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase", textAlign: "center", lineHeight: 1.2, maxWidth: 38 }}>{item.abbr}</span>
            {item.pinLevel && (
              <div style={{ position: "absolute", top: 2, right: 2, width: 4, height: 4, borderRadius: "50%", background: item.pinLevel === "management" ? "#C87028" : GOLD, opacity: 0.7 }} />
            )}
          </motion.button>
        );
      })}

      <div style={{ flex: 1 }} />
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }} />
      <span style={{ fontSize: 7, color: `${GOLD}30`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em" }}>v2.4</span>
    </div>
  );
}

function SystemBar() {
  const { profile }              = useNoveeGuest();
  const { navigate, resetGuest } = useNoveeNav();
  const { phase }                = profile;
  const inSession = SESSION_PHASES.has(phase);
  const [staffAuthPulsing, setStaffAuthPulsing] = useState(true);
  const [staffAuthActive,  setStaffAuthActive]  = useState(false);

  function onStaffAuth() {
    setStaffAuthActive(true);
    setStaffAuthPulsing(false);
    navigate("eat_dashboard", "staff");
    setTimeout(() => { setStaffAuthActive(false); setStaffAuthPulsing(true); }, 4000);
  }

  return (
    <div style={{ position: "absolute", top: 3, left: 0, right: 0, height: 38, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", zIndex: 50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 6px #32B45A" }} />
          <span style={{ fontSize: 9, letterSpacing: "0.28em", color: "rgba(212,175,55,0.45)", fontWeight: 800, fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>GA</span>
        </div>
        <div style={{ width: 18, height: 18, borderRadius: "50%", border: `1px solid rgba(212,175,55,0.30)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", border: `1px solid ${GOLD}66` }} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <motion.button type="button" onPointerDown={() => navigate("crafthub")} whileTap={{ scale: 0.95 }}
          style={{ border: "1px solid rgba(212,175,55,0.35)", borderRadius: 6, padding: "5px 14px", background: "rgba(212,175,55,0.08)", cursor: "pointer", fontSize: 9, fontWeight: 800, letterSpacing: "0.22em", color: GOLD, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", opacity: inSession ? 1 : 0.35 }}>
          RESET BLEND
        </motion.button>

        <motion.button type="button" onPointerDown={() => navigate("eat_dashboard", "staff")} whileTap={{ scale: 0.95 }}
          style={{ border: `1px solid ${GOLD}66`, borderRadius: 6, padding: "5px 14px", background: `rgba(212,175,55,0.14)`, cursor: "pointer", fontSize: 9, fontWeight: 800, letterSpacing: "0.22em", color: GOLD, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", boxShadow: `0 0 10px ${GOLD}22` }}>
          COACH HELP
        </motion.button>

        <style>{`
          @keyframes staffAuthPulse { 0%   { box-shadow: 0 0 8px rgba(212,175,55,0.55), 0 0 2px rgba(212,175,55,0.80); border-color: rgba(212,175,55,0.55); } 50%  { box-shadow: 0 0 22px rgba(212,175,55,0.90), 0 0 8px rgba(212,175,55,1.0), inset 0 0 6px rgba(212,175,55,0.18); border-color: rgba(212,175,55,1.0); } 100% { box-shadow: 0 0 8px rgba(212,175,55,0.55), 0 0 2px rgba(212,175,55,0.80); border-color: rgba(212,175,55,0.55); } }
          @keyframes staffAuthDot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.72); } }
        `}</style>
        <motion.button type="button" onPointerDown={onStaffAuth} whileTap={{ scale: 0.93 }}
          style={{ border: `1px solid ${GOLD}`, borderRadius: 6, padding: "5px 14px", background: staffAuthActive ? `rgba(212,175,55,0.32)` : `rgba(212,175,55,0.10)`, cursor: "pointer", fontSize: 9, fontWeight: 900, letterSpacing: "0.22em", color: GOLD, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", gap: 6, animation: staffAuthPulsing ? "staffAuthPulse 2.0s ease-in-out infinite" : "none", transition: "background 0.25s" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, animation: staffAuthPulsing ? "staffAuthDot 2.0s ease-in-out infinite" : "none", boxShadow: `0 0 6px ${GOLD}`, flexShrink: 0 }} />
          STAFF AUTH
        </motion.button>

        <motion.button type="button" onPointerDown={() => { resetGuest(); navigate("crafthub"); }} whileTap={{ scale: 0.93 }}
          style={{ border: "1px solid rgba(240,112,112,0.35)", borderRadius: 6, padding: "5px 14px", background: "rgba(240,112,112,0.08)", cursor: "pointer", fontSize: 9, fontWeight: 800, letterSpacing: "0.22em", color: "#F07070", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>
          PROFILE RESET
        </motion.button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 100, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 9, letterSpacing: "0.26em", color: "rgba(255,255,255,0.18)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>TABLE KIOSK · ACTIVE</span>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }} />
        <span style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(255,255,255,0.12)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>KIOSK EDITION · NOVEE OS</span>
      </div>
    </div>
  );
}

function EATTelemetryBar() {
  const { navigate } = useNoveeNav();
  const [temp, setTemp]       = useState(68);
  const [humidity,setHumidity]= useState(72);
  const [count, setCount]     = useState(145);

  React.useEffect(() => {
    const id = setInterval(() => {
      setTemp(t      => Math.round(Math.min(74, Math.max(64, t + (Math.random() - 0.5) * 0.8))));
      setHumidity(h  => Math.round(Math.min(80, Math.max(65, h + (Math.random() - 0.5) * 0.6))));
      setCount(c     => Math.max(120, c - (Math.random() > 0.97 ? 1 : 0)));
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const telemetry = [
    { label: "Lounge Temp",     value: `${temp}°F`,       color: temp > 71 ? "#F07070" : "#5BBFFF" },
    { label: "Humidity",        value: `${humidity}%`,    color: humidity > 76 ? "#F07070" : "#32B45A" },
    { label: "Humidor Count",   value: `${count} Puros`,  color: GOLD },
    { label: "Lounge Mode",     value: "Active",          color: "#32B45A" },
    { label: "POS Transaction", value: "Authenticated",   color: GOLD },
  ];

  return (
    <motion.div onPointerDown={() => navigate("eat_dashboard", "staff")} whileTap={{ scale: 0.995 }}
      style={{ width: "100%", flexShrink: 0, height: 42, background: "rgba(3,2,0,0.98)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderTop: `1px solid rgba(212,175,55,0.30)`, borderBottom: `1px solid rgba(212,175,55,0.12)`, display: "flex", flexDirection: "row", alignItems: "center", position: "relative", zIndex: 180, cursor: "pointer", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 200, background: `radial-gradient(ellipse at 0% 50%, rgba(212,175,55,0.07) 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ flexShrink: 0, padding: "0 16px", borderRight: `1px solid rgba(212,175,55,0.22)`, display: "flex", flexDirection: "row", alignItems: "center", gap: 8, height: "100%", background: "rgba(212,175,55,0.05)" }}>
        <div style={{ width: 22, height: 22, borderRadius: 5, background: `rgba(212,175,55,0.20)`, border: `1px solid ${GOLD}66`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 8px ${GOLD}33` }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: GOLD, fontFamily: "'Inter',sans-serif" }}>⊞</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.22em", color: GOLD, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", whiteSpace: "nowrap" }}>E.A.T INTELLIGENCE</span>
          <span style={{ fontSize: 7.5, letterSpacing: "0.18em", color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", whiteSpace: "nowrap" }}>Environment • Asset • Transaction</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "row", alignItems: "center", padding: "0 20px", gap: 0, overflow: "hidden" }}>
        {telemetry.map((item, i) => (
          <div key={item.label} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 0, flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", padding: "0 18px", borderLeft: i === 0 ? "none" : `1px solid rgba(212,175,55,0.12)` }}>
              <span style={{ fontSize: 8.5, letterSpacing: "0.22em", color: "rgba(212,175,55,0.40)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase", whiteSpace: "nowrap" }}>{item.label}</span>
              <motion.span key={item.value} initial={{ opacity: 0.6, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                style={{ fontSize: 13, fontWeight: 800, color: item.color, fontFamily: "'Inter',sans-serif", letterSpacing: "0.06em", whiteSpace: "nowrap", textShadow: `0 0 12px ${item.color}55` }}>
                {item.value}
              </motion.span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ flexShrink: 0, padding: "0 16px", height: "100%", display: "flex", alignItems: "center", gap: 8, borderLeft: `1px solid rgba(212,175,55,0.14)` }}>
        <span style={{ fontSize: 8.5, letterSpacing: "0.22em", color: `${GOLD}50`, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", whiteSpace: "nowrap" }}>OPEN COMMAND CENTER</span>
        <span style={{ fontSize: 14, color: `${GOLD}66` }}>›</span>
      </div>
    </motion.div>
  );
}

const TICKER_ITEMS = [
  { cat: "CIGAR",   text: "Arturo Fuente Opus X — Limited Reserve, Tonight Only" },
  { cat: "SPIRITS", text: "Hennessy XO Cognac — Complimentary First Pour with Session" },
  { cat: "KITCHEN", text: "Wagyu Beef Sliders, Chef's Feature — Available Until 11 PM" },
  { cat: "CIGAR",   text: "Padron 1964 Aniversario Natural — 2 for $68 This Evening" },
  { cat: "DRINKS",  text: "Anejo Old Fashioned — House Cocktail Special $16" },
  { cat: "BITES",   text: "Lobster Bisque Shots, Truffle Deviled Eggs — Lounge Menu" },
  { cat: "CIGAR",   text: "Rocky Patel Vintage 1990 — Staff Recommendation Tonight" },
  { cat: "WINE",    text: "Opus One 2019 — Sommelier Select, Limited Bottles Available" },
  { cat: "KITCHEN", text: "Pan-Seared Sea Bass — Market Price, Reserve at the Bar" },
];

function BottomBar() {
  const textSegment = TICKER_ITEMS.map((item, i) => (
    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "0 36px", flexShrink: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.20em", color: GOLD, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", background: "rgba(212,175,55,0.15)", border: `1px solid ${GOLD}55`, borderRadius: 4, padding: "3px 10px", flexShrink: 0 }}>{item.cat}</span>
      <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: "0.04em", color: "rgba(255,248,235,0.95)", fontFamily: "'Cormorant Garamond',Georgia,serif", whiteSpace: "nowrap" }}>{item.text}</span>
      <span style={{ color: `${GOLD}77`, fontSize: 8, marginLeft: 4, letterSpacing: "0.10em", fontFamily: "'Inter',sans-serif" }}>—</span>
    </span>
  ));

  const dayOneItem = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "0 48px", flexShrink: 0 }}>
      <img src={IMG("dayone360.png")} alt="Day One 360 Travel" style={{ height: 32, width: 32, borderRadius: 6, objectFit: "contain", background: "#fff", padding: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.10em", color: "#C8D8F0", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>DAY ONE 360 TRAVEL</span>
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: "rgba(200,216,240,0.65)", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>— Your Luxury Travel Partner — Ask Staff for Details</span>
      <span style={{ color: `${GOLD}77`, fontSize: 8, marginLeft: 4 }}>—</span>
    </span>
  );

  return (
    <div style={{ width: "100%", flexShrink: 0, height: 58, background: "rgba(4,2,0,0.98)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderTop: `2px solid ${GOLD}`, boxShadow: `0 -6px 32px rgba(212,175,55,0.18)`, display: "flex", flexDirection: "row", alignItems: "center", position: "relative", zIndex: 200, overflow: "hidden" }}>
      <style>{`
        @keyframes novee-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .novee-ticker-track { display: inline-flex; flex-direction: row; align-items: center; white-space: nowrap; animation: novee-ticker 80s linear infinite; will-change: transform; }
      `}</style>
      <div style={{ flexShrink: 0, padding: "0 18px", borderRight: `1px solid ${GOLD}44`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 2, background: "rgba(212,175,55,0.06)" }}>
        <span style={{ fontSize: 9, letterSpacing: "0.28em", color: `${GOLD}99`, fontWeight: 900, fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>TONIGHT'S</span>
        <span style={{ fontSize: 13, letterSpacing: "0.20em", color: GOLD, fontWeight: 900, fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>SPECIALS</span>
      </div>
      <div style={{ flex: 1, overflow: "hidden", height: "100%", display: "flex", alignItems: "center", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 48, background: "linear-gradient(90deg, rgba(4,2,0,0.98) 0%, transparent 100%)", zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 48, background: "linear-gradient(270deg, rgba(4,2,0,0.98) 0%, transparent 100%)", zIndex: 2, pointerEvents: "none" }} />
        <div className="novee-ticker-track">{textSegment}{dayOneItem}{textSegment}{dayOneItem}</div>
      </div>
    </div>
  );
}

function phaseKey(phase: string): string {
  if (phase === "crafthub")          return "crafthub";
  if (phase === "eat_dashboard")     return "eat_dashboard";
  if (phase === "executive_command") return "executive_command";
  if (phase === "pairing_view")      return "pairing_view";
  if (phase === "lounge_view")       return "lounge_view";
  if (phase === "profile_view")      return "profile_view";
  if (phase === "settings_view")     return "settings_view";
  if (S1_PHASES.has(phase))          return "s1";
  if (S2_PHASES.has(phase))          return "s2";
  if (S3_PHASES.has(phase))          return "s3";
  if (S4_PHASES.has(phase))          return "s4";
  return "crafthub";
}

function PhaseScreen({ eatFlags, onFlagsChange }: { eatFlags: any; onFlagsChange: (f: any) => void }) {
  const { profile } = useNoveeGuest();
  const { phase }   = profile;
  
  const Comp1 = S1_InitGate as any;
  const Comp2 = S2_TerroirMatrix as any;
  const Comp3 = S3_FormulationLab as any;
  const Comp4 = S4_DesignStudio as any;
  const CompEAT = NoveeEATDashboard as any;
  const CompExec = NoveeExecutiveCommandCenter as any;
  const CompBoot = NoveeKioskBootSequence as any;

  return (
    <Suspense fallback={null}>
      {phase === "crafthub" && <NoveeCraftPortalHome />}
      {phase === "eat_dashboard" && <CompEAT eatFlags={eatFlags} />}
      {phase === "executive_command" && <CompExec flags={eatFlags} onFlagsChange={onFlagsChange} />}
      {phase === "pairing_view" && <PairingView />}
      {phase === "lounge_view" && <LoungeView />}
      {phase === "profile_view" && <ProfileView />}
      {phase === "settings_view" && <SettingsView />}
      {(S1_PHASES.has(phase) || (phase as string) === "s1") && <Comp1 />}
      {(S2_PHASES.has(phase) || (phase as string) === "s2") && <Comp2 />}
      {(S3_PHASES.has(phase) || (phase as string) === "s3") && <Comp3 />}
      {(S4_PHASES.has(phase) || (phase as string) === "s4") && <Comp4 />}
    </Suspense>
  );
}

function PhaseRouter({ eatFlags, onFlagsChange }: { eatFlags: any; onFlagsChange: (f: any) => void }) {
  const { profile } = useNoveeGuest();
  const key = phaseKey(profile.phase);
  return (
    <AnimatePresence mode="wait">
      <motion.div key={key} variants={PAGE_V} initial="enter" animate="active" exit="exit" transition={PAGE_T}
        style={{ position: "absolute", inset: 0 }}>
        <PhaseScreen eatFlags={eatFlags} onFlagsChange={onFlagsChange} />
      </motion.div>
    </AnimatePresence>
  );
}

function FullBleedBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(175deg, #100C06 0%, #080502 50%, #0C0804 100%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.018) 1px, transparent 2px, transparent 10px)` }} />
      <div style={{ position: "absolute", top: "-8%", left: "50%", transform: "translateX(-50%)", width: "110%", height: "65%", background: "radial-gradient(ellipse at 50% 10%, rgba(212,140,30,0.13) 0%, rgba(160,80,10,0.06) 35%, transparent 65%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 55% 100% at 0% 50%, rgba(5,3,1,0.80) 0%, transparent 55%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 55% 100% at 100% 50%, rgba(5,3,1,0.75) 0%, transparent 55%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 100% 55% at 50% 100%, rgba(4,2,0,0.85) 0%, transparent 55%)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent 0%, ${G}60 20%, ${G} 50%, ${G}60 80%, transparent 100%)`, boxShadow: `0 0 40px 6px ${G}28, 0 1px 0 rgba(255,255,255,0.08)` }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent 0%, ${G}40 30%, ${G}70 50%, ${G}40 70%, transparent 100%)` }} />
    </div>
  );
}

function handlePointerDown() { playClick(); hapticClick(); }

function OsShellContent() {
  const { setPhase, resetProfile } = useNoveeGuest();
  const [eatFlags, setEatFlags]    = useState<any>({
    revenue: true,
    environmental: true,
    inventory: true,
    telemetry: true,
    social: true
  });

  interface PinTarget { phase: Phase; level: PinRole }
  const [pinGate, setPinGate] = useState<PinTarget | null>(null);

  function navigate(phase: Phase, pinLevel?: PinRole) {
    if (pinLevel) {
      setPinGate({ phase, level: pinLevel });
    } else {
      setPhase(phase);
    }
  }

  function onPinSuccess(role: PinRole, targetPhase: Phase) {
    void role;
    setPinGate(null);
    setPhase(targetPhase);
  }

  function resetGuest() {
    resetProfile();
    try {
      sessionStorage.removeItem("novee_golden_box_seen");
    } catch { /* */ }
  }

  const navCtx: NoveeNavCtx = {
    navigate,
    eatFlags,
    onFlagsChange: setEatFlags,
    resetGuest,
  };

  return (
    <NoveeNavContext.Provider value={navCtx}>
      <div onPointerDown={handlePointerDown}
        style={{ position: "fixed", inset: 0, cursor: "none", userSelect: "none", WebkitUserSelect: "none", overscrollBehavior: "none", touchAction: "manipulation", overflow: "hidden", display: "flex", flexDirection: "column" }}>

        <OsNavBar />

        <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", position: "relative" }}>
          <LeftRail />
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <FullBleedBackground />
            <SystemBar />
            <div style={{ position: "relative", zIndex: 10, width: "100%", height: "100%" }}>
              <PhaseRouter eatFlags={eatFlags} onFlagsChange={setEatFlags} />
            </div>
          </div>
        </div>

        <EATTelemetryBar />
        <BottomBar />

        <AnimatePresence>
          {pinGate && (
            <Suspense fallback={null}>
              <NoveeStaffPinGate
                key={`pin-${pinGate.phase}`}
                level={pinGate.level}
                onSuccess={(role) => onPinSuccess(role, pinGate.phase)}
                onCancel={() => setPinGate(null)}
              />
            </Suspense>
          )}
        </AnimatePresence>
      </div>
    </NoveeNavContext.Provider>
  );
}

export default function NoveeOsShell() {
  const [bootDone, setBootDone] = useState<boolean>(() => {
    try { return sessionStorage.getItem("novee_boot_done") === "1"; } catch { return false; }
  });

  const CompBoot = NoveeKioskBootSequence as any;

  function handleBootComplete() {
    try { sessionStorage.setItem("novee_boot_done", "1"); } catch { /* */ }
    setBootDone(true);
  }

  return (
    <NoveeGuestProfileProvider>
      <AnimatePresence mode="wait">
        {!bootDone ? (
          <Suspense fallback={null}>
            <CompBoot key="boot" onComplete={handleBootComplete} />
          </Suspense>
        ) : (
          <motion.div key="shell"
            initial={{ opacity: 0, filter: "blur(12px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.20, ease: EASE_CINEMA }}
            style={{ position: "fixed", inset: 0 }}>
            <OsShellContent />
          </motion.div>
        )}
      </AnimatePresence>
    </NoveeGuestProfileProvider>
  );
}
