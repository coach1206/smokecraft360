/**
 * GlobalSmokeCanvas — persistent full-screen smoke + ember particle layer.
 * Renders behind all content (zIndex 0) so it never occludes UI elements.
 * Extracted from MasterBlender and elevated to global scope.
 */

import { useEffect, useRef } from "react";

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  r: number; alpha: number;
  grow: number;
  type: "smoke" | "ember";
  hue: number;
};

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
    const MAX_SMOKE  = 40;
    const MAX_EMBERS = 18;

    function spawnSmoke() {
      particles.push({
        type:  "smoke",
        x:     Math.random() * canvas!.width,
        y:     canvas!.height + 30,
        vx:    (Math.random() - 0.5) * 0.45,
        vy:    -(Math.random() * 0.45 + 0.14),
        r:     Math.random() * 50 + 30,
        alpha: Math.random() * 0.045 + 0.012,
        grow:  Math.random() * 0.12 + 0.03,
        hue:   0,
      });
    }

    function spawnEmber() {
      particles.push({
        type:  "ember",
        x:     Math.random() * canvas!.width,
        y:     canvas!.height + 8,
        vx:    (Math.random() - 0.5) * 0.8,
        vy:    -(Math.random() * 1.2 + 0.5),
        r:     Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.55 + 0.25,
        grow:  0,
        hue:   20 + Math.random() * 30,
      });
    }

    let frame = 0;
    let raf: number;

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      const smokeCount  = particles.filter(p => p.type === "smoke").length;
      const emberCount  = particles.filter(p => p.type === "ember").length;

      if (frame % 6 === 0 && smokeCount < MAX_SMOKE)  spawnSmoke();
      if (frame % 9 === 0 && emberCount < MAX_EMBERS) spawnEmber();
      frame++;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.x += p.vx;
        p.y += p.vy;

        if (p.type === "smoke") {
          p.r     += p.grow;
          p.alpha -= 0.00025;
          if (p.alpha <= 0 || p.y < -p.r * 2) { particles.splice(i, 1); continue; }
          const g = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0,   `rgba(180,145,80,${p.alpha.toFixed(4)})`);
          g.addColorStop(0.5, `rgba(120,90,45,${(p.alpha * 0.4).toFixed(4)})`);
          g.addColorStop(1,   "rgba(0,0,0,0)");
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fillStyle = g;
          ctx!.fill();
        } else {
          p.alpha -= 0.004;
          p.vx   += (Math.random() - 0.5) * 0.04;
          if (p.alpha <= 0 || p.y < -10) { particles.splice(i, 1); continue; }
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fillStyle = `hsla(${p.hue}, 95%, 62%, ${p.alpha.toFixed(3)})`;
          ctx!.shadowColor = `hsla(${p.hue}, 95%, 62%, 0.55)`;
          ctx!.shadowBlur  = 4;
          ctx!.fill();
          ctx!.shadowBlur = 0;
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
        opacity:       0.65,
      }}
    />
  );
}
