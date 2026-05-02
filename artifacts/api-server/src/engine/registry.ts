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

const datasets: Record<string, Product[]> = {
  cigar:   cigars,
  alcohol: alcohol,
};

/** Products added at runtime via the API — stored separately to keep the
 *  static arrays read-only and support easy reset in tests. */
const dynamic: Record<string, Product[]> = {};

const pairingCategories: Record<string, string> = {
  cigar:   "alcohol",
  alcohol: "cigar",
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
