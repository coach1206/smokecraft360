import { Product, RecommendRequest, ScoredProduct, Tier } from "./types";
import { getProductBoost } from "../services/boostService";

const WEIGHTS = {
  flavorMatch:    3,
  moodMatch:      4,
  strengthExact:  3,
  strengthClose:  2,
  strengthNear:   1,
  /** Vitola match — boost when product name contains the requested shape.
   *  Bounded so it can't swamp flavor/strength signal: a vitola match adds
   *  ~half the weight of a perfect flavor hit. Designed to break ties
   *  between otherwise-equivalent products in favor of the guest's chosen
   *  physical preference.                                                    */
  vitolaMatch:    2,
  /** Session-length match — guests choosing a longer session usually want
   *  fuller, more complex cigars; quick sessions favor lighter strengths so
   *  the smoke doesn't outlast the time. Small bounded tiebreaker.           */
  sessionMatch:   1,
} as const;

/** Preferred strength band per session length (cigar only).
 *  quick (~30m) → mild, long (~90m+) → fuller. Used for a +1 nudge. */
const SESSION_STRENGTH_BAND: Record<NonNullable<RecommendRequest["cigarSession"]>, [number, number]> = {
  quick:    [1, 2],
  standard: [2, 3],
  extended: [3, 4],
  long:     [4, 5],
};

const TIER_BONUS: Record<Tier, number> = {
  premium:  2,
  mid:      1,
  standard: 0,
};

/**
 * Maximum boost contribution that sponsored/boosted products can add.
 * Keeps irrelevant products from overriding genuinely relevant ones.
 */
const MAX_BOOST_POINTS = 5;

/**
 * Base relevance score — flavor, strength, mood, tier.
 * No boost applied. Used by the scoring service's featured section builder.
 */
export function scoreProductBase(product: Product, request: RecommendRequest): number {
  let score = 0;

  const preferenceSet = new Set(request.flavorPreferences.map((f) => f.toLowerCase()));
  for (const note of product.flavorNotes) {
    if (preferenceSet.has(note.toLowerCase())) score += WEIGHTS.flavorMatch;
  }

  const dist = Math.abs(product.strength - request.strength);
  if      (dist === 0) score += WEIGHTS.strengthExact;
  else if (dist === 1) score += WEIGHTS.strengthClose;
  else if (dist === 2) score += WEIGHTS.strengthNear;

  if (product.moodTags.some((t) => t.toLowerCase() === request.mood.toLowerCase())) {
    score += WEIGHTS.moodMatch;
  }

  /* Vitola (cigar shape) match. Cigar category only. Uses a word-boundary
   * regex on the product name so "Robusto Reserve" matches /robusto/ but
   * "Coronado" does NOT match /corona/ — important because vitola names
   * are short and prone to substring collisions. */
  if (request.cigarShape && product.category === "cigar") {
    const re = new RegExp(`\\b${request.cigarShape}\\b`, "i");
    if (re.test(product.name)) score += WEIGHTS.vitolaMatch;
  }

  if (request.cigarSession && product.category === "cigar") {
    const [lo, hi] = SESSION_STRENGTH_BAND[request.cigarSession];
    if (product.strength >= lo && product.strength <= hi) score += WEIGHTS.sessionMatch;
  }

  score += TIER_BONUS[product.tier] ?? 0;

  return score;
}

/**
 * Full score = base relevance + capped boost contribution.
 *
 * Boost is only applied when the product has at least some base relevance
 * (score > 0), preserving recommendation integrity.
 */
export function scoreProduct(
  product: Product,
  request: RecommendRequest,
): { total: number; base: number; boost: number } {
  const base  = scoreProductBase(product, request);
  const state = getProductBoost(product.id);

  const rawBoost = state.boostLevel + (state.sponsored ? 2 : 0);
  const boost    = base > 0 ? Math.min(rawBoost, MAX_BOOST_POINTS) : 0;

  return { total: base + boost, base, boost };
}

/**
 * Scores all products in a pool and returns the top N, annotated with boost metadata.
 */
export function rankProducts(
  pool:    Product[],
  request: RecommendRequest,
  topN:    number,
): ScoredProduct[] {
  return pool
    .map((product): ScoredProduct => {
      const { total, boost } = scoreProduct(product, request);
      const state = getProductBoost(product.id);
      return {
        ...product,
        score:        total,
        boostApplied: boost,
        boostLevel:   state.boostLevel,
        sponsored:    state.sponsored,
        brandId:      state.brandId,
        campaignId:   state.campaignId,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
