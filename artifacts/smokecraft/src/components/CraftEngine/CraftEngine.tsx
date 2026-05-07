/**
 * CraftEngine — Full Sensory Canvas Physics Engine
 *
 * Renders real-time liquid / vape physics on a canvas, then cross-fades to
 * the AI-generated (or static fallback) photo once the animation has played.
 *
 * Physics profiles
 * ────────────────
 * beer     → dynamic waves + rising foam + ice cubes
 * whiskey  → slow viscous waves + optional swirl + ice
 * wine     → medium waves
 * vape     → pointer-reactive particle cloud
 *
 * Performance
 * ───────────
 * - requestAnimationFrame only; no setInterval
 * - 60 fps cap (skips frames faster than 16 ms)
 * - RAF cancelled when image crossfade completes (canvas opacity → 0)
 * - ResizeObserver keeps canvas pixel-perfect on kiosk resize
 */

import {
  useCallback, useEffect, useRef, useState,
} from "react";

export type CraftType = "beer" | "whiskey" | "wine" | "vape";

interface Physics {
  speed:        number;
  waveStrength: number;
  waveSpeed:    number;
  foam:         boolean;
  fillTarget:   number;
  density:      number;
}

function getPhysics(type: CraftType): Physics {
  switch (type) {
    case "beer":
      return { speed: 0.011, waveStrength: 7,   waveSpeed: 0.11, foam: true,  fillTarget: 0.82, density: 1.2 };
    case "whiskey":
      return { speed: 0.006, waveStrength: 2.5, waveSpeed: 0.07, foam: false, fillTarget: 0.68, density: 1.0 };
    case "wine":
      return { speed: 0.008, waveStrength: 4,   waveSpeed: 0.09, foam: false, fillTarget: 0.65, density: 1.0 };
    case "vape":
      return { speed: 0.016, waveStrength: 0,   waveSpeed: 0,    foam: false, fillTarget: 0,    density: 1.3 };
    default:
      return { speed: 0.007, waveStrength: 3,   waveSpeed: 0.08, foam: false, fillTarget: 0.70, density: 1.0 };
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  const n = parseInt(c.length === 3
    ? c.split("").map(x => x + x).join("")
    : c, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawFoam(
  ctx:      CanvasRenderingContext2D,
  w:        number,
  h:        number,
  liquidH:  number,
  progress: number,
): void {
  const foamH  = Math.min(16 + progress * 26, 34);
  const count  = Math.floor(55 + progress * 35);
  for (let i = 0; i < count; i++) {
    const bx = w * 0.12 + Math.random() * w * 0.76;
    const by = (h - liquidH) - Math.random() * foamH;
    const br = 0.5 + Math.random() * 3.5;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.38 + Math.random() * 0.42})`;
    ctx.fill();
  }
}

function drawIce(
  ctx:     CanvasRenderingContext2D,
  w:       number,
  h:       number,
  liquidH: number,
): void {
  const baseY = h - liquidH + 10;
  ctx.fillStyle = "rgba(200,225,255,0.30)";
  ctx.strokeStyle = "rgba(200,225,255,0.55)";
  ctx.lineWidth = 0.8;

  const rects: [number, number, number][] = [
    [w * 0.24, baseY,     w * 0.17],
    [w * 0.52, baseY + 7, w * 0.15],
  ];
  for (const [rx, ry, rw] of rects) {
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rw, 3);
    ctx.fill();
    ctx.stroke();
  }
}

function drawLiquid(
  ctx:      CanvasRenderingContext2D,
  w:        number,
  h:        number,
  progress: number,
  physics:  Physics,
  color:    string,
  ice:      boolean,
  swirl:    boolean,
  time:     number,
): void {
  const liquidH = progress * h * physics.fillTarget;
  const y0      = h - liquidH;
  const [r, g, b] = hexToRgb(color);

  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const swirlOff = swirl
      ? Math.sin(time * 0.0018 + x * 0.038) * 7
      : 0;
    const y =
      y0 +
      Math.sin((x * 0.052) + time * physics.waveSpeed) * physics.waveStrength +
      swirlOff;
    if (x === 0) ctx.moveTo(x, y);
    else          ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, y0 - physics.waveStrength, 0, h);
  grad.addColorStop(0,   `rgba(${r},${g},${b},0.92)`);
  grad.addColorStop(0.4, `rgba(${r},${g},${b},0.78)`);
  grad.addColorStop(1,   `rgba(26,26,27,0.30)`);
  ctx.fillStyle = grad;
  ctx.fill();

  if (ice && progress > 0.3)    drawIce(ctx, w, h, liquidH);
  if (physics.foam && progress > 0.05) drawFoam(ctx, w, h, liquidH, progress);
}

function drawVape(
  ctx:      CanvasRenderingContext2D,
  w:        number,
  h:        number,
  progress: number,
  physics:  Physics,
  time:     number,
  touchX:   number,
): void {
  const cx = w * Math.max(0.1, Math.min(0.9, touchX));
  for (let i = 0; i < 40; i++) {
    const t  = i / 40;
    const x  = cx
      + Math.sin(i * 0.72 + time * 0.0038) * w * 0.22
      + Math.cos(i * 0.55 + time * 0.0025) * w * 0.08;
    const y  = h * 0.88 - progress * h * 0.55 * t - i * (h / 58);
    const r  = physics.density * (2.5 + Math.random() * 13) * (1 - t * 0.45);
    const alpha = (1 - t) * 0.072 * progress;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(225,228,240,${alpha})`;
    ctx.fill();
  }
}

function synthPourSound(type: CraftType): void {
  let ac: AudioContext;
  try {
    ac = new AudioContext();
  } catch { return; }

  if (ac.state === "suspended") void ac.resume();

  const now = ac.currentTime;

  if (type === "vape") {
    // Soft filtered white-noise burst
    const buf  = ac.createBuffer(1, ac.sampleRate * 1.6, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.65;
    }
    const src  = ac.createBufferSource();
    const filt = ac.createBiquadFilter();
    const gain = ac.createGain();
    src.buffer       = buf;
    filt.type        = "bandpass";
    filt.frequency.value = 900;
    filt.Q.value     = 0.7;
    gain.gain.setValueAtTime(0.10, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(ac.destination);
    src.start(now);
    src.stop(now + 1.6);
    return;
  }

  if (type === "beer") {
    // Bubbly rising gurgle: filtered noise + a small ascending tone
    const buf  = ac.createBuffer(1, ac.sampleRate * 1.2, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(i / (ac.sampleRate * 0.012)) * 0.5;
    }
    const src  = ac.createBufferSource();
    const filt = ac.createBiquadFilter();
    const gain = ac.createGain();
    src.buffer       = buf;
    filt.type        = "bandpass";
    filt.frequency.value = 480;
    filt.Q.value     = 1.4;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.20, now + 0.18);
    gain.gain.setValueAtTime(0.20, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(ac.destination);
    src.start(now);
    src.stop(now + 1.2);
    return;
  }

  // whiskey / wine — smooth trickle
  const buf  = ac.createBuffer(1, ac.sampleRate * 1.4, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (0.3 + 0.7 * Math.pow(1 - i / data.length, 1.5));
  }
  const src  = ac.createBufferSource();
  const filt = ac.createBiquadFilter();
  const gain = ac.createGain();
  src.buffer        = buf;
  filt.type         = "lowpass";
  filt.frequency.value = 340;
  filt.Q.value      = 0.9;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.22);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
  src.connect(filt);
  filt.connect(gain);
  gain.connect(ac.destination);
  src.start(now);
  src.stop(now + 1.4);
}

export interface CraftEngineProps {
  type:    CraftType;
  color:   string;
  image:   string;
  ice?:    boolean;
  swirl?:  boolean;
  muted?:  boolean;
}

export default function CraftEngine({
  type,
  color,
  image,
  ice    = false,
  swirl  = false,
  muted  = false,
}: CraftEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const progressRef  = useRef(0);
  const lastTsRef    = useRef(0);
  const touchXRef    = useRef(0.5);
  const activeRef    = useRef(true);

  const [imgOpacity, setImgOpacity] = useState(0);
  const [imgSrc,     setImgSrc]     = useState<string | null>(null);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    touchXRef.current = (e.clientX - rect.left) / rect.width;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    activeRef.current = true;
    progressRef.current = 0;
    lastTsRef.current   = 0;

    const physics = getPhysics(type);

    const resize = () => {
      canvas.width  = container.clientWidth  || 400;
      canvas.height = container.clientHeight || 280;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    if (!muted) {
      try { synthPourSound(type); } catch { /* autoplay blocked — silent */ }
    }

    const crossfadeTimer = window.setTimeout(() => {
      setImgSrc(image);
      window.setTimeout(() => setImgOpacity(1), 40);
    }, 1900);

    const draw = (ts: number) => {
      if (!activeRef.current) return;

      if (ts - lastTsRef.current < 15) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastTsRef.current = ts;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (type === "vape") {
        drawVape(ctx, w, h, progressRef.current, physics, ts, touchXRef.current);
      } else {
        drawLiquid(ctx, w, h, progressRef.current, physics, color, ice, swirl, ts);
      }

      if (progressRef.current < 1) {
        progressRef.current = Math.min(1, progressRef.current + physics.speed);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      activeRef.current = false;
      cancelAnimationFrame(rafRef.current);
      clearTimeout(crossfadeTimer);
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, color, ice, swirl, muted]);

  // Re-crossfade when image prop changes (AI image arrives after static)
  useEffect(() => {
    if (!image || imgSrc === image) return;
    setImgOpacity(0);
    const t = window.setTimeout(() => {
      setImgSrc(image);
      window.setTimeout(() => setImgOpacity(1), 60);
    }, 380);
    return () => clearTimeout(t);
  }, [image, imgSrc]);

  // Stop RAF once fully covered (save CPU on idle kiosk)
  useEffect(() => {
    if (imgOpacity >= 1) {
      activeRef.current = false;
      cancelAnimationFrame(rafRef.current);
    }
  }, [imgOpacity]);

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      {/* Physics canvas — fades out as image takes over */}
      <canvas
        ref={canvasRef}
        style={{
          position:   "absolute",
          inset:      0,
          width:      "100%",
          height:     "100%",
          opacity:    1 - imgOpacity * 0.88,
          transition: "opacity 800ms ease",
          pointerEvents: "none",
        }}
      />

      {/* Photo layer — crossfades in after animation plays */}
      {imgSrc && (
        <img
          src={imgSrc}
          alt=""
          aria-hidden
          style={{
            position:       "absolute",
            inset:          0,
            width:          "100%",
            height:         "100%",
            objectFit:      "cover",
            objectPosition: "center",
            opacity:        imgOpacity,
            transition:     "opacity 800ms ease",
            pointerEvents:  "none",
          }}
        />
      )}
    </div>
  );
}
