/**
 * ParticleSystem — ambient particle overlay with organic entropy.
 *
 * Each craft type uses craft-specific particle physics with humanized timing:
 *   smoke: ember sparks with irregular curl + ash flicker + dust motes
 *   pour:  condensation droplets with stagger + refraction glints
 *   brew:  carbonation bubbles with randomized speed/size + foam wisps
 *   vape:  vapor wisps with turbulent drift + neon orbs with pulse variance
 *
 * Particle density driven by EnvironmentEngine.particleDensity (0–1).
 * All animations are transform/opacity only for 60fps.
 * Uses organicMotion for entropy — deterministic per seed, varied per particle.
 */

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { useEnvironmentSafe } from "@/contexts/EnvironmentContext";
import { CRAFT_THEMES } from "@/lib/craftThemes";
import {
  humanDuration,
  humanDelay,
  organicOpacityPath,
  organicTimes,
  organicDriftX,
} from "@/lib/organicMotion";

// ── Extended particle type ────────────────────────────────────────────────────

interface OrganicParticle {
  id:        number;
  x:         number;    // % left
  y:         number;    // % bottom/top
  size:      number;    // px
  delay:     number;    // s
  dur:       number;    // s
  xPath:     number[];  // organic horizontal path keyframes
  opPath:    number[];  // organic opacity keyframes
  times:     number[];  // non-uniform keyframe timing
  peakOp:    number;    // max opacity cap
  yTravel:   number;    // total vertical travel px
}

// ── Organic particle factory ──────────────────────────────────────────────────

