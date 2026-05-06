/**
 * axiom360Store — Handoff orchestration for the AXIOM 360 Experience OS.
 *
 * Owns ONLY the patron ↔ staff mode state machine and session context.
 * Revenue / member / prestige state lives in useAxiomStore (axiomStore.ts).
 *
 * Persisted under "axiom360-os" so mode survives page refreshes.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CraftType  = "smoke" | "pour" | "brew" | "vape" | null;
export type ActiveMode = "patron" | "staff";

interface Axiom360State {
  /** Current operating mode — determines which UI layer is rendered */
  activeMode: ActiveMode;

  /** Which craft was last selected / is currently active */
  currentCraft: CraftType;

  /** Table / seat identifier from POS context */
  activeTableId: string | null;

  /** Timestamp of last staff handoff — for session audit trail */
  lastHandoffAt: number | null;

  setMode:    (mode: ActiveMode)  => void;
  setCraft:   (craft: CraftType)  => void;
  setTableId: (id: string | null) => void;

  /**
   * Flip patron ↔ staff and record the timestamp.
   * Patron → Staff: records handoff time, preserves currentCraft.
   * Staff → Patron: restores patron view in-place.
   */
  handoff: () => void;
}

export const useAxiom360 = create<Axiom360State>()(
  persist(
    (set) => ({
      activeMode:    "patron",
      currentCraft:  null,
      activeTableId: null,
      lastHandoffAt: null,

      setMode:    (mode)  => set({ activeMode: mode }),
      setCraft:   (craft) => set({ currentCraft: craft }),
      setTableId: (id)    => set({ activeTableId: id }),

      handoff: () =>
        set((s) => ({
          activeMode:    s.activeMode === "patron" ? "staff" : "patron",
          lastHandoffAt: Date.now(),
        })),
    }),
    {
      name: "axiom360-os",
      partialize: (s) => ({
        activeMode:    s.activeMode,
        currentCraft:  s.currentCraft,
        activeTableId: s.activeTableId,
        lastHandoffAt: s.lastHandoffAt,
      }),
    },
  ),
);
