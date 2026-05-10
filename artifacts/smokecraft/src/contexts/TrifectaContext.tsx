/**
 * TrifectaContext — Sovereign Insight Cube state management.
 *
 * Provides:
 *   triggerTrifecta(profile)  — compute + open in one call (the `onFinish` pattern)
 *   insightPayload            — last computed TrifectaResult
 *   cubeOpen                  — whether the overlay is visible
 *   closeCube()               — dismiss the overlay
 *
 * Mount TrifectaProvider inside SubPageProviders.
 * Render <SovereignInsightCube /> as a sibling to page content — it reads from
 * this context and renders itself as a portal-style fixed overlay.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  TitanNervousSystem,
  type TrifectaProfile,
  type TrifectaResult,
} from "@/lib/titanNervousSystem";

// ── Context shape ──────────────────────────────────────────────────────────────

interface TrifectaContextValue {
  insightPayload: TrifectaResult | null;
  cubeOpen:       boolean;
  /** Compute trifecta from profile, store result, open the Insight Cube. */
  triggerTrifecta(profile: TrifectaProfile): void;
  /** Open/close cube independently (e.g. reopen cached result). */
  openCube(open: boolean): void;
  /** Dismiss the Insight Cube. */
  closeCube(): void;
}

const TrifectaContext = createContext<TrifectaContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function TrifectaProvider({ children }: { children: React.ReactNode }) {
  const [insightPayload, setInsightPayload] = useState<TrifectaResult | null>(null);
  const [cubeOpen,       setCubeOpen]       = useState(false);

  const triggerTrifecta = useCallback((profile: TrifectaProfile) => {
    const result = TitanNervousSystem.getTrifecta(profile);
    setInsightPayload(result);
    setCubeOpen(true);
    // Haptic confirmation on Trifecta reveal
    TitanNervousSystem.haptics.confirm();
  }, []);

  const openCube  = useCallback((open: boolean) => setCubeOpen(open), []);
  const closeCube = useCallback(() => setCubeOpen(false),              []);

  const value = useMemo<TrifectaContextValue>(
    () => ({ insightPayload, cubeOpen, triggerTrifecta, openCube, closeCube }),
    [insightPayload, cubeOpen, triggerTrifecta, openCube, closeCube],
  );

  return (
    <TrifectaContext.Provider value={value}>
      {children}
    </TrifectaContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTrifecta(): TrifectaContextValue {
  const ctx = useContext(TrifectaContext);
  if (!ctx) throw new Error("useTrifecta must be used within TrifectaProvider");
  return ctx;
}
