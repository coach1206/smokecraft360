/**
 * EATTransitionOverlay — NOVEE OS cinematic management handoff transition.
 *
 * Stage 1  Geometric Shatter & Liquid Ripple Disruption
 *   HTML5 canvas ripple rings over the full viewport + CSS rotateY(180deg) flip to #000.
 *
 * Stage 2  Shadow Emergence & Explosive Logo Scale
 *   E.A.T. System emblem scales 0 → 130% (0.8 s) with Web Audio sub-bass sweep.
 *
 * Stage 3  High-Tension Dense Snap-Back & Emission Flash
 *   Elastic snap-back 130% → 100% (0.4 s) + gold neon drop-shadow emission flash.
 *
 * Stage 4  Fluid Workspace Deployment
 *   Logo dissolves, overlay fades, EATDashboard command deck becomes visible.
 *
 * Trigger:  window CustomEvent "eat:enter"
 *   — dispatched by OSShell when the E.A.T. ENGINE tile is activated.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Transition } from "framer-motion";
import styles from "./EATTransitionOverlay.module.css";

// ── Asset path resolves correctly under NOVEE OS base path ───────────────────
const LOGO_SRC = `${(import.meta.env.BASE_URL ?? "/").replace(/\/$/, "")}/images/logo_eat.png`;

// ── Timing in ms from trigger ─────────────────────────────────────────────────
const T_VOID      = 600;
const T_EMERGE    = 720;
const T_SNAP      = 1520;
const T_FLASH     = 1920;
const T_FADE_LOGO = 2440;
const T_EXIT      = 2900;
const T_DONE      = 3200;

// ── Web Audio sub-bass drop ───────────────────────────────────────────────────
function fireBassDrop() {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;

    const sub  = ctx.createOscillator();
    const subG = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(55, now);
    sub.frequency.exponentialRampToValueAtTime(22, now + 0.8);
    subG.gain.setValueAtTime(0, now);
    subG.gain.linearRampToValueAtTime(0.28, now + 0.04);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    sub.connect(subG); subG.connect(ctx.destination);
    sub.start(now); sub.stop(now + 1.1);

    const atk  = ctx.createOscillator();
    const atkG = ctx.createGain();
    atk.type = "sawtooth";
    atk.frequency.setValueAtTime(110, now);
    atk.frequency.exponentialRampToValueAtTime(44, now + 0.35);
    atkG.gain.setValueAtTime(0, now);
    atkG.gain.linearRampToValueAtTime(0.06, now + 0.025);
    atkG.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    atk.connect(atkG); atkG.connect(ctx.destination);
    atk.start(now); atk.stop(now + 0.55);

    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 1500);
  } catch { /* AudioContext unavailable */ }
}

