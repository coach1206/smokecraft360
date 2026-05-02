import { RecommendRequest, RecommendResponse } from "./types";
import { getProductsByCategory, getPairingPool } from "./registry";
import { rankProducts } from "./scorer";
import { findPairings } from "./pairing";
import { findFoodPairings } from "./food";
import { foods } from "../data/foods";

/**
 * Top-level recommendation entry point.
 *
 * Pipeline:
 *  1. Fetch product pool for the requested category
 *  2. Rank products by user preferences
 *  3. Find cross-category (cigar ↔ alcohol) pairings
 *  4. Find food pairings based on top recommendation + user profile
 */
export function getRecommendations(request: RecommendRequest): RecommendResponse {
  const pool = getProductsByCategory(request.category);
  const recommendations = rankProducts(pool, request, 3);

  const pairingPool = getPairingPool(request.category);
  const pairings = findPairings(recommendations, pairingPool, 2);

  const foodPairings = findFoodPairings(recommendations, foods, request, 3);

  return { recommendations, pairings, foodPairings };
}
