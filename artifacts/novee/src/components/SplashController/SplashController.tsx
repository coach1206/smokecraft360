/**
 * SplashController — Cinematic Luxury Lounge Entry
 *
 * 6-layer depth stack per stage:
 *   1. Cinematic lounge photograph (blurred, drifting)
 *   2. Dark material overlay + vignette
 *   3. Warm amber light bloom (breathing)
 *   4. Smoke drift wisps
 *   5. Ember spark particles
 *   6. Brand identity logos
 *
 * Timing:
 *   STAGE 1  Profound Innovation  — 1.2 s fade-in   · 2.0 s hold
 *   STAGE 2  Novee OS             — 1.0 s slide-in   · 1.8 s hold
 *   STAGE 3  CraftHub Gateway     — 0.8 s scale-zoom · 1.2 s hold
 *   STAGE 4  Sensory dissolve     — 0.8 s exit
 *
 * Skip: single tap / Escape / Enter collapses to dissolve immediately.
 */

import { useEffect, useRef, useState } from "react";
import styles from "./SplashController.module.css";

const BASE = import.meta.env.BASE_URL ?? "/";

/** NOVEE always shows the splash (no session gate). Exported for API compatibility. */
export function hasSeenSplash(): boolean { return false; }

function hasSkipParam(): boolean {
  if (typeof window === "undefined") return false;
  try { return new URLSearchParams(window.location.search).get("skip_splash") === "1"; } catch { return false; }
}

// ── Timing (ms) ─────────────────────────────────────────────────────────────
const S1_FADE  = 1200;
const S1_HOLD  = 2000;
const S1_END   = S1_FADE + S1_HOLD;                   // 3 200

const S2_TRANS = 1000;
const S2_HOLD  = 1800;
const S2_END   = S1_END + S2_TRANS + S2_HOLD;         // 6 000

const S3_TRANS = 800;
const S3_HOLD  = 1200;
const S3_END   = S2_END + S3_TRANS + S3_HOLD;         // 8 000

const DISSOLVE = 800;
const UNMOUNT  = S3_END + DISSOLVE;                    // 8 800

type Stage = "profound" | "novee" | "crafthub" | "dissolving";

const LOGO_PROFOUND = `${BASE}images/logo_profound.png`;
const LOGO_NOVEE    = `${BASE}images/logo_novee.png`;
const LOGO_CRAFTHUB = `${BASE}images/logo_crafthub.png`;
const LOUNGE_BG     = `${BASE}images/lounge-bg.jpg`;

// ── Smoke wisp configs ───────────────────────────────────────────────────────
const WISPS = [
  { left: "8%",  w: 110, h: 160, dur: "12s", del: "0s",    dx: "14px",  dx2: "-10px" },
  { left: "22%", w: 80,  h: 120, dur: "9s",  del: "1.8s",  dx: "-8px",  dx2: "12px"  },
  { left: "40%", w: 140, h: 200, dur: "14s", del: "0.6s",  dx: "10px",  dx2: "-14px" },
  { left: "58%", w: 90,  h: 140, dur: "11s", del: "2.4s",  dx: "-12px", dx2: "8px"   },
  { left: "72%", w: 120, h: 180, dur: "13s", del: "1.2s",  dx: "8px",   dx2: "-10px" },
  { left: "86%", w: 70,  h: 100, dur: "8s",  del: "3.0s",  dx: "-6px",  dx2: "10px"  },
] as const;

// ── Ember spark configs ──────────────────────────────────────────────────────
const EMBERS = [
  { left: "12%",  bottom: "10%", dur: "4.2s", del: "0s",    dx: "8px",   dx2: "-6px"  },
  { left: "28%",  bottom: "8%",  dur: "5.8s", del: "1.1s",  dx: "-10px", dx2: "7px"   },
  { left: "43%",  bottom: "12%", dur: "3.9s", del: "0.5s",  dx: "6px",   dx2: "-8px"  },
  { left: "57%",  bottom: "6%",  dur: "6.2s", del: "2.1s",  dx: "-8px",  dx2: "10px"  },
  { left: "70%",  bottom: "14%", dur: "4.5s", del: "1.6s",  dx: "10px",  dx2: "-6px"  },
  { left: "84%",  bottom: "9%",  dur: "5.1s", del: "0.8s",  dx: "-7px",  dx2: "9px"   },
  { left: "20%",  bottom: "18%", dur: "3.4s", del: "2.8s",  dx: "9px",   dx2: "-5px"  },
  { left: "66%",  bottom: "20%", dur: "7.0s", del: "0.3s",  dx: "-9px",  dx2: "11px"  },
] as const;

export interface SplashControllerProps {
  onFinish?: () => void;
}

export function SplashController({ onFinish }: SplashControllerProps = {}) {
  const [visible,    setVisible]    = useState(() => !hasSkipParam());
  const [stage,      setStage]      = useState<Stage>("profound");
  const [dismissing, setDismissing] = useState(false);

  const finishedRef   = useRef(false);
  const onFinishRef   = useRef(onFinish);
  const timersRef     = useRef<number[]>([]);
  onFinishRef.current = onFinish;

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setVisible(false);
    onFinishRef.current?.();
  }

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

  useEffect(() => {
    if (!visible) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  const dissolving = dismissing || stage === "dissolving";
  const s1Class    = stage === "profound" ? styles.s1Enter : styles.s1Exit;
  const showS2     = stage !== "profound";
  const s2Class    = stage === "novee" ? styles.s2Enter : styles.s2Exit;
  const showS3     = stage === "crafthub" || stage === "dissolving" || dismissing;

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
      {/* ── LAYER 1: Cinematic lounge environment ─────────────────────── */}
      <div
        className={styles.envBg}
        style={{ backgroundImage: `url("${LOUNGE_BG}")` }}
        aria-hidden="true"
      />

      {/* ── LAYER 2a: Dark material overlay ──────────────────────────── */}
      <div className={styles.envOverlay} aria-hidden="true" />

      {/* ── LAYER 2b: Edge vignette ───────────────────────────────────── */}
      <div className={styles.envVignette} aria-hidden="true" />

      {/* ── LAYER 3: Amber light bloom ────────────────────────────────── */}
      <div className={styles.envBloom} aria-hidden="true" />

      {/* ── LAYER 4: Smoke drift wisps ────────────────────────────────── */}
      <div className={styles.smokeField} aria-hidden="true">
        {WISPS.map((w, i) => (
          <div
            key={i}
            className={styles.smokeWisp}
            style={{
              left:   w.left,
              width:  w.w,
              height: w.h,
              "--wdur": w.dur,
              "--wdel": w.del,
              "--wdx":  w.dx,
              "--wdx2": w.dx2,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* ── LAYER 5: Ember sparks ─────────────────────────────────────── */}
      <div className={styles.emberField} aria-hidden="true">
        {EMBERS.map((e, i) => (
          <div
            key={i}
            className={styles.ember}
            style={{
              left:   e.left,
              bottom: e.bottom,
              "--edur": e.dur,
              "--edel": e.del,
              "--edx":  e.dx,
              "--edx2": e.dx2,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* ── LAYER 6: Brand identity logos ────────────────────────────── */}

      {/* Stage 1 — Profound Innovation */}
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

      {/* Stage 2 — Novee OS */}
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

      {/* Stage 3 — CraftHub Gateway */}
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

      {/* Tap hint */}
      <div className={styles.tapHint} aria-hidden="true">TAP ANYWHERE TO SKIP</div>
    </div>
  );
}

export default SplashController;
