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

  // Subscribe to engine state changes
  useEffect(() => {
    const unsub = environmentEngine.subscribe(setEnv);
    environmentEngine.applyTimeOfDay();
    return unsub;
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
