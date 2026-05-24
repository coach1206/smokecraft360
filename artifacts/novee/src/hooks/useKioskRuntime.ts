import { useEffect, useRef, useState } from "react";

type DisplayMode = "fullscreen" | "standalone" | "browser";

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
}

interface NavigatorWithWakeLock {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
}

export interface KioskRuntimeState {
  displayMode: DisplayMode;
  idleSecondsRemaining: number;
  isCoarsePointer: boolean;
  isLandscape: boolean;
  isOnline: boolean;
  wakeLockActive: boolean;
}

interface KioskRuntimeOptions {
  idleMs?: number;
  enabled?: boolean;
  onIdleReset?: () => void;
}

function resolveDisplayMode(): DisplayMode {
  if (typeof window === "undefined") return "browser";
  if (window.matchMedia("(display-mode: fullscreen)").matches) return "fullscreen";
  if (window.matchMedia("(display-mode: standalone)").matches) return "standalone";
  return "browser";
}

function applyViewportHeightVar() {
  if (typeof window === "undefined") return;
  const h = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--kiosk-vh", `${h * 0.01}px`);
}

export function useKioskRuntime({
  idleMs = 180_000,
  enabled = true,
  onIdleReset,
}: KioskRuntimeOptions = {}): KioskRuntimeState {
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => resolveDisplayMode());
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [idleSecondsRemaining, setIdleSecondsRemaining] = useState(() => Math.ceil(idleMs / 1000));
  const [isCoarsePointer, setIsCoarsePointer] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );
  const [isLandscape, setIsLandscape] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(orientation: landscape)").matches,
  );
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const lastActivityRef = useRef(Date.now());
  const idleCallbackRef = useRef(onIdleReset);
  idleCallbackRef.current = onIdleReset;

  useEffect(() => {
    if (!enabled) return;

    const preventDefault = (event: Event) => event.preventDefault();
    const preventZoomKeys = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && ["+", "-", "=", "0"].includes(event.key)) {
        event.preventDefault();
      }
    };

    window.addEventListener("contextmenu", preventDefault);
    window.addEventListener("dragstart", preventDefault);
    window.addEventListener("selectstart", preventDefault);
    window.addEventListener("keydown", preventZoomKeys);

    return () => {
      window.removeEventListener("contextmenu", preventDefault);
      window.removeEventListener("dragstart", preventDefault);
      window.removeEventListener("selectstart", preventDefault);
      window.removeEventListener("keydown", preventZoomKeys);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const markActivity = () => {
      lastActivityRef.current = Date.now();
      setIdleSecondsRemaining(Math.ceil(idleMs / 1000));
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "pointermove", "keydown", "touchstart"];
    events.forEach(eventName => window.addEventListener(eventName, markActivity, { passive: true }));

    const timer = window.setInterval(() => {
      const remainingMs = Math.max(0, idleMs - (Date.now() - lastActivityRef.current));
      setIdleSecondsRemaining(Math.ceil(remainingMs / 1000));
      if (remainingMs === 0) {
        markActivity();
        idleCallbackRef.current?.();
      }
    }, 1000);

    return () => {
      events.forEach(eventName => window.removeEventListener(eventName, markActivity));
      window.clearInterval(timer);
    };
  }, [enabled, idleMs]);

  useEffect(() => {
    if (!enabled) return;

    const fullscreenQuery = window.matchMedia("(display-mode: fullscreen)");
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const pointerQuery = window.matchMedia("(pointer: coarse)");
    const orientationQuery = window.matchMedia("(orientation: landscape)");

    const update = () => {
      setIsOnline(navigator.onLine);
      setDisplayMode(resolveDisplayMode());
      setIsCoarsePointer(pointerQuery.matches);
      setIsLandscape(orientationQuery.matches);
      applyViewportHeightVar();
    };

    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    fullscreenQuery.addEventListener("change", update);
    standaloneQuery.addEventListener("change", update);
    pointerQuery.addEventListener("change", update);
    orientationQuery.addEventListener("change", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      fullscreenQuery.removeEventListener("change", update);
      standaloneQuery.removeEventListener("change", update);
      pointerQuery.removeEventListener("change", update);
      orientationQuery.removeEventListener("change", update);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined") return;
    let cancelled = false;

    async function requestWakeLock() {
      try {
        const nav = navigator as unknown as NavigatorWithWakeLock;
        if (!nav.wakeLock || document.visibilityState !== "visible") return;
        wakeLockRef.current = await nav.wakeLock.request("screen");
        if (cancelled) {
          await wakeLockRef.current.release();
          return;
        }
        setWakeLockActive(!wakeLockRef.current.released);
        wakeLockRef.current.addEventListener("release", () => setWakeLockActive(false));
      } catch {
        setWakeLockActive(false);
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [enabled]);

  return {
    displayMode,
    idleSecondsRemaining,
    isCoarsePointer,
    isLandscape,
    isOnline,
    wakeLockActive,
  };
}
