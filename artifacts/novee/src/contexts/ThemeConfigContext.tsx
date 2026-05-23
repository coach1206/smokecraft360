import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type OperationalMode = "standard" | "senior" | "rush";
export type ContrastMode    = "standard" | "luminous";
export type AnimationIntensity = "full" | "reduced" | "none";

export interface ThemeConfig {
  operationalMode:    OperationalMode;
  fontScale:          number;
  touchScale:         number;
  contrastMode:       ContrastMode;
  animationIntensity: AnimationIntensity;
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
  fontScale:          1.0,
  touchScale:         1.0,
  contrastMode:       "standard",
  animationIntensity: "full",
};

const SENIOR: ThemeConfig = {
  operationalMode:    "senior",
  fontScale:          1.45,
  touchScale:         1.3,
  contrastMode:       "luminous",
  animationIntensity: "reduced",
};

const RUSH: ThemeConfig = {
  operationalMode:    "rush",
  fontScale:          0.9,
  touchScale:         1.0,
  contrastMode:       "standard",
  animationIntensity: "full",
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
