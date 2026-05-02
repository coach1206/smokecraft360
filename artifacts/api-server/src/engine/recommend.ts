import { RecommendRequest, RecommendResponse } from "./types";
import { getProductsByCategory, getPairingPool } from "./registry";
import { rankAndScore, buildFeatured } from "../services/scoringService";
import { findPairings } from "./pairing";
import { findFoodPairings } from "./food";
import { recordImpression } from "../services/boostService";
import { foods } from "../data/foods";

export function getRecommendations(request: RecommendRequest): RecommendResponse {
  const pool = getProductsByCategory(request.category);

  // 1. Score + rank with boost applied
  const recommendations = rankAndScore(pool, request, 3);

  // 2. Analytics — track impressions for every recommended product
  for (const rec of recommendations) recordImpression(rec.id, false);

  // 3. Cross-category pairings (cigar ↔ alcohol)
  const pairings = findPairings(recommendations, getPairingPool(request.category), 2);

  // 4. Food pairings
  const foodPairings = findFoodPairings(recommendations, foods, request, 3);

  // 5. Featured — sponsored / highly-boosted products not already in top 3
  const topIds   = new Set(recommendations.map((r) => r.id));
  const featured = buildFeatured(pool, topIds, request);

  // 6. Track featured impressions
  for (const f of featured) recordImpression(f.id, true);

  return { recommendations, pairings, foodPairings, featured };
}
