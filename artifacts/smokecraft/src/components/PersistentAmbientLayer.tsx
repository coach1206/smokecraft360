/**
 * PersistentAmbientLayer — always-on reactive background that lives above the Router.
 *
 * This layer is the "continuous living atmosphere." It renders only when on
 * experience/reveal routes, using craft-aware background images + reactive
 * lighting filters that morph smoothly based on EnvironmentEngine state.
 *
 * Key behaviors:
 * - Only activates on /experience/* and /reveal/* routes
 * - Crossfades between craft images (no hard cuts)
 * - Cinematic Ken Burns zoom drift (28s loop)
 * - Dynamic CSS filter reacts to lightingMood changes
 * - Glow overlay reacts to glowStrength
 * - Smooth Framer Motion transitions between all states
 * - 60fps: transform-only animations, will-change hints
 */

import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useEnvironmentSafe } from "@/contexts/EnvironmentContext";
import { CRAFT_THEMES } from "@/lib/craftThemes";
import { MOOD_VISUALS } from "@/lib/environmentEngine";

// ── Craft → background image map (uses craftThemes bgImage) ──────────────────

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

// ── Experience route detector ─────────────────────────────────────────────────

function isExperienceRoute(path: string): boolean {
  return (
    path.startsWith("/experience/") ||
    path.startsWith("/reveal/") ||
    path === "/craft-hub"
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PersistentAmbientLayer = memo(function PersistentAmbientLayer() {
  const [location] = useLocation();
  const envCtx     = useEnvironmentSafe();
  const active     = isExperienceRoute(location);
  const env        = envCtx?.env;

  // Extract craft from URL (e.g. /experience/smoke → "smoke")
  const urlCraft  = location.split("/")[2] ?? env?.craftType ?? "smoke";
  const craft     = env?.craftType ?? urlCraft;
  const bgImage   = CRAFT_BG[craft] ?? CRAFT_BG.smoke;
  const accent    = CRAFT_ACCENT[craft] ?? "#d4af37";

  // Reactive lighting from environment engine
  const lightingMood = env?.lightingMood ?? "neutral";
  const moodVisuals  = MOOD_VISUALS[lightingMood];
  const glowStrength = env?.glowStrength ?? 0.5;

  // Film grain persistence
  const [grainSeed] = useState(() => Math.random());

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
      {/* ── Layer 1: Craft background image (crossfades on craft change) ── */}
      <AnimatePresence mode="sync">
        <motion.div
          key={bgImage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          style={{
            position: "absolute", inset: 0,
            filter: moodVisuals.filterStr,
            willChange: "opacity",
            transition: "filter 1.8s ease",
          }}
        >
          {/* Ken Burns: 28s cinematic drift loop */}
          <motion.div
            animate={{
              scale: [1.08, 1.13, 1.08],
              x:     ["0%", "-2%", "0%"],
              y:     ["0%", "-1%", "0%"],
            }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position:           "absolute",
              inset:              0,
              backgroundImage:    `url('${bgImage}')`,
              backgroundSize:     "cover",
              backgroundPosition: "center",
              willChange:         "transform",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* ── Layer 2: Reactive tint overlay (morphs per lighting mood) ── */}
      <motion.div
        animate={{ background: moodVisuals.tintColor }}
        transition={{ duration: 1.8, ease: "easeInOut" }}
        style={{ position: "absolute", inset: 0, willChange: "background" }}
      />

      {/* ── Layer 3: Bottom gradient (depth) ── */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, transparent 25%, rgba(0,0,0,0.65) 100%)",
      }} />

      {/* ── Layer 4: Reactive accent glow (reacts to glowStrength) ── */}
      <motion.div
        animate={{ opacity: glowStrength * 0.35 }}
        transition={{ duration: 2.2, ease: "easeInOut" }}
        style={{
          position: "absolute",
          bottom: "-10%", left: "10%",
          width: "80%", height: "60%",
          background: `radial-gradient(ellipse, ${accent}50 0%, ${accent}15 45%, transparent 70%)`,
          filter: "blur(40px)",
          willChange: "opacity",
        }}
      />

      {/* ── Layer 5: Top edge gold line ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${accent}28, ${accent}42, ${accent}28, transparent)`,
      }} />

      {/* ── Layer 6: Film grain ── */}
      <div style={{
        position: "absolute", inset: 0,
        opacity: 0.028,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n${Math.round(grainSeed * 999)}'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n${Math.round(grainSeed * 999)})'/%3E%3C/svg%3E")`,
        backgroundSize: "180px 180px",
        pointerEvents: "none",
      }} />

      {/* ── Layer 7: Vignette edge ── */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
      }} />
    </div>
  );
});
