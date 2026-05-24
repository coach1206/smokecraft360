/**
 * SplashController — 4-stage cinematic brand identity intro.
 *
 * STAGE 1  Profound Innovation  — 1.5 s linear fade-in  · 3.5 s hold
 * STAGE 2  Novee OS             — 2.0 s horizontal slide · 4.0 s hold
 * STAGE 3  CraftHub Gateway     — 2.0 s scale-zoom      · 3.5 s hold
 * STAGE 4  Cockpit Reveal       — 1.9 s sensory dissolve → unmount
 *
 * Anti-blur: all image containers get translate3d + will-change + backface-visibility.
 * Session gate: sessionStorage prevents replay within the same session.
 * Skip: single tap/click anywhere collapses to dissolve immediately.
 */

import { useEffect, useRef, useState } from "react";
import styles from "./SplashController.module.css";

// ── Session gate ────────────────────────────────────────────────────────────
const SESSION_KEY = "smokecraft_splash_v2_seen";

export function hasSeenSplash(): boolean {
  if (typeof window === "undefined") return false;
  try { return window.sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
}

function hasSkipParam(): boolean {
  if (typeof window === "undefined") return false;
  try { return new URLSearchParams(window.location.search).get("skip_splash") === "1"; } catch { return false; }
}

// ── Timing constants (ms) ────────────────────────────────────────────────────
const S1_FADE   = 1200;   // Profound: linear fade-in
const S1_HOLD   = 2000;   // Profound: static hold after fade completes
const S1_END    = S1_FADE + S1_HOLD;                         // 3 200 ms

const S2_TRANS  = 1000;   // Novee OS: slide transition
const S2_HOLD   = 1800;   // Novee OS: static hold
const S2_END    = S1_END  + S2_TRANS + S2_HOLD;              // 6 000 ms

const S3_TRANS  = 800;    // CraftHub: scale-zoom transition
const S3_HOLD   = 1200;   // CraftHub: static hold
const S3_END    = S2_END  + S3_TRANS + S3_HOLD;              // 8 000 ms

const DISSOLVE  = 800;    // Final sensory dissolve duration
const UNMOUNT   = S3_END  + DISSOLVE;                        // 8 800 ms

// ── Stage enum ───────────────────────────────────────────────────────────────
type Stage = "profound" | "novee" | "crafthub" | "dissolving";

// ── Logo asset paths ─────────────────────────────────────────────────────────
const LOGO_PROFOUND  = "/images/logo_profound.png";
const LOGO_NOVEE     = "/images/logo_novee.png";
const LOGO_CRAFTHUB  = "/images/logo_crafthub.png";

// ── Component ────────────────────────────────────────────────────────────────
export interface SplashControllerProps {
  onFinish?: () => void;
}

export function SplashController({ onFinish }: SplashControllerProps = {}) {
  const [visible,    setVisible]    = useState(() => !hasSkipParam() && !hasSeenSplash());
  const [stage,      setStage]      = useState<Stage>("profound");
  const [dismissing, setDismissing] = useState(false);

  const finishedRef   = useRef(false);
  const onFinishRef   = useRef(onFinish);
  const timersRef     = useRef<number[]>([]);
  onFinishRef.current = onFinish;

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try { window.sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ok */ }
    setVisible(false);
    onFinishRef.current?.();
  }

  // ── Main timing engine ──────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;

    const push = (fn: () => void, ms: number) => {
      const t = window.setTimeout(fn, ms);
      timersRef.current.push(t);
      return t;
    };

    push(() => setStage("novee"),      S1_END);
    push(() => setStage("crafthub"),   S2_END);
    push(() => setStage("dissolving"), S3_END);
    push(() => finish(),               UNMOUNT);

    return () => {
      timersRef.current.forEach(t => window.clearTimeout(t));
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Skip on tap / Escape ────────────────────────────────────────────────
  function dismiss() {
    if (finishedRef.current || dismissing) return;
    timersRef.current.forEach(t => window.clearTimeout(t));
    timersRef.current = [];
    setDismissing(true);
    window.setTimeout(() => finish(), DISSOLVE);
  }

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, dismissing]);

  // ── Already seen or done ────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  const dissolving = dismissing || stage === "dissolving";

  // ── Derived animation classes ────────────────────────────────────────────
  // Stage 1
  const s1Class = stage === "profound" ? styles.s1Enter : styles.s1Exit;

  // Stage 2 (only rendered once stage !== "profound")
  const showS2  = stage !== "profound";
  const s2Class = stage === "novee" ? styles.s2Enter : styles.s2Exit;

  // Stage 3 (only rendered from "crafthub" onward)
  const showS3  = stage === "crafthub" || stage === "dissolving" || dismissing;

  return (
    <div
      className={`${styles.root} ${dissolving ? styles.dissolving : ""}`}
      onClick={dismiss}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") dismiss(); }}
      role="button"
      tabIndex={0}
      aria-label="Skip brand intro"
      data-testid="splash-controller"
    >

      {/* ── STAGE 1 — Profound Innovation ──────────────────────────────── */}
      <div className={styles.stageLayer}>
        <div className={styles.imgWrap}>
          <img
            src={LOGO_PROFOUND}
            alt="Profound Innovation — Software & Systems Development"
            className={`${styles.logo} ${s1Class}`}
            draggable={false}
          />
        </div>
      </div>

      {/* ── STAGE 2 — Novee OS ─────────────────────────────────────────── */}
      {showS2 && (
        <div className={styles.stageLayer}>
          <div className={styles.imgWrap}>
            <img
              src={LOGO_NOVEE}
              alt="Novee OS — Intelligence That Elevates"
              className={`${styles.logo} ${s2Class}`}
              draggable={false}
            />
          </div>
        </div>
      )}

      {/* ── STAGE 3 — CraftHub Gateway ─────────────────────────────────── */}
      {showS3 && (
        <div className={styles.stageLayer}>
          <div className={styles.imgWrap}>
            <img
              src={LOGO_CRAFTHUB}
              alt="CraftHub — Intro to Smoke Craft"
              className={`${styles.logo} ${styles.s3Enter}`}
              draggable={false}
            />
          </div>
        </div>
      )}

      {/* ── Ambient gold radial pulse ───────────────────────────────────── */}
      <div className={styles.pulse} aria-hidden="true" />

      {/* ── Tap hint ───────────────────────────────────────────────────── */}
      <div className={styles.tapHint} aria-hidden="true">TAP ANYWHERE TO SKIP</div>
    </div>
  );
}

export default SplashController;
