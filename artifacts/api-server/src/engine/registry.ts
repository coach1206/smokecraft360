import { Product, Category } from "./types";
import { cigars } from "../data/cigars";
import { alcohol } from "../data/alcohol";

/**
 * Central product registry.
 *
 * To add a new category (e.g. "coffee", "scents"):
 *  1. Create a new dataset file under /data (e.g. coffee.ts)
 *  2. Import it here and add it to the `datasets` map
 *  3. Add a pairing mapping entry in `pairingCategories` if applicable
 *
 * No changes needed in routes, scorer, or pairing logic.
 */

/** All products indexed by category name. */
const datasets: Record<string, Product[]> = {
  cigar: cigars,
  alcohol: alcohol,
};

/**
 * Defines which category provides pairings for a given primary category.
 * Key: primary category being recommended.
 * Value: category to source pairings from.
 */
const pairingCategories: Record<string, string> = {
  cigar: "alcohol",
  alcohol: "cigar",
};

/**
 * Returns all products for a given category, or an empty array if unknown.
 */
export function getProductsByCategory(category: Category): Product[] {
  return datasets[category.toLowerCase()] ?? [];
}

/**
 * Returns the pairing pool for a given category.
 * E.g. for "cigar" returns alcohol products; for "alcohol" returns cigars.
 */
export function getPairingPool(category: Category): Product[] {
  const pairingCategory = pairingCategories[category.toLowerCase()];
  if (!pairingCategory) return [];
  return datasets[pairingCategory] ?? [];
}

/**
 * Returns all registered category names.
 * Useful for validation and documentation endpoints.
 */
export function getRegisteredCategories(): string[] {
  return Object.keys(datasets);
}
