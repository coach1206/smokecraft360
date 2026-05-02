import { RecommendRequest, RecommendResponse } from "./types";
import { getProductsByCategory, getPairingPool } from "./registry";
import { rankProducts } from "./scorer";
import { findPairings } from "./pairing";

/**
 * Top-level recommendation entry point.
 *
 * Orchestrates the full pipeline:
 *  1. Fetch the product pool for the requested category
 *  2. Rank products by the user's preferences
 *  3. Find cross-category pairings based on the top recommendations
 *
 * This function is the single public surface of the engine — routes
 * (and future UI adapters) call only this.
 *
 * @param request  Validated user input from the API layer.
 * @returns        Top 3 recommendations + up to 2 pairings.
 */
export function getRecommendations(request: RecommendRequest): RecommendResponse {
  // 1. Fetch products for the requested category
  const pool = getProductsByCategory(request.category);

  // 2. Rank and return top 3 matches
  const recommendations = rankProducts(pool, request, 3);

  // 3. Fetch the complementary pool and find pairings
  const pairingPool = getPairingPool(request.category);
  const pairings = findPairings(recommendations, pairingPool, 2);

  return { recommendations, pairings };
}
