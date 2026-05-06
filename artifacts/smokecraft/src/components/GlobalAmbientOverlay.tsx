/**
 * GlobalAmbientOverlay — always-on subtle environmental overlay.
 *
 * Renders across ALL routes (mounted above the Switch in App.tsx).
 * Does NOT change the background image — that's PersistentAmbientLayer's job
 * for experience routes. This layer is the "nervous system":
 *
 * Layer stack (all fixed, pointer-events: none, z-index: 1):
 *   1. OLED edge vignette — breathing radial gradient at screen edges
 *   2. Warmth tint — very subtle warm color overlay driven by energyState
 *   3. VIP arrival pulse — 2s cinematic gold flash on triggerVipArrival()
 *   4. Energy shimmer — faint shimmer on peak_energy / event_atmosphere
 *
 * All animations use transform/opacity only — 60fps guaranteed.
 */

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEnvironmentSafe } from "@/contexts/EnvironmentContext";
import { ENERGY_STATE_CONFIG } from "@/lib/environmentEngine";

// ── Pre-computed breathing sequences ─────────────────────────────────────────

const VIGNETTE_BASE  = 0.72;
const VIGNETTE_DELTA = 0.08;

// 5-keyframe vignette breath — 22s cycle, asymmetric
const VIGNETTE_OPACITY = [
  VIGNETTE_BASE,
  VIGNETTE_BASE + VIGNETTE_DELTA * 0.6,
  VIGNETTE_BASE + VIGNETTE_DELTA,
  VIGNETTE_BASE + VIGNETTE_DELTA * 0.4,
  VIGNETTE_BASE,
];
const VIGNETTE_TIMES = [0, 0.22, 0.50, 0.78, 1];

// Energy state → warm tint color
const ENERGY_TINT: Record<string, string> = {
  quiet_reserve:      "rgba(12, 8, 4, 0.0)",
  social_warmth:      "rgba(40, 22, 6, 0.09)",
  elevated_lounge:    "rgba(52, 28, 6, 0.13)",
  peak_energy:        "rgba(64, 32, 6, 0.18)",
  vip_session:        "rgba(60, 36, 8, 0.20)",
  late_night_reserve: "rgba(8, 4, 2, 0.05)",
  event_atmosphere:   "rgba(50, 26, 6, 0.14)",
  mentor_session:     "rgba(38, 20, 6, 0.10)",
};

export const GlobalAmbientOverlay = memo(function GlobalAmbientOverlay() {
  const envCtx = useEnvironmentSafe();
  const env    = envCtx?.env;

  const energyState    = env?.energyState     ?? "social_warmth";
  const vipActive      = env?.vipArrivalActive ?? false;
  const warmthTint     = env?.warmthTint       ?? 0.14;
  const motionCalmness = env?.motionCalmness   ?? 55;

  const cfg        = ENERGY_STATE_CONFIG[energyState];
  const tintColor  = ENERGY_TINT[energyState] ?? ENERGY_TINT["social_warmth"]!;

  // Vignette breathing duration scales with motionCalmness
  const breatheDur = 14 + (motionCalmness / 100) * 18; // 14s (fast) → 32s (slow)

  // Shimmer active on high-energy states
  const shimmerActive = energyState === "peak_energy" || energyState === "event_atmosphere";

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* ── Layer 1: OLED edge vignette — always breathing ── */}
      <motion.div
        animate={{ opacity: VIGNETTE_OPACITY }}
        transition={{
          duration: breatheDur,
          repeat:   Infinity,
          ease:     "easeInOut",
          times:    VIGNETTE_TIMES,
        }}
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 30%, rgba(4,2,1,0.55) 70%, rgba(2,1,0,0.88) 100%)",
          willChange: "opacity",
        }}
      />

      {/* ── Layer 2: Energy-state warmth tint — fades on state change ── */}
      <motion.div
        animate={{
          backgroundColor: tintColor,
          opacity: warmthTint * cfg.warmthTint * 8, // subtle compound
        }}
        transition={{ duration: 2.8, ease: "easeInOut" }}
        style={{
          position:   "absolute",
          inset:      0,
          willChange: "opacity, background-color",
        }}
      />

      {/* ── Layer 3: VIP arrival cinematic pulse ── */}
      <AnimatePresence>
        {vipActive && (
          <motion.div
            key="vip-pulse"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.18, 0.10, 0.22, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3.2, ease: "easeInOut", times: [0, 0.2, 0.4, 0.7, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse 60% 55% at 50% 45%, rgba(212,175,55,0.35) 0%, rgba(180,130,20,0.12) 50%, transparent 80%)",
              willChange: "opacity",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Layer 4: Peak energy / event shimmer ── */}
      <AnimatePresence>
        {shimmerActive && (
          <motion.div
            key="shimmer"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.06, 0.03, 0.08, 0.04, 0.06, 0] }}
            exit={{ opacity: 0, transition: { duration: 1.8 } }}
            transition={{
              duration: 6,
              repeat:   Infinity,
              ease:     "easeInOut",
              times:    [0, 0.15, 0.35, 0.55, 0.72, 0.88, 1],
            }}
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, transparent 0%, rgba(201,168,76,0.08) 30%, transparent 55%, rgba(201,168,76,0.05) 75%, transparent 100%)",
              willChange: "opacity",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Layer 5: Top edge gold breathing line ── */}
      <motion.div
        animate={{ opacity: [0.28, 0.42, 0.30, 0.48, 0.28] }}
        transition={{
          duration: breatheDur * 1.3,
          repeat:   Infinity,
          ease:     "easeInOut",
          times:    [0, 0.25, 0.50, 0.75, 1],
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.6) 20%, rgba(212,175,55,0.9) 50%, rgba(201,168,76,0.6) 80%, transparent 100%)",
          willChange: "opacity",
        }}
      />
    </div>
  );
});