// ── Canvas ripple renderer ────────────────────────────────────────────────────
function renderRipple(canvas: HTMLCanvasElement, progress: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const maxR = Math.hypot(cx, cy) * 1.18;
  for (let i = 0; i < 3; i++) {
    const t = Math.max(0, Math.min(progress * 1.45 - i * 0.30, 1));
    if (t <= 0) continue;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * t, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(212,175,55,${(1 - t) * 0.55})`;
    ctx.lineWidth   = 3.5 * (1 - t) + 0.5;
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(0,0,0,${Math.min(progress * 1.25, 1)})`;
  ctx.fillRect(0, 0, w, h);
}

// ── Stage type ────────────────────────────────────────────────────────────────
type Stage =
  | "idle" | "ripple" | "void" | "emerge"
  | "snap" | "flash"  | "fade-logo" | "exit" | "done";

function logoAnimate(stage: Stage) {
  switch (stage) {
    case "emerge":
      return { opacity: 1, scale: 1.3,  filter: "drop-shadow(0 0 16px rgba(212,175,55,0.28))" };
    case "snap":
      return { opacity: 1, scale: 1.0,  filter: "drop-shadow(0 0 22px rgba(212,175,55,0.42))" };
    case "flash":
      return { opacity: 1, scale: 1.0,  filter: "drop-shadow(0 0 38px rgba(212,175,55,0.78)) drop-shadow(0 0 72px rgba(212,175,55,0.40))" };
    case "fade-logo":
      return { opacity: 0, scale: 0.92, filter: "drop-shadow(0 0 0px rgba(212,175,55,0))" };
    default:
      return { opacity: 0, scale: 0.05, filter: "drop-shadow(0 0 0px rgba(212,175,55,0))" };
  }
}

function logoTransition(stage: Stage): Transition {
  switch (stage) {
    case "emerge":    return { duration: 0.8,  ease: "easeOut"   };
    case "snap":      return { duration: 0.4,  ease: "backOut"   };
    case "flash":     return { duration: 0.08, ease: "linear"    };
    case "fade-logo": return { duration: 0.5,  ease: "easeInOut" };
    default:          return { duration: 0.01 };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export function EATTransitionOverlay() {
  const [stage, setStage] = useState<Stage>("idle");
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const rafRef     = useRef<number | null>(null);
  const t0Ref      = useRef<number | null>(null);
  const timersRef  = useRef<number[]>([]);
  const activeRef  = useRef(false);

  const flush = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    t0Ref.current = null;
  };

  const after = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  const activate = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;

    setStage("ripple");
    t0Ref.current = null;
    const tick = (ts: number) => {
      if (t0Ref.current === null) t0Ref.current = ts;
      const prog = Math.min((ts - t0Ref.current) / T_VOID, 1);
      if (canvasRef.current) renderRipple(canvasRef.current, prog);
      if (prog < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    after(() => setStage("void"),                        T_VOID);
    after(() => { setStage("emerge"); fireBassDrop(); }, T_EMERGE);
    after(() => setStage("snap"),                        T_SNAP);
    after(() => setStage("flash"),                       T_FLASH);
    after(() => setStage("fade-logo"),                   T_FADE_LOGO);
    after(() => setStage("exit"),                        T_EXIT);
    after(() => { flush(); activeRef.current = false; setStage("done"); }, T_DONE);
  }, []);

  useEffect(() => {
    const handler = () => activate();
    window.addEventListener("eat:enter", handler as EventListener);
    return () => window.removeEventListener("eat:enter", handler as EventListener);
  }, [activate]);

  useEffect(() => () => flush(), []);

  if (stage === "idle" || stage === "done") return null;

  const showCanvas = stage === "ripple";
  const showLogo   = stage === "emerge" || stage === "snap" || stage === "flash" || stage === "fade-logo";

  return (
    <div
      className={`${styles.root} ${stage === "exit" ? styles.rootExit : ""}`}
      aria-hidden="true"
      data-testid="eat-transition-overlay"
    >
      <AnimatePresence>
        {stage === "ripple" && (
          <motion.div
            key="flip"
            className={styles.flipPanel}
            initial={{ rotateY: 0, scale: 1, opacity: 0 }}
            animate={{ rotateY: 180, scale: 0.95, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {showCanvas && (
        <canvas
          ref={canvasRef}
          className={styles.rippleCanvas}
          width={typeof window !== "undefined" ? window.innerWidth  : 1280}
          height={typeof window !== "undefined" ? window.innerHeight : 800}
          aria-hidden="true"
        />
      )}

      {!showCanvas && stage !== "void" && (
        <div className={styles.goldenPulse} aria-hidden="true" />
      )}

      <AnimatePresence>
        {showLogo && (
          <motion.div
            key="logo-wrap"
            className={styles.logoWrap}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <motion.img
              src={LOGO_SRC}
              alt="E.A.T. System — Environment, Asset, Transactions"
              className={styles.logo}
              draggable={false}
              animate={logoAnimate(stage)}
              transition={logoTransition(stage)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default EATTransitionOverlay;
