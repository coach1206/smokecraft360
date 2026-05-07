/**
 * prestigeStore — Pure utility functions and visual config for the prestige system.
 *
 * The Zustand store has been consolidated into useAxiomStore (axiomStore.ts).
 * This file retains only the pure helper functions and display constants that
 * are imported by UI components.
 *
 * XP thresholds:
 *   0    → Novice
 *   500  → Connoisseur
 *   2000 → Master
 *   5000 → Legend
 */

export type PrestigeRank = "Novice" | "Connoisseur" | "Master" | "Legend";

/** Progress within the current XP tier, 0–1 */
export function xpProgress(xp: number): number {
  if (xp >= 5000) return 1;
  if (xp >= 2000) return (xp - 2000) / 3000;
  if (xp >= 500)  return (xp - 500)  / 1500;
  return xp / 500;
}

/** XP remaining until the next rank, or null if at Legend */
export function xpToNextRank(xp: number): number | null {
  if (xp >= 5000) return null;
  if (xp >= 2000) return 5000 - xp;
  if (xp >= 500)  return 2000 - xp;
  return 500 - xp;
}

/** Per-rank colour token and glyph for display */
export const RANK_CONFIG: Record<PrestigeRank, { color: string; glyph: string }> = {
  Novice:      { color: "rgba(26,26,27,0.38)", glyph: "◦" },
  Connoisseur: { color: "#D48B00",                glyph: "◆" },
  Master:      { color: "#9B7FD4",                glyph: "❖" },
  Legend:      { color: "#FFD166",                glyph: "✦" },
};
