/**
 * Venue Inventory Store — in-memory cache of per-venue product availability.
 *
 * Loaded from PostgreSQL at server startup. All lookups are synchronous O(1).
 *
 * Structure: Map<venueId, Map<productId, StockInfo>>
 *
 * "In stock" = available=true AND quantity > 0.
 *
 * Demo / no-inventory fallback:
 *   If a venue has NO rows in venue_inventory the store returns inStock=true
 *   for all products so the recommendation engine still works before a venue
 *   has configured their inventory.
 */

import { db, venueInventoryTable } from "@workspace/db";
import { eq }                       from "drizzle-orm";
import { logger }                   from "../lib/logger";

export interface StockInfo {
  quantity:  number;
  available: boolean;
}

// venueId → ( productId → StockInfo )
const store = new Map<string, Map<string, StockInfo>>();

// ── Startup ────────────────────────────────────────────────────────────────────

export async function loadVenueInventory(): Promise<void> {
  try {
    const rows = await db.select().from(venueInventoryTable);
    store.clear();

    for (const row of rows) {
      if (!row.venueId) continue;
      if (!store.has(row.venueId)) store.set(row.venueId, new Map());
      store.get(row.venueId)!.set(row.productId, {
        quantity:  row.quantity,
        available: row.available,
      });
    }

    logger.info({ venues: store.size, items: rows.length }, "Venue inventory loaded");
  } catch (err) {
    logger.warn({ err }, "Failed to load venue inventory — all products treated as available");
  }
}

// ── Read API ───────────────────────────────────────────────────────────────────

/**
 * Returns true when the product is in stock for the given venue.
 * Returns true when the venue has no inventory records (demo / unconfigured).
 */
export function isInStock(venueId: string, productId: string): boolean {
  const venueMap = store.get(venueId);
  if (!venueMap || venueMap.size === 0) return true; // no inventory configured
  const info = venueMap.get(productId);
  if (!info) return false; // product not listed in this venue's inventory
  return info.available && info.quantity > 0;
}

export function getStockInfo(venueId: string, productId: string): StockInfo | null {
  return store.get(venueId)?.get(productId) ?? null;
}

/**
 * Returns the Set of in-stock product IDs for a venue.
 * Returns null when venue has no inventory (caller treats all as available).
 */
export function getInStockSet(venueId: string): Set<string> | null {
  const venueMap = store.get(venueId);
  if (!venueMap || venueMap.size === 0) return null;
  const set = new Set<string>();
  for (const [pid, info] of venueMap) {
    if (info.available && info.quantity > 0) set.add(pid);
  }
  return set;
}

/** Returns all stock entries for a venue — used by the intelligence endpoint. */
export function getVenueStock(venueId: string): Map<string, StockInfo> {
  return store.get(venueId) ?? new Map();
}

/** Returns all venue IDs with at least one configured inventory row. */
export function getConfiguredVenues(): string[] {
  return Array.from(store.keys());
}

// ── Write-through cache update ─────────────────────────────────────────────────

export function updateStockCache(
  venueId:   string,
  productId: string,
  info:      StockInfo,
): void {
  if (!store.has(venueId)) store.set(venueId, new Map());
  store.get(venueId)!.set(productId, info);
}

// ── Venue inventory CRUD (route helper) ───────────────────────────────────────

export async function upsertVenueInventory(
  venueId:   string,
  productId: string,
  quantity:  number,
  available: boolean,
  priceCents?: number,
): Promise<void> {
  await db
    .insert(venueInventoryTable)
    .values({ venueId, productId, quantity, available, priceCents })
    .onConflictDoUpdate({
      target: [venueInventoryTable.venueId, venueInventoryTable.productId],
      set: {
        quantity,
        available,
        ...(priceCents !== undefined ? { priceCents } : {}),
        updatedAt: new Date(),
      },
    });

  updateStockCache(venueId, productId, { quantity, available });
}

export async function getVenueInventoryFromDB(venueId: string) {
  return db
    .select()
    .from(venueInventoryTable)
    .where(eq(venueInventoryTable.venueId, venueId));
}
