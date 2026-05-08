/**
 * CraftSensoryCanvas — Full-canvas physics-based sensory engine.
 *
 * Replaces/augments CSS-based CraftRealism with real particle systems:
 *   smoke  — curl-noise smoke particles with ash behavior + ember glow
 *   pour   — liquid pour simulation with surface tension + condensation droplets
 *   brew   — carbonation physics + foam crown with bubble coalescence
 *   vape   — perlin vapor clouds with neon coil glow + LED sweep
 *
 * Uses Canvas 2D + requestAnimationFrame. Mounts as a fixed-position
 * overlay with pointerEvents: none.  Never fully stops — intensity
 * modulates based on `intensity` prop (0.0–1.0).
 */

import { useEffect, useRef } from "react";

interface Props {
  craftType:  "smoke" | "pour" | "brew" | "vape";
  accent:     string;
  intensity?: number;          // 0.0 = minimal, 1.0 = full cinematic
  fullScreen?: boolean;        // true = fixed overlay, false = absolute fill parent
}

// ── Utility ───────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function rand(min: number, max: number)         { return min + Math.random() * (max - min); }

// Simple pseudo-noise (value noise)
function noise2(x: number, y: number): number {
  const ix = Math.floor(x); const iy = Math.floor(y);
  const fx = x - ix;        const fy = y - iy;
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const pfx = fade(fx);     const pfy = fade(fy);
  const h = (n: number) => {
    let s = Math.sin(n * 127.1 + iy * 311.7) * 43758.5453;
    s -= Math.floor(s); return s * 2 - 1;
  };
  return lerp(lerp(h(ix), h(ix + 1), pfx), lerp(h(ix + iy), h(ix + 1 + iy), pfx), pfy);
}

// ── Smoke Engine ──────────────────────────────────────────────────────────────

interface SmokeParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; r: number;
  opacity: number; curl: number;
}

