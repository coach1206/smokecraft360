// Sovereign XP persistence — shared across TITAN pages via localStorage

export const XP_KEY = "axiom_xp";

export const LEVELS = [
  { name: "Initiate",    color: "#606060", minXp: 0,    badge: "◈" },
  { name: "Explorer",    color: "#d4af37", minXp: 100,  badge: "◈" },
  { name: "Grand Master",color: "#8b5cf6", minXp: 1000, badge: "◆" },
] as const;

export type Level = typeof LEVELS[number];

export function getXP(): number {
  return parseInt(localStorage.getItem(XP_KEY) ?? "0", 10);
}

export function addXP(amount: number): number {
  const next = getXP() + amount;
  localStorage.setItem(XP_KEY, String(next));
  return next;
}

export function getCurrentLevel(xp: number): Level {
  return [...LEVELS].reverse().find(l => xp >= l.minXp) ?? LEVELS[0];
}

export function xpProgressPct(xp: number): number {
  const idx = LEVELS.findIndex(l => l === getCurrentLevel(xp));
  const next = LEVELS[idx + 1];
  if (!next) return 100;
  const base = LEVELS[idx]!.minXp;
  return Math.min(100, Math.round(((xp - base) / (next.minXp - base)) * 100));
}
