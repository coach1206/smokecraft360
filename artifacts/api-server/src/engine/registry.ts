/**
 * Product registry — the source pool for the recommendation engine.
 *
 * Static datasets (cigars, alcohol) are loaded at module init.
 * Dynamically created products (POST /api/products) are registered via
 * `registerProductInEngine` so they immediately participate in scoring.
 */

import { Product, Category } from "./types";
import { cigars  }           from "../data/cigars";
import { alcohol }           from "../data/alcohol";
import { beer    }           from "../data/beer";

// New theme verticals (wine, cocktail) start empty — vendors populate them
// via POST /api/products and registerProductInEngine. Listing them here
// makes the engine recognize them as valid categories so the recommendation
// API accepts ?category=wine / ?category=cocktail requests from PourCraft.
//
// `beer` ships with a curated lineup (see data/beer.ts) so the BrewCraft
// swipe-card page has working content out of the box.
const datasets: Record<string, Product[]> = {
  cigar:    cigars,
  alcohol:  alcohol,
  beer:     beer,
  wine:     [],
  cocktail: [],
};

/** Products added at runtime via the API — stored separately to keep the
 *  static arrays read-only and support easy reset in tests. */
const dynamic: Record<string, Product[]> = {};

// Cross-category pairing direction. Beer ↔ cigar mirrors alcohol ↔ cigar
// so a BrewCraft beer pick surfaces a cigar pairing and vice-versa.
const pairingCategories: Record<string, string> = {
  cigar:   "alcohol",
  alcohol: "cigar",
  beer:    "cigar",
};

/** Register a product so it is included in future recommendation runs. */
export function registerProductInEngine(product: Product): void {
  const cat = product.category.toLowerCase();
  if (!dynamic[cat]) dynamic[cat] = [];
  // Prevent duplicates (idempotent)
  if (!dynamic[cat].find((p) => p.id === product.id)) {
    dynamic[cat].push(product);
  }
}

export function getProductsByCategory(category: Category): Product[] {
  const cat = category.toLowerCase();
  return [...(datasets[cat] ?? []), ...(dynamic[cat] ?? [])];
}

export function getPairingPool(category: Category): Product[] {
  const pairingCat = pairingCategories[category.toLowerCase()];
  if (!pairingCat) return [];
  return getProductsByCategory(pairingCat);
}

export function getRegisteredCategories(): string[] {
  return Object.keys(datasets);
}

/**
 * Look up a product by id across every category (static + dynamic).
 * Used by the operations layer (staff pitch, layout) so it doesn't need
 * to know which vertical the product belongs to.
 */
export function findProduct(productId: string): Product | null {
  for (const cat of Object.keys(datasets)) {
    const hit = datasets[cat]!.find((p) => p.id === productId);
    if (hit) return hit;
  }
  for (const cat of Object.keys(dynamic)) {
    const hit = dynamic[cat]!.find((p) => p.id === productId);
    if (hit) return hit;
  }
  return null;
}
