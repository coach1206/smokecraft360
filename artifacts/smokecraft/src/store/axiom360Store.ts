/**
 * axiom360Store — Global OS state for the AXIOM 360 Experience OS.
 *
 * Tracks the active operating mode and session context so that
 * switching from Patron → Staff → Patron preserves exactly where
 * the patron was, which table they were viewing, and which craft
 * was active.
 *
 * Persisted to localStorage under the key "axiom360-os" so state
 * survives page refreshes and device wakes from sleep.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CraftType = "smoke" | "pour" | "brew" | "vape" | null;
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

  // ── Setters ────────────────────────────────────────────────────────────────

  setMode:    (mode: ActiveMode) => void;
  setCraft:   (craft: CraftType) => void;
  setTableId: (id: string | null) => void;

  /**
   * Trigger the Handoff — flips patron ↔ staff and records the timestamp.
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
      // Only persist state values — never persist action functions
      partialize: (s) => ({
        activeMode:    s.activeMode,
        currentCraft:  s.currentCraft,
        activeTableId: s.activeTableId,
        lastHandoffAt: s.lastHandoffAt,
      }),
    },
  ),
);
