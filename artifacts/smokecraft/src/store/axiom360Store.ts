/**
 * axiom360Store — Global OS state for the AXIOM 360 Experience OS.
 *
 * Tracks the active operating mode, session context, and the
 * Revenue Intelligence layer (dynamic pricing, member lock, lift).
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

  // ── Revenue Intelligence ────────────────────────────────────────────────────

  /** Venue occupancy 0–100 %. Drives the dynamic pricing engine. */
  venueOccupancy: number;

  /** Master kill-switch for the dynamic pricing engine */
  isDynamicPricingActive: boolean;

  /** Whether a loyalty member is currently authenticated on this terminal */
  isMemberLoggedIn: boolean;

  /**
   * Cumulative extra dollars captured today through surge pricing
   * vs what static pricing would have generated.
   */
  revenueLift: number;

  // ── Setters ────────────────────────────────────────────────────────────────

  setMode:    (mode: ActiveMode) => void;
  setCraft:   (craft: CraftType) => void;
  setTableId: (id: string | null) => void;

  setOccupancy:         (pct: number)   => void;
  toggleDynamicPricing: ()             => void;
  loginMember:          ()             => void;
  logoutMember:         ()             => void;
  addRevenueLift:       (delta: number) => void;

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

      venueOccupancy:         45,
      isDynamicPricingActive: true,
      isMemberLoggedIn:       false,
      revenueLift:            0,

      setMode:    (mode)  => set({ activeMode: mode }),
      setCraft:   (craft) => set({ currentCraft: craft }),
      setTableId: (id)    => set({ activeTableId: id }),

      setOccupancy:         (pct)   => set({ venueOccupancy: Math.max(0, Math.min(100, pct)) }),
      toggleDynamicPricing: ()      => set((s) => ({ isDynamicPricingActive: !s.isDynamicPricingActive })),
      loginMember:          ()      => set({ isMemberLoggedIn: true }),
      logoutMember:         ()      => set({ isMemberLoggedIn: false }),
      addRevenueLift:       (delta) => set((s) => ({ revenueLift: s.revenueLift + delta })),

      handoff: () =>
        set((s) => ({
          activeMode:    s.activeMode === "patron" ? "staff" : "patron",
          lastHandoffAt: Date.now(),
        })),
    }),
    {
      name: "axiom360-os",
      partialize: (s) => ({
        activeMode:             s.activeMode,
        currentCraft:           s.currentCraft,
        activeTableId:          s.activeTableId,
        lastHandoffAt:          s.lastHandoffAt,
        venueOccupancy:         s.venueOccupancy,
        isDynamicPricingActive: s.isDynamicPricingActive,
        isMemberLoggedIn:       s.isMemberLoggedIn,
        revenueLift:            s.revenueLift,
      }),
    },
  ),
);
