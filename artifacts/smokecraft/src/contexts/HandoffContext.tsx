/**
 * HandoffContext — XEI Staff Handoff State Machine
 *
 * Manages the transition between Guest Mode and Staff Operational Mode.
 * The ripple origin is the touch/click coordinate — the wave expands from there.
 *
 * Phase sequence:
 *   idle → expanding (700ms) → live (staff overlay active) → collapsing (600ms) → idle
 *
 * No page navigation occurs. The current guest route stays mounted underneath.
 */

import {
  createContext, useContext, useState, useCallback, type ReactNode,
} from "react";

export type RipplePhase = "idle" | "expanding" | "live" | "collapsing";

interface HandoffState {
  isStaffMode:    boolean;
  rippleOrigin:   { x: number; y: number };
  ripplePhase:    RipplePhase;
  triggerHandoff: (x: number, y: number) => void;
  releaseHandoff: () => void;
}

const HandoffCtx = createContext<HandoffState | null>(null);

export function useHandoff(): HandoffState {
  const ctx = useContext(HandoffCtx);
  if (!ctx) throw new Error("useHandoff must be inside HandoffProvider");
  return ctx;
}

export function HandoffProvider({ children }: { children: ReactNode }) {
  const [isStaffMode,  setIsStaffMode]  = useState(false);
  const [ripplePhase,  setRipplePhase]  = useState<RipplePhase>("idle");
  const [rippleOrigin, setRippleOrigin] = useState({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 540,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 960,
  });

  const triggerHandoff = useCallback((x: number, y: number) => {
    if (isStaffMode || ripplePhase !== "idle") return;
    setRippleOrigin({ x, y });
    setRipplePhase("expanding");
    setTimeout(() => {
      setIsStaffMode(true);
      setRipplePhase("live");
    }, 680);
  }, [isStaffMode, ripplePhase]);

  const releaseHandoff = useCallback(() => {
    if (!isStaffMode) return;
    setRipplePhase("collapsing");
    setTimeout(() => {
      setIsStaffMode(false);
      setRipplePhase("idle");
    }, 580);
  }, [isStaffMode]);

  return (
    <HandoffCtx.Provider value={{
      isStaffMode, rippleOrigin, ripplePhase, triggerHandoff, releaseHandoff,
    }}>
      {children}
    </HandoffCtx.Provider>
  );
}
