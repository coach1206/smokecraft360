/**
 * CraftRealism — CSS-based ambient animations per craft type.
 *
 * Each component renders a layered animation overlay on top of a swipe card.
 * Maintains 60fps via transform-only animations and will-change hints.
 * Designed for purely decorative use — pointerEvents: none on all layers.
 *
 * Exports:
 *   EmberGlow       — SmokeCraft: ember pulse + smoke curl
 *   LiquidShimmer   — PourCraft:  liquid refraction + glass glint
 *   FoamRise        — BrewCraft:  rising bubbles + foam crown
 *   VaporDrift      — VapeCraft:  layered vapor + neon ambient
 */

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

type RealisticsProps = { accent: string; intensity?: number };

// ── SmokeCraft: Ember Glow + Smoke Curl ──────────────────────────────────────

export function EmberGlow({ accent, intensity = 1 }: RealisticsProps) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Base ember warmth */}
      <motion.div
        animate={{ opacity: [0.18, 0.32, 0.18], scale: [1, 1.06, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          bottom: -40, left: "20%",
          width: "60%", height: "55%",
          background: `radial-gradient(ellipse, ${accent}55 0%, ${accent}20 40%, transparent 70%)`,
          willChange: "opacity, transform",
        }}
      />
      {/* Ember particles */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{
            y:       [0, -60 - i * 30, -120 - i * 30],
            x:       [0, (i % 2 === 0 ? 1 : -1) * (8 + i * 4), 0],
            opacity: [0, 0.8, 0],
            scale:   [0.4, 1, 0.2],
          }}
          transition={{
            duration:   2.2 + i * 0.6,
            repeat:     Infinity,
            delay:      i * 0.9,
            ease:       "easeOut",
          }}
          style={{
            position: "absolute",
            bottom: 40 + i * 10,
            left:   `${38 + i * 8}%`,
            width:  4 + i * 2,
            height: 4 + i * 2,
            borderRadius: "50%",
            background: `${accent}`,
            boxShadow:  `0 0 6px ${accent}`,
            willChange: "transform, opacity",
          }}
        />
      ))}
      {/* Smoke curl wisps */}
      {[0, 1].map(i => (
        <motion.div
          key={`smoke-${i}`}
          animate={{
            y:       [0, -80 - i * 20],
            x:       [0, (i === 0 ? 12 : -10)],
            opacity: [0, 0.12, 0],
            scaleX:  [0.4, 1.8, 2.4],
          }}
          transition={{
            duration: 4 + i * 1.2,
            repeat:   Infinity,
            delay:    i * 1.8,
            ease:     "easeOut",
          }}
          style={{
            position:     "absolute",
            bottom:       60,
            left:         `${44 + i * 6}%`,
            width:        20,
            height:       60,
            background:   "linear-gradient(180deg, rgba(26,26,27,0.10) 0%, transparent 100%)",
            borderRadius: "50% 50% 0 0",
            willChange:   "transform, opacity",
          }}
        />
      ))}
      {/* Cigar burn tip glow */}
      <motion.div
        animate={{ boxShadow: [`0 0 8px ${accent}60`, `0 0 20px ${accent}90`, `0 0 8px ${accent}60`] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:     "absolute",
          bottom:       72,
          left:         "48%",
          width:        8,
          height:       4,
          borderRadius: "50%",
          background:   accent,
          willChange:   "box-shadow",
        }}
      />
    </div>
  );
}

// ── PourCraft: Liquid Shimmer + Glass Refraction ──────────────────────────────

