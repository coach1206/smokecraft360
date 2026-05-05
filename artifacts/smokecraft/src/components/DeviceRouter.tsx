/**
 * DeviceRouter — device-aware UI context.
 *
 * Detects the current device class (kiosk / tablet / mobile / desktop)
 * and provides it via context so any component can adapt layout/behavior.
 *
 * Detection rules (in priority order):
 *  1. URL param ?deviceMode=kiosk|tablet|mobile — override for testing/kiosks
 *  2. Screen width < 480  → mobile
 *  3. Screen width < 1024 → tablet
 *  4. Kiosk UA hint or fullscreen API hint → kiosk
 *  5. Otherwise → desktop
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from "react";

export type DeviceMode = "kiosk" | "tablet" | "mobile" | "desktop";

interface DeviceRouterCtx {
  mode:         DeviceMode;
  isKiosk:      boolean;
  isMobile:     boolean;
  isTouch:      boolean;
  screenWidth:  number;
  screenHeight: number;
}

const Ctx = createContext<DeviceRouterCtx>({
  mode: "desktop", isKiosk: false, isMobile: false, isTouch: false,
  screenWidth: 1280, screenHeight: 720,
});

function detectMode(): DeviceMode {
  // 1. URL param override
  try {
    const param = new URLSearchParams(window.location.search).get("deviceMode");
    if (param === "kiosk" || param === "tablet" || param === "mobile" || param === "desktop") {
      return param as DeviceMode;
    }
  } catch { /* ignore */ }

  const w = window.innerWidth;

  // 2. Mobile
  if (w < 480) return "mobile";

  // 3. Tablet range
  if (w < 1024) return "tablet";

  // 4. Kiosk hints
  const ua = navigator.userAgent.toLowerCase();
  const kioskHints = ["electron", "cef", "kiosk", "headless", "webview"];
  if (kioskHints.some(h => ua.includes(h))) return "kiosk";
  // Kiosk screens are typically landscape 1080p or 4K
  if (w >= 1920 && window.screen.availWidth === window.screen.width) return "kiosk";

  return "desktop";
}

export function DeviceRouterProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DeviceMode>(() => detectMode());
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });

  const update = useCallback(() => {
    setMode(detectMode());
    setDims({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  useEffect(() => {
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  const value: DeviceRouterCtx = {
    mode,
    isKiosk:      mode === "kiosk",
    isMobile:     mode === "mobile",
    isTouch:      mode === "mobile" || mode === "tablet",
    screenWidth:  dims.w,
    screenHeight: dims.h,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDeviceRouter(): DeviceRouterCtx {
  return useContext(Ctx);
}

/** Convenience: render children only on matched modes */
export function DeviceOnly({
  modes, children,
}: {
  modes: DeviceMode | DeviceMode[];
  children: ReactNode;
}) {
  const { mode } = useDeviceRouter();
  const list = Array.isArray(modes) ? modes : [modes];
  return list.includes(mode) ? <>{children}</> : null;
}
