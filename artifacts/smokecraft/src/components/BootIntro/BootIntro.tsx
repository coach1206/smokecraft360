/**
 * BootIntro — Profound Innovation cinematic brand splash that plays once
 * per session BEFORE the Axiom OS interface loads. Specced across
 * briefs 25 (visual flow + sound design + sessionStorage gate) and 26
 * (CSS keyframes / colors). Mounted as a sibling overlay above the Router
 * in App.tsx so it covers every entry route on first session load.
 *
 * Behaviour summary:
 *   - 0.0s  olive screen, silent
 *   - 0.3s  logo slides in from left with subtle motion blur
 *   - 1.2s  arrival sound triggers + PROFOUND/INNOVATION text fades in
 *   - 1.6s  "Software & Systems Development Company" tagline fades in
 *   - 2.0s  "Digital Infrastructure Studio" subline fades in (low opacity)
 *   - 2.8s  hold (everything still)
 *   - 3.8s  begin 1s opacity fadeout
 *   - 4.8s  unmount + render the underlying app
 *
 * Skip: tap/click anywhere triggers the same fadeout-then-unmount path.
 * Audio: fails gracefully if browser blocks autoplay (no error UI).
 * Once-per-session: sessionStorage flag suppresses subsequent renders.
 */

import { useEffect, useRef, useState } from "react";
import styles from "./BootIntro.module.css";

const SESSION_KEY     = "smokecraft_boot_intro_seen";
const FADEOUT_AT_MS   = 3800;
const UNMOUNT_AT_MS   = 4800;
const SOUND_AT_MS     = 1200; // synced with logo-arrival per brief
const ARRIVAL_SRC     = "/sounds/arrival.mp3";

/** Synchronous read of the once-per-session flag. App.tsx uses this to
 *  initialize its `ready` gate so a "seen" session never mounts BootIntro
 *  at all — eliminates the one-frame-of-nothing flash a useEffect-based
 *  signal would cause. */
export function hasSeenBootIntro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export interface BootIntroProps {
  /** Called once when the intro animation completes naturally (4.8s) or
   *  the user skips. Parent should respond by flipping its ready gate so
   *  this component unmounts and the underlying app renders. */
  onFinish?: () => void;
}

/** Inline SVG logo — flat solid dark-green geometric mark, no outline / no
 *  glow / no 3D per brief 25. Stylized "P/I" monogram inside a soft square.
 *  Lives inline so the boot screen never depends on an extra network round-
 *  trip. Drop a real Profound Innovation logo SVG in here when it lands. */
function PlaceholderLogo() {
  return (
    <svg
      viewBox="0 0 120 120"
      width="120"
      height="120"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Profound Innovation"
      role="img"
      className={styles["boot-logo"]}
    >
      {/* dark forest/olive green — flat, no gradient */}
      <rect x="6" y="6" width="108" height="108" rx="18" fill="#2d3a23" />
      {/* Stylized "P" — solid */}
      <path
        d="M36 30 L36 90 L48 90 L48 70 L62 70 C72 70 80 62 80 50 C80 38 72 30 62 30 Z M48 40 L62 40 C66 40 68 44 68 50 C68 56 66 60 62 60 L48 60 Z"
        fill="#c5c8b4"
      />
      {/* Vertical "I" stem to the right of P, suggesting the second initial */}
      <rect x="86" y="30" width="6" height="60" fill="#c5c8b4" />
    </svg>
  );
}

export function BootIntro({ onFinish }: BootIntroProps = {}) {
  /* Initialize from sessionStorage SYNCHRONOUSLY so we never even paint the
   * overlay if it's been seen this session. With the gate pattern in App.tsx
   * the parent already pre-checks via hasSeenBootIntro(), but this guard
   * stays as defense-in-depth for any caller that mounts us directly. */
  const [visible, setVisible] = useState(() => !hasSeenBootIntro());
  const [fading, setFading]   = useState(false);
  /* Single source of truth for "we've signaled completion". Prevents
   * onFinish from firing twice if the auto-timer and a manual skip race. */
  const finishedRef           = useRef(false);
  /* Latest onFinish — captured in a ref so timer callbacks always see the
   * current callback even if the parent re-renders with a new closure. */
  const onFinishRef           = useRef(onFinish);
  onFinishRef.current = onFinish;
  const audioRef              = useRef<HTMLAudioElement | null>(null);
  const dismissedRef          = useRef(false);
  /* Tracks the manual-dismiss unmount timer so cleanup can clear it if
   * the component tears down during the 400ms tail (HMR / parent unmount
   * edge case flagged by code review). */
  const dismissTimerRef       = useRef<number | null>(null);

  /* Call onFinish at most once. Centralising this here means the auto-timer,
   * the manual skip, and any future entry point all funnel through one
   * idempotent exit. */
  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setVisible(false);
    onFinishRef.current?.();
  }

  /* Mark the session flag the moment we decide to play the intro so a fast
   * SPA navigation during the animation can't trigger a second instance. */
  useEffect(() => {
    if (!visible) return;
    try { window.sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
  }, [visible]);

  /* Schedule fadeout + unmount + sound. Single effect so the timers share a
   * cleanup path and a manual skip cancels everything cleanly. */
  useEffect(() => {
    if (!visible) return;

    const fadeTimer    = window.setTimeout(() => setFading(true), FADEOUT_AT_MS);
    const unmountTimer = window.setTimeout(() => finish(),         UNMOUNT_AT_MS);
    const soundTimer   = window.setTimeout(() => {
      try {
        const a = new Audio(ARRIVAL_SRC);
        a.volume = 0.45; // medium-low per brief
        audioRef.current = a;
        const p = a.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => { /* autoplay blocked — silent failure per brief */ });
        }
      } catch { /* ignore — sound is enhancement, never required */ }
    }, SOUND_AT_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(unmountTimer);
      window.clearTimeout(soundTimer);
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

  /* Click / tap / Escape / Enter to skip. Re-uses the same fade-then-unmount
   * cadence (compressed) so the dismiss feels intentional, not abrupt. The
   * 400ms timer is tracked in a ref so cleanup can cancel a stale setVisible
   * if the parent unmounts during the tail. */
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

  /* Defense-in-depth path: if a caller mounted us directly without checking
   * hasSeenBootIntro(), still call onFinish so the parent's gate (if any)
   * progresses. Idempotent thanks to finishedRef. */
  useEffect(() => {
    if (!visible) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`${styles["boot-container"]} ${fading ? styles["fade-out"] : ""}`}
      onClick={dismiss}
      role="button"
      tabIndex={0}
      aria-label="Skip Profound Innovation intro"
      data-testid="boot-intro"
    >
      <div className={styles.grain} />

      <div className={styles["logo-wrapper"]}>
        <PlaceholderLogo />
      </div>

      <div className={styles["boot-text"]}>
        <h1>PROFOUND</h1>
        <h2>INNOVATION</h2>
        <div className={styles.tagline}>
          Software &amp; Systems Development Company
        </div>
        <div className={styles.subline}>DIGITAL INFRASTRUCTURE STUDIO</div>
      </div>

      <div className={styles["tap-hint"]}>TAP ANYWHERE TO CONTINUE</div>
    </div>
  );
}

export default BootIntro;
