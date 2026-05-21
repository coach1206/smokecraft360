/**
 * AmbiContext — Live Reactive Environmental Telemetry
 * Manages real-time venue atmosphere state (lighting, audio, aroma)
 * and allows craft modules to trigger their own sensory profiles.
 */

import React, { createContext, useContext, useState, useCallback } from "react";

export type CraftModule = "SmokeCraft" | "PourCraft" | "BeerCraft" | "WineCraft" | "Neutral";

export interface AtmosphereState {
  lightingLux:         number;
  lightingColorTemp:   string;
  audioSoundscape:     string;
  aromaSaturation:     number;
  activeZoneId:        string;
  activeCraft:         CraftModule;
}

const CRAFT_PROFILES: Record<CraftModule, Partial<AtmosphereState>> = {
  SmokeCraft: {
    lightingLux:       35,
    lightingColorTemp: "2200K (Warm Ember Amber)",
    audioSoundscape:   "Bourbon-Bar Jazz Dispersion",
    aromaSaturation:   60,
    activeCraft:       "SmokeCraft",
  },
  WineCraft: {
    lightingLux:       30,
    lightingColorTemp: "2400K (Velvet Burgundy Amber)",
    audioSoundscape:   "Boutique Sommelier Jazz Dispersion Floor",
    aromaSaturation:   50,
    activeCraft:       "WineCraft",
  },
  PourCraft: {
    lightingLux:       45,
    lightingColorTemp: "3000K (Crystal Copper)",
    audioSoundscape:   "Speakeasy Deep House Lounge",
    aromaSaturation:   40,
    activeCraft:       "PourCraft",
  },
  BeerCraft: {
    lightingLux:       65,
    lightingColorTemp: "3500K (Warm Brass Taproom)",
    audioSoundscape:   "Craft Taproom Acoustic Set",
    aromaSaturation:   30,
    activeCraft:       "BeerCraft",
  },
  Neutral: {
    lightingLux:       100,
    lightingColorTemp: "4000K",
    audioSoundscape:   "Standard Ambient Floor",
    aromaSaturation:   0,
    activeCraft:       "Neutral",
  },
};

const DEFAULT_STATE: AtmosphereState = {
  lightingLux:       100,
  lightingColorTemp: "4000K",
  audioSoundscape:   "Standard Ambient Floor",
  aromaSaturation:   0,
  activeZoneId:      "VIP_Lounge_Main",
  activeCraft:       "Neutral",
};

interface AmbiContextValue {
  atmosphere:       AtmosphereState;
  triggerAmbiScene: (module: CraftModule) => void;
  resetAtmosphere:  () => void;
}

const AmbiContext = createContext<AmbiContextValue | null>(null);

export function AmbiProvider({ children }: { children: React.ReactNode }) {
  const [atmosphere, setAtmosphere] = useState<AtmosphereState>(DEFAULT_STATE);

  const triggerAmbiScene = useCallback((module: CraftModule) => {
    const profile = CRAFT_PROFILES[module] ?? CRAFT_PROFILES.Neutral;
    setAtmosphere(prev => ({ ...prev, ...profile }));
  }, []);

  const resetAtmosphere = useCallback(() => {
    setAtmosphere(DEFAULT_STATE);
  }, []);

  return (
    <AmbiContext.Provider value={{ atmosphere, triggerAmbiScene, resetAtmosphere }}>
      {children}
    </AmbiContext.Provider>
  );
}

export function useAmbi(): AmbiContextValue {
  const ctx = useContext(AmbiContext);
  if (!ctx) throw new Error("useAmbi must be used inside <AmbiProvider>");
  return ctx;
}
