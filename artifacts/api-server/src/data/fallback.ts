/**
 * Fallback Data
 *
 * Static product catalogue used when the database is unavailable at startup
 * or when DB seeding has not yet occurred.
 *
 * The recommendation engine can function entirely from these arrays —
 * flavour notes, strength, mood tags, and pairing logic all work offline.
 * Boost/sponsored state defaults to zero (no promotions) in fallback mode.
 */

import { cigars  } from "./cigars";
import { alcohol } from "./alcohol";
import type { Product } from "../engine/types";

/** All fallback cigar products. */
export const fallbackCigars: Product[] = cigars;

/** All fallback alcohol/spirits products. */
export const fallbackAlcohol: Product[] = alcohol;

/** Combined fallback catalogue — all categories. */
export const ALL_FALLBACK_PRODUCTS: Product[] = [...cigars, ...alcohol];

/**
 * Returns the fallback product pool for a given category.
 * Returns an empty array for unknown categories (does not throw).
 */
export function getFallbackProducts(category: string): Product[] {
  switch (category.toLowerCase()) {
    case "cigar":   return fallbackCigars;
    case "alcohol": return fallbackAlcohol;
    default:        return [];
  }
}

/** True when no DATABASE_URL is configured — recommendation engine uses fallback only. */
export function isFallbackMode(): boolean {
  return !process.env["DATABASE_URL"];
}
