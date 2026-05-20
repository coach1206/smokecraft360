import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GuestProfileProvider, useGuest } from "@/context/GuestProfileContext";
import CraftPortalHome from "@/pages/CraftPortalHome";
import EATDashboard from "@/pages/EATDashboard";
import { S1_InitGate } from "@/pages/S1_InitGate";
import { S2_TerroirMatrix } from "@/pages/S2_TerroirMatrix";
import { S3_FormulationLab } from "@/pages/S3_FormulationLab";
import { S4_DesignStudio } from "@/pages/S4_DesignStudio";
import { playClick } from "@/hooks/useAudio";
import { hapticClick } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";

const PAGE_V = {
  enter:  { opacity: 0, x: 40,  scale: 0.96 },
  active: { opacity: 1, x: 0,   scale: 1    },
  exit:   { opacity: 0, x: -30, scale: 0.98 },
};
const PAGE_T = { type: "spring" as const, mass: 1.1, stiffness: 280, damping: 32, duration: 0.35 };

const queryClient = new QueryClient();

const S1_PHASES = new Set(["s1_demo","s1_rules","s1_leaderboard","s1_mentor","s1_seed","s1_quiz","s1_posgate"]);
const S2_PHASES = new Set(["s2_terroir","s2_voucher"]);
const S3_PHASES = new Set(["s3_spiritquiz","s3_sensorytrap","s3_leafsliders"]);
const S4_PHASES = new Set(["s4_vitola","s4_designstudio","s4_results"]);
const SESSION_PHASES = new Set([...S1_PHASES,...S2_PHASES,...S3_PHASES,...S4_PHASES]);

/* ─────────────────────────────────────────────
   OS Nav Bar — persistent top navigation
───────────────────────────────────────────── */
interface NavItem {
  id: string;
  label: string;
  abbr: string;
  targetPhase: string | null;
  isActive: (p: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "crafthub",   label: "CraftHub",   abbr: "HUB", targetPhase: "crafthub",      isActive: (p) => p === "crafthub" },
  { id: "smokecraft", label: "SmokeCraft",  abbr: "SC",  targetPhase: "crafthub",      isActive: (p) => SESSION_PHASES.has(p) },
  { id: "eat",        label: "E.A.T",       abbr: "EAT", targetPhase: "eat_dashboard", isActive: (p) => p === "eat_dashboard" },
  { id: "pairing",    label: "Pairing",     abbr: "PR",  targetPhase: null,            isActive: () => false },
  { id: "lounge",     label: "Lounge",      abbr: "LG",  targetPhase: "crafthub",      isActive: () => false },
  { id: "profile",    label: "My Profile",  abbr: "ME",  targetPhase: null,            isActive: () => false },
  { id: "settings",   label: "Settings",    abbr: "ST",  targetPhase: null,            isActive: () => false },
];

