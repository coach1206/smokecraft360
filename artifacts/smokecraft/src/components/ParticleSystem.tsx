/**
 * ParticleSystem — ambient particle overlay.
 *
 * Renders craft-specific ambient particles:
 *   smoke: floating ember sparks + dust motes
 *   pour:  condensation droplets + refraction glints
 *   brew:  rising bubbles + micro-foam
 *   vape:  vapor wisps + neon glow orbs
 *
 * Particle density is driven by EnvironmentEngine.particleDensity (0–1).
 * All animations are transform-only for 60fps.
 * Automatically cleans up on unmount (no memory leaks).
 */

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { useEnvironmentSafe } from "@/contexts/EnvironmentContext";
import { CRAFT_THEMES } from "@/lib/craftThemes";

interface Particle {
  id:     number;
  x:      number;  // % left
  y:      number;  // % bottom
  size:   number;  // px
  delay:  number;  // animation delay s
  dur:    number;  // animation duration s
  drift:  number;  // horizontal drift px
}

function makeParticles(count: number, seed: number): Particle[] {
  // Deterministic pseudo-random from seed
  const rng = (i: number, s: number) => {
    const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  return Array.from({ length: count }, (_, i) => ({
    id:    i,
    x:     rng(i, seed + 0) * 90 + 5,
    y:     rng(i, seed + 1) * 50,
    size:  rng(i, seed + 2) * 4 + 1.5,
    delay: rng(i, seed + 3) * 6,
    dur:   rng(i, seed + 4) * 4 + 3,
    drift: (rng(i, seed + 5) - 0.5) * 40,
  }));
}

// ── Ember particles (smoke) ───────────────────────────────────────────────────

function EmberParticles({ accent, count }: { accent: string; count: number }) {
  const particles = useMemo(() => makeParticles(count, 42), [count]);
  return (
    <>
      {particles.map(p => (
        <motion.div
          key={p.id}
          animate={{
            y:       [0, -(120 + p.dur * 18)],
            x:       [0, p.drift],
            opacity: [0, 0.85, 0],
            scale:   [0.3, 1, 0.2],
          }}
          transition={{
            duration: p.dur,
            repeat:   Infinity,
            delay:    p.delay,
            ease:     "easeOut",
          }}
          style={{
            position:     "absolute",
            bottom:       `${p.y}%`,
            left:         `${p.x}%`,
            width:        p.size,
            height:       p.size,
            borderRadius: "50%",
            background:   accent,
            boxShadow:    `0 0 ${p.size * 2}px ${accent}`,
            willChange:   "transform, opacity",
          }}
        />
      ))}
      {/* Dust motes */}
      {particles.slice(0, Math.ceil(count * 0.4)).map(p => (
        <motion.div
          key={`mote-${p.id}`}
          animate={{
            y:       [0, -(60 + p.dur * 8)],
            x:       [0, p.drift * 0.6],
            opacity: [0, 0.25, 0],
          }}
          transition={{
            duration: p.dur * 1.8,
            repeat:   Infinity,
            delay:    p.delay + 2,
            ease:     "easeInOut",
          }}
          style={{
            position:     "absolute",
            bottom:       `${p.y + 30}%`,
            left:         `${p.x + 5}%`,
            width:        p.size * 0.6,
            height:       p.size * 0.6,
            borderRadius: "50%",
            background:   "rgba(240,220,180,0.6)",
            willChange:   "transform, opacity",
          }}
        />
      ))}
    </>
  );
}

// ── Condensation droplets (pour) ──────────────────────────────────────────────

function CondensationDroplets({ count }: { count: number }) {
  const particles = useMemo(() => makeParticles(count, 77), [count]);
  return (
    <>
      {particles.map(p => (
        <motion.div
          key={p.id}
          animate={{
            y:       [0, 20 + p.dur * 3],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: p.dur * 0.8,
            repeat:   Infinity,
            delay:    p.delay,
            ease:     "linear",
          }}
          style={{
            position:     "absolute",
            top:          `${p.y + 15}%`,
            left:         `${p.x}%`,
            width:        p.size * 0.7,
            height:       p.size * 1.8,
            borderRadius: "50% 50% 60% 60%",
            background:   "rgba(220,240,255,0.45)",
            willChange:   "transform, opacity",
          }}
        />
      ))}
      {/* Refraction glints */}
      {particles.slice(0, Math.ceil(count * 0.3)).map(p => (
        <motion.div
          key={`glint-${p.id}`}
          animate={{
            opacity: [0, 0.6, 0],
            scale:   [0.5, 1.4, 0.5],
          }}
          transition={{
            duration: p.dur * 0.5,
            repeat:   Infinity,
            delay:    p.delay + 1,
            ease:     "easeInOut",
          }}
          style={{
            position:     "absolute",
            top:          `${p.y * 0.6 + 10}%`,
            left:         `${p.x}%`,
            width:        3,
            height:       3,
            borderRadius: "50%",
            background:   "rgba(255,255,255,0.9)",
            boxShadow:    "0 0 6px rgba(255,255,255,0.7)",
            willChange:   "transform, opacity",
          }}
        />
      ))}
    </>
  );
}

// ── Carbonation bubbles (brew) ────────────────────────────────────────────────

function CarbonationBubbles({ accent, count }: { accent: string; count: number }) {
  const particles = useMemo(() => makeParticles(count, 128), [count]);
  return (
    <>
      {particles.map(p => (
        <motion.div
          key={p.id}
          animate={{
            y:       [0, -(100 + p.dur * 15)],
            opacity: [0, 0.6, 0],
            scale:   [0.4, 1, 0.6],
          }}
          transition={{
            duration: p.dur * 0.7,
            repeat:   Infinity,
            delay:    p.delay,
            ease:     "easeOut",
          }}
          style={{
            position:     "absolute",
            bottom:       `${p.y * 0.4}%`,
            left:         `${p.x}%`,
            width:        p.size,
            height:       p.size,
            borderRadius: "50%",
            background:   "transparent",
            border:       `1px solid rgba(255,255,255,0.45)`,
            willChange:   "transform, opacity",
          }}
        />
      ))}
    </>
  );
}

// ── Vapor wisps (vape) ────────────────────────────────────────────────────────

function VaporWisps({ accent, count }: { accent: string; count: number }) {
  const particles = useMemo(() => makeParticles(count, 200), [count]);
  return (
    <>
      {particles.map(p => (
        <motion.div
          key={p.id}
          animate={{
            y:       [0, -(80 + p.dur * 12)],
            x:       [0, p.drift],
            opacity: [0, 0.20, 0],
            scaleX:  [0.5, 2.2, 3],
          }}
          transition={{
            duration: p.dur * 1.6,
            repeat:   Infinity,
            delay:    p.delay,
            ease:     "easeOut",
          }}
          style={{
            position:     "absolute",
            bottom:       `${p.y * 0.5 + 10}%`,
            left:         `${p.x}%`,
            width:        p.size * 8,
            height:       p.size * 5,
            borderRadius: "50%",
            background:   "rgba(255,255,255,0.08)",
            filter:       "blur(12px)",
            willChange:   "transform, opacity",
          }}
        />
      ))}
      {/* Neon glow orbs */}
      {particles.slice(0, Math.ceil(count * 0.35)).map(p => (
        <motion.div
          key={`orb-${p.id}`}
          animate={{
            opacity: [0, 0.4, 0],
            scale:   [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: p.dur * 1.2,
            repeat:   Infinity,
            delay:    p.delay + 0.5,
            ease:     "easeInOut",
          }}
          style={{
            position:     "absolute",
            bottom:       `${p.y + 5}%`,
            left:         `${p.x + 10}%`,
            width:        p.size * 3,
            height:       p.size * 3,
            borderRadius: "50%",
            background:   accent,
            filter:       `blur(${p.size * 3}px)`,
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

  // Scale particle counts with density (min 0, max full)
  const baseCount = Math.round(density * 14);
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
      {craft === "pour"  && <CondensationDroplets count={Math.round(baseCount * 0.8)} />}
      {craft === "brew"  && <CarbonationBubbles accent={accent} count={baseCount} />}
      {craft === "vape"  && <VaporWisps accent={accent} count={Math.round(baseCount * 0.7)} />}
    </div>
  );
});
