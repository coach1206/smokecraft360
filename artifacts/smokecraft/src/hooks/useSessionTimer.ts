/**
 * useSessionTimer — countdown timer with idle detection and streak tracking.
 *
 * Timer states:
 *  active     — >5 min remaining, normal cadence
 *  idle       — >60 s of no interaction — sets isIdle=true, fires onIdle()
 *  countdown  — ≤5 min remaining — isCountdown=true, tick SFX at milestones
 *  expired    — reached 0 — isExpired=true, streak resets, onExpire() fires
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { playSFX } from "@/services/sound";

const IDLE_THRESHOLD_MS   = 60_000;   // 60 s of no interaction
const COUNTDOWN_THRESHOLD = 300;      // ≤300 s (5 min) → countdown state

/** Remaining-second values at which a tick SFX fires during final countdown. */
const TICK_MARKS = new Set([300, 240, 180, 120, 60, 30, 20, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);

export interface UseSessionTimerOptions {
  totalSecs:          number;
  initialRemaining?:  number;
  initialStreak?:     number;
  /** Externally controlled: true after user starts the build. */
  running:            boolean;
  onExpire?:          () => void;
  /** Fires once when the user goes idle (>60 s). */
  onIdle?:            () => void;
  /** Fires once when the user comes back from idle. */
  onActive?:          () => void;
}

export interface SessionTimerResult {
  remainingSecs:  number;
  isIdle:         boolean;
  isExpired:      boolean;
  isCountdown:    boolean;
  streakCount:    number;
  incrementStreak: () => void;
  breakStreak:    () => void;
  setStreak:      (n: number) => void;
  resetTimer:     (newTotal: number, newRemaining?: number) => void;
}

export function useSessionTimer({
  totalSecs,
  initialRemaining,
  initialStreak = 0,
  running,
  onExpire,
  onIdle,
  onActive,
}: UseSessionTimerOptions): SessionTimerResult {
  const [remainingSecs, setRemainingSecs] = useState(initialRemaining ?? totalSecs);
  const [isIdle,        setIsIdle       ] = useState(false);
  const [isExpired,     setIsExpired    ] = useState(false);
  const [streakCount,   setStreakCount  ] = useState(initialStreak);

  const lastInteractionRef = useRef(Date.now());
  const wasIdleRef         = useRef(false);

  const onExpireRef  = useRef(onExpire);
  const onIdleRef    = useRef(onIdle);
  const onActiveRef  = useRef(onActive);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);
  useEffect(() => { onIdleRef.current   = onIdle;   }, [onIdle]);
  useEffect(() => { onActiveRef.current = onActive; }, [onActive]);

  useEffect(() => {
    const touch = () => { lastInteractionRef.current = Date.now(); };
    document.addEventListener("pointerdown", touch, { passive: true });
    document.addEventListener("pointermove", touch, { passive: true });
    document.addEventListener("keydown",     touch);
    document.addEventListener("touchstart",  touch, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", touch);
      document.removeEventListener("pointermove", touch);
      document.removeEventListener("keydown",     touch);
      document.removeEventListener("touchstart",  touch);
    };
  }, []);

  useEffect(() => {
    if (!running || isExpired) return;

    const id = setInterval(() => {
      const idleMs  = Date.now() - lastInteractionRef.current;
      const nowIdle = idleMs > IDLE_THRESHOLD_MS;

      if (nowIdle !== wasIdleRef.current) {
        wasIdleRef.current = nowIdle;
        setIsIdle(nowIdle);
        if (nowIdle) onIdleRef.current?.();
        else         onActiveRef.current?.();
      }

      setRemainingSecs(prev => {
        const next = Math.max(0, prev - 1);

        if (next <= COUNTDOWN_THRESHOLD && TICK_MARKS.has(next)) {
          playSFX("tick");
        }

        if (next <= 0) {
          clearInterval(id);
          setIsExpired(true);
          setStreakCount(0);
          onExpireRef.current?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [running, isExpired]);

  const incrementStreak = useCallback(() => setStreakCount(c => c + 1), []);
  const breakStreak     = useCallback(() => setStreakCount(0), []);
  const setStreak       = useCallback((n: number) => setStreakCount(n), []);

  const resetTimer = useCallback((newTotal: number, newRemaining?: number) => {
    setRemainingSecs(newRemaining ?? newTotal);
    setIsExpired(false);
    setIsIdle(false);
    wasIdleRef.current = false;
    lastInteractionRef.current = Date.now();
  }, []);

  return {
    remainingSecs,
    isIdle,
    isExpired,
    isCountdown: remainingSecs <= COUNTDOWN_THRESHOLD && !isExpired,
    streakCount,
    incrementStreak,
    breakStreak,
    setStreak,
    resetTimer,
  };
}
