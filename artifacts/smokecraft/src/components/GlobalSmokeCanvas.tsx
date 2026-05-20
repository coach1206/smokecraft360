/**
 * GlobalSmokeCanvas — persistent full-screen volumetric smoke layer.
 *
 * Multi-layered canvas system: slow large background wisps + faster medium foreground
 * layers + amber ember micro-particles, all rising from the bottom screen edge.
 * Smoke dies at ~60% of screen height so product imagery above the fold stays legible.
 *
 * Mounted globally in SubPageProviders — never unmounts between guest stages.
 */

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  grow: number;
  layer: "bg" | "mid" | "ember";
  hue: number;
}

export default function GlobalSmokeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: Particle[] = [];

    /* Background layer — large, very slow-drifting wisps filling bottom 60% */
    function spawnBgSmoke() {
      const h = canvas!.height;
      const w = canvas!.width;
      particles.push({
        layer: "bg",
        x:     Math.random() * w,
        y:     h + 40,
        vx:    (Math.random() - 0.5) * 0.28,
        vy:    -(Math.random() * 0.28 + 0.08),
        r:     70 + Math.random() * 90,
        alpha: Math.random() * 0.038 + 0.010,
        grow:  Math.random() * 0.16 + 0.05,
        hue:   0,
      });
    }

    /* Mid layer — medium speed, tighter spread, slightly warmer */
    function spawnMidSmoke() {
      const h = canvas!.height;
      const w = canvas!.width;
      /* Bias spawn toward center-bottom like a smoldering source */
      const cx = w * 0.5 + (Math.random() - 0.5) * w * 0.7;
      particles.push({
        layer: "mid",
        x:     cx,
        y:     h + 20,
        vx:    (Math.random() - 0.5) * 0.45,
        vy:    -(Math.random() * 0.42 + 0.14),
        r:     28 + Math.random() * 48,
        alpha: Math.random() * 0.050 + 0.018,
        grow:  Math.random() * 0.12 + 0.04,
        hue:   0,
      });
    }

    /* Ember micro-particles — small glowing sparks from bottom edge */
    function spawnEmber() {
      const h = canvas!.height;
      const w = canvas!.width;
      particles.push({
        layer: "ember",
        x:     Math.random() * w,
        y:     h + 6,
        vx:    (Math.random() - 0.5) * 0.85,
        vy:    -(Math.random() * 1.4 + 0.5),
        r:     Math.random() * 1.6 + 0.5,
        alpha: Math.random() * 0.60 + 0.25,
        grow:  0,
        hue:   18 + Math.random() * 28,   // warm amber/orange hues
      });
    }

    /* Ceiling height — smoke dies when it crosses 40% from top (fills bottom 60%) */
    function ceilingY(): number {
      return (canvas?.height ?? 0) * 0.40;
    }

    let frame = 0;
    let raf: number;

    /* Particle caps per layer */
    const MAX_BG    = 22;
    const MAX_MID   = 38;
    const MAX_EMBER = 20;

    function draw() {
      const w = canvas!.width;
      const h = canvas!.height;
      ctx!.clearRect(0, 0, w, h);

      const bgCount    = particles.filter(p => p.layer === "bg").length;
      const midCount   = particles.filter(p => p.layer === "mid").length;
      const emberCount = particles.filter(p => p.layer === "ember").length;

      if (frame % 10 === 0 && bgCount    < MAX_BG)    spawnBgSmoke();
      if (frame % 5  === 0 && midCount   < MAX_MID)   spawnMidSmoke();
      if (frame % 8  === 0 && emberCount < MAX_EMBER)  spawnEmber();
      frame++;

      const ceil = ceilingY();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.x  += p.vx;
        p.y  += p.vy;
        /* Gentle horizontal drift — simulates slow lounge air current */
        p.vx += (Math.random() - 0.5) * 0.012;

        if (p.layer === "bg" || p.layer === "mid") {
          p.r     += p.grow;
          /* Fade out more aggressively as smoke approaches the ceiling */
          const headroom = Math.max(0, p.y - ceil);
          const fadeDenom = h * 0.18;
          const ceilFade  = fadeDenom > 0 ? Math.min(1, headroom / fadeDenom) : 1;
          p.alpha  -= 0.00018;

          if (p.alpha <= 0 || p.y < ceil - p.r) {
            particles.splice(i, 1);
            continue;
          }

          const displayAlpha = p.alpha * ceilFade;
          /* Guard against NaN (canvas not yet sized) or near-zero values */
          if (!(displayAlpha > 0.001)) continue;

          const g = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          if (p.layer === "bg") {
            g.addColorStop(0,   `rgba(170,130,65,${(displayAlpha).toFixed(4)})`);
            g.addColorStop(0.4, `rgba(110,80,40,${(displayAlpha * 0.45).toFixed(4)})`);
            g.addColorStop(1,   "rgba(0,0,0,0)");
          } else {
            /* Mid layer — slightly warmer amber tint */
            g.addColorStop(0,   `rgba(195,145,70,${Math.min(1, displayAlpha * 1.1).toFixed(4)})`);
            g.addColorStop(0.45,`rgba(140,100,50,${(displayAlpha * 0.40).toFixed(4)})`);
            g.addColorStop(1,   "rgba(0,0,0,0)");
          }

          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fillStyle = g;
          ctx!.fill();

        } else {
          /* Ember */
          p.alpha -= 0.0038;
          if (p.alpha <= 0 || p.y < -12) { particles.splice(i, 1); continue; }
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fillStyle = `hsla(${p.hue}, 95%, 65%, ${p.alpha.toFixed(3)})`;
          ctx!.shadowColor = `hsla(${p.hue}, 90%, 60%, 0.65)`;
          ctx!.shadowBlur  = 5;
          ctx!.fill();
          ctx!.shadowBlur  = 0;
        }
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      "fixed",
        inset:         0,
        pointerEvents: "none",
        zIndex:        1,
        opacity:       0.72,
      }}
    />
  );
}
