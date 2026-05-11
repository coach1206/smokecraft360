/**
 * SovereignOverrideHub — fixed top-right pill.
 *
 * Click → navigate to /gate (dual-tier PIN authentication page).
 *   Staff PIN (4-digit)     → server redirects to /eeie-command
 *   Sovereign PIN (6-digit) → server redirects to /admin-master
 *
 * Kill-switch status from SuperAdminContext is reflected in pill
 * border colour and glow so operators see system state at a glance.
 */

import { useCallback }        from "react";
import { motion }             from "framer-motion";
import { useLocation }        from "wouter";
import { useSuperAdmin }      from "@/contexts/SuperAdminContext";
import { useUnifiedCognitive } from "@/contexts/UnifiedCognitiveContext";

// ── Design tokens ───────────────────────────────────────────────────────────
const OBSIDIAN  = "rgba(5,5,5,0.97)";
const KILL_RED  = "#FF2D2D";
const BORDER    = "rgba(212,175,55,0.42)";
const MUTED     = "rgba(212,175,55,0.46)";
const FONT      = "'Space Mono','Courier New',monospace";

const PULSE_DUR: Record<string, string> = {
  MEDITATIVE:  "3.5s",
  FOCUSED:     "2s",
  HIGH_ENERGY: "0.85s",
};

// ── Chevron icon ────────────────────────────────────────────────────────────
function IconChevron() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
      <path
        d="M2 3.5L4.5 6L7 3.5"
        stroke={MUTED}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Component ───────────────────────────────────────────────────────────────
export function SovereignOverrideHub() {
  const [, navigate]    = useLocation();
  const { killSwitches } = useSuperAdmin();
  const { lounge_mood } = useUnifiedCognitive();

  const isBlackoutActive = killSwitches.find(s => s.name === "session_blackout")?.enabled ?? false;
  const isApiLockActive  = killSwitches.find(s => s.name === "api_disconnect")?.enabled  ?? false;
  const isAlert          = isBlackoutActive || isApiLockActive;

  const pulseDur = PULSE_DUR[lounge_mood] ?? "2s";

  const handleClick = useCallback(() => {
    navigate("/gate");
  }, [navigate]);

  return (
    <>
      <style>{`
        @keyframes sov-pill-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>

      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={handleClick}
        aria-label="Open Sovereign Gate"
        style={{
          position:                "fixed",
          top:                     12,
          right:                   14,
          zIndex:                  20000,
          display:                 "flex",
          alignItems:              "center",
          gap:                     7,
          background:              OBSIDIAN,
          border:                  `1px solid ${isAlert ? KILL_RED : BORDER}`,
          borderRadius:            999,
          padding:                 "9px 16px",
          backdropFilter:          "blur(20px)",
          WebkitBackdropFilter:    "blur(20px)",
          cursor:                  "pointer",
          minHeight:               42,
          touchAction:             "manipulation",
          WebkitTapHighlightColor: "transparent",
          userSelect:              "none",
          boxShadow:               isAlert
            ? "0 0 20px rgba(255,45,45,0.30)"
            : "0 2px 12px rgba(0,0,0,0.55)",
          transition:              "border-color 0.18s, box-shadow 0.18s",
        }}
      >
        {/* Status dot */}
        <div
          style={{
            width:        6,
            height:       6,
            borderRadius: "50%",
            background:   isAlert ? KILL_RED : "#22c55e",
            boxShadow:    `0 0 7px ${isAlert ? KILL_RED : "#22c55e"}`,
            flexShrink:   0,
            animation:    `sov-pill-pulse ${pulseDur} ease-in-out infinite`,
          }}
        />

        {/* Label */}
        <span
          style={{
            fontSize:      9,
            fontWeight:    700,
            color:         MUTED,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontFamily:    FONT,
            whiteSpace:    "nowrap",
          }}
        >
          {isAlert ? "◈ SYSTEM ALERT" : "◈ NOVEE OS // SOVEREIGN"}
        </span>

        <IconChevron />
      </motion.button>
    </>
  );
}
