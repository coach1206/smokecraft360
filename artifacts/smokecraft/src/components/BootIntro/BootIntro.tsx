/**
 * BootIntro — NOVEE OS cinematic 3-phase boot sequence.
 *
 * Phase 1.1 (0–1.5s):   Web Audio API 3400 Hz readiness tone (0.5s)
 * Phase 1.2 (1.5–4.5s): PROFOUND INNOVATIONS LLC corporate anchor
 * Phase 1.3 (4.5–7.5s): NOVEE OS wordmark + rotating radial loading ring
 *
 * Skip: tap / click / Escape anywhere collapses instantly.
 * Gate: sessionStorage flag prevents replay within the same session.
 */

import { useEffect, useRef, useState } from "react";
import styles from "./BootIntro.module.css";

const SESSION_KEY      = "smokecraft_boot_intro_seen";
const TONE_AT_MS       = 80;
const CORPORATE_AT_MS  = 1500;
const LOGO_AT_MS       = 4500;
const POWERED_AT_MS    = 5600;
const INIT_AT_MS       = 6400;
const FADEOUT_AT_MS    = 7200;
const UNMOUNT_AT_MS    = 8200;

const PARTICLES = [
  { x: 14, y: 22, size: 2,   delay: 0.0, dur: 5.2 },
  { x: 76, y: 14, size: 1.5, delay: 0.5, dur: 6.8 },
  { x: 86, y: 67, size: 2.5, delay: 0.9, dur: 4.6 },
  { x: 24, y: 78, size: 1,   delay: 1.3, dur: 7.1 },
  { x: 62, y: 88, size: 2,   delay: 0.2, dur: 5.8 },
  { x: 44, y: 8,  size: 1.5, delay: 0.7, dur: 6.2 },
  { x: 91, y: 42, size: 1,   delay: 1.1, dur: 4.9 },
  { x: 8,  y: 55, size: 2,   delay: 0.4, dur: 5.5 },
];

/** Fire 3400 Hz sine-wave tone via Web Audio API (0.5 s, 100 ms ramp). */
function playInitTone() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 3400;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.50);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.55);
    setTimeout(() => { try { ctx.close(); } catch { /**/ } }, 700);
  } catch { /* non-blocking */ }
}

