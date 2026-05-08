/**
 * useAtmosphereMode — Phase 4: Environmental AI Modes hook.
 *
 * Subscribes to Socket.io environment:mode_changed events and exposes
 * the active mode config to any component. Also provides an imperative
 * activateMode() trigger for staff controls.
 *
 * The hook injects CSS custom properties onto :root so every component
 * automatically responds to mode changes via CSS variables.
 */

import { useEffect, useState, useCallback } from "react";
import { io as socketIO } from "socket.io-client";

export interface ModeConfig {
  mode:             string;
  particleDensity:  number;
  particleSpeed:    number;
  lightingWarmth:   number;
  lightingIntensity: number;
  motionDamping:    number;
  acousticProfile:  string;
  cssVars:          Record<string, string>;
  label:            string;
  description:      string;
}

interface UseAtmosphereModeResult {
  mode:         string;
  config:       ModeConfig | null;
  transitionMs: number;
  activateMode: (venueId: string, mode: string, triggeredBy?: string) => Promise<void>;
  loading:      boolean;
}

const DEFAULT_VARS: Record<string, string> = {
  "--ax-mode-bg":     "rgba(10,10,11,0.95)",
  "--ax-mode-accent": "#D48B00",
  "--ax-mode-glow":   "rgba(212,139,0,0.10)",
  "--ax-mode-speed":  "1.6s",
};

function applyVars(vars: Record<string, string>) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
}

export function useAtmosphereMode(venueId?: string): UseAtmosphereModeResult {
  const [mode,         setMode]         = useState("default");
  const [config,       setConfig]       = useState<ModeConfig | null>(null);
  const [transitionMs, setTransitionMs] = useState(1200);
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    applyVars(DEFAULT_VARS);

    const sock = (window as { _spatialSocket?: ReturnType<typeof socketIO> })._spatialSocket
      ?? socketIO({ path: "/socket.io", transports: ["websocket"] });

    sock.on("environment:mode_changed", (data: {
      mode: string; config: ModeConfig; transitionMs: number;
    }) => {
      setMode(data.mode);
      setConfig(data.config);
      setTransitionMs(data.transitionMs ?? 1200);
      if (data.config?.cssVars) applyVars(data.config.cssVars);
    });

    return () => { sock.off("environment:mode_changed"); };
  }, []);

  useEffect(() => {
    if (!venueId) return;
    fetch(`/api/env-mode/venue/${venueId}`)
      .then(r => r.json())
      .then((data: { mode: string; config: ModeConfig }) => {
        setMode(data.mode);
        setConfig(data.config);
        if (data.config?.cssVars) applyVars(data.config.cssVars);
      })
      .catch(() => {});
  }, [venueId]);

  const activateMode = useCallback(async (vid: string, newMode: string, triggeredBy = "staff") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/env-mode/venue/${vid}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mode: newMode, triggeredBy }),
      });
      if (res.ok) {
        const data = await res.json() as { config: ModeConfig };
        setMode(newMode);
        setConfig(data.config);
        if (data.config?.cssVars) applyVars(data.config.cssVars);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { mode, config, transitionMs, activateMode, loading };
}
