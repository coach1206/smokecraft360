/**
 * PersistentAmbientLayer — always-on reactive background with organic breathing.
 *
 * Upgrades from Phase 1:
 * - Humanized Ken Burns: asymmetric drift with micro-rotation and 4 waypoints
 * - Atmospheric breathing: two offset slow-pulse overlays (not synchronized)
 * - Glow pulsation variance: 5-keyframe non-uniform pulse instead of even bounce
 * - Shadow fluctuation: bottom depth gradient varies subtly over time
 * - Top gold line breathing: subtle opacity variation
 * - Camera humanization: very slight handheld imperfection (0→0.1deg rotation)
 *
 * All 60fps: transform/opacity only, will-change hints throughout.
 */

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useEnvironmentSafe } from "@/contexts/EnvironmentContext";
import { CRAFT_THEMES } from "@/lib/craftThemes";
import { MOOD_VISUALS } from "@/lib/environmentEngine";
import { glowPulseKeyframes, breatheKeyframes, organicTimes } from "@/lib/organicMotion";

const CRAFT_BG: Record<string, string> = {
  smoke: CRAFT_THEMES.smoke.bgImage,
  pour:  CRAFT_THEMES.pour.bgImage,
  brew:  CRAFT_THEMES.brew.bgImage,
  vape:  CRAFT_THEMES.vape.bgImage,
};

const CRAFT_ACCENT: Record<string, string> = {
  smoke: CRAFT_THEMES.smoke.accent,
  pour:  CRAFT_THEMES.pour.accent,
  brew:  CRAFT_THEMES.brew.accent,
  vape:  CRAFT_THEMES.vape.accent,
};

function isExperienceRoute(path: string): boolean {
  return (
    path.startsWith("/experience/") ||
    path.startsWith("/reveal/") ||
    path === "/craft-hub"
  );
}

// ── Pre-computed breathing sequences (stable, not re-created per render) ──────

// Layer A: 16s cycle, 5 keyframes — slow atmospheric luminance pulse
const BREATHE_A_OPACITY = breatheKeyframes(0.035, 0.028, 5, 111);
const BREATHE_A_TIMES   = organicTimes(5, 222);

// Layer B: 23s cycle, 5 keyframes — offset phase
const BREATHE_B_OPACITY = breatheKeyframes(0.025, 0.022, 5, 333);
const BREATHE_B_TIMES   = organicTimes(5, 444);

// Shadow fluctuation: 19s cycle
const SHADOW_OPACITY = breatheKeyframes(0.62, 0.08, 5, 555);
const SHADOW_TIMES   = organicTimes(5, 666);

// Humanized Ken Burns: 4 waypoints with asymmetric timing
const KB_SCALE  = [1.08, 1.12, 1.10, 1.14, 1.08];
const KB_X      = ["0%", "-1.6%", "-0.4%", "-2.2%", "0%"];
const KB_Y      = ["0%", "-0.8%", "-0.2%", "-1.2%", "0%"];
const KB_ROTATE = [0, 0.08, -0.04, 0.10, 0];   // micro-handheld imperfection
const KB_TIMES  = [0, 0.28, 0.52, 0.78, 1];    // asymmetric pacing

