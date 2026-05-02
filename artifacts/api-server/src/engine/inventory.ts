/**
 * Inventory store — in-memory boost cache backed by PostgreSQL.
 *
 * On startup call `initInventory()`.  All subsequent reads are served from
 * in-memory Maps (fast path for the recommendation engine).  Writes are
 * persisted to the database and reflected in memory immediately.
 */

import { eq, sql } from "drizzle-orm";
import { db, productsTable, analyticsEventsTable } from "@workspace/db";
import type { Product } from "./types";
import { cigars  } from "../data/cigars";
import { alcohol } from "../data/alcohol";

export interface BoostState {
  boostLevel:  number;
  sponsored:   boolean;
  brandId?:    string;
  campaignId?: string;
}

export interface ProductStats {
  impressions:        number;
  featuredImpressions: number;
}

const boostStore = new Map<string, BoostState>();
const statsStore = new Map<string, ProductStats>();
const metaStore  = new Map<string, Pick<Product, "id" | "name" | "category" | "tier">>();

/** Called once before the server starts accepting connections. */
export async function initInventory(): Promise<void> {
  const rows = await db.select().from(productsTable);

  if (rows.length === 0) {
    const allProducts = [...cigars, ...alcohol];

    await db.insert(productsTable).values(
      allProducts.map((p) => ({
        id:          p.id,
        name:        p.name,
        category:    p.category as "cigar" | "alcohol",
        flavorNotes: p.flavorNotes,
        strength:    p.strength,
        moodTags:    p.moodTags,
        pairingTags: p.pairingTags,
        tier:        p.tier as "standard" | "mid" | "premium",
        boostLevel:  p.boostLevel  ?? 0,
        sponsored:   p.sponsored   ?? false,
        brandId:     undefined,
        campaignId:  p.campaignId,
        active:      true,
      })),
    );

    for (const p of allProducts) {
      metaStore.set(p.id, { id: p.id, name: p.name, category: p.category, tier: p.tier });
      boostStore.set(p.id, {
        boostLevel:  p.boostLevel  ?? 0,
        sponsored:   p.sponsored   ?? false,
        campaignId:  p.campaignId,
      });
    }
  } else {
    for (const row of rows) {
      metaStore.set(row.id, { id: row.id, name: row.name, category: row.category, tier: row.tier });
      boostStore.set(row.id, {
        boostLevel:  row.boostLevel,
        sponsored:   row.sponsored,
        brandId:     row.brandId  ?? undefined,
        campaignId:  row.campaignId ?? undefined,
      });
    }
  }

  await refreshImpressionCache();
}

/** Sync in-memory stats from DB aggregates. */
async function refreshImpressionCache(): Promise<void> {
  const recs = await db
    .select({
      productId: analyticsEventsTable.productId,
      cnt:       sql<number>`cast(count(*) as integer)`,
    })
    .from(analyticsEventsTable)
    .where(eq(analyticsEventsTable.eventType, "recommendation"))
    .groupBy(analyticsEventsTable.productId);

  const feat = await db
    .select({
      productId: analyticsEventsTable.productId,
      cnt:       sql<number>`cast(count(*) as integer)`,
    })
    .from(analyticsEventsTable)
    .where(eq(analyticsEventsTable.eventType, "sponsored_view"))
    .groupBy(analyticsEventsTable.productId);

  const featMap = new Map(feat.map((r) => [r.productId, r.cnt]));

  for (const r of recs) {
    if (!r.productId) continue;
    statsStore.set(r.productId, {
      impressions:         r.cnt,
      featuredImpressions: featMap.get(r.productId) ?? 0,
    });
  }
  for (const [pid, cnt] of featMap) {
    if (!pid) continue;
    const existing = statsStore.get(pid) ?? { impressions: 0, featuredImpressions: 0 };
    statsStore.set(pid, { ...existing, featuredImpressions: cnt });
  }
}

export function getProductBoost(id: string): BoostState {
  return boostStore.get(id) ?? { boostLevel: 0, sponsored: false };
}

/** Sync to DB and update in-memory. */
export async function setProductBoostDB(
  id: string,
  updates: Partial<BoostState>,
): Promise<BoostState> {
  const current = getProductBoost(id);
  const updated: BoostState = {
    ...current,
    ...Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined)),
  };
  boostStore.set(id, updated);

  await db.update(productsTable).set({
    boostLevel: updated.boostLevel,
    sponsored:  updated.sponsored,
    brandId:    updates.brandId    ?? null,
    campaignId: updates.campaignId ?? null,
  }).where(eq(productsTable.id, id));

  return updated;
}

/** Fire-and-forget analytics write — does NOT block recommendations. */
export function trackImpression(productId: string, featured = false): void {
  const eventType = featured ? "sponsored_view" as const : "recommendation" as const;

  db.insert(analyticsEventsTable).values({ productId, eventType }).then(() => {
    const current = statsStore.get(productId) ?? { impressions: 0, featuredImpressions: 0 };
    statsStore.set(productId, {
      impressions:         current.impressions         + (featured ? 0 : 1),
      featuredImpressions: current.featuredImpressions + (featured ? 1 : 0),
    });
  }).catch(() => { /* non-critical — do not crash recommendation */ });
}

export function getStats(productId: string): ProductStats {
  return statsStore.get(productId) ?? { impressions: 0, featuredImpressions: 0 };
}

export function getAllInventory() {
  return Array.from(metaStore.values()).map((meta) => ({
    ...meta,
    ...getProductBoost(meta.id),
    ...getStats(meta.id),
  }));
}
