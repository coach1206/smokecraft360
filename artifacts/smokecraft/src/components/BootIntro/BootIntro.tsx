/**
 * BootIntro — NOVEE OS cinematic boot sequence.
 *
 * Plays once per session before the CraftHub interface loads.
 * Spec: pure black → gold pulse → NOVEE wordmark illuminates → ambient
 * telemetry particles → "Powered by NOVEE Intelligence" → EEIE init line
 * → cinematic fade to CraftHub.
 *
 * Skip: tap / click / Escape anywhere collapses the sequence instantly.
 * Audio: arrival.mp3 fires at pulse-onset; fails silently if autoplay blocked.
 * Gate: sessionStorage flag prevents re-play within the same session.
 */

import { useEffect, useRef, useState } from "react";
import styles from "./BootIntro.module.css";

const SESSION_KEY   = "smokecraft_boot_intro_seen";
const SOUND_AT_MS   = 300;
const LOGO_AT_MS    = 800;
const POWERED_AT_MS = 2200;
const INIT_AT_MS    = 3200;
const FADEOUT_AT_MS = 4400;
const UNMOUNT_AT_MS = 5300;
const ARRIVAL_SRC   = "/sounds/arrival.mp3";

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
  const [visible, setVisible]         = useState(() => !hasSeenBootIntro() && !hasSkipParam());
  const [fading, setFading]           = useState(false);
  const [showLogo, setShowLogo]       = useState(false);
  const [showPowered, setShowPowered] = useState(false);
  const [showInit, setShowInit]       = useState(false);

  const finishedRef     = useRef(false);
  const onFinishRef     = useRef(onFinish);
  onFinishRef.current   = onFinish;
  const audioRef        = useRef<HTMLAudioElement | null>(null);
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

    timers.push(window.setTimeout(() => {
      try {
        const a = new Audio(ARRIVAL_SRC);
        a.volume = 0.35;
        audioRef.current = a;
        const p = a.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch { /* ignore */ }
    }, SOUND_AT_MS));

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
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch { /* ignore */ }
        audioRef.current = null;
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
      {/* Ambient gold radial pulse — starts immediately */}
      <div className={styles.pulse} />

      {/* Telemetry drift particles — rendered always, CSS-gated opacity */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className={styles.particle}
          style={{
            left:            `${p.x}%`,
            top:             `${p.y}%`,
            width:           `${p.size}px`,
            height:          `${p.size}px`,
            animationDelay:  `${p.delay + 1.2}s`,
            animationDuration:`${p.dur}s`,
          }}
        />
      ))}

      {/* NOVEE wordmark — illuminates from pure darkness */}
      <div className={`${styles.logoBlock} ${showLogo ? styles.logoVisible : ""}`}>
        <div className={styles.wordmark}>NOVEE</div>
        <div className={styles.wordmarkSub}>OS</div>
      </div>

      {/* "Powered by NOVEE Intelligence" */}
      <div className={`${styles.poweredLine} ${showPowered ? styles.lineVisible : ""}`}>
        Powered by NOVEE Intelligence
      </div>

      {/* EEIE initialization sequence */}
      <div className={`${styles.initLine} ${showInit ? styles.lineVisible : ""}`}>
        Initializing Adaptive Environment&hellip;
      </div>

      <div className={styles.tapHint}>TAP ANYWHERE TO CONTINUE</div>
    </div>
  );
}

export default BootIntro;
