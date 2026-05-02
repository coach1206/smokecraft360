/**
 * Scoring Service — high-level ranking and featured-section pipeline.
 *
 * Combines the base flavor/strength/mood scoring from the engine with
 * boost data from the boost service.  Import this in routes and engines
 * rather than calling scorer.ts and boostService.ts directly.
 *
 * Key exports:
 *  - rankAndScore     — score a pool and return top N
 *  - buildFeatured    — build the sponsored/boosted featured section
 *  - scoreBreakdown   — per-product scoring debug breakdown
 */

import type { Product, RecommendRequest, ScoredProduct } from "../engine/types";
import { scoreProduct, scoreProductBase, rankProducts } from "../engine/scorer";
import { getProductBoost } from "./boostService";

export type { ScoredProduct };

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  productId:  string;
  base:       number;
  boost:      number;
  total:      number;
  sponsored:  boolean;
  boostLevel: number;
}

// ── Ranking ───────────────────────────────────────────────────────────────────

/**
 * Rank a pool of products and return the top N.
 * Boost is applied automatically from the boost service.
 */
export function rankAndScore(
  pool:    Product[],
  request: RecommendRequest,
  topN:    number,
): ScoredProduct[] {
  return rankProducts(pool, request, topN);
}

// ── Featured section ──────────────────────────────────────────────────────────

/**
 * Build the "featured" section — sponsored or highly-boosted products that
 * have relevance to the request but didn't reach the top recommendations.
 *
 * Sort order: sponsored first, then by boost level, then by base score.
 */
export function buildFeatured(
  pool:         Product[],
  topIds:       Set<string>,
  request:      RecommendRequest,
  maxItems = 2,
): ScoredProduct[] {
  return pool
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
    .slice(0, maxItems);
}

// ── Debug / explainability ────────────────────────────────────────────────────

/**
 * Returns a full score breakdown for a single product.
 * Useful for debugging why a product ranked where it did.
 */
export function scoreBreakdown(
  product: Product,
  request: RecommendRequest,
): ScoreBreakdown {
  const { total, base, boost } = scoreProduct(product, request);
  const state = getProductBoost(product.id);
  return {
    productId:  product.id,
    base,
    boost,
    total,
    sponsored:  state.sponsored,
    boostLevel: state.boostLevel,
  };
}
