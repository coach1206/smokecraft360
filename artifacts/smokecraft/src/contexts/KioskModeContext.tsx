/**
 * KioskModeContext — provides kiosk/tablet mode state + inactivity auto-reset.
 *
 * Activated via URL params:
 *   ?mode=kiosk&venueId=<uuid>&tableNumber=<str>&deviceId=<uuid>
 *   ?mode=tablet&venueId=<uuid>&tableNumber=<str>&deviceId=<uuid>
 *
 * Inactivity rules (kiosk only):
 *   - 90 seconds idle → show 10-second countdown overlay
 *   - countdown expires → reset() called (navigate to /)
 *   - any user activity → reset timer
 *
 * Exports:
 *   useKioskMode() — { mode, isKiosk, isTablet, venueId, tableNumber, deviceId, reset }
 *   KioskModeProvider — wrap App
 *   KioskInactivityOverlay — auto-reset countdown UI
 */

import {
  createContext, useContext, useEffect, useState,
  useCallback, useRef, type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, RotateCcw }     from "lucide-react";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { useDeviceHeartbeat } from "@/hooks/useDeviceHeartbeat";

// ── Types ──────────────────────────────────────────────────────────────────────

type Mode = "kiosk" | "tablet" | "normal";

interface KioskState {
  mode:        Mode;
  isKiosk:     boolean;
  isTablet:    boolean;
  venueId:     string | null;
  tableNumber: string | null;
  deviceId:    string | null;
  reset:       () => void;
  burnInActive: boolean;
}

const BURN_IN_INTERVAL_MS = 45_000;
const BURN_IN_SHIFT_PX    = 2;

// ── Context ────────────────────────────────────────────────────────────────────

const KioskContext = createContext<KioskState>({
  mode: "normal", isKiosk: false, isTablet: false,
  venueId: null, tableNumber: null, deviceId: null,
  reset: () => {}, burnInActive: false,
});

export function useKioskMode(): KioskState {
  return useContext(KioskContext);
}

// ── Inactivity constants ───────────────────────────────────────────────────────

const IDLE_MS      = 90_000;   // 90 s before countdown
const COUNTDOWN_S  = 10;       // 10 s countdown before reset

// ── Provider ───────────────────────────────────────────────────────────────────

