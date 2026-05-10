/**
 * DeviceRouter — device-aware UI context with shell wrappers.
 *
 * Detection priority:
 *  1. Registered device record lookup via `?deviceId=<uuid>` → calls API for device.type
 *  2. URL param `?deviceType=kiosk|pos|tablet|mobile`  — direct override
 *  3. Screen width < 480  → mobile
 *  4. Screen width < 1024 → tablet
 *  5. Kiosk UA hint or large landscape screen → kiosk
 *  6. Otherwise → desktop
 *
 * Shell variants:
 *  - KioskShell   — full-screen, no scrollbars, pixel-shift safe, back-nav trapped
 *  - PosShell     — widescreen commerce layout, back-nav trapped
 *  - TabletShell  — touch-optimized layout
 *  - MobileShell  — compact mobile layout
 *  - DesktopShell — standard desktop layout
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode, type CSSProperties,
} from "react";
import { useLocation }    from "wouter";
import { getAuthHeaders } from "@/services/auth";

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

  // Priority 1: look up the registered device record when ?deviceId= is present
  useEffect(() => {
    let cancelled = false;
    const deviceId = new URLSearchParams(window.location.search).get("deviceId");
    if (!deviceId) return;
    (async () => {
      try {
        const r = await fetch(`/api/devices/${deviceId}/type`, { headers: getAuthHeaders() });
        if (!r.ok) return;
        const j = await r.json() as { type?: string };
        const t = j.type?.toLowerCase() ?? "";
        if (!cancelled && (t === "kiosk" || t === "pos" || t === "tablet" || t === "mobile")) {
          setMode(t as DeviceMode);
        }
      } catch { /* fall through to heuristics */ }
    })();
    return () => { cancelled = true; };
  }, []);

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

/** KioskShell — traps back-navigation; adds slim status bar for venue/time context */
export function KioskShell({ children }: { children: ReactNode }) {
  const [time, setTime] = useState(
    () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  );

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const trap  = () => window.history.pushState(null, "", window.location.href);
    const clock = setInterval(
      () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
      30_000,
    );
    window.addEventListener("popstate", trap);
    return () => { window.removeEventListener("popstate", trap); clearInterval(clock); };
  }, []);

  return (
    <div data-shell="kiosk" style={kioskStyle}>
      <div data-shell-panel="kiosk-statusbar" style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 9000,
        height: 30, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", background: "rgba(26,26,27,0.30)", backdropFilter: "blur(8px)",
        fontSize: 10, fontWeight: 700, color: "rgba(26,26,27,0.40)",
        letterSpacing: "0.12em", textTransform: "uppercase", pointerEvents: "none",
      }}>
        <span>NOVEE OS · Kiosk</span>
        <span>{time}</span>
      </div>
      <div style={{ paddingTop: 30, height: "100%" }}>{children}</div>
    </div>
  );
}

/** PosShell — POS layout: top command bar with back-nav + POS mode indicator, then product grid content */
export function PosShell({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const trap = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", trap);
    return () => window.removeEventListener("popstate", trap);
  }, []);

  return (
    <div data-shell="pos" style={{ display: "flex", flexDirection: "column", width: "100vw", minHeight: "100vh" }}>
      <div data-shell-panel="pos-topbar" style={{
        display: "flex", alignItems: "center", gap: 12,
        height: 48, flexShrink: 0, padding: "0 16px",
        background: "rgba(26,26,27,0.48)", borderBottom: "1px solid rgba(212,139,0,0.12)",
        backdropFilter: "blur(10px)", zIndex: 800,
      }}>
        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 12px", borderRadius: 8, cursor: "pointer",
            background: "rgba(26,26,27,0.07)", border: "1px solid rgba(26,26,27,0.12)",
            color: "rgba(26,26,27,0.62)", fontSize: 12, fontWeight: 700,
          }}
        >
          ← Back
        </button>
        <div style={{ width: 1, height: 18, background: "rgba(26,26,27,0.10)", flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(212,139,0,0.7)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Axiom Commerce
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "rgba(26,26,27,0.25)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          NOVEE OS
        </span>
      </div>
      <div data-shell-panel="pos-main" style={{ flex: 1, overflow: "auto" }}>{children}</div>
    </div>
  );
}

/** TabletShell — touch-optimized layout with top navigation bar and explicit back affordance */
export function TabletShell({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  return (
    <div data-shell="tablet" style={{ display: "flex", flexDirection: "column", width: "100vw", minHeight: "100dvh", touchAction: "pan-y" }}>
      <div data-shell-panel="tablet-topbar" style={{
        display: "flex", alignItems: "center", gap: 10,
        height: 44, flexShrink: 0, padding: "0 16px",
        background: "rgba(26,26,27,0.38)", borderBottom: "1px solid rgba(26,26,27,0.09)",
        backdropFilter: "blur(8px)",
      }}>
        <button
          onClick={() => { if (window.history.length > 1) window.history.back(); else navigate("/"); }}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "5px 10px", borderRadius: 8, cursor: "pointer",
            background: "rgba(26,26,27,0.07)", border: "1px solid rgba(26,26,27,0.10)",
            color: "rgba(26,26,27,0.58)", fontSize: 12, fontWeight: 700,
          }}
        >
          ← Back
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "rgba(212,139,0,0.4)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Tablet</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" as CSSProperties["WebkitOverflowScrolling"] }}>{children}</div>
    </div>
  );
}

/** MobileShell — compact layout with persistent bottom navigation including back, home, menu, loyalty */
export function MobileShell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const navBtn = (label: string, icon: string, path: string) => (
    <button
      key={label}
      onClick={() => path === "__back"
        ? (window.history.length > 1 ? window.history.back() : navigate("/"))
        : navigate(path)}
      style={{
        flex: 1, height: "100%", background: "none", border: "none", cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 2, fontSize: 10, fontWeight: 600,
        color: location === path ? "#D48B00" : "rgba(26,26,27,0.44)",
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      {label}
    </button>
  );
  return (
    <div data-shell="mobile" style={{ display: "flex", flexDirection: "column", width: "100vw", minHeight: "100dvh", touchAction: "pan-y" }}>
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 56 }}>{children}</div>
      <div data-shell-panel="mobile-bottomnav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: 56,
        display: "flex", alignItems: "stretch",
        background: "rgba(10,8,7,0.96)", borderTop: "1px solid rgba(26,26,27,0.09)",
        backdropFilter: "blur(16px)", zIndex: 900,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {navBtn("Back",    "←", "__back"  )}
        {navBtn("Home",    "⌂", "/"       )}
        {navBtn("Menu",    "☰", "/orders" )}
        {navBtn("Loyalty", "✦", "/rewards")}
      </div>
    </div>
  );
}

export function DesktopShell({ children }: { children: ReactNode }) { return <div data-shell="desktop" style={desktopStyle}>{children}</div>; }

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
