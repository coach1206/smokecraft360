/**
 * In-memory inventory store.
 *
 * Persists boost/sponsored overrides and impression analytics for the
 * current server session. A future iteration can swap this for a database.
 *
 * Seeded on startup from the product data files so all products are visible
 * in the dashboard even before any overrides are applied.
 */

import type { Product } from "./types";

export interface BoostState {
  boostLevel: number;   // 0–3
  sponsored: boolean;
  brandId?: string;
  campaignId?: string;
}

export interface ProductStats {
  impressions: number;
  featuredImpressions: number;
}

const boostStore = new Map<string, BoostState>();
const statsStore = new Map<string, ProductStats>();
/** Keeps product metadata (name, category, tier) for inventory listing */
const metaStore  = new Map<string, Pick<Product, "id" | "name" | "category" | "tier">>();

/** Seed the store from an array of products (called once per category on startup). */
export function seedInventory(products: Product[]): void {
  for (const p of products) {
    metaStore.set(p.id, { id: p.id, name: p.name, category: p.category, tier: p.tier });
    if (!boostStore.has(p.id)) {
      boostStore.set(p.id, {
        boostLevel:  p.boostLevel  ?? 0,
        sponsored:   p.sponsored   ?? false,
        brandId:     p.brandId,
        campaignId:  p.campaignId,
      });
    }
  }
}

export function getProductBoost(id: string): BoostState {
  return boostStore.get(id) ?? { boostLevel: 0, sponsored: false };
}

export function setProductBoost(id: string, updates: Partial<BoostState>): BoostState {
  const current = getProductBoost(id);
  const updated: BoostState = {
    ...current,
    ...Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    ),
  };
  boostStore.set(id, updated);
  return updated;
}

export function trackImpression(productId: string, featured = false): void {
  const current = statsStore.get(productId) ?? { impressions: 0, featuredImpressions: 0 };
  statsStore.set(productId, {
    impressions: current.impressions + 1,
    featuredImpressions: current.featuredImpressions + (featured ? 1 : 0),
  });
}

export function getStats(productId: string): ProductStats {
  return statsStore.get(productId) ?? { impressions: 0, featuredImpressions: 0 };
}

/** Returns all known products merged with their current boost state and stats. */
export function getAllInventory() {
  return Array.from(metaStore.values()).map((meta) => ({
    ...meta,
    ...getProductBoost(meta.id),
    ...getStats(meta.id),
  }));
}