export function KioskModeProvider({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();

  // Parse URL params once on mount
  const params = new URLSearchParams(window.location.search);
  const modeParam = params.get("mode") as Mode | null;
  const mode: Mode = modeParam === "kiosk" || modeParam === "tablet" ? modeParam : "normal";

  const venueId     = params.get("venueId");
  const tableNumber = params.get("tableNumber");
  const deviceId    = params.get("deviceId");

  const [showOverlay, setShowOverlay] = useState(false);
  const [countdown,   setCountdown]   = useState(COUNTDOWN_S);
  const [burnInActive, setBurnInActive] = useState(false);
  const burnInEnabled = useFeatureFlag("burn_in_protection", true);

  const idleTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = useCallback(() => {
    if (idleTimer.current)    clearTimeout(idleTimer.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const reset = useCallback(() => {
    clearAll();
    setShowOverlay(false);
    setCountdown(COUNTDOWN_S);
    // Navigate home, preserving kiosk params
    const qs = new URLSearchParams({ mode });
    if (venueId)     qs.set("venueId", venueId);
    if (tableNumber) qs.set("tableNumber", tableNumber);
    if (deviceId)    qs.set("deviceId", deviceId);
    navigate(`/?${qs.toString()}`);
  }, [clearAll, mode, venueId, tableNumber, deviceId, navigate]);

  const startIdleTimer = useCallback(() => {
    clearAll();
    idleTimer.current = setTimeout(() => {
      setShowOverlay(true);
      setCountdown(COUNTDOWN_S);
      let c = COUNTDOWN_S;
      countdownRef.current = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) {
          clearAll();
          reset();
        }
      }, 1000);
    }, IDLE_MS);
  }, [clearAll, reset]);

  const dismissOverlay = useCallback(() => {
    clearAll();
    setShowOverlay(false);
    setCountdown(COUNTDOWN_S);
    startIdleTimer();
  }, [clearAll, startIdleTimer]);

  // Activity listeners
  useEffect(() => {
    if (mode !== "kiosk") return;
    const events = ["mousedown", "mousemove", "touchstart", "keydown", "scroll", "click"];
    const handler = () => {
      if (!showOverlay) startIdleTimer();
    };
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    startIdleTimer();
    return () => {
      clearAll();
      events.forEach((e) => window.removeEventListener(e, handler));
    };
  }, [mode, showOverlay, startIdleTimer, clearAll]);

  // Enter full-screen on kiosk mode
  useEffect(() => {
    if (mode === "kiosk" && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, [mode]);

  // ── Burn-in protection ──────────────────────────────────────────────────────
  // Subtle pixel shift (1-2px) every 45s. Only active during idle/attract
  // (showOverlay === true or no recent activity). Paused when user is
  // actively interacting (showOverlay === false means active session).
  const userIsIdle = useRef(false);
  const burnStyleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    userIsIdle.current = showOverlay;
  }, [showOverlay]);

  useEffect(() => {
    if (mode !== "kiosk" || !burnInEnabled) return;
    let burnInterval: ReturnType<typeof setInterval> | null = null;
    let shiftIndex = 0;
    const shifts = [
      { x: 0, y: 0 },
      { x: BURN_IN_SHIFT_PX, y: 0 },
      { x: BURN_IN_SHIFT_PX, y: BURN_IN_SHIFT_PX },
      { x: 0, y: BURN_IN_SHIFT_PX },
      { x: -BURN_IN_SHIFT_PX, y: 0 },
      { x: -BURN_IN_SHIFT_PX, y: -BURN_IN_SHIFT_PX },
      { x: 0, y: -BURN_IN_SHIFT_PX },
      { x: BURN_IN_SHIFT_PX, y: -BURN_IN_SHIFT_PX },
    ];

    const styleEl = document.createElement("style");
    styleEl.dataset["burnin"] = "protection";
    document.head.appendChild(styleEl);
    burnStyleRef.current = styleEl;

    const root = document.getElementById("root");
    if (root) root.classList.add("kiosk-burn-shift");

    let lastActivity = Date.now();
    const IDLE_THRESHOLD = 30_000;
    const onActivity = () => { lastActivity = Date.now(); };
    const activityEvents = ["mousedown", "touchstart", "keydown", "scroll"];
    activityEvents.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    burnInterval = setInterval(() => {
      const isIdle = userIsIdle.current || (Date.now() - lastActivity > IDLE_THRESHOLD);
      if (!isIdle) {
        styleEl.textContent = `
          .kiosk-burn-shift {
            transform: translate(0px, 0px);
            transition: transform 2s ease-in-out;
          }
        `;
        setBurnInActive(false);
        return;
      }

      shiftIndex = (shiftIndex + 1) % shifts.length;
      const s = shifts[shiftIndex]!;
      styleEl.textContent = `
        .kiosk-burn-shift {
          transform: translate(${s.x}px, ${s.y}px);
          transition: transform 2s ease-in-out;
        }
      `;
      setBurnInActive(s.x !== 0 || s.y !== 0);
    }, BURN_IN_INTERVAL_MS);

    return () => {
      if (burnInterval) clearInterval(burnInterval);
      styleEl.remove();
      burnStyleRef.current = null;
      activityEvents.forEach((e) => window.removeEventListener(e, onActivity));
      if (root) {
        root.classList.remove("kiosk-burn-shift");
        root.style.transform = "";
      }
      setBurnInActive(false);
    };
  }, [mode, burnInEnabled]);

  // ── Kiosk lockdown ────────────────────────────────────────────────────────
  // Only active when mode === "kiosk". Does NOT affect tablet/normal so
  // dashboard users keep their right-click + devtools.
  useEffect(() => {
    if (mode !== "kiosk") return;

    // 1. Block right-click context menu (prevents "save image / inspect")
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("contextmenu", onContextMenu);

    // 2. Block reload, devtools, new-tab, close-window keyboard shortcuts.
    //    NOTE: browsers cannot block ALL system shortcuts (Cmd-Q on macOS,
    //    Alt-F4 on Win). Real lockdown still requires the OS launching
    //    Chrome/Edge in actual --kiosk mode. This middleware closes the
    //    common in-page exits.
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const blocked =
        k === "f5"  ||
        k === "f11" ||
        k === "f12" ||
        (ctrl && (k === "r" || k === "w" || k === "t" || k === "n" || k === "p" || k === "s")) ||
        (ctrl && e.shiftKey && (k === "i" || k === "j" || k === "c" || k === "r" || k === "n" || k === "t")) ||
        (e.altKey && k === "f4");
      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });

    // 3. Disable text selection + drag (no copy-out, no image drag).
    const KIOSK_LOCKDOWN_CSS = `
      html, body {
        -webkit-user-select: none;
        -ms-user-select:    none;
        user-select:        none;
        -webkit-touch-callout: none;
        overscroll-behavior:   none;
      }
      img, a { -webkit-user-drag: none; user-drag: none; }
      /* Inputs still need selection for typing */
      input, textarea, [contenteditable="true"] {
        -webkit-user-select: text;
        user-select:         text;
      }
    `;
    const styleEl = document.createElement("style");
    styleEl.dataset["kiosk"] = "lockdown";
    styleEl.textContent = KIOSK_LOCKDOWN_CSS;
    document.head.appendChild(styleEl);

    // 4. Acquire wake lock so the kiosk screen never sleeps. Re-acquires
    //    automatically when the tab regains visibility (browsers drop the
    //    lock on backgrounding).
    type ScreenWakeLock = { release: () => Promise<void> };
    type WakeLockNav = Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<ScreenWakeLock> };
    };
    const wakeNav = navigator as WakeLockNav;
    let wakeLock: ScreenWakeLock | null = null;

    async function requestWake() {
      try {
        if (!wakeNav.wakeLock) return;
        wakeLock = await wakeNav.wakeLock.request("screen");
      } catch { /* user agent may deny — non-fatal */ }
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") void requestWake();
    };
    void requestWake();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown, { capture: true } as EventListenerOptions);
      document.removeEventListener("visibilitychange", onVisibility);
      styleEl.remove();
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [mode]);

  useDeviceHeartbeat(
    mode !== "normal" ? deviceId : null,
    mode !== "normal" ? venueId : null,
    showOverlay,
  );

  const value: KioskState = {
    mode, isKiosk: mode === "kiosk", isTablet: mode === "tablet",
    venueId, tableNumber, deviceId, reset, burnInActive,
  };

  return (
    <KioskContext.Provider value={value}>
      {children}
      {mode === "kiosk" && (
        <KioskInactivityOverlay
          visible={showOverlay}
          countdown={countdown}
          onDismiss={dismissOverlay}
          onReset={reset}
        />
      )}
    </KioskContext.Provider>
  );
}

