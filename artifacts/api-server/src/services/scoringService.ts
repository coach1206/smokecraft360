/**
 * Scoring Service — high-level ranking and featured-section pipeline.
 *
 * Exports two complementary functions matching the reference architecture:
 *
 *  scoreProducts(products, input)   — pure base scoring, no boost applied
 *  buildFeatured(pool, topIds, req) — sponsored/boosted featured section
 *  rankAndScore(pool, req, topN)    — convenience: score + boost + sort in one call
 *  scoreBreakdown(product, req)     — per-product debug breakdown
 *
 * The recommendation engine calls scoreProducts first, then hands the result
 * to boostService.applyBoosts for a clean two-pass pipeline.
 */

import type { Product, RecommendRequest, ScoredProduct } from "../engine/types";
import { scoreProduct, scoreProductBase, rankProducts } from "../engine/scorer";
import { getProductBoost } from "./boostService";
import { isActiveCampaign } from "./campaignStore";

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

// ── Pure scoring (no boost) ───────────────────────────────────────────────────

/**
 * Score a pool of products against a request using only base signals
 * (flavor notes, strength, mood, tier) — no boost applied.
 *
 * The engine calls this first, then passes the result to boostService.applyBoosts
 * for a clean two-pass pipeline:
 *
 *   const scored   = scoreProducts(pool, request);
 *   const boosted  = applyBoosts(scored);
 *   const top3     = boosted.sort(...).slice(0, 3);
 */
export function scoreProducts(
  products: Product[],
  request:  RecommendRequest,
): ScoredProduct[] {
  return products.map((p): ScoredProduct => ({
    ...p,
    score:        scoreProductBase(p, request),
    boostApplied: 0,
    boostLevel:   0,
    sponsored:    false,
  }));
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
      return (boost.sponsored || boost.boostLevel >= 2 || isActiveCampaign(boost.campaignId)) && !topIds.has(p.id);
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

// ── Convenience: score + boost + sort in one call ─────────────────────────────

/**
 * Rank a pool and return the top N — score, boost, sort combined.
 * Useful outside of the main recommendation flow (e.g. testing, batch jobs).
 */
export function rankAndScore(
  pool:    Product[],
  request: RecommendRequest,
  topN:    number,
): ScoredProduct[] {
  return rankProducts(pool, request, topN);
}

// ── Debug / explainability ────────────────────────────────────────────────────

/**
 * Returns a full score breakdown for a single product.
 * Useful for explaining why a product ranked where it did.
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
