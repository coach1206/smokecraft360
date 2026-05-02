import { Product, RecommendRequest, ScoredProduct } from "./types";

/**
 * Weights used in scoring. Adjust these values to tune recommendation quality
 * without touching the scoring logic itself.
 */
const WEIGHTS = {
  /** Points awarded per overlapping flavor note */
  flavorMatch: 2,
  /** Points subtracted per unit of strength distance (lower = closer match) */
  strengthPenalty: 1,
  /** Points awarded for a mood tag match */
  moodMatch: 3,
} as const;

/**
 * Computes a relevance score for a single product against a user request.
 *
 * Score breakdown:
 *  +2 per overlapping flavor note
 *  +3 if any mood tag matches the requested mood
 *  -1 per point of strength distance from the requested strength
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

  // --- Strength proximity (inverse penalty) ---
  const strengthDistance = Math.abs(product.strength - request.strength);
  score -= strengthDistance * WEIGHTS.strengthPenalty;

  // --- Mood match ---
  const requestedMood = request.mood.toLowerCase();
  if (product.moodTags.some((tag) => tag.toLowerCase() === requestedMood)) {
    score += WEIGHTS.moodMatch;
  }

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