export const PersistentAmbientLayer = memo(function PersistentAmbientLayer() {
  const [location] = useLocation();
  const envCtx     = useEnvironmentSafe();
  const active     = isExperienceRoute(location);
  const env        = envCtx?.env;

  const urlCraft  = location.split("/")[2] ?? env?.craftType ?? "smoke";
  const craft     = env?.craftType ?? urlCraft;
  const bgImage   = CRAFT_BG[craft] ?? CRAFT_BG.smoke;
  const accent    = CRAFT_ACCENT[craft] ?? "#D48B00";

  const lightingMood = env?.lightingMood ?? "neutral";
  const moodVisuals  = MOOD_VISUALS[lightingMood];
  const glowStrength = env?.glowStrength ?? 0.5;

  const [grainSeed] = useState(() => Math.floor(Math.random() * 999));

  // Pre-compute glow pulse for current glowStrength
  const glowPulse = glowPulseKeyframes(glowStrength * 0.24, glowStrength * 0.40, 77);
  const glowTimes = [0, 0.26, 0.52, 0.76, 1];

  if (!active) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed", inset: 0,
        zIndex: 0, pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* ── Layer 1: Craft bg — crossfades on craft change ── */}
      <AnimatePresence mode="sync">
        <motion.div
          key={bgImage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          style={{
            position: "absolute", inset: 0,
            filter: moodVisuals.filterStr,
            willChange: "opacity",
            transition: "filter 2.2s ease",
          }}
        >
          {/* Humanized Ken Burns — 4 waypoints, micro-rotation, asymmetric timing */}
          {/* motionCalmness 0→18s (energetic) … 100→52s (very calm) */}
          <motion.div
            animate={{
              scale:  KB_SCALE,
              x:      KB_X,
              y:      KB_Y,
              rotate: KB_ROTATE,
            }}
            transition={{
              duration: 18 + ((env?.motionCalmness ?? 55) / 100) * 34,
              repeat:   Infinity,
              ease:     "easeInOut",
              times:    KB_TIMES,
            }}
            style={{
              position:           "absolute",
              inset:              0,
              backgroundImage:    `url('${bgImage}')`,
              backgroundSize:     "cover",
              backgroundPosition: "center",
              willChange:         "transform",
              transformOrigin:    "55% 45%",  // offset from center for handheld feel
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* ── Layer 2: Reactive tint overlay — morphs per lighting mood ── */}
      <motion.div
        animate={{ background: moodVisuals.tintColor }}
        transition={{ duration: 2.2, ease: "easeInOut" }}
        style={{ position: "absolute", inset: 0 }}
      />

      {/* ── Layer 3A: Atmospheric breathing pulse A — 16s cycle ── */}
      <motion.div
        animate={{ opacity: BREATHE_A_OPACITY }}
        transition={{
          duration: 16,
          repeat:   Infinity,
          ease:     "easeInOut",
          times:    BREATHE_A_TIMES,
        }}
        style={{
          position:   "absolute", inset: 0,
          background: "rgba(0,0,0,1)",
          willChange: "opacity",
        }}
      />

      {/* ── Layer 3B: Atmospheric breathing pulse B — 23s cycle, offset phase ── */}
      <motion.div
        animate={{ opacity: BREATHE_B_OPACITY }}
        transition={{
          duration: 23,
          repeat:   Infinity,
          ease:     "easeInOut",
          times:    BREATHE_B_TIMES,
          delay:    7,  // phase offset so they don't sync
        }}
        style={{
          position:   "absolute", inset: 0,
          background: "rgba(0,0,0,1)",
          willChange: "opacity",
        }}
      />

      {/* ── Layer 4: Bottom depth — shadow fluctuation ── */}
      <motion.div
        animate={{ opacity: SHADOW_OPACITY }}
        transition={{
          duration: 19,
          repeat:   Infinity,
          ease:     "easeInOut",
          times:    SHADOW_TIMES,
          delay:    3,
        }}
        style={{
          position:   "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(26,26,27,0.03) 0%, transparent 22%, rgba(26,26,27,0.34) 100%)",
          willChange: "opacity",
        }}
      />

      {/* ── Layer 5: Reactive accent glow with pulsation variance ── */}
      <motion.div
        animate={{ opacity: glowPulse }}
        transition={{
          duration: 9,
          repeat:   Infinity,
          ease:     "easeInOut",
          times:    glowTimes,
        }}
        style={{
          position:     "absolute",
          bottom:       "-12%", left: "8%",
          width:        "84%",  height: "62%",
          background:   `radial-gradient(ellipse, ${accent}55 0%, ${accent}18 42%, transparent 68%)`,
          filter:       "blur(44px)",
          willChange:   "opacity",
        }}
      />

      {/* ── Layer 6: Secondary glow pocket — offset position, slower pulse ── */}
      <motion.div
        animate={{ opacity: [glowStrength * 0.08, glowStrength * 0.18, glowStrength * 0.08] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        style={{
          position:   "absolute",
          top:        "20%", right: "10%",
          width:      "35%", height: "30%",
          background: `radial-gradient(ellipse, ${accent}30 0%, transparent 65%)`,
          filter:     "blur(32px)",
          willChange: "opacity",
        }}
      />

      {/* ── Layer 7: Top edge gold line — breathing opacity ── */}
      <motion.div
        animate={{ opacity: [0.55, 0.85, 0.60, 0.90, 0.55] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${accent}30, ${accent}50, ${accent}30, transparent)`,
          willChange: "opacity",
        }}
      />

      {/* ── Layer 8: Film grain (static) ── */}
      <div style={{
        position:            "absolute", inset: 0,
        opacity:             0.026,
        backgroundImage:     `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n${grainSeed}'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.80' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n${grainSeed})'/%3E%3C/svg%3E")`,
        backgroundSize:      "180px 180px",
      }} />

      {/* ── Layer 9: Vignette ── */}
      <div style={{
        position:   "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 45%, transparent 52%, rgba(26,26,27,0.24) 100%)",
      }} />
    </div>
  );
});
