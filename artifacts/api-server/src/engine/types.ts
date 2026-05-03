/**
 * Core shared types for the recommendation engine.
 */

export type Category = "cigar" | "alcohol" | string;
export type Tier = "premium" | "mid" | "standard";

export type AvailabilityLabel =
  | "Available Now"
  | "Closest Available Match"
  | "Not Available";

export interface Product {
  id: string;
  name: string;
  category: Category;
  flavorNotes: string[];
  strength: number;
  moodTags: string[];
  pairingTags: string[];
  tier: Tier;
  /** Optional initial boost level (0–3). Runtime managed via inventory store. */
  boostLevel?: number;
  /** Whether this product has sponsored placement. Runtime managed via inventory store. */
  sponsored?: boolean;
  /** Future: brand partner identifier */
  brandId?: string;
  /** Future: active campaign identifier */
  campaignId?: string;
  /** Cloudinary image URL */
  imageUrl?: string;
}

/** Pre-computed taste profile bias — see services/tasteProfile.ts.
 *  Optional; when present the scorer awards a small bounded affinity
 *  bonus per product. Anonymous kiosk requests omit this. */
export interface TasteProfileBias {
  strength:    Record<string, number>;
  flavor:      Record<string, number>;
  mood:        Record<string, number>;
  categories:  Record<string, number>;
  sampleCount: number;
}

export interface RecommendRequest {
  category:          Category;
  flavorPreferences: string[];
  strength:          number;
  mood:              string;
  /** Optional venue filter — enables inventory-aware recommendations. */
  venueId?:          string;
  /** Cigar vitola preference — when present the scorer adds a bounded
   *  boost to products whose names match the requested shape (e.g.
   *  selecting "toro" boosts every product with /toro/i in its name).
   *  Cigar category only; ignored for alcohol requests.                      */
  cigarShape?:       "robusto" | "corona" | "toro" | "churchill" | "torpedo" | "belicoso";
  /** Session-length preference — soft hint, used as a tiebreaker only.       */
  cigarSession?:     "quick" | "standard" | "extended" | "long";
  /** Optional taste profile aggregated from past userPreferences snapshots.
   *  When provided, scorer adds a bounded affinity bonus to bias results
   *  toward products that match the user's history. Anonymous requests
   *  omit this field entirely; behavior is unchanged when absent. */
  tasteProfile?:     TasteProfileBias;
}

export interface ScoredProduct extends Product {
  score:        number;
  /** Boost points applied (0 if none) */
  boostApplied: number;
  /** Crowd trend boost applied (0, 1, or 2) */
  trendBoost?:  number;
  /** Whether this product is in stock at the requested venue */
  inStock?:     boolean;
  /** Current quantity at the venue (undefined when no venue filter) */
  quantity?:    number;
  /** Human-readable availability label for the UI */
  availabilityLabel?: AvailabilityLabel;
  /** Set when this product is a fallback substitute for an out-of-stock ideal */
  fallbackFor?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  category: "wings" | "steak" | "salad" | "appetizers" | "seafood" | "desserts";
  description: string;
  flavorTags: string[];
  strengthMin: number;
  strengthMax: number;
}

export interface ScoredFood extends FoodItem {
  score: number;
}

/** Natural-language layer added by services/aiCommentary.ts.
 *  Always present (deterministic) — feeds the right-panel voice player. */
export interface RecommendCommentary {
  /** Speakable headline for the top recommendation. */
  description: string;
  /** Optional one-sentence pairing rationale (when a cross-category pairing exists). */
  reasoning?:  string;
  /** Pairing/flavor tags surfaced by this result — used by /api/menu/suggested. */
  pairingTags: string[];
}

export interface RecommendResponse {
  recommendations: ScoredProduct[];
  pairings:        ScoredProduct[];
  foodPairings:    ScoredFood[];
  /** Sponsored / high-boost products with some user relevance, shown separately. */
  featured:        ScoredProduct[];
  /**
   * Out-of-stock products that would have been top recommendations.
   * Returned so the UI can offer "Request This Item" demand capture.
   */
  outOfStock?:     ScoredProduct[];
  /** Deterministic AI-style commentary built from the structured result.
   *  Optional only because legacy endpoints may construct responses without it. */
  commentary?:     RecommendCommentary;
}

/** Shape returned by GET /api/inventory */
export interface InventoryProduct extends Product {
  boostLevel:          number;
  sponsored:           boolean;
  impressions:         number;
  featuredImpressions: number;
}