export function LiquidShimmer({ accent }: RealisticsProps) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Liquid pool at bottom */}
      <motion.div
        animate={{ scaleX: [0.95, 1.05, 0.95], skewX: ["-1deg", "1deg", "-1deg"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:   "absolute",
          bottom:     0, left: 0, right: 0,
          height:     "28%",
          background: `linear-gradient(180deg, transparent 0%, ${accent}18 60%, ${accent}35 100%)`,
          willChange: "transform",
        }}
      />
      {/* Glass refraction glint — horizontal shimmer */}
      <motion.div
        animate={{ x: ["-120%", "220%"], opacity: [0, 0.35, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, delay: 1, ease: "easeInOut" }}
        style={{
          position:   "absolute",
          top: "15%", left: 0,
          width:      "40%",
          height:     "70%",
          background: "linear-gradient(105deg, transparent 30%, rgba(26,26,27,0.14) 50%, transparent 70%)",
          transform:  "skewX(-15deg)",
          willChange: "transform, opacity",
        }}
      />
      {/* Viscosity slow wave */}
      <motion.div
        animate={{ y: [0, -6, 0], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:     "absolute",
          bottom:       "18%",
          left:         "10%",
          width:        "80%",
          height:       12,
          background:   `${accent}30`,
          borderRadius: "50%",
          filter:       "blur(6px)",
          willChange:   "transform, opacity",
        }}
      />
      {/* Ice condensation droplets */}
      {[0, 1, 2, 3].map(i => (
        <motion.div
          key={i}
          animate={{ y: [0, 18 + i * 4], opacity: [0.5, 0] }}
          transition={{
            duration: 1.8 + i * 0.4,
            repeat:   Infinity,
            delay:    i * 0.7,
            ease:     "linear",
          }}
          style={{
            position:     "absolute",
            top:          `${20 + i * 12}%`,
            left:         `${12 + i * 18}%`,
            width:        3,
            height:       8 + i * 2,
            background:   "rgba(255,255,255,0.4)",
            borderRadius: "50% 50% 60% 60%",
            willChange:   "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}

// ── BrewCraft: Rising Bubbles + Foam Crown ────────────────────────────────────

export function FoamRise({ accent }: RealisticsProps) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Foam crown at top of liquid */}
      <motion.div
        animate={{ y: [0, -4, 0], scaleX: [0.97, 1.03, 0.97] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:     "absolute",
          bottom:       "22%",
          left:         "5%",
          width:        "90%",
          height:       18,
          background:   "rgba(26,26,27,0.17)",
          borderRadius: "50%",
          filter:       "blur(2px)",
          willChange:   "transform",
        }}
      />
      {/* Rising carbonation bubbles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y:       [0, -160 - i * 20],
            opacity: [0, 0.6, 0],
            scale:   [0.3, 1, 0.5],
          }}
          transition={{
            duration: 2.4 + (i % 3) * 0.5,
            repeat:   Infinity,
            delay:    i * 0.35,
            ease:     "easeOut",
          }}
          style={{
            position:     "absolute",
            bottom:       `${18 + (i % 4) * 3}%`,
            left:         `${10 + i * 10}%`,
            width:        3 + (i % 3) * 2,
            height:       3 + (i % 3) * 2,
            borderRadius: "50%",
            background:   "rgba(255,255,255,0.5)",
            border:       "1px solid rgba(255,255,255,0.3)",
            willChange:   "transform, opacity",
          }}
        />
      ))}
      {/* Amber liquid body */}
      <motion.div
        animate={{ opacity: [0.12, 0.18, 0.12] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:   "absolute",
          bottom:     0, left: 0, right: 0,
          height:     "30%",
          background: `linear-gradient(180deg, transparent, ${accent}25)`,
          willChange: "opacity",
        }}
      />
    </div>
  );
}

// ── VapeCraft: Neon Vapor Atmosphere ─────────────────────────────────────────

export function VaporDrift({ accent }: RealisticsProps) {
  const cyan    = "#06b6d4";
  const magenta = "#e879f9";

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>

      {/* ── Shifting neon atmosphere — breathes between purple / cyan / magenta ── */}
      <motion.div
        animate={{
          opacity: [0.7, 1, 0.7],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:   "absolute",
          inset:      0,
          background: `radial-gradient(ellipse 90% 60% at 30% 85%, ${accent}42 0%, ${cyan}18 45%, transparent 75%)`,
          filter:     "blur(10px)",
          willChange: "opacity",
        }}
      />
      <motion.div
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 9, repeat: Infinity, delay: 3, ease: "easeInOut" }}
        style={{
          position:   "absolute",
          inset:      0,
          background: `radial-gradient(ellipse 80% 70% at 70% 15%, ${cyan}40 0%, ${accent}14 45%, transparent 75%)`,
          filter:     "blur(8px)",
          willChange: "opacity",
        }}
      />
      <motion.div
        animate={{ opacity: [0, 0.45, 0] }}
        transition={{ duration: 7, repeat: Infinity, delay: 5.5, ease: "easeInOut" }}
        style={{
          position:   "absolute",
          inset:      0,
          background: `radial-gradient(ellipse 85% 55% at 55% 90%, ${magenta}32 0%, ${accent}18 40%, transparent 70%)`,
          filter:     "blur(8px)",
          willChange: "opacity",
        }}
      />

      {/* ── Neon vapor clouds — colored wisps rising ── */}
      {([
        { x: 8,  yPct: 30, w: 180, h: 90,  color: accent,  dur: 7.0, del: 0.0 },
        { x: 45, yPct: 20, w: 140, h: 70,  color: cyan,    dur: 9.2, del: 1.8 },
        { x: 62, yPct: 38, w: 160, h: 80,  color: magenta, dur: 8.4, del: 3.5 },
      ] as const).map((c, i) => (
        <motion.div
          key={`cloud-${i}`}
          animate={{
            y:       [0, -(28 + i * 12), 0],
            x:       [0, 8 - i * 4, 0],
            opacity: [0, 0.22 - i * 0.05, 0],
            scale:   [0.65, 1.5 + i * 0.22, 0.75],
          }}
          transition={{ duration: c.dur, repeat: Infinity, delay: c.del, ease: "easeOut" }}
          style={{
            position:     "absolute",
            left:         `${c.x}%`,
            bottom:       `${c.yPct}%`,
            width:        c.w,
            height:       c.h,
            background:   `radial-gradient(ellipse, ${c.color}35 0%, transparent 72%)`,
            borderRadius: "50%",
            filter:       "blur(18px)",
            willChange:   "transform, opacity",
          }}
        />
      ))}

      {/* ── Horizontal scan lines — sweep across card ── */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={`scan-${i}`}
          animate={{ opacity: [0, 0.28, 0], x: ["-100%", "220%"] }}
          transition={{ duration: 3.4 + i * 1.1, repeat: Infinity, delay: i * 2.8, ease: "linear" }}
          style={{
            position:   "absolute",
            left:       0,
            top:        `${20 + i * 28}%`,
            width:      "42%",
            height:     1,
            background: `linear-gradient(90deg, transparent, ${i === 1 ? cyan : i === 2 ? magenta : accent}90, transparent)`,
            willChange: "transform, opacity",
          }}
        />
      ))}

      {/* ── Left edge neon line ── */}
      <motion.div
        animate={{ opacity: [0.08, 0.55, 0.08], scaleY: [0.55, 1, 0.65] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:         "absolute",
          top: "8%", left: 0,
          width:            2,
          height:           "84%",
          background:       `linear-gradient(180deg, transparent, ${accent}CC, ${cyan}AA, transparent)`,
          willChange:       "opacity, transform",
          transformOrigin:  "center",
        }}
      />

      {/* ── Right edge neon line ── */}
      <motion.div
        animate={{ opacity: [0.08, 0.42, 0.08], scaleY: [0.65, 1, 0.5] }}
        transition={{ duration: 3.9, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
        style={{
          position:         "absolute",
          top: "8%", right: 0,
          width:            2,
          height:           "84%",
          background:       `linear-gradient(180deg, transparent, ${cyan}CC, ${magenta}99, transparent)`,
          willChange:       "opacity, transform",
          transformOrigin:  "center",
        }}
      />

      {/* ── Holographic sweep shimmer ── */}
      <motion.div
        animate={{ opacity: [0, 0.32, 0], x: ["-35%", "140%"] }}
        transition={{ duration: 2.9, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.8 }}
        style={{
          position:   "absolute",
          top:        0,
          left:       0,
          width:      "44%",
          height:     "100%",
          background: `linear-gradient(108deg, transparent 0%, ${accent}22 38%, ${cyan}18 62%, transparent 100%)`,
          willChange: "transform, opacity",
        }}
      />

    </div>
  );
}

// ── Selector ──────────────────────────────────────────────────────────────────

export function CraftRealism({
  type, accent, intensity = 1,
}: { type: string; accent: string; intensity?: number }) {
  switch (type) {
    case "smoke": return <EmberGlow accent={accent} intensity={intensity} />;
    case "pour":  return <LiquidShimmer accent={accent} intensity={intensity} />;
    case "brew":  return <FoamRise accent={accent} intensity={intensity} />;
    case "vape":  return <VaporDrift accent={accent} intensity={intensity} />;
    default:      return null;
  }
}
