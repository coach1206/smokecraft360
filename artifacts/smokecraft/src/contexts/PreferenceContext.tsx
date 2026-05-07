/**
 * PreferenceContext — global user mood / intensity / setting preferences.
 *
 * These preferences drive the useVisualMatch hook: DynamicCard cards filter
 * their scene arrays to only show scenes whose tags match the active values.
 *
 * Preset modes
 * ────────────
 * Chill Mode  → { mood: "social", intensity: "light",  setting: "day"   }
 * Deep Session→ { mood: "solo",   intensity: "strong", setting: "night" }
 * Premium     → { mood: "solo",   intensity: "premium",setting: "night" }
 * Social      → { mood: "social", intensity: "social", setting: "group" }
 */

import React, { createContext, useContext, useState } from "react";

export interface UserPreferences {
  mood:      string;  // "social" | "solo"
  intensity: string;  // "light" | "strong" | "premium"
  setting:   string;  // "day" | "night" | "urban" | "group"
}

export const PRESET_MODES: {
  id: string; label: string; icon: string;
  preferences: UserPreferences;
  color: string;
}[] = [
  {
    id: "chill", label: "Chill Mode", icon: "☀️",
    preferences: { mood: "social", intensity: "light", setting: "day" },
    color: "#34d399",
  },
  {
    id: "deep", label: "Deep Session", icon: "🌙",
    preferences: { mood: "solo", intensity: "strong", setting: "night" },
    color: "#a78bfa",
  },
  {
    id: "premium", label: "Premium", icon: "✦",
    preferences: { mood: "solo", intensity: "premium", setting: "night" },
    color: "#D48B00",
  },
  {
    id: "social", label: "Social", icon: "🎉",
    preferences: { mood: "social", intensity: "social", setting: "group" },
    color: "#f59e0b",
  },
];

interface PreferenceContextValue {
  preferences:    UserPreferences;
  activePresetId: string | null;
  setPreferences: (p: UserPreferences, presetId?: string) => void;
}

const PreferenceContext = createContext<PreferenceContextValue | null>(null);

export function PreferenceProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPrefs] = useState<UserPreferences>({
    mood: "social", intensity: "strong", setting: "night",
  });
  const [activePresetId, setActivePresetId] = useState<string | null>("deep");

  const setPreferences = (p: UserPreferences, presetId?: string) => {
    setPrefs(p);
    setActivePresetId(presetId ?? null);
  };

  return (
    <PreferenceContext.Provider value={{ preferences, activePresetId, setPreferences }}>
      {children}
    </PreferenceContext.Provider>
  );
}

export function usePreferences(): PreferenceContextValue {
  const ctx = useContext(PreferenceContext);
  if (!ctx) throw new Error("usePreferences must be used inside <PreferenceProvider>");
  return ctx;
}