function seededR(i: number, s: number): number {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function makeOrganicParticles(count: number, seed: number, opts: {
  xRange:      [number, number];
  yRange:      [number, number];
  sizeRange:   [number, number];
  durRange:    [number, number];
  delayRange:  [number, number];
  yTravelRange:[number, number];
  driftAmp:    number;
  opPeak:      number;
  steps:       number;
}): OrganicParticle[] {
  const {
    xRange, yRange, sizeRange, durRange, delayRange,
    yTravelRange, driftAmp, opPeak, steps,
  } = opts;

  return Array.from({ length: count }, (_, i) => {
    const baseDur  = durRange[0] + seededR(i, seed + 4) * (durRange[1] - durRange[0]);
    const baseDelay = delayRange[0] + seededR(i, seed + 3) * (delayRange[1] - delayRange[0]);
    const peakOp   = opPeak * (0.65 + seededR(i, seed + 7) * 0.4);

    return {
      id:      i,
      x:       xRange[0]  + seededR(i, seed + 0) * (xRange[1]  - xRange[0]),
      y:       yRange[0]  + seededR(i, seed + 1) * (yRange[1]  - yRange[0]),
      size:    sizeRange[0] + seededR(i, seed + 2) * (sizeRange[1] - sizeRange[0]),
      delay:   humanDelay(baseDelay, baseDelay * 0.3, i * seed + 11),
      dur:     humanDuration(baseDur, baseDur * 0.28, i * seed + 22),
      yTravel: yTravelRange[0] + seededR(i, seed + 5) * (yTravelRange[1] - yTravelRange[0]),
      xPath:   organicDriftX(driftAmp, steps, i * 13 + seed),
      opPath:  organicOpacityPath(peakOp, steps, i * 17 + seed),
      times:   organicTimes(steps, i * 19 + seed),
      peakOp,
    };
  });
}

// ── SmokeCraft: Ember Sparks + Ash Flicker + Dust Motes ──────────────────────

function EmberParticles({ accent, count }: { accent: string; count: number }) {
  const embers = useMemo(() => makeOrganicParticles(count, 42, {
    xRange:       [5, 88],
    yRange:       [0, 45],
    sizeRange:    [1.5, 5.5],
    durRange:     [3.5, 8.5],
    delayRange:   [0, 7],
    yTravelRange: [90, 220],
    driftAmp:     28,
    opPeak:       0.82,
    steps:        5,
  }), [count]);

  const motes = useMemo(() => makeOrganicParticles(Math.ceil(count * 0.45), 99, {
    xRange:       [8, 85],
    yRange:       [25, 65],
    sizeRange:    [1, 3],
    durRange:     [6, 14],
    delayRange:   [0, 9],
    yTravelRange: [40, 90],
    driftAmp:     16,
    opPeak:       0.22,
    steps:        5,
  }), [count]);

  return (
    <>
      {embers.map(p => {
        // Y path: rise with slight stall, then accelerate
        const yPath = [0, -(p.yTravel * 0.2), -(p.yTravel * 0.55), -(p.yTravel * 0.82), -p.yTravel];
        return (
          <motion.div
            key={p.id}
            animate={{
              y:       yPath,
              x:       p.xPath,
              opacity: p.opPath,
              scale:   [0.25, 1.1, 0.9, 0.6, 0.15],
            }}
            transition={{
              duration: p.dur,
              repeat:   Infinity,
              delay:    p.delay,
              ease:     "linear",
              times:    p.times,
            }}
            style={{
              position:     "absolute",
              bottom:       `${p.y}%`,
              left:         `${p.x}%`,
              width:        p.size,
              height:       p.size,
              borderRadius: "50%",
              background:   accent,
              boxShadow:    `0 0 ${p.size * 2.5}px ${p.size * 0.8}px ${accent}55`,
              willChange:   "transform, opacity",
            }}
          />
        );
      })}

      {/* Ash flicker — very small, rapid micro-blink on a few embers */}
      {embers.slice(0, Math.ceil(count * 0.25)).map(p => (
        <motion.div
          key={`ash-${p.id}`}
          animate={{
            opacity: [0, 0.18, 0, 0.10, 0],
            y:       [0, -(p.yTravel * 0.3)],
          }}
          transition={{
            duration: p.dur * 0.35,
            repeat:   Infinity,
            delay:    p.delay + p.dur * 0.6,
            ease:     "easeOut",
            times:    [0, 0.2, 0.45, 0.7, 1],
          }}
          style={{
            position:     "absolute",
            bottom:       `${p.y + 5}%`,
            left:         `${p.x + 2}%`,
            width:        p.size * 0.5,
            height:       p.size * 0.5,
            borderRadius: "50%",
            background:   "rgba(255,200,100,0.7)",
            willChange:   "transform, opacity",
          }}
        />
      ))}

      {/* Dust motes — slow horizontal drift, nearly invisible */}
      {motes.map(p => {
        const yPath = [0, -(p.yTravel * 0.3), -(p.yTravel * 0.65), -(p.yTravel * 0.88), -p.yTravel];
        return (
          <motion.div
            key={`mote-${p.id}`}
            animate={{ y: yPath, x: p.xPath, opacity: p.opPath }}
            transition={{
              duration: p.dur,
              repeat:   Infinity,
              delay:    p.delay + 1.5,
              ease:     "linear",
              times:    p.times,
            }}
            style={{
              position:     "absolute",
              bottom:       `${p.y}%`,
              left:         `${p.x}%`,
              width:        p.size,
              height:       p.size,
              borderRadius: "50%",
              background:   "rgba(245,225,185,0.55)",
              willChange:   "transform, opacity",
            }}
          />
        );
      })}
    </>
  );
}

// ── PourCraft: Condensation + Refraction Glints ───────────────────────────────

function CondensationDroplets({ count }: { count: number }) {
  const drops = useMemo(() => makeOrganicParticles(count, 77, {
    xRange:       [12, 82],
    yRange:       [8, 55],
    sizeRange:    [1, 3.5],
    durRange:     [2.5, 7],
    delayRange:   [0, 8],
    yTravelRange: [18, 55],
    driftAmp:     6,   // condensation barely drifts sideways
    opPeak:       0.55,
    steps:        5,
  }), [count]);

  const glints = useMemo(() => makeOrganicParticles(Math.ceil(count * 0.4), 133, {
    xRange:       [15, 80],
    yRange:       [5, 50],
    sizeRange:    [1.5, 4],
    durRange:     [1.2, 4],
    delayRange:   [0, 6],
    yTravelRange: [0, 0],
    driftAmp:     2,
    opPeak:       0.75,
    steps:        5,
  }), [count]);

  return (
    <>
      {drops.map(p => {
        // Condensation: hangs at top, then runs down with stalls
        const yPath = [0, p.yTravel * 0.15, p.yTravel * 0.4, p.yTravel * 0.72, p.yTravel];
        return (
          <motion.div
            key={p.id}
            animate={{ y: yPath, x: p.xPath, opacity: p.opPath }}
            transition={{
              duration: p.dur,
              repeat:   Infinity,
              delay:    p.delay,
              ease:     "linear",
              times:    p.times,
            }}
            style={{
              position:     "absolute",
              top:          `${p.y}%`,
              left:         `${p.x}%`,
              width:        p.size * 0.7,
              height:       p.size * 2.2,
              borderRadius: "50% 50% 60% 60%",
              background:   "rgba(200,225,255,0.42)",
              willChange:   "transform, opacity",
            }}
          />
        );
      })}

      {/* Refraction glints — brief bright flickers on glass surface */}
      {glints.map(p => (
        <motion.div
          key={`glint-${p.id}`}
          animate={{
            opacity: p.opPath,
            scaleX:  [0.3, 1.8, 0.6, 1.2, 0.3],
            scaleY:  [0.5, 0.8, 0.4, 0.7, 0.5],
          }}
          transition={{
            duration: p.dur,
            repeat:   Infinity,
            delay:    p.delay + 0.8,
            ease:     "easeInOut",
            times:    p.times,
          }}
          style={{
            position:     "absolute",
            top:          `${p.y * 0.5 + 8}%`,
            left:         `${p.x}%`,
            width:        4,
            height:       2,
            borderRadius: 2,
            background:   "rgba(255,255,255,0.88)",
            boxShadow:    "0 0 5px 2px rgba(255,255,255,0.55)",
            willChange:   "transform, opacity",
          }}
        />
      ))}
    </>
  );
}

// ── BrewCraft: Carbonation Bubbles + Foam Wisps ───────────────────────────────

function CarbonationBubbles({ accent, count }: { accent: string; count: number }) {
  const bubbles = useMemo(() => makeOrganicParticles(count, 128, {
    xRange:       [8, 88],
    yRange:       [0, 25],
    sizeRange:    [1.2, 6],   // much wider size range = organic
    durRange:     [1.8, 7],
    delayRange:   [0, 9],
    yTravelRange: [60, 180],
    driftAmp:     12,
    opPeak:       0.60,
    steps:        5,
  }), [count]);

  const foam = useMemo(() => makeOrganicParticles(Math.ceil(count * 0.3), 200, {
    xRange:       [5, 90],
    yRange:       [55, 75],
    sizeRange:    [6, 18],
    durRange:     [3, 9],
    delayRange:   [0, 5],
    yTravelRange: [0, 15],
    driftAmp:     20,
    opPeak:       0.12,
    steps:        5,
  }), [count]);

  return (
    <>
      {bubbles.map(p => {
        // Bubbles: rise with slight wobble, some faster near top
        const yPath = [0, -(p.yTravel * 0.22), -(p.yTravel * 0.5), -(p.yTravel * 0.78), -p.yTravel];
        return (
          <motion.div
            key={p.id}
            animate={{
              y:       yPath,
              x:       p.xPath,
              opacity: p.opPath,
              scale:   [0.4, 0.9, 1.1, 0.95, 0.5],
            }}
            transition={{
              duration: p.dur,
              repeat:   Infinity,
              delay:    p.delay,
              ease:     "linear",
              times:    p.times,
            }}
            style={{
              position:     "absolute",
              bottom:       `${p.y}%`,
              left:         `${p.x}%`,
              width:        p.size,
              height:       p.size,
              borderRadius: "50%",
              background:   "transparent",
              border:       `1px solid rgba(255,255,255,${0.25 + p.peakOp * 0.3})`,
              willChange:   "transform, opacity",
            }}
          />
        );
      })}

      {/* Foam wisps — hover near top, drift sideways, collapse */}
      {foam.map(p => {
        const yPath = [0, -(p.yTravel * 0.3), -(p.yTravel * 0.6), -(p.yTravel * 0.4), 0];
        return (
          <motion.div
            key={`foam-${p.id}`}
            animate={{ y: yPath, x: p.xPath, opacity: p.opPath }}
            transition={{
              duration: p.dur,
              repeat:   Infinity,
              delay:    p.delay + 2,
              ease:     "easeInOut",
              times:    p.times,
            }}
            style={{
              position:     "absolute",
              top:          `${p.y}%`,
              left:         `${p.x}%`,
              width:        p.size * 4,
              height:       p.size * 1.5,
              borderRadius: "50%",
              background:   `rgba(255,255,255,0.06)`,
              filter:       "blur(4px)",
              willChange:   "transform, opacity",
            }}
          />
        );
      })}
    </>
  );
}

// ── VapeCraft: Vapor Wisps + Neon Glow Orbs ──────────────────────────────────

function VaporWisps({ accent, count }: { accent: string; count: number }) {
  const wisps = useMemo(() => makeOrganicParticles(count, 200, {
    xRange:       [5, 85],
    yRange:       [10, 60],
    sizeRange:    [14, 40],
    durRange:     [5, 14],
    delayRange:   [0, 8],
    yTravelRange: [50, 140],
    driftAmp:     35,  // vapor drifts widely
    opPeak:       0.18,
    steps:        5,
  }), [count]);

  const orbs = useMemo(() => makeOrganicParticles(Math.ceil(count * 0.4), 255, {
    xRange:       [10, 80],
    yRange:       [5, 70],
    sizeRange:    [4, 12],
    durRange:     [2.5, 8],
    delayRange:   [0, 6],
    yTravelRange: [0, 0],
    driftAmp:     0,
    opPeak:       0.40,
    steps:        5,
  }), [count]);

  return (
    <>
      {wisps.map(p => {
        // Turbulent vapor: rising with lateral billowing, expanding as it rises
        const yPath = [0, -(p.yTravel * 0.18), -(p.yTravel * 0.45), -(p.yTravel * 0.72), -p.yTravel];
        // scaleX grows as it rises (vapor expansion)
        const sxPath = [0.5, 1.4, 2.0, 2.8, 3.5];
        return (
          <motion.div
            key={p.id}
            animate={{
              y:       yPath,
              x:       p.xPath,
              opacity: p.opPath,
              scaleX:  sxPath,
            }}
            transition={{
              duration: p.dur,
              repeat:   Infinity,
              delay:    p.delay,
              ease:     "linear",
              times:    p.times,
            }}
            style={{
              position:     "absolute",
              bottom:       `${p.y}%`,
              left:         `${p.x}%`,
              width:        p.size,
              height:       p.size * 0.7,
              borderRadius: "50%",
              background:   "rgba(255,255,255,0.06)",
              filter:       "blur(10px)",
              willChange:   "transform, opacity",
            }}
          />
        );
      })}

      {/* Neon glow orbs — pulse with irregular timing */}
      {orbs.map(p => (
        <motion.div
          key={`orb-${p.id}`}
          animate={{ opacity: p.opPath, scale: [0.4, 1.6, 0.8, 1.4, 0.4] }}
          transition={{
            duration: p.dur,
            repeat:   Infinity,
            delay:    p.delay + 0.4,
            ease:     "easeInOut",
            times:    p.times,
          }}
          style={{
            position:     "absolute",
            bottom:       `${p.y}%`,
            left:         `${p.x}%`,
            width:        p.size,
            height:       p.size,
            borderRadius: "50%",
            background:   accent,
            filter:       `blur(${p.size * 2.5}px)`,
            willChange:   "transform, opacity",
          }}
        />
      ))}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const ParticleSystem = memo(function ParticleSystem() {
  const envCtx = useEnvironmentSafe();
  if (!envCtx) return null;

  const { env } = envCtx;
  const density = env.particleDensity;
  const craft   = env.craftType;
  const accent  = CRAFT_THEMES[craft]?.accent ?? "#d4af37";

  // Performance mode scales particle count: cinematic ×1.4 / balanced ×1 / low-power ×0.3
  const perfScale = env.performanceMode === "cinematic" ? 1.4
    : env.performanceMode === "low-power" ? 0.3
    : 1.0;
  const baseCount = Math.round(density * 12 * perfScale); // max 12 at balanced
  if (baseCount === 0) return null;

  return (
    <div style={{
      position:      "fixed",
      inset:         0,
      zIndex:        1,
      pointerEvents: "none",
      overflow:      "hidden",
    }}>
      {craft === "smoke" && <EmberParticles accent={accent} count={baseCount} />}
      {craft === "pour"  && <CondensationDroplets count={Math.max(3, Math.round(baseCount * 0.85))} />}
      {craft === "brew"  && <CarbonationBubbles accent={accent} count={baseCount} />}
      {craft === "vape"  && <VaporWisps accent={accent} count={Math.max(3, Math.round(baseCount * 0.75))} />}
    </div>
  );
});
