/**
 * Recommendation Engine — inventory-aware, crowd-learning pipeline.
 *
 * Pipeline passes:
 *   1. Base scoring    — flavor, strength, mood, tier  (scoringService)
 *   2. Boost scoring   — boostLevel, sponsored, campaign, trend  (boostService)
 *   3. Inventory gate  — if venueId provided, filter to in-stock products
 *   4. Fallback match  — out-of-stock ideal → closest in-stock substitute
 *   5. Featured build  — sponsored / highly-boosted products (scoringService)
 */

import { RecommendRequest, RecommendResponse, ScoredProduct } from "./types";
import { getProductsByCategory, getPairingPool }              from "./registry";
import { scoreProducts, buildFeatured }                       from "../services/scoringService";
import { applyBoosts, recordImpression }                      from "../services/boostService";
import { getInStockSet, getStockInfo }                        from "../services/venueInventoryStore";
import { findPairings }                                       from "./pairing";
import { findFoodPairings }                                   from "./food";
import { foods }                                              from "../data/foods";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Flavor overlap score between two products (0–1). */
function flavorOverlap(a: ScoredProduct, b: ScoredProduct): number {
  if (a.flavorNotes.length === 0 || b.flavorNotes.length === 0) return 0;
  const setB  = new Set(b.flavorNotes.map((f) => f.toLowerCase()));
  const hits  = a.flavorNotes.filter((f) => setB.has(f.toLowerCase())).length;
  return hits / Math.max(a.flavorNotes.length, b.flavorNotes.length);
}

/**
 * Find the best in-stock substitute for an out-of-stock ideal.
 * Uses flavor overlap + strength proximity + score as tiebreak.
 */
function findClosestMatch(
  ideal:      ScoredProduct,
  candidates: ScoredProduct[],
  exclude:    Set<string>,
): ScoredProduct | null {
  let best: ScoredProduct | null = null;
  let bestSim = -Infinity;

  for (const c of candidates) {
    if (exclude.has(c.id)) continue;
    const overlap   = flavorOverlap(ideal, c);
    const strengthD = Math.abs((ideal.strength ?? 3) - (c.strength ?? 3)) / 5;
    const sim       = overlap * 2 - strengthD + (c.score / 20);
    if (sim > bestSim) { bestSim = sim; best = c; }
  }

  return best;
}

// ── Core engine ────────────────────────────────────────────────────────────────

export function getRecommendations(request: RecommendRequest): RecommendResponse {
  const pool   = getProductsByCategory(request.category);
  const { venueId } = request;

  // Pass 1 — pure base scoring (flavor, strength, mood, tier)
  const scored = scoreProducts(pool, request);

  // Pass 2 — apply boost levels, sponsored, campaign, and trend scores
  const boosted = applyBoosts(scored);

  // Sort by final score descending (working copy)
  const sorted = [...boosted].sort((a, b) => b.score - a.score);

  // ── Pass 3 & 4: Inventory gate + fallback matching ─────────────────────────

  let recommendations: ScoredProduct[];
  let outOfStockResults: ScoredProduct[] = [];

  if (!venueId) {
    // No venue context — treat all as available
    recommendations = sorted
      .slice(0, 3)
      .map((p) => ({ ...p, inStock: true, availabilityLabel: "Available Now" as const }));
  } else {
    const inStockSet = getInStockSet(venueId);

    if (!inStockSet) {
      // Venue has no configured inventory — treat all as available
      recommendations = sorted
        .slice(0, 3)
        .map((p) => ({ ...p, inStock: true, availabilityLabel: "Available Now" as const }));
    } else {
      // Partition by stock status
      const inStockSorted  = sorted.filter((p) => inStockSet.has(p.id));
      const outStockSorted = sorted.filter((p) => !inStockSet.has(p.id));

      // Enrich in-stock with quantity data
      const enriched = (arr: ScoredProduct[], inStock: boolean): ScoredProduct[] =>
        arr.map((p) => {
          const info = getStockInfo(venueId, p.id);
          return {
            ...p,
            inStock,
            quantity:          info?.quantity,
            availabilityLabel: inStock ? "Available Now" as const : "Not Available" as const,
          };
        });

      const inStockEnriched  = enriched(inStockSorted,  true);
      const outStockEnriched = enriched(outStockSorted, false);

      // Primary recs: top in-stock products
      const selectedIds = new Set<string>();
      recommendations   = inStockEnriched.slice(0, 3).map((p) => {
        selectedIds.add(p.id);
        return p;
      });

      // Fallback: for each top-scoring out-of-stock product find the nearest in-stock
      // substitute not already selected. Exposed as "Closest Available Match".
      const fallbackCandidates = inStockEnriched.filter((p) => !selectedIds.has(p.id));
      const fallbackRecs: ScoredProduct[] = [];

      for (const oos of outStockSorted.slice(0, 3)) {
        if (fallbackCandidates.length === 0) break;
        const match = findClosestMatch(oos, fallbackCandidates, new Set([...selectedIds, ...fallbackRecs.map((f) => f.id)]));
        if (match) {
          fallbackRecs.push({
            ...match,
            availabilityLabel: "Closest Available Match",
            fallbackFor:       oos.id,
          });
        }
      }

      // Top 3 out-of-stock ideals returned for demand-capture UI
      outOfStockResults = outStockEnriched.slice(0, 3);

      // Pad recommendations with fallbacks if we got fewer than 3 in-stock
      if (recommendations.length < 3 && fallbackRecs.length > 0) {
        const needed = 3 - recommendations.length;
        recommendations = [...recommendations, ...fallbackRecs.slice(0, needed)];
      }
    }
  }

  // Track impressions for every recommended product
  for (const rec of recommendations) recordImpression(rec.id, false);

  // Cross-category pairings (cigar ↔ alcohol)
  const pairings = findPairings(recommendations, getPairingPool(request.category), 2);

  // Food pairings
  const foodPairings = findFoodPairings(recommendations, foods, request, 3);

  // Featured — sponsored / highly-boosted products not already in top recs
  const topIds   = new Set(recommendations.map((r) => r.id));
  const featured = buildFeatured(pool, topIds, request);

  // Track featured impressions
  for (const f of featured) recordImpression(f.id, true);

  return {
    recommendations,
    pairings,
    foodPairings,
    featured,
    ...(outOfStockResults.length > 0 ? { outOfStock: outOfStockResults } : {}),
  };
}
