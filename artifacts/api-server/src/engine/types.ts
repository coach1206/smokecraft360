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

export interface RecommendRequest {
  category:          Category;
  flavorPreferences: string[];
  strength:          number;
  mood:              string;
  /** Optional venue filter — enables inventory-aware recommendations. */
  venueId?:          string;
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
}

/** Shape returned by GET /api/inventory */
export interface InventoryProduct extends Product {
  boostLevel:          number;
  sponsored:           boolean;
  impressions:         number;
  featuredImpressions: number;
}
