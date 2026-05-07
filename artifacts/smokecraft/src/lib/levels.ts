/**
 * SmokeCraft 360 — Level & XP System (shared client constants)
 *
 * Levels advance when BOTH verified-orders AND xp thresholds are met.
 * The "Maestro del Fuego" tier also unlocks the Band Creator and
 * Signature Cigar tools.
 */

export interface LevelTier {
  index:         number;
  title:         string;
  subtitle:      string;
  minOrders:     number;
  minXp:         number;
  color:         string;
  borderColor:   string;
  isElite:       boolean;
  unlocksBlend:  boolean;
}

export const LEVEL_TIERS: LevelTier[] = [
  {
    index: 0, title: "Explorer", subtitle: "Beginning the journey",
    minOrders: 0,  minXp: 0,
    color: "rgba(160,140,110,0.7)", borderColor: "rgba(160,140,110,0.25)",
    isElite: false, unlocksBlend: false,
  },
  {
    index: 1, title: "Enthusiast", subtitle: "Developing the palate",
    minOrders: 5,  minXp: 50,
    color: "rgba(107,94,78,0.78)", borderColor: "rgba(107,94,78,0.30)",
    isElite: false, unlocksBlend: false,
  },
  {
    index: 2, title: "Aficionado", subtitle: "A refined taste",
    minOrders: 15, minXp: 150,
    color: "rgba(200,165,80,0.85)", borderColor: "rgba(200,165,80,0.35)",
    isElite: false, unlocksBlend: false,
  },
  {
    index: 3, title: "Connoisseur", subtitle: "Master of the craft",
    minOrders: 30, minXp: 350,
    color: "rgba(212,139,0,0.9)", borderColor: "rgba(212,139,0,0.4)",
    isElite: true, unlocksBlend: false,
  },
  {
    index: 4, title: "Maestro del Fuego", subtitle: "Top tier — elite creator",
    minOrders: 60, minXp: 700,
    color: "rgba(212,139,0,1)",   borderColor: "rgba(212,139,0,0.6)",
    isElite: true, unlocksBlend: true,
  },
];

/** XP awarded per verified order component */
export const XP_REWARDS = {
  cigar:      10,
  drink:       8,
  food:        4,
  comboBonus: 20,   // cigar + drink + food together
  newProduct:  5,   // first time trying this product
} as const;

/**
 * Compute the current level tier from verified orders and XP.
 * Returns the highest tier whose BOTH thresholds are met.
 */
export function computeLevel(verifiedOrders: number, xp: number): LevelTier {
  let tier = LEVEL_TIERS[0]!;
  for (const t of LEVEL_TIERS) {
    if (verifiedOrders >= t.minOrders && xp >= t.minXp) tier = t;
  }
  return tier;
}

/**
 * Progress percentage (0–100) toward the next tier.
 * Returns 100 if already at max tier.
 */
export function levelProgress(verifiedOrders: number, xp: number): number {
  const current = computeLevel(verifiedOrders, xp);
  const nextIdx = current.index + 1;
  if (nextIdx >= LEVEL_TIERS.length) return 100;
  const next = LEVEL_TIERS[nextIdx]!;
  const orderPct = next.minOrders > 0
    ? Math.min(verifiedOrders / next.minOrders, 1)
    : 1;
  const xpPct = next.minXp > 0
    ? Math.min(xp / next.minXp, 1)
    : 1;
  return Math.round(Math.min(orderPct, xpPct) * 100);
}

/**
 * Returns the next tier, or null if at max.
 */
export function nextTier(verifiedOrders: number, xp: number): LevelTier | null {
  const current = computeLevel(verifiedOrders, xp);
  return LEVEL_TIERS[current.index + 1] ?? null;
}
