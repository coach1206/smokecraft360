/**
 * Core shared types for the recommendation engine.
 */

export type Category = "cigar" | "alcohol" | string;
export type Tier = "premium" | "mid" | "standard";

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
}

export interface RecommendRequest {
  category: Category;
  flavorPreferences: string[];
  strength: number;
  mood: string;
}

export interface ScoredProduct extends Product {
  score: number;
  /** Boost points applied (0 if none) */
  boostApplied: number;
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
  pairings: ScoredProduct[];
  foodPairings: ScoredFood[];
  /** Sponsored / high-boost products with some user relevance, shown separately. */
  featured: ScoredProduct[];
}

/** Shape returned by GET /api/inventory */
export interface InventoryProduct extends Product {
  boostLevel: number;
  sponsored: boolean;
  impressions: number;
  featuredImpressions: number;
}
