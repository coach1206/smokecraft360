import { RecommendRequest, RecommendResponse } from "./types";
import { getProductsByCategory, getPairingPool } from "./registry";
import { scoreProducts, buildFeatured } from "../services/scoringService";
import { applyBoosts, recordImpression } from "../services/boostService";
import { findPairings } from "./pairing";
import { findFoodPairings } from "./food";
import { foods } from "../data/foods";

export function getRecommendations(request: RecommendRequest): RecommendResponse {
  const pool = getProductsByCategory(request.category);

  // Pass 1 — pure base scoring (flavor, strength, mood, tier)
  const scored = scoreProducts(pool, request);

  // Pass 2 — apply boost levels and sponsored multipliers on top
  const boosted = applyBoosts(scored);

  // Top 3 recommendations by total score
  const recommendations = boosted
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Track impressions for every recommended product
  for (const rec of recommendations) recordImpression(rec.id, false);

  // Cross-category pairings (cigar ↔ alcohol)
  const pairings = findPairings(recommendations, getPairingPool(request.category), 2);

  // Food pairings
  const foodPairings = findFoodPairings(recommendations, foods, request, 3);

  // Featured — sponsored / highly-boosted products not already in top 3
  const topIds   = new Set(recommendations.map((r) => r.id));
  const featured = buildFeatured(pool, topIds, request);

  // Track featured impressions
  for (const f of featured) recordImpression(f.id, true);

  return { recommendations, pairings, foodPairings, featured };
}
