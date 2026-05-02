import { FoodItem, ScoredFood, ScoredProduct, RecommendRequest } from "./types";

/**
 * Scores a food item against the recommended products and user request.
 *
 * Scoring:
 *  +3  — user strength falls within food's ideal strength range
 *  +1  — user strength is within 1 step of the ideal midpoint
 *  +2  — each food flavorTag that matches a cigar/alcohol flavorNote
 *  +2  — each food flavorTag that matches a user flavor preference
 *  +1  — partial match against product pairing tags or name
 */
function scoreFoodItem(
  food: FoodItem,
  topProduct: ScoredProduct,
  request: RecommendRequest,
): number {
  let score = 0;

  // Strength range bonus
  const { strength } = request;
  if (strength >= food.strengthMin && strength <= food.strengthMax) {
    score += 3;
  } else {
    const mid = (food.strengthMin + food.strengthMax) / 2;
    if (Math.abs(strength - mid) <= 1) score += 1;
    else score -= 1;
  }

  const productFlavors = topProduct.flavorNotes.map((f) => f.toLowerCase());
  const userFlavors    = request.flavorPreferences.map((f) => f.toLowerCase());
  const productText    = [topProduct.name, ...topProduct.pairingTags]
    .join(" ")
    .toLowerCase();

  for (const tag of food.flavorTags) {
    const t = tag.toLowerCase();
    if (productFlavors.includes(t)) score += 2;
    if (userFlavors.includes(t))    score += 2;
    if (productText.includes(t))    score += 1;
  }

  return score;
}

/**
 * Returns the top N food pairings for a given recommendation result.
 *
 * @param recommendations  Ranked cigar/alcohol recommendations.
 * @param foodPool         All available food items.
 * @param request          Original user request (for strength + flavor prefs).
 * @param topN             Number of pairings to return (default 3).
 */
export function findFoodPairings(
  recommendations: ScoredProduct[],
  foodPool: FoodItem[],
  request: RecommendRequest,
  topN = 3,
): ScoredFood[] {
  if (recommendations.length === 0 || foodPool.length === 0) return [];

  // Score against the top recommendation as anchor
  const anchor = recommendations[0];

  const scored: ScoredFood[] = foodPool.map((food) => ({
    ...food,
    score: scoreFoodItem(food, anchor, request),
  }));

  return scored
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
