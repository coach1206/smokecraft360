/**
 * Inventory initialisation — called once at server startup before the first
 * request is accepted.
 *
 * Responsibility: seed the boost service from PostgreSQL (or from the static
 * fallback data on the very first run), then load persisted impression counts.
 *
 * All runtime state (boost levels, impression counts, product metadata) lives
 * in services/boostService.ts — this file is purely a startup orchestrator.
 */

import { db, productsTable } from "@workspace/db";
import { seedProducts, seedFromDB, syncStatsFromDB } from "../services/boostService";
import { ALL_FALLBACK_PRODUCTS } from "../data/fallback";

export async function initInventory(): Promise<void> {
  const rows = await db.select().from(productsTable);

  if (rows.length === 0) {
    // First run — persist the static catalogue to the database.
    await db.insert(productsTable).values(
      ALL_FALLBACK_PRODUCTS.map((p) => ({
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
        active:      true,
      })),
    );
    seedProducts(ALL_FALLBACK_PRODUCTS);
  } else {
    seedFromDB(rows);
  }

  await syncStatsFromDB();
}