/** Synchronous read used by App.tsx to suppress the overlay on repeat sessions. */
export function hasSeenBootIntro(): boolean {
  if (typeof window === "undefined") return false;
  try { return window.sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
}

function hasSkipParam(): boolean {
  if (typeof window === "undefined") return false;
  try { return new URLSearchParams(window.location.search).get("skip_splash") === "1"; } catch { return false; }
}

export interface BootIntroProps {
  onFinish?: () => void;
}

export function BootIntro({ onFinish }: BootIntroProps = {}) {
  const [visible,        setVisible]        = useState(() => !hasSeenBootIntro() && !hasSkipParam());
  const [fading,         setFading]         = useState(false);
  const [showCorporate,  setShowCorporate]  = useState(false);
  const [showLogo,       setShowLogo]       = useState(false);
  const [showPowered,    setShowPowered]    = useState(false);
  const [showInit,       setShowInit]       = useState(false);

  const finishedRef     = useRef(false);
  const onFinishRef     = useRef(onFinish);
  onFinishRef.current   = onFinish;
  const dismissedRef    = useRef(false);
  const dismissTimerRef = useRef<number | null>(null);

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setVisible(false);
    onFinishRef.current?.();
  }

  useEffect(() => {
    if (!visible) return;
    try { window.sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const timers: number[] = [];

    // Phase 1.1 — hardware readiness tone
    timers.push(window.setTimeout(() => playInitTone(), TONE_AT_MS));

    // Phase 1.2 — corporate anchor
    timers.push(window.setTimeout(() => setShowCorporate(true), CORPORATE_AT_MS));

    // Phase 1.3 — NOVEE OS wordmark + ring
    timers.push(window.setTimeout(() => setShowLogo(true),    LOGO_AT_MS));
    timers.push(window.setTimeout(() => setShowPowered(true), POWERED_AT_MS));
    timers.push(window.setTimeout(() => setShowInit(true),    INIT_AT_MS));
    timers.push(window.setTimeout(() => setFading(true),      FADEOUT_AT_MS));
    timers.push(window.setTimeout(() => finish(),             UNMOUNT_AT_MS));

    return () => {
      timers.forEach(t => window.clearTimeout(t));
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [visible]);

  function dismiss() {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setFading(true);
    dismissTimerRef.current = window.setTimeout(() => {
      dismissTimerRef.current = null;
      finish();
    }, 400);
  }

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  useEffect(() => {
    if (!visible) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`${styles.container} ${fading ? styles.fadeOut : ""}`}
      onClick={dismiss}
      role="button"
      tabIndex={0}
      aria-label="Skip NOVEE OS boot sequence"
      data-testid="boot-intro"
    >
      {/* Ambient gold radial pulse */}
      <div className={styles.pulse} />

      {/* Telemetry drift particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className={styles.particle}
          style={{
            left:             `${p.x}%`,
            top:              `${p.y}%`,
            width:            `${p.size}px`,
            height:           `${p.size}px`,
            animationDelay:   `${p.delay + 1.2}s`,
            animationDuration:`${p.dur}s`,
          }}
        />
      ))}

      {/* ── Phase 1.2 — PROFOUND INNOVATIONS LLC corporate anchor ── */}
      <div className={`${styles.corporateBlock} ${showCorporate && !showLogo ? styles.corporateVisible : ""}`}>
        {/* Geometric emblem — smoked chrome hexagon */}
        <svg viewBox="0 0 80 80" className={styles.corporateEmblem} aria-hidden="true">
          <defs>
            <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#C8C8CC" />
              <stop offset="40%"  stopColor="#D4AF37" stopOpacity="0.9" />
              <stop offset="70%"  stopColor="#8C8C90" />
              <stop offset="100%" stopColor="#B0A090" />
            </linearGradient>
          </defs>
          {/* Outer hexagon */}
          <polygon
            points="40,4 72,22 72,58 40,76 8,58 8,22"
            stroke="url(#chromeGrad)"
            strokeWidth="1.5"
            fill="rgba(212,175,55,0.06)"
          />
          {/* Inner hexagon */}
          <polygon
            points="40,14 63,27 63,53 40,66 17,53 17,27"
            stroke="rgba(212,175,55,0.35)"
            strokeWidth="0.8"
            fill="none"
          />
          {/* Center mark */}
          <circle cx="40" cy="40" r="5" fill="url(#chromeGrad)" opacity="0.9" />
          <circle cx="40" cy="40" r="9" stroke="rgba(212,175,55,0.40)" strokeWidth="0.6" fill="none" />
        </svg>
        <div className={styles.corporateName}>PROFOUND INNOVATIONS</div>
        <div className={styles.corporateSub}>LLC</div>
      </div>

      {/* ── Phase 1.3 — NOVEE OS wordmark + rotating loading ring ── */}
      <div className={`${styles.logoBlock} ${showLogo ? styles.logoVisible : ""}`}>
        {/* Rotating radial ring */}
        <div className={styles.ringWrapper}>
          <div className={styles.loadingRing} />
          <div className={styles.loadingRingInner} />
        </div>

        {/* Wordmark */}
        <div className={styles.wordmark}>NOVEE</div>
        <div className={styles.wordmarkSub}>OS</div>
      </div>

      {/* "Powered by NOVEE Intelligence" */}
      <div className={`${styles.poweredLine} ${showPowered ? styles.lineVisible : ""}`}>
        Powered by NOVEE Intelligence
      </div>

      {/* Init line */}
      <div className={`${styles.initLine} ${showInit ? styles.lineVisible : ""}`}>
        Initializing Adaptive Environment&hellip;
      </div>

      {/* SYSTEM ACTIVE indicator — top-left */}
      <div className={`${styles.systemActive} ${showLogo ? styles.systemActiveVisible : ""}`}>
        <div className={styles.systemActiveDot} />
        SYSTEM ACTIVE
      </div>

      <div className={styles.tapHint}>TAP ANYWHERE TO CONTINUE</div>
    </div>
  );
}

export default BootIntro;