function OsNavBar() {
  const { profile, setPhase } = useGuest();
  const { phase } = profile;

  return (
    <div style={{
      width: "100%", flexShrink: 0,
      height: 62,
      background: "rgba(3,2,0,0.97)",
      backdropFilter: "blur(32px)",
      WebkitBackdropFilter: "blur(32px)",
      borderBottom: `1px solid rgba(212,175,55,0.20)`,
      display: "flex", flexDirection: "row", alignItems: "center",
      position: "relative", zIndex: 200,
      paddingLeft: 12, paddingRight: 12,
      gap: 4,
    }}>

      {/* Bottom gold accent line */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent 0%, ${GOLD}88 20%, ${GOLD} 50%, ${GOLD}88 80%, transparent 100%)`,
        boxShadow: `0 0 12px ${GOLD}44`,
      }} />

      {/* NOVEE OS logo */}
      <div style={{
        display: "flex", flexDirection: "row", alignItems: "center", gap: 10,
        paddingRight: 16,
        borderRight: "1px solid rgba(212,175,55,0.18)",
        marginRight: 8, flexShrink: 0,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `linear-gradient(135deg, ${GOLD}55 0%, rgba(0,0,0,0.70) 100%)`,
          border: `1.5px solid ${GOLD}99`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 18px ${GOLD}44`,
        }}>
          <span style={{
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: 22, fontWeight: 700, color: GOLD, lineHeight: 1,
          }}>N</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: GOLD, fontFamily: "'Cormorant Garamond',Georgia,serif", letterSpacing: "0.06em" }}>NOVEE OS</span>
          <span style={{ fontSize: 9, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>Kiosk Edition</span>
        </div>
      </div>

      {/* Nav items */}
      {NAV_ITEMS.map((item) => {
        const active  = item.isActive(phase);
        const enabled = item.targetPhase !== null;
        return (
          <motion.button
            key={item.id}
            type="button"
            onPointerDown={() => {
              if (enabled && item.targetPhase) setPhase(item.targetPhase as Parameters<typeof setPhase>[0]);
            }}
            whileTap={enabled ? { scale: 0.93 } : {}}
            animate={{ background: active ? `rgba(212,175,55,0.16)` : "transparent" }}
            transition={{ duration: 0.18 }}
            style={{
              border: `1.5px solid ${active ? GOLD + "66" : "rgba(255,255,255,0.09)"}`,
              borderRadius: 10,
              cursor: enabled ? "pointer" : "default",
              padding: "7px 14px",
              display: "flex", flexDirection: "row", alignItems: "center", gap: 8,
              fontFamily: "'Inter',sans-serif",
              opacity: enabled ? 1 : 0.38,
              position: "relative",
              flexShrink: 0,
              boxShadow: active ? `0 0 14px ${GOLD}33, inset 0 1px 0 ${GOLD}22` : "none",
              transition: "border-color 0.18s, box-shadow 0.18s",
            }}
          >
            {/* Active glow pill */}
            {active && (
              <motion.div
                layoutId="nav-active-glow"
                style={{
                  position: "absolute", inset: 0, borderRadius: 10,
                  background: `radial-gradient(ellipse at 50% 50%, ${GOLD}18 0%, transparent 70%)`,
                  pointerEvents: "none",
                }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}

            {/* Abbr badge */}
            <div style={{
              width: 30, height: 30, borderRadius: 7,
              background: active ? `rgba(212,175,55,0.28)` : "rgba(255,255,255,0.07)",
              border: `1px solid ${active ? GOLD + "77" : "rgba(255,255,255,0.12)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 900, letterSpacing: "0.04em",
                color: active ? GOLD : "rgba(240,232,212,0.80)",
                fontFamily: "'Inter',sans-serif",
              }}>{item.abbr}</span>
            </div>

            {/* Label */}
            <span style={{
              fontSize: 12, letterSpacing: "0.08em",
              color: active ? GOLD : "rgba(240,232,212,0.70)",
              textTransform: "uppercase", fontWeight: active ? 800 : 600,
              whiteSpace: "nowrap",
            }}>{item.label}</span>

            {/* Active bottom indicator */}
            {active && (
              <div style={{
                position: "absolute", bottom: -1, left: "20%", right: "20%", height: 2,
                background: GOLD, borderRadius: 2,
                boxShadow: `0 0 8px ${GOLD}`,
              }} />
            )}
          </motion.button>
        );
      })}

      {/* Version tag — push to far right */}
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 9, color: "rgba(212,175,55,0.30)", letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif", flexShrink: 0 }}>v2.4</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Phase routing
───────────────────────────────────────────── */
function phaseKey(phase: string): string {
  if (phase === "crafthub")      return "crafthub";
  if (phase === "eat_dashboard") return "eat_dashboard";
  if (S1_PHASES.has(phase))      return "s1";
  if (S2_PHASES.has(phase))      return "s2";
  if (S3_PHASES.has(phase))      return "s3";
  if (S4_PHASES.has(phase))      return "s4";
  return "crafthub";
}

function PhaseScreen() {
  const { profile } = useGuest();
  const { phase }   = profile;
  if (phase === "crafthub")      return <CraftPortalHome />;
  if (phase === "eat_dashboard") return <EATDashboard />;
  if (S1_PHASES.has(phase))      return <S1_InitGate />;
  if (S2_PHASES.has(phase))      return <S2_TerroirMatrix />;
  if (S3_PHASES.has(phase))      return <S3_FormulationLab />;
  if (S4_PHASES.has(phase))      return <S4_DesignStudio />;
  return <CraftPortalHome />;
}

function PhaseRouter() {
  const { profile } = useGuest();
  const key = phaseKey(profile.phase);
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        variants={PAGE_V}
        initial="enter"
        animate="active"
        exit="exit"
        transition={PAGE_T}
        style={{ position: "absolute", inset: 0 }}
      >
        <PhaseScreen />
      </motion.div>
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────
   Top system bar (inside content area)
───────────────────────────────────────────── */
function SystemBar() {
  const { profile, setPhase } = useGuest();
  const { phase } = profile;
  const inSession = SESSION_PHASES.has(phase);

  return (
    <div style={{
      position: "absolute", top: 3, left: 0, right: 0, height: 38,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      zIndex: 50,
    }}>

      {/* Left: location + biometric */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 6px #32B45A" }} />
          <span style={{ fontSize: 9, letterSpacing: "0.28em", color: "rgba(212,175,55,0.45)", fontWeight: 800, fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>GA</span>
        </div>
        <div style={{
          width: 18, height: 18, borderRadius: "50%",
          border: `1px solid rgba(212,175,55,0.30)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", border: `1px solid ${GOLD}66` }} />
        </div>
      </div>

      {/* Center: staff action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <motion.button
          type="button"
          onPointerDown={() => setPhase("crafthub")}
          whileTap={{ scale: 0.95 }}
          style={{
            border: "1px solid rgba(212,175,55,0.35)",
            borderRadius: 6, padding: "5px 14px",
            background: "rgba(212,175,55,0.08)",
            cursor: "pointer",
            fontSize: 9, fontWeight: 800, letterSpacing: "0.22em",
            color: GOLD, textTransform: "uppercase",
            fontFamily: "'Inter',sans-serif",
            opacity: inSession ? 1 : 0.35,
          }}
        >
          RESET BLEND
        </motion.button>

        <motion.button
          type="button"
          onPointerDown={() => setPhase("eat_dashboard")}
          whileTap={{ scale: 0.95 }}
          style={{
            border: `1px solid ${GOLD}66`,
            borderRadius: 6, padding: "5px 14px",
            background: `rgba(212,175,55,0.14)`,
            cursor: "pointer",
            fontSize: 9, fontWeight: 800, letterSpacing: "0.22em",
            color: GOLD, textTransform: "uppercase",
            fontFamily: "'Inter',sans-serif",
            boxShadow: `0 0 10px ${GOLD}22`,
          }}
        >
          COACH HELP
        </motion.button>
      </div>

      {/* Right: kiosk status */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 100, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 9, letterSpacing: "0.26em", color: "rgba(255,255,255,0.18)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>
          TABLE KIOSK · ACTIVE
        </span>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Root app
───────────────────────────────────────────── */
function handlePointerDown() { playClick(); hapticClick(); }

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GuestProfileProvider>
        <div
          onPointerDown={handlePointerDown}
          style={{
            position: "fixed", inset: 0,
            cursor: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            overscrollBehavior: "none",
            touchAction: "manipulation",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ── Top OS navigation bar ── */}
          <OsNavBar />

          {/* ── Main content area ── */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

            {/* Cinematic background */}
            <FullBleedBackground />

            {/* Top system bar */}
            <SystemBar />

            {/* Phase content */}
            <div style={{ position: "relative", zIndex: 10, width: "100%", height: "100%" }}>
              <PhaseRouter />
            </div>
          </div>
        </div>
      </GuestProfileProvider>
    </QueryClientProvider>
  );
}

/* ─────────────────────────────────────────────
   Cinematic background — pure CSS
───────────────────────────────────────────── */
function FullBleedBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>

      {/* Base obsidian */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(175deg, #100C06 0%, #080502 50%, #0C0804 100%)" }} />

      {/* Brushed titanium grain */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.018) 1px, transparent 2px, transparent 10px)`,
      }} />

      {/* Ambient ember glow */}
      <div style={{
        position: "absolute", top: "-8%", left: "50%", transform: "translateX(-50%)",
        width: "110%", height: "65%",
        background: "radial-gradient(ellipse at 50% 10%, rgba(212,140,30,0.13) 0%, rgba(160,80,10,0.06) 35%, transparent 65%)",
      }} />

      {/* Left-wall depth */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 55% 100% at 0% 50%, rgba(5,3,1,0.80) 0%, transparent 55%)" }} />
      {/* Right-wall depth */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 55% 100% at 100% 50%, rgba(5,3,1,0.75) 0%, transparent 55%)" }} />
      {/* Floor vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 100% 55% at 50% 100%, rgba(4,2,0,0.85) 0%, transparent 55%)" }} />

      {/* Gold top hardware bezel */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.60) 20%, rgba(212,175,55,1) 50%, rgba(212,175,55,0.60) 80%, transparent 100%)",
        boxShadow: "0 0 40px 6px rgba(212,175,55,0.28), 0 1px 0 rgba(255,255,255,0.08)",
      }} />

      {/* Gold bottom bezel */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.40) 30%, rgba(212,175,55,0.70) 50%, rgba(212,175,55,0.40) 70%, transparent 100%)",
      }} />

      {/* Ambient cigar smoke */}
      <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "40%", opacity: 0.06, pointerEvents: "none" }}
        viewBox="0 0 1920 400" preserveAspectRatio="xMidYMax slice">
        <defs>
          <filter id="smoke-bg">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.006" numOctaves="3" seed="2" result="nz" />
            <feDisplacementMap in="SourceGraphic" in2="nz" scale="60" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        {[180, 420, 700, 980, 1260, 1540, 1780].map((x, i) => (
          <ellipse key={i} cx={x} cy={380} rx={60 + i * 8} ry={220 + i * 12}
            fill={`rgba(200,160,80,${0.15 + i * 0.02})`} filter="url(#smoke-bg)" />
        ))}
      </svg>
    </div>
  );
}
