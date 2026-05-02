import { Product, Category } from "./types";
import { cigars  } from "../data/cigars";
import { alcohol } from "../data/alcohol";

const datasets: Record<string, Product[]> = {
  cigar:   cigars,
  alcohol: alcohol,
};

const pairingCategories: Record<string, string> = {
  cigar:   "alcohol",
  alcohol: "cigar",
};

export function getProductsByCategory(category: Category): Product[] {
  return datasets[category.toLowerCase()] ?? [];
}

export function getPairingPool(category: Category): Product[] {
  const pairingCategory = pairingCategories[category.toLowerCase()];
  if (!pairingCategory) return [];
  return datasets[pairingCategory] ?? [];
}

export function getRegisteredCategories(): string[] {
  return Object.keys(datasets);
}
