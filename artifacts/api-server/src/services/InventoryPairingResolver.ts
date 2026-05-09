/**
 * InventoryPairingResolver — only surfaces products actually in the venue's DB.
 *
 * Never hallucinate brand names. Everything returned must exist in
 * productsTable (joined with venueInventoryTable when venueId is provided).
 */

import { eq, and, inArray, gt } from "drizzle-orm";
import { db, productsTable, venueInventoryTable } from "@workspace/db";

export interface ResolvedProduct {
  id:         string;
  name:       string;
  category:   string;
  priceCents: number | null;
  imageUrl:   string | null;
  flavorNotes: string[];
  quantity:   number;
  premiumTier: number;
}

/**
 * Fetch in-venue products matching at least one spirit tag or beer tag.
 * Falls back to all in-venue products for the target categories if no tag match.
 */
export async function resolveInventoryPairings(params: {
  venueId?:   string;
  spiritTags: string[];
  beerTags:   string[];
  limit?:     number;
}): Promise<{ spirits: ResolvedProduct[]; beers: ResolvedProduct[] }> {
  const { venueId, spiritTags, beerTags, limit = 4 } = params;

  // Categories that map to spirits
  const spiritCategories = ["alcohol", "cocktail", "wine"];
  const beerCategories   = ["beer"];

  let allProducts: {
    id: string; name: string; category: string;
    imageUrl: string | null; flavorNotes: string[];
    costCents: number | null; priceCents: number | null;
    quantity: number; premiumTier: number;
  }[] = [];

  try {
    if (venueId) {
      const rows = await db
        .select({
          id:          productsTable.id,
          name:        productsTable.name,
          category:    productsTable.category,
          imageUrl:    productsTable.imageUrl,
          flavorNotes: productsTable.flavorNotes,
          costCents:   productsTable.costCents,
          priceCents:  venueInventoryTable.priceCents,
          quantity:    venueInventoryTable.quantity,
          premiumTier: venueInventoryTable.premiumTier,
        })
        .from(productsTable)
        .innerJoin(venueInventoryTable, eq(productsTable.id, venueInventoryTable.productId))
        .where(
          and(
            eq(venueInventoryTable.venueId, venueId),
            eq(productsTable.active, true),
            gt(venueInventoryTable.quantity, 0),
          )
        )
        .limit(200);

      allProducts = rows.map(r => ({
        ...r,
        category:   r.category as string,
        flavorNotes: (r.flavorNotes as string[]) ?? [],
        priceCents:  r.priceCents ?? r.costCents,
        quantity:    r.quantity,
        premiumTier: r.premiumTier,
      }));
    } else {
      const rows = await db
        .select({
          id:          productsTable.id,
          name:        productsTable.name,
          category:    productsTable.category,
          imageUrl:    productsTable.imageUrl,
          flavorNotes: productsTable.flavorNotes,
          costCents:   productsTable.costCents,
        })
        .from(productsTable)
        .where(eq(productsTable.active, true))
        .limit(200);

      allProducts = rows.map(r => ({
        ...r,
        category:    r.category as string,
        flavorNotes: (r.flavorNotes as string[]) ?? [],
        priceCents:  r.costCents,
        quantity:    99,
        premiumTier: 1,
      }));
    }
  } catch {
    return { spirits: [], beers: [] };
  }

  // ── Score products by tag affinity ─────────────────────────────────────────

  function scoreProduct(
    p: typeof allProducts[0],
    tags: string[],
  ): number {
    const text = `${p.name} ${p.flavorNotes.join(" ")}`.toLowerCase();
    let score  = p.premiumTier * 2; // premium items get a small boost
    for (const tag of tags) {
      if (text.includes(tag.toLowerCase())) score += 10;
    }
    return score;
  }

  const spirits = allProducts
    .filter(p => spiritCategories.includes(p.category))
    .map(p => ({ ...p, _score: scoreProduct(p, spiritTags) }))
    .sort((a, b) => b._score - a._score || b.premiumTier - a.premiumTier)
    .slice(0, limit)
    .map(({ _score: _, ...p }) => p as ResolvedProduct);

  const beers = allProducts
    .filter(p => beerCategories.includes(p.category))
    .map(p => ({ ...p, _score: scoreProduct(p, beerTags) }))
    .sort((a, b) => b._score - a._score || b.premiumTier - a.premiumTier)
    .slice(0, 2)
    .map(({ _score: _, ...p }) => p as ResolvedProduct);

  return { spirits, beers };
}
