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
}

export interface RecommendRequest {
  category: Category;
  flavorPreferences: string[];
  strength: number;
  mood: string;
}

export interface ScoredProduct extends Product {
  score: number;
}

/** A food item in the catalog. */
export interface FoodItem {
  id: string;
  name: string;
  category: "wings" | "steak" | "salad" | "appetizers" | "seafood" | "desserts";
  description: string;
  flavorTags: string[];
  strengthMin: number;
  strengthMax: number;
}

/** A food item with a computed pairing score. */
export interface ScoredFood extends FoodItem {
  score: number;
}

export interface RecommendResponse {
  recommendations: ScoredProduct[];
  pairings: ScoredProduct[];
  foodPairings: ScoredFood[];
}
