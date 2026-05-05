/**
 * DeviceRouter — device-aware UI context with shell wrappers.
 *
 * Detection priority:
 *  1. URL param `?deviceType=kiosk|pos|tablet|mobile`  — override for testing/kiosk deployments
 *  2. Screen width < 480  → mobile
 *  3. Screen width < 1024 → tablet
 *  4. Kiosk UA hint or large landscape screen → kiosk
 *  5. Otherwise → desktop (pos/desktop shell)
 *
 * Shell variants:
 *  - KioskShell   — full-screen, no scrollbars, pixel-shift safe
 *  - PosShell     — widescreen commerce layout
 *  - TabletShell  — touch-optimized layout
 *  - MobileShell  — compact mobile layout
 *  - DesktopShell — standard desktop layout
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode, type CSSProperties,
} from "react";

export type DeviceMode = "kiosk" | "pos" | "tablet" | "mobile" | "desktop";

interface DeviceRouterCtx {
  mode:         DeviceMode;
  isKiosk:      boolean;
  isPOS:        boolean;
  isMobile:     boolean;
  isTouch:      boolean;
  screenWidth:  number;
  screenHeight: number;
}

const Ctx = createContext<DeviceRouterCtx>({
  mode: "desktop", isKiosk: false, isPOS: false, isMobile: false, isTouch: false,
  screenWidth: 1280, screenHeight: 720,
});

function detectMode(): DeviceMode {
  // 1. URL param override — use `?deviceType=` as the canonical param
  try {
    const param = new URLSearchParams(window.location.search).get("deviceType");
    if (param === "kiosk" || param === "pos" || param === "tablet" || param === "mobile" || param === "desktop") {
      return param as DeviceMode;
    }
  } catch { /* ignore */ }

  const w = window.innerWidth;

  // 2. Mobile
  if (w < 480) return "mobile";

  // 3. Tablet range
  if (w < 1024) return "tablet";

  // 4. Kiosk hints (Electron/CEF/WebView UA or fullscreen kiosk screens)
  const ua          = navigator.userAgent.toLowerCase();
  const kioskHints  = ["electron", "cef", "kiosk", "headless", "webview"];
  if (kioskHints.some(h => ua.includes(h))) return "kiosk";
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
    isPOS:        mode === "pos",
    isMobile:     mode === "mobile",
    isTouch:      mode === "mobile" || mode === "tablet",
    screenWidth:  dims.w,
    screenHeight: dims.h,
  };

  // Render the appropriate shell wrapper around children
  return (
    <Ctx.Provider value={value}>
      <ShellWrapper mode={mode}>{children}</ShellWrapper>
    </Ctx.Provider>
  );
}

// ── Shell components ──────────────────────────────────────────────────────────

function ShellWrapper({ mode, children }: { mode: DeviceMode; children: ReactNode }) {
  switch (mode) {
    case "kiosk":   return <KioskShell>{children}</KioskShell>;
    case "pos":     return <PosShell>{children}</PosShell>;
    case "tablet":  return <TabletShell>{children}</TabletShell>;
    case "mobile":  return <MobileShell>{children}</MobileShell>;
    default:        return <DesktopShell>{children}</DesktopShell>;
  }
}

const kioskStyle: CSSProperties = {
  width:    "100vw",
  height:   "100vh",
  overflow: "hidden",
  position: "relative",
  // Pixel-shift safe — kiosk burn-in protection runs at container level
  contain:  "strict",
};

const posStyle: CSSProperties = {
  width:    "100vw",
  minHeight:"100vh",
  display:  "flex",
  flexDirection: "column",
};

const tabletStyle: CSSProperties = {
  width:       "100vw",
  minHeight:   "100dvh",
  touchAction: "pan-y",
  WebkitOverflowScrolling: "touch" as CSSProperties["WebkitOverflowScrolling"],
};

const mobileStyle: CSSProperties = {
  width:       "100vw",
  minHeight:   "100dvh",
  touchAction: "pan-y",
};

const desktopStyle: CSSProperties = {
  width:    "100vw",
  minHeight:"100vh",
};

export function KioskShell ({ children }: { children: ReactNode }) { return <div data-shell="kiosk"   style={kioskStyle}>  {children}</div>; }
export function PosShell   ({ children }: { children: ReactNode }) { return <div data-shell="pos"     style={posStyle}>    {children}</div>; }
export function TabletShell({ children }: { children: ReactNode }) { return <div data-shell="tablet"  style={tabletStyle}> {children}</div>; }
export function MobileShell({ children }: { children: ReactNode }) { return <div data-shell="mobile"  style={mobileStyle}> {children}</div>; }
export function DesktopShell({ children }: { children: ReactNode }){ return <div data-shell="desktop" style={desktopStyle}>{children}</div>; }

// ── Hooks + helpers ───────────────────────────────────────────────────────────

export function useDeviceRouter(): DeviceRouterCtx {
  return useContext(Ctx);
}

/** Render children only when current mode matches */
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
