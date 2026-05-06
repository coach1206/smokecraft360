/**
 * prestigeStore — Patron XP, rank progression, and badge collection.
 *
 * XP thresholds:
 *   0    → Novice
 *   500  → Connoisseur
 *   2000 → Master
 *   5000 → Legend
 *
 * Badges are awarded automatically on each rank-up and stored alongside
 * the patron's session. Persisted to localStorage so progress survives
 * kiosk sleeps and page refreshes.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PrestigeRank = "Novice" | "Connoisseur" | "Master" | "Legend";

export interface PrestigeState {
  xp:     number;
  rank:   PrestigeRank;
  badges: string[];

  addXP: (amount: number) => void;
  resetPrestige: () => void;
}

// ── XP → Rank ─────────────────────────────────────────────────────────────────

const XP_THRESHOLDS: [number, PrestigeRank][] = [
  [5000, "Legend"],
  [2000, "Master"],
  [500,  "Connoisseur"],
  [0,    "Novice"],
];

function xpToRank(xp: number): PrestigeRank {
  for (const [threshold, rank] of XP_THRESHOLDS) {
    if (xp >= threshold) return rank;
  }
  return "Novice";
}

// Badge awarded when a patron achieves each rank
const RANK_BADGES: Record<PrestigeRank, string> = {
  Novice:      "",                // no badge on entry rank
  Connoisseur: "First Taste",
  Master:      "Refined Palate",
  Legend:      "Grand Master",
};

// ── XP progress within the current tier (0–1) ─────────────────────────────────

export function xpProgress(xp: number): number {
  if (xp >= 5000) return 1;
  if (xp >= 2000) return (xp - 2000) / 3000;
  if (xp >= 500)  return (xp - 500)  / 1500;
  return xp / 500;
}

export function xpToNextRank(xp: number): number | null {
  if (xp >= 5000) return null;
  if (xp >= 2000) return 5000 - xp;
  if (xp >= 500)  return 2000 - xp;
  return 500 - xp;
}

// ── Rank visual config ────────────────────────────────────────────────────────

export const RANK_CONFIG: Record<PrestigeRank, { color: string; glyph: string }> = {
  Novice:      { color: "rgba(240,232,212,0.38)", glyph: "◦" },
  Connoisseur: { color: "#C9A84C",                glyph: "◆" },
  Master:      { color: "#9B7FD4",                glyph: "❖" },
  Legend:      { color: "#FFD166",                glyph: "✦" },
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const usePrestige = create<PrestigeState>()(
  persist(
    (set) => ({
      xp:     0,
      rank:   "Novice",
      badges: [],

      addXP: (amount) =>
        set((state) => {
          const newXP   = state.xp + amount;
          const newRank = xpToRank(newXP);
          const rankUp  = newRank !== state.rank;
          const badge   = rankUp ? RANK_BADGES[newRank] : "";
          return {
            xp:     newXP,
            rank:   newRank,
            badges: badge ? [...state.badges, badge] : state.badges,
          };
        }),

      resetPrestige: () => set({ xp: 0, rank: "Novice", badges: [] }),
    }),
    {
      name: "axiom360-prestige",
      partialize: (s) => ({ xp: s.xp, rank: s.rank, badges: s.badges }),
    },
  ),
);
