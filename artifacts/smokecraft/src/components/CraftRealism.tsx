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

// ── SmokeCraft: Canvas-based volumetric smoke + smoldering ember fixture ──────

interface SmokeParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  type: "ember" | "smoke";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.startsWith("#") ? hex : "#d4af37";
  return {
    r: parseInt(clean.slice(1, 3), 16),
    g: parseInt(clean.slice(3, 5), 16),
    b: parseInt(clean.slice(5, 7), 16),
  };
}

export function EmberGlow({ accent, intensity = 1 }: RealisticsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawCtx = canvas.getContext("2d");
    if (!rawCtx) return;
    // Capture as non-null alias so TypeScript is satisfied inside all closures
    const c: CanvasRenderingContext2D = rawCtx;

    let raf: number;
    let t = 0;
    const rgb = hexToRgb(accent);
    const particles: SmokeParticle[] = [];

    function resize() {
      canvas!.width  = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
    }
    resize();

    function spawnEmber() {
      const w = canvas!.width;
      const h = canvas!.height;
      particles.push({
        x: w * (0.44 + (Math.random() - 0.5) * 0.14),
        y: h * 0.74,
        vx: (Math.random() - 0.5) * 0.7,
        vy: -(0.55 + Math.random() * 0.85),
        life: 0,
        maxLife: 80 + Math.random() * 60,
        size: 1.4 + Math.random() * 2,
        type: "ember",
      });
    }

    function spawnSmoke() {
      const w = canvas!.width;
      const h = canvas!.height;
      particles.push({
        x: w * (0.42 + (Math.random() - 0.5) * 0.18),
        y: h * 0.70,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -(0.28 + Math.random() * 0.45),
        life: 0,
        maxLife: 200 + Math.random() * 140,
        size: 14 + Math.random() * 22,
        type: "smoke",
      });
    }

    function tick() {
      t++;
      const w = canvas!.width;
      const h = canvas!.height;
      c.clearRect(0, 0, w, h);

      if (t % 4  === 0) spawnEmber();
      if (t % 14 === 0) spawnSmoke();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.x  += p.vx;
        p.y  += p.vy;
        p.vx += (Math.random() - 0.5) * 0.05;
        p.life++;

        const progress = p.life / p.maxLife;
        const alpha    = Math.sin(progress * Math.PI) * intensity;

        if (p.type === "ember") {
          c.save();
          c.shadowBlur  = p.size * 3.5;
          c.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.75})`;
          c.beginPath();
          c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          c.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.92})`;
          c.fill();
          c.restore();
        } else {
          const r = p.size * (1 + progress * 1.6);
          const grad = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          grad.addColorStop(0, `rgba(180,130,60,${alpha * 0.07})`);
          grad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.04})`);
          grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
          c.beginPath();
          c.arc(p.x, p.y, r, 0, Math.PI * 2);
          c.fillStyle = grad;
          c.fill();
        }

        if (p.life >= p.maxLife) particles.splice(i, 1);
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [accent, intensity]);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Canvas-based 60fps volumetric smoke + ember particle system */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", willChange: "contents" }}
      />

      {/* ── Smoldering cigar-tip ember — fixed bottom-center, 4–6s pulse ── */}
      <motion.div
        animate={{
          boxShadow: [
            `0 0 6px 2px ${accent}38`,
            `0 0 24px 7px ${accent}92`,
            `0 0 12px 3px ${accent}60`,
            `0 0 24px 7px ${accent}92`,
            `0 0 6px 2px ${accent}38`,
          ],
          opacity: [0.82, 1, 0.88, 1, 0.82],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:     "absolute",
          bottom:       68,
          left:         "49%",
          width:        9,
          height:       5,
          borderRadius: "50%",
          background:   `radial-gradient(ellipse, #fff8e1 0%, ${accent} 42%, #7c3800 100%)`,
          willChange:   "box-shadow, opacity",
        }}
      />

      {/* Micro-sparks ejecting from tip */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={`spark-${i}`}
          animate={{
            x:       [0, (i === 0 ? -7 : i === 1 ? 5 : -2)],
            y:       [0, -(16 + i * 9)],
            opacity: [0, 0.88, 0],
            scale:   [1, 0.35],
          }}
          transition={{
            duration: 0.5 + i * 0.14,
            repeat:   Infinity,
            delay:    i * 1.5 + 0.2,
            ease:     "easeOut",
          }}
          style={{
            position:     "absolute",
            bottom:       70,
            left:         `calc(49% + ${i * 2}px)`,
            width:        2.5,
            height:       2.5,
            borderRadius: "50%",
            background:   "#fff8e1",
            boxShadow:    `0 0 4px ${accent}`,
            willChange:   "transform, opacity",
          }}
        />
      ))}

      {/* Base ember warmth pool — ambient heat underlay */}
      <motion.div
        animate={{ opacity: [0.14, 0.26, 0.14], scale: [1, 1.05, 1] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:  "absolute",
          bottom:    -40, left: "20%",
          width:     "60%", height: "55%",
          background:`radial-gradient(ellipse, ${accent}55 0%, ${accent}20 40%, transparent 70%)`,
          willChange:"opacity, transform",
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