function smokeEngine(canvas: HTMLCanvasElement, accent: string, intensity: number) {
  const ctx   = canvas.getContext("2d")!;
  const [r, g, b] = hexToRgb(accent);
  const particles: SmokeParticle[] = [];
  let   time  = 0;
  let   raf   = 0;

  function spawn() {
    if (particles.length > 60 * intensity) return;
    const spawnX = canvas.width * rand(0.35, 0.65);
    particles.push({
      x: spawnX, y: canvas.height * 0.72,
      vx: rand(-0.3, 0.3), vy: rand(-0.8, -1.4),
      life: 0, maxLife: rand(120, 220) * intensity,
      r: rand(18, 42) * intensity,
      opacity: rand(0.06, 0.16) * intensity,
      curl: rand(-0.008, 0.008),
    });
  }

  function draw() {
    raf  = requestAnimationFrame(draw);
    time += 0.012;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Spawn 1-2 particles per frame
    if (Math.random() < 0.55 * intensity) spawn();
    if (intensity > 0.7 && Math.random() < 0.25) spawn();

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!;
      p.life++;
      if (p.life > p.maxLife) { particles.splice(i, 1); continue; }

      const t   = p.life / p.maxLife;
      const age = t < 0.15 ? t / 0.15 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;

      // Curl noise drift
      const nx  = noise2(p.x * 0.004, time * 0.3);
      const ny  = noise2(p.y * 0.004 + 5, time * 0.3);
      p.vx     += nx * 0.04 + p.curl;
      p.vy     += ny * 0.015 - 0.012;
      p.vx     *= 0.98;
      p.vy     *= 0.98;
      p.x      += p.vx;
      p.y      += p.vy;
      p.r      += 0.18 * intensity;

      const alpha = p.opacity * age;
      const grad  = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0,   `rgba(${r},${g},${b},${alpha * 0.55})`);
      grad.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.25})`);
      grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ember tip glow
    const tipX = canvas.width  * 0.5;
    const tipY = canvas.height * 0.72;
    const glow = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 14 * intensity);
    const pulse = 0.6 + 0.4 * Math.sin(time * 3.2);
    glow.addColorStop(0,   `rgba(${r},${g},${b},${0.8 * pulse * intensity})`);
    glow.addColorStop(0.5, `rgba(${r},${g},${b},${0.25 * pulse * intensity})`);
    glow.addColorStop(1,   "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  draw();
  return () => cancelAnimationFrame(raf);
}

// ── Pour / Liquid Engine ──────────────────────────────────────────────────────

interface LiquidDrop { x: number; y: number; vy: number; r: number; life: number; maxLife: number; }

function liquidEngine(canvas: HTMLCanvasElement, accent: string, intensity: number) {
  const ctx = canvas.getContext("2d")!;
  const [r, g, b] = hexToRgb(accent);
  const drops: LiquidDrop[] = [];
  let   time = 0, raf = 0;
  const poolY = canvas.height * 0.68;

  function spawnDrop() {
    if (drops.length > 30 * intensity) return;
    drops.push({
      x: canvas.width * rand(0.44, 0.56),
      y: canvas.height * 0.12,
      vy: rand(2.4, 4.2) * intensity,
      r: rand(3, 7) * intensity,
      life: 0, maxLife: rand(60, 100),
    });
  }

  // Condensation drips
  const drips = Array.from({ length: Math.ceil(6 * intensity) }, (_, i) => ({
    x: canvas.width * (0.15 + i * 0.14),
    y: canvas.height * rand(0.25, 0.55),
    vy: rand(0.15, 0.4), r: rand(1.5, 3),
  }));

  function draw() {
    raf  = requestAnimationFrame(draw);
    time += 0.016;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (Math.random() < 0.35 * intensity) spawnDrop();

    // Pool surface — slow viscous wave
    const waveAmp = 4 * intensity;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 4) {
      const wy = poolY + Math.sin(x * 0.018 + time * 1.2) * waveAmp
                       + Math.sin(x * 0.034 + time * 0.8) * waveAmp * 0.5;
      x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    const poolGrad = ctx.createLinearGradient(0, poolY, 0, canvas.height);
    poolGrad.addColorStop(0,   `rgba(${r},${g},${b},${0.22 * intensity})`);
    poolGrad.addColorStop(0.6, `rgba(${r},${g},${b},${0.12 * intensity})`);
    poolGrad.addColorStop(1,   `rgba(${r},${g},${b},${0.06 * intensity})`);
    ctx.fillStyle = poolGrad;
    ctx.fill();

    // Refraction shimmer
    const shimX = (Math.sin(time * 0.6) * 0.5 + 0.5) * canvas.width;
    const shimGrad = ctx.createLinearGradient(shimX, 0, shimX + 40, canvas.height);
    shimGrad.addColorStop(0,   "rgba(255,255,255,0)");
    shimGrad.addColorStop(0.5, `rgba(255,255,255,${0.06 * intensity})`);
    shimGrad.addColorStop(1,   "rgba(255,255,255,0)");
    ctx.fillStyle = shimGrad;
    ctx.fillRect(shimX - 20, canvas.height * 0.1, 60, canvas.height * 0.85);

    // Liquid drops in flight
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i]!;
      d.y   += d.vy;
      d.life++;
      if (d.y > poolY || d.life > d.maxLife) { drops.splice(i, 1); continue; }
      const t     = d.life / d.maxLife;
      const alpha = intensity * (1 - t * 0.3);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.6})`;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.r * 0.7, d.r, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Condensation drips
    drips.forEach(drip => {
      drip.y += drip.vy;
      if (drip.y > canvas.height * 0.75) drip.y = canvas.height * rand(0.2, 0.4);
      const alpha = 0.28 * intensity;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.ellipse(drip.x, drip.y, drip.r * 0.5, drip.r, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  draw();
  return () => cancelAnimationFrame(raf);
}

// ── Brew / Carbonation Engine ─────────────────────────────────────────────────

interface Bubble { x: number; y: number; vy: number; r: number; life: number; maxLife: number; }

function brewEngine(canvas: HTMLCanvasElement, accent: string, intensity: number) {
  const ctx = canvas.getContext("2d")!;
  const [r, g, b] = hexToRgb(accent);
  const bubbles: Bubble[] = [];
  let   time = 0, raf = 0;
  const liquidTop = canvas.height * 0.28;

  function spawnBubble() {
    if (bubbles.length > 55 * intensity) return;
    const sz = rand(1.5, 4.5) * intensity;
    bubbles.push({
      x: rand(canvas.width * 0.12, canvas.width * 0.88),
      y: canvas.height * 0.75,
      vy: rand(0.7, 2.0) * intensity,
      r: sz, life: 0, maxLife: rand(80, 160),
    });
  }

  function draw() {
    raf  = requestAnimationFrame(draw);
    time += 0.014;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Beer body
    const beerGrad = ctx.createLinearGradient(0, liquidTop, 0, canvas.height);
    beerGrad.addColorStop(0,   `rgba(${r},${g},${b},${0.18 * intensity})`);
    beerGrad.addColorStop(1,   `rgba(${r},${g},${b},${0.08 * intensity})`);
    ctx.fillStyle = beerGrad;
    ctx.fillRect(0, liquidTop, canvas.width, canvas.height - liquidTop);

    // Foam crown (animated billowing)
    const foamY = liquidTop - 14 * intensity;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 6) {
      const wy = foamY
        + Math.sin(x * 0.028 + time * 0.9) * 7 * intensity
        + Math.sin(x * 0.055 + time * 1.5) * 4 * intensity;
      x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
    }
    ctx.lineTo(canvas.width, liquidTop + 18);
    ctx.lineTo(0, liquidTop + 18);
    ctx.closePath();
    ctx.fillStyle = `rgba(255,252,245,${0.22 * intensity})`;
    ctx.fill();

    // Spawn bubbles
    if (Math.random() < 0.7 * intensity) spawnBubble();

    // Draw + rise bubbles
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const bub = bubbles[i]!;
      bub.y   -= bub.vy;
      bub.x   += Math.sin(bub.life * 0.08) * 0.35;
      bub.life++;
      if (bub.y < liquidTop || bub.life > bub.maxLife) { bubbles.splice(i, 1); continue; }
      const t     = bub.life / bub.maxLife;
      const alpha = intensity * (1 - t) * 0.55;
      ctx.strokeStyle = `rgba(255,252,245,${alpha})`;
      ctx.lineWidth   = 0.7;
      ctx.beginPath();
      ctx.arc(bub.x, bub.y, bub.r, 0, Math.PI * 2);
      ctx.stroke();
      // Highlight
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(bub.x - bub.r * 0.25, bub.y - bub.r * 0.25, bub.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Foam micro-bubbles on crown
    for (let i = 0; i < Math.ceil(12 * intensity); i++) {
      const fx    = (time * 18 + i * 30) % canvas.width;
      const fy    = foamY + Math.sin(fx * 0.04 + time) * 5;
      const fr    = rand(2, 5) * intensity;
      const alpha = 0.12 * intensity;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth   = 0.5;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  draw();
  return () => cancelAnimationFrame(raf);
}

// ── Vape / Vapor Engine ───────────────────────────────────────────────────────

interface VapeCloud { x: number; y: number; vx: number; vy: number; r: number; life: number; maxLife: number; hue: number; }

function vapeEngine(canvas: HTMLCanvasElement, accent: string, intensity: number) {
  const ctx = canvas.getContext("2d")!;
  const [r, g, b] = hexToRgb(accent);
  const clouds: VapeCloud[] = [];
  let   time = 0, raf = 0;

  // Hue cycle: purple → cyan → magenta
  const HUE_MAP: Array<[number, number, number]> = [
    [r, g, b],
    [6, 182, 212],    // cyan
    [232, 121, 249],  // magenta
  ];

  function spawnCloud() {
    if (clouds.length > 22 * intensity) return;
    const hIdx = Math.floor(Math.random() * 3);
    const [hr, hg, hb] = HUE_MAP[hIdx]!;
    clouds.push({
      x: canvas.width * rand(0.2, 0.8),
      y: canvas.height * rand(0.45, 0.65),
      vx: rand(-0.25, 0.25), vy: rand(-0.6, -1.1) * intensity,
      r: rand(30, 80) * intensity,
      life: 0, maxLife: rand(160, 280),
      hue: (hr << 16) | (hg << 8) | hb,
    });
  }

  function draw() {
    raf  = requestAnimationFrame(draw);
    time += 0.013;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (Math.random() < 0.45 * intensity) spawnCloud();

    for (let i = clouds.length - 1; i >= 0; i--) {
      const c = clouds[i]!;
      c.life++;
      if (c.life > c.maxLife) { clouds.splice(i, 1); continue; }

      const t   = c.life / c.maxLife;
      const age = t < 0.12 ? t / 0.12 : t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;

      // Curl + noise drift
      c.vx += noise2(c.x * 0.005, time * 0.2) * 0.04;
      c.vy += noise2(c.y * 0.005 + 8, time * 0.2) * 0.015 - 0.008;
      c.vx *= 0.97; c.vy *= 0.97;
      c.x  += c.vx; c.y  += c.vy;
      c.r  += 0.22 * intensity;

      const cr   = (c.hue >> 16) & 255;
      const cg   = (c.hue >> 8)  & 255;
      const cb   =  c.hue        & 255;
      const alpha= 0.14 * age * intensity;
      const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      grad.addColorStop(0,   `rgba(${cr},${cg},${cb},${alpha * 0.9})`);
      grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},${alpha * 0.4})`);
      grad.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Coil glow at bottom center
    const coilX = canvas.width  * 0.5;
    const coilY = canvas.height * 0.78;
    const coilPulse = 0.5 + 0.5 * Math.sin(time * 4.5);
    const coil = ctx.createRadialGradient(coilX, coilY, 0, coilX, coilY, 28 * intensity);
    coil.addColorStop(0,   `rgba(${r},${g},${b},${0.7 * coilPulse * intensity})`);
    coil.addColorStop(0.5, `rgba(6,182,212,${0.3  * coilPulse * intensity})`);
    coil.addColorStop(1,   "rgba(0,0,0,0)");
    ctx.fillStyle = coil;
    ctx.beginPath();
    ctx.arc(coilX, coilY, 28, 0, Math.PI * 2);
    ctx.fill();

    // LED neon scan line
    const scanX = (Math.sin(time * 0.9) * 0.5 + 0.5) * canvas.width;
    const scanGrad = ctx.createLinearGradient(scanX - 80, 0, scanX + 80, 0);
    scanGrad.addColorStop(0,   "rgba(0,0,0,0)");
    scanGrad.addColorStop(0.5, `rgba(${r},${g},${b},${0.18 * intensity})`);
    scanGrad.addColorStop(1,   "rgba(0,0,0,0)");
    ctx.fillStyle = scanGrad;
    ctx.fillRect(scanX - 80, 0, 160, canvas.height);
  }

  draw();
  return () => cancelAnimationFrame(raf);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CraftSensoryCanvas({ craftType, accent, intensity = 1, fullScreen = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let cleanup: (() => void) | undefined;
    switch (craftType) {
      case "smoke": cleanup = smokeEngine(canvas, accent, intensity);   break;
      case "pour":  cleanup = liquidEngine(canvas, accent, intensity);  break;
      case "brew":  cleanup = brewEngine(canvas, accent, intensity);    break;
      case "vape":  cleanup = vapeEngine(canvas, accent, intensity);    break;
    }

    return () => {
      ro.disconnect();
      cleanup?.();
    };
  }, [craftType, accent, intensity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      fullScreen ? "fixed" : "absolute",
        inset:         0,
        width:         "100%",
        height:        "100%",
        pointerEvents: "none",
        zIndex:        fullScreen ? 5 : 2,
        opacity:       intensity,
      }}
    />
  );
}
