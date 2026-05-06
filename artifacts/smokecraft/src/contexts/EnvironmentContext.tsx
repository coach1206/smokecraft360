/**
 * EnvironmentContext — React wrapper for the EnvironmentEngine singleton.
 *
 * Provides reactive environment state to all components.
 * Also initialises the sound engine on first user interaction.
 * Also handles session continuity — shows "Welcome back" banner on return visit.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { environmentEngine, type EnvironmentState, type CraftType } from "@/lib/environmentEngine";
import { soundEngine } from "@/lib/soundEngine";
import { fetchExperienceControl } from "@/services/experienceControl";

interface EnvironmentContextValue {
  env:            EnvironmentState;
  setCraft:       (craft: CraftType) => void;
  onSwipeAdd:     (tags: string[]) => void;
  onSwipeSkip:    (tags: string[]) => void;
  onRevealStart:  () => void;
  onOrderConfirm: () => void;
  soundEnabled:   boolean;
  setSoundEnabled:(enabled: boolean) => void;
}

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null);

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [env,          setEnv]          = useState<EnvironmentState>(environmentEngine.getState());
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const soundInitRef = useRef(false);

  // Subscribe to engine state changes + wake up atmosphere on return
  useEffect(() => {
    const unsub = environmentEngine.subscribe(setEnv);
    environmentEngine.applyTimeOfDay();
    // Wake up atmosphere gradually on return visit (3–4s ramp)
    if (environmentEngine.getState().returnVisit) {
      setTimeout(() => environmentEngine.wakeUpAtmosphere(), 200);
    }
    return unsub;
  }, []);

  // Fetch venue Experience Control settings and apply to engine
  useEffect(() => {
    fetchExperienceControl()
      .then(data => {
        if (data.global) {
          environmentEngine.applyControlSettings({
            atmosphereIntensity: data.global.atmosphereIntensity,
            particleDensity:     data.global.particleDensity,
            motionCalmness:      data.global.motionCalmness,
            revealPacing:        data.global.revealPacing,
            soundVolume:         data.global.soundVolume,
            performanceMode:     data.global.performanceMode,
          });
          // Apply sound volume to engine
          soundEngine.setVolume(data.global.soundVolume / 100);
        }
      })
      .catch(() => { /* unauthenticated or no settings — use engine defaults */ });
  }, []);

  // Init sound on first interaction (respects browser autoplay policy)
  useEffect(() => {
    function handleFirstInteraction() {
      if (soundInitRef.current) return;
      soundInitRef.current = true;
      soundEngine.init();
      // Auto-enable sound off by default — user must opt in via UI
    }
    window.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    window.addEventListener("keydown",    handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown",    handleFirstInteraction);
    };
  }, []);

  const setCraft = useCallback((craft: CraftType) => {
    environmentEngine.setCraft(craft);
    if (soundEnabled) soundEngine.switchCraft(craft);
  }, [soundEnabled]);

  const onSwipeAdd = useCallback((tags: string[]) => {
    environmentEngine.onSwipeAdd(tags);
    if (soundEnabled) soundEngine.swipeAdd();
  }, [soundEnabled]);

  const onSwipeSkip = useCallback((tags: string[]) => {
    environmentEngine.onSwipeSkip(tags);
    if (soundEnabled) soundEngine.swipeSkip();
  }, [soundEnabled]);

  const onRevealStart = useCallback(() => {
    environmentEngine.onRevealStart();
    if (soundEnabled) soundEngine.revealStart();
  }, [soundEnabled]);

  const onOrderConfirm = useCallback(() => {
    environmentEngine.onOrderConfirm();
    if (soundEnabled) soundEngine.orderConfirm();
  }, [soundEnabled]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    soundEngine.setMuted(!enabled);
    if (enabled && soundInitRef.current && env.craftType) {
      soundEngine.switchCraft(env.craftType);
    }
  }, [env.craftType]);

  return (
    <EnvironmentContext.Provider value={{
      env, setCraft,
      onSwipeAdd, onSwipeSkip,
      onRevealStart, onOrderConfirm,
      soundEnabled, setSoundEnabled,
    }}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment(): EnvironmentContextValue {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) throw new Error("useEnvironment must be used inside <EnvironmentProvider>");
  return ctx;
}

/** Safe hook — returns null outside provider (for non-experience pages). */
export function useEnvironmentSafe(): EnvironmentContextValue | null {
  return useContext(EnvironmentContext);
}
