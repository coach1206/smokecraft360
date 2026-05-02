/**
 * Core shared types for the recommendation engine.
 * These are intentionally generic so the engine can plug into
 * any product category: cigars, alcohol, coffee, scents, etc.
 */

/** Supported product categories. Add new ones here as the catalog grows. */
export type Category = "cigar" | "alcohol" | string;

/** Product quality tier — contributes a bonus to the recommendation score. */
export type Tier = "premium" | "mid" | "standard";

/** A single product in any category. */
export interface Product {
  id: string;
  name: string;
  category: Category;
  /** Descriptive flavor/aroma notes (e.g. ["smoky", "sweet", "spicy"]) */
  flavorNotes: string[];
  /** Intensity on a 1–5 scale (1 = mild, 5 = very strong) */
  strength: number;
  /** Contextual mood or occasion tags (e.g. ["relaxed", "bold"]) */
  moodTags: string[];
  /** Cross-category pairing descriptors (e.g. ["bourbon", "full-body cigar"]) */
  pairingTags: string[];
  /** Quality tier — affects scoring bonus */
  tier: Tier;
}

/** Input payload for the POST /recommend endpoint. */
export interface RecommendRequest {
  category: Category;
  flavorPreferences: string[];
  /** Desired strength on 1–5 scale */
  strength: number;
  /** Single mood descriptor (e.g. "relaxed") */
  mood: string;
}

/** A product augmented with its computed recommendation score. */
export interface ScoredProduct extends Product {
  score: number;
}

/** Shape of the JSON response from POST /recommend. */
export interface RecommendResponse {
  recommendations: ScoredProduct[];
  pairings: ScoredProduct[];
}