// ── Inactivity Overlay ─────────────────────────────────────────────────────────

const GOLD     = "rgba(212,175,55,1)";
const GOLD_DIM = "rgba(212,175,55,0.6)";

function KioskInactivityOverlay({
  visible, countdown, onDismiss, onReset,
}: { visible: boolean; countdown: number; onDismiss: () => void; onReset: () => void }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

          <motion.div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: "rgba(212,175,55,0.08)", border: "2px solid rgba(212,175,55,0.3)" }}
            animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
            <p className="font-serif text-5xl" style={{ color: GOLD, fontWeight: 300 }}>
              {countdown}
            </p>
          </motion.div>

          <div className="text-center space-y-2">
            <p className="font-serif text-2xl" style={{ color: "rgba(230,210,175,0.9)", fontWeight: 300 }}>
              Still there?
            </p>
            <p className="text-sm" style={{ color: "rgba(180,155,100,0.55)" }}>
              Session will reset in {countdown} second{countdown !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex gap-3">
            <motion.button onClick={onDismiss}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-medium"
              style={{ background: "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))", color: "hsl(22 18% 6%)", fontSize: 14 }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              Continue Session
            </motion.button>

            <motion.button onClick={onReset}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: GOLD_DIM }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <RotateCcw size={14} />Reset Now
            </motion.button>
          </div>

          <p className="text-[8px] uppercase tracking-[0.25em] mt-2" style={{ color: "rgba(180,155,100,0.25)" }}>
            SmokeCraft 360 · Kiosk Mode
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Kiosk Mode Banner (tablet/kiosk visible bar) ──────────────────────────────

export function KioskModeBanner() {
  const { mode, isKiosk, isTablet, tableNumber, reset } = useKioskMode();
  if (!isKiosk && !isTablet) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-between px-6 py-2.5"
      style={{ background: "rgba(10,8,5,0.95)", borderTop: "1px solid rgba(212,175,55,0.15)", backdropFilter: "blur(8px)" }}>
      <div className="flex items-center gap-3">
        <Monitor size={11} style={{ color: "rgba(212,175,55,0.5)" }} />
        <span className="text-[8px] uppercase tracking-[0.2em]" style={{ color: "rgba(180,155,100,0.4)" }}>
          {mode === "kiosk" ? "Kiosk" : "Tablet"} Mode{tableNumber ? ` · Table ${tableNumber}` : ""}
        </span>
      </div>
      <button onClick={reset}
        className="flex items-center gap-1.5 text-[7px] uppercase tracking-wider px-2.5 py-1 rounded"
        style={{ color: "rgba(180,155,100,0.35)", border: "1px solid rgba(180,155,100,0.15)" }}>
        <RotateCcw size={8} />Reset
      </button>
    </div>
  );
}
