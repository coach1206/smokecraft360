import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type OperationalMode    = "standard" | "senior" | "rush";
export type ContrastMode       = "standard" | "luminous";
export type AnimationIntensity = "full" | "reduced" | "none";
export type SpacingMode        = "compact" | "standard" | "comfortable";
export type DashboardDensity   = "dense" | "standard" | "airy";
export type CinematicIntensity = "low" | "standard" | "high";

export interface ThemeConfig {
  operationalMode:    OperationalMode;
  operationalLayout:  string;
  fontScale:          number;
  touchScale:         number;
  contrastMode:       ContrastMode;
  animationIntensity: AnimationIntensity;
  spacingMode:        SpacingMode;
  dashboardDensity:   DashboardDensity;
  cinematicIntensity: CinematicIntensity;
}

interface ThemeConfigCtx extends ThemeConfig {
  setSeniorMode:      () => void;
  setRushMode:        () => void;
  setStandardMode:    () => void;
  setOperationalMode: (m: OperationalMode) => void;
  update:             (patch: Partial<ThemeConfig>) => void;
}

const STANDARD: ThemeConfig = {
  operationalMode:    "standard",
  operationalLayout:  "Standard",
  fontScale:          1.0,
  touchScale:         1.0,
  contrastMode:       "standard",
  animationIntensity: "full",
  spacingMode:        "standard",
  dashboardDensity:   "standard",
  cinematicIntensity: "standard",
};

const SENIOR: ThemeConfig = {
  operationalMode:    "senior",
  operationalLayout:  "Senior Mode",
  fontScale:          1.45,
  touchScale:         1.3,
  contrastMode:       "luminous",
  animationIntensity: "reduced",
  spacingMode:        "comfortable",
  dashboardDensity:   "airy",
  cinematicIntensity: "low",
};

const RUSH: ThemeConfig = {
  operationalMode:    "rush",
  operationalLayout:  "Rush Mode",
  fontScale:          0.9,
  touchScale:         1.0,
  contrastMode:       "standard",
  animationIntensity: "full",
  spacingMode:        "compact",
  dashboardDensity:   "dense",
  cinematicIntensity: "high",
};

const PRESETS: Record<OperationalMode, ThemeConfig> = {
  standard: STANDARD,
  senior:   SENIOR,
  rush:     RUSH,
};

const STORAGE_KEY = "ax_theme_config_v1";

function load(): ThemeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...STANDARD, ...(JSON.parse(raw) as Partial<ThemeConfig>) };
  } catch { /* ignore */ }
  return STANDARD;
}

function applyCSS(cfg: ThemeConfig) {
  const r = document.documentElement;
  r.style.setProperty("--theme-font-scale",          String(cfg.fontScale));
  r.style.setProperty("--theme-touch-scale",         String(cfg.touchScale));
  r.style.setProperty("--theme-anim-intensity",      cfg.animationIntensity);
  r.style.setProperty("--theme-contrast-mode",       cfg.contrastMode);
  r.style.setProperty("--theme-spacing-mode",        cfg.spacingMode);
  r.style.setProperty("--theme-dashboard-density",   cfg.dashboardDensity);
  r.style.setProperty("--theme-cinematic-intensity", cfg.cinematicIntensity);
  r.setAttribute("data-operational-mode",            cfg.operationalMode);
  if (cfg.contrastMode === "luminous") {
    r.style.setProperty("--foreground", "0 0% 100%");
  } else {
    r.style.removeProperty("--foreground");
  }
}

const Ctx = createContext<ThemeConfigCtx | null>(null);

export function ThemeConfigProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<ThemeConfig>(load);

  useEffect(() => {
    applyCSS(cfg);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
  }, [cfg]);

  const setOperationalMode = useCallback((m: OperationalMode) => setCfg(PRESETS[m]), []);
  const setSeniorMode      = useCallback(() => setCfg(SENIOR), []);
  const setRushMode        = useCallback(() => setCfg(RUSH), []);
  const setStandardMode    = useCallback(() => setCfg(STANDARD), []);
  const update             = useCallback((patch: Partial<ThemeConfig>) =>
    setCfg(prev => ({ ...prev, ...patch })), []);

  return (
    <Ctx.Provider value={{ ...cfg, setOperationalMode, setSeniorMode, setRushMode, setStandardMode, update }}>
      {children}
    </Ctx.Provider>
  );
}

export function useThemeConfig(): ThemeConfigCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useThemeConfig must be inside ThemeConfigProvider");
  return ctx;
}
