/**
 * Boost Service — owns the in-memory product state cache, backed by PostgreSQL.
 *
 * This is the single source of truth for boost levels, sponsored flags,
 * impression statistics, and product metadata at runtime.
 *
 * All mutations are write-through: the in-memory cache is updated instantly
 * (so recommendations are never blocked), then the DB is persisted async.
 *
 * Call `seedProducts` or `seedFromDB` once at startup (via engine/inventory.ts),
 * then `syncStatsFromDB` to load persisted impression counts.
 */

import { eq, sql } from "drizzle-orm";
import { db, productsTable, analyticsEventsTable } from "@workspace/db";
import type { Product } from "../engine/types";

// ── Public types ──────────────────────────────────────────────────────────────

export interface BoostState {
  boostLevel:  number;
  sponsored:   boolean;
  brandId?:    string;
  campaignId?: string;
}

export interface ProductStats {
  impressions:         number;
  featuredImpressions: number;
}

export interface ProductMeta {
  id:       string;
  name:     string;
  category: string;
  tier:     string;
}

export type InventoryEntry = ProductMeta & BoostState & ProductStats;

// ── In-memory caches (module-level singletons) ────────────────────────────────

const boostStore = new Map<string, BoostState>();
const statsStore = new Map<string, ProductStats>();
const metaStore  = new Map<string, ProductMeta>();

// ── Seeding ───────────────────────────────────────────────────────────────────

/** Seed from a static Product array (used on first run before DB rows exist). */
export function seedProducts(products: Product[]): void {
  for (const p of products) {
    metaStore.set(p.id, { id: p.id, name: p.name, category: p.category, tier: p.tier });
    boostStore.set(p.id, {
      boostLevel:  p.boostLevel  ?? 0,
      sponsored:   p.sponsored   ?? false,
      campaignId:  p.campaignId,
    });
    if (!statsStore.has(p.id)) {
      statsStore.set(p.id, { impressions: 0, featuredImpressions: 0 });
    }
  }
}

/** Seed boost + meta from a PostgreSQL products query result. */
export function seedFromDB(rows: (typeof productsTable.$inferSelect)[]): void {
  for (const row of rows) {
    metaStore.set(row.id, {
      id:       row.id,
      name:     row.name,
      category: row.category,
      tier:     row.tier,
    });
    boostStore.set(row.id, {
      boostLevel:  row.boostLevel,
      sponsored:   row.sponsored,
      brandId:     row.brandId    ?? undefined,
      campaignId:  row.campaignId ?? undefined,
    });
    if (!statsStore.has(row.id)) {
      statsStore.set(row.id, { impressions: 0, featuredImpressions: 0 });
    }
  }
}

/** Load aggregated impression counts from the analytics_events table. */
export async function syncStatsFromDB(): Promise<void> {
  const [recs, feat] = await Promise.all([
    db.select({
      productId: analyticsEventsTable.productId,
      cnt:       sql<number>`cast(count(*) as integer)`,
    })
      .from(analyticsEventsTable)
      .where(eq(analyticsEventsTable.eventType, "recommendation"))
      .groupBy(analyticsEventsTable.productId),

    db.select({
      productId: analyticsEventsTable.productId,
      cnt:       sql<number>`cast(count(*) as integer)`,
    })
      .from(analyticsEventsTable)
      .where(eq(analyticsEventsTable.eventType, "sponsored_view"))
      .groupBy(analyticsEventsTable.productId),
  ]);

  const featMap = new Map(feat.map((r) => [r.productId, r.cnt]));

  for (const r of recs) {
    if (!r.productId) continue;
    statsStore.set(r.productId, {
      impressions:         r.cnt,
      featuredImpressions: featMap.get(r.productId) ?? 0,
    });
  }
  for (const [pid, cnt] of featMap) {
    if (!pid || statsStore.has(pid)) continue;
    statsStore.set(pid, { impressions: 0, featuredImpressions: cnt });
  }
}

// ── Read API ──────────────────────────────────────────────────────────────────

export function getProductBoost(id: string): BoostState {
  return boostStore.get(id) ?? { boostLevel: 0, sponsored: false };
}

export function getStats(id: string): ProductStats {
  return statsStore.get(id) ?? { impressions: 0, featuredImpressions: 0 };
}

export function getMeta(id: string): ProductMeta | undefined {
  return metaStore.get(id);
}

export function getAllInventory(): InventoryEntry[] {
  return Array.from(metaStore.values()).map((meta) => ({
    ...meta,
    ...getProductBoost(meta.id),
    ...getStats(meta.id),
  }));
}

export function hasProducts(): boolean {
  return metaStore.size > 0;
}

// ── Write API ─────────────────────────────────────────────────────────────────

/**
 * Write-through boost update.
 * Memory is updated immediately; DB is awaited so callers can confirm persistence.
 */
export async function applyBoost(
  id:      string,
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

/**
 * Fire-and-forget impression write.
 * Never throws — analytics failures must never surface to the user.
 */
export function recordImpression(productId: string, featured: boolean): void {
  const eventType = featured ? "sponsored_view" as const : "recommendation" as const;

  db.insert(analyticsEventsTable)
    .values({ productId, eventType })
    .then(() => {
      const current = statsStore.get(productId) ?? { impressions: 0, featuredImpressions: 0 };
      statsStore.set(productId, {
        impressions:         current.impressions         + (featured ? 0 : 1),
        featuredImpressions: current.featuredImpressions + (featured ? 1 : 0),
      });
    })
    .catch(() => { /* non-critical — never crash a recommendation */ });
}
