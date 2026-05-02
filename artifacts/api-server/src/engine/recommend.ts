import { RecommendRequest, RecommendResponse, ScoredProduct } from "./types";
import { getProductsByCategory, getPairingPool } from "./registry";
import { rankProducts, scoreProductBase } from "./scorer";
import { findPairings } from "./pairing";
import { findFoodPairings } from "./food";
import { getProductBoost, trackImpression } from "./inventory";
import { foods } from "../data/foods";

export function getRecommendations(request: RecommendRequest): RecommendResponse {
  const pool = getProductsByCategory(request.category);

  // 1. Rank with boost applied
  const recommendations = rankProducts(pool, request, 3);

  // 2. Track impressions for recommended products
  for (const rec of recommendations) {
    trackImpression(rec.id, false);
  }

  // 3. Cross-category pairings
  const pairingPool = getPairingPool(request.category);
  const pairings    = findPairings(recommendations, pairingPool, 2);

  // 4. Food pairings
  const foodPairings = findFoodPairings(recommendations, foods, request, 3);

  // 5. Featured: sponsored/boosted products not already in top 3, with some relevance
  const topIds = new Set(recommendations.map((r) => r.id));

  const featured: ScoredProduct[] = pool
    .filter((p) => {
      const boost = getProductBoost(p.id);
      return (boost.sponsored || boost.boostLevel >= 2) && !topIds.has(p.id);
    })
    .map((p): ScoredProduct => {
      const boost = getProductBoost(p.id);
      const base  = scoreProductBase(p, request);
      return {
        ...p,
        score:        base,
        boostApplied: 0,
        boostLevel:   boost.boostLevel,
        sponsored:    boost.sponsored,
        brandId:      boost.brandId,
        campaignId:   boost.campaignId,
      };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => {
      const aS = a.sponsored ? 1 : 0;
      const bS = b.sponsored ? 1 : 0;
      return bS - aS || (b.boostLevel ?? 0) - (a.boostLevel ?? 0) || b.score - a.score;
    })
    .slice(0, 2);

  // 6. Track featured impressions
  for (const f of featured) {
    trackImpression(f.id, true);
  }

  return { recommendations, pairings, foodPairings, featured };
}
