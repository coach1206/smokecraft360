import { Product, RecommendRequest, ScoredProduct, Tier } from "./types";

/**
 * Weights used in scoring. Adjust these values to tune recommendation quality
 * without touching the scoring logic itself.
 */
const WEIGHTS = {
  /** Points awarded per overlapping flavor note */
  flavorMatch: 3,
  /** Points awarded for an exact mood tag match */
  moodMatch: 4,
  /** Strength proximity rewards — no penalties, only bonuses */
  strengthExact: 3,   // |distance| = 0
  strengthClose: 2,   // |distance| = 1
  strengthNear: 1,    // |distance| = 2
  // |distance| >= 3 → 0 points
} as const;

/** Bonus points per quality tier */
const TIER_BONUS: Record<Tier, number> = {
  premium: 2,
  mid: 1,
  standard: 0,
};

/**
 * Computes a relevance score for a single product against a user request.
 *
 * Scoring is purely additive — no penalties.
 *
 * Score breakdown:
 *  +3 per overlapping flavor note
 *  +4 if any mood tag matches the requested mood
 *  +3 / +2 / +1 for strength proximity (exact / ±1 / ±2), 0 beyond
 *  +2 / +1 / +0 tier bonus (premium / mid / standard)
 *
 * @param product  The product to evaluate.
 * @param request  The user's preference payload.
 * @returns        A numeric score (higher = better match).
 */
export function scoreProduct(
  product: Product,
  request: RecommendRequest,
): number {
  let score = 0;

  // --- Flavor overlap ---
  const preferenceSet = new Set(
    request.flavorPreferences.map((f) => f.toLowerCase()),
  );
  for (const note of product.flavorNotes) {
    if (preferenceSet.has(note.toLowerCase())) {
      score += WEIGHTS.flavorMatch;
    }
  }

  // --- Strength proximity (graduated reward, no penalty) ---
  const strengthDistance = Math.abs(product.strength - request.strength);
  if (strengthDistance === 0) {
    score += WEIGHTS.strengthExact;
  } else if (strengthDistance === 1) {
    score += WEIGHTS.strengthClose;
  } else if (strengthDistance === 2) {
    score += WEIGHTS.strengthNear;
  }
  // distance >= 3 → no points added

  // --- Mood match ---
  const requestedMood = request.mood.toLowerCase();
  if (product.moodTags.some((tag) => tag.toLowerCase() === requestedMood)) {
    score += WEIGHTS.moodMatch;
  }

  // --- Tier bonus ---
  score += TIER_BONUS[product.tier] ?? 0;

  return score;
}

/**
 * Scores all products in a pool and returns the top N, sorted descending.
 *
 * @param pool     Array of products to rank.
 * @param request  The user's preference payload.
 * @param topN     Maximum number of results to return.
 * @returns        Ranked array of ScoredProduct (highest score first).
 */
export function rankProducts(
  pool: Product[],
  request: RecommendRequest,
  topN: number,
): ScoredProduct[] {
  return pool
    .map((product) => ({ ...product, score: scoreProduct(product, request) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
