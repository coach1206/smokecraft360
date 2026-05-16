/**
 * normalizeProduct — maps raw provider product data to a canonical
 * UniversalProduct structure, establishing the universal commerce language.
 *
 * Each POS provider has wildly different field names, data types, and
 * conventions. This normalizer produces consistent output regardless of
 * which provider is the source.
 */

import { z }                           from "zod/v4";
import { type UniversalMenuItem }      from "../schemas/universalMenu";

export const UniversalProductSchema = z.object({
  id:              z.string(),              // EEIS internal id (may be empty until mapped)
  posProductId:    z.string(),
  provider:        z.string(),
  venueId:         z.string(),
  name:            z.string(),
  description:     z.string().default(""),
  sku:             z.string().optional(),
  category:        z.string().optional(),
  subcategory:     z.string().optional(),
  craftType:       z.enum(["smoke","pour","brew","vape"]).optional(),
  priceCents:      z.number().int().nonnegative(),
  comparePriceCents:z.number().int().nonnegative().optional(),
  taxable:         z.boolean().default(true),
  taxCategoryId:   z.string().optional(),
  available:       z.boolean().default(true),
  stockQuantity:   z.number().int().nonnegative().default(0),
  reorderPoint:    z.number().int().nonnegative().default(0),
  unit:            z.string().default("each"),
  imageUrl:        z.string().optional(),
  tags:            z.array(z.string()).default([]),
  allergens:       z.array(z.string()).default([]),
  sortOrder:       z.number().int().default(0),
  variants:        z.array(z.object({
    id:         z.string(),
    name:       z.string(),
    priceCents: z.number().int().nonnegative(),
    sku:        z.string().optional(),
  })).default([]),
  meta:            z.record(z.string(), z.unknown()).default({}),
  syncedAt:        z.string().datetime(),
});
export type UniversalProduct = z.infer<typeof UniversalProductSchema>;

type RawProviderProduct = Record<string, unknown>;

const CRAFT_KEYWORDS: Record<string, "smoke"|"pour"|"brew"|"vape"> = {
  cigar: "smoke", cigarette:"smoke", tobacco:"smoke", pipe:"smoke",
  whiskey:"pour", bourbon:"pour", scotch:"pour", wine:"pour", spirit:"pour", cocktail:"pour", beer:"brew",
  brew:"brew", draft:"brew", lager:"brew", ale:"brew",
  vape:"vape", vapor:"vape", "e-liquid":"vape", pod:"vape",
};

function inferCraftType(name: string, category?: string): "smoke"|"pour"|"brew"|"vape"|undefined {
  const text = `${name} ${category ?? ""}`.toLowerCase();
  for (const [kw, craft] of Object.entries(CRAFT_KEYWORDS)) {
    if (text.includes(kw)) return craft;
  }
  return undefined;
}

function normalizePriceCents(raw: unknown): number {
  if (typeof raw === "number") return Math.round(raw < 100 ? raw * 100 : raw);
  if (typeof raw === "string") {
    const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : Math.round(n < 100 ? n * 100 : n);
  }
  return 0;
}

export function normalizeProduct(
  raw:      RawProviderProduct,
  provider: string,
  venueId:  string,
): UniversalProduct {
  const now = new Date().toISOString();

  // Field name aliases by provider
  const id         = String(raw["id"] ?? raw["item_id"] ?? raw["product_id"] ?? raw["variantId"] ?? "");
  const name       = String(raw["name"] ?? raw["item_name"] ?? raw["title"] ?? "Unknown");
  const desc       = String(raw["description"] ?? raw["item_description"] ?? raw["body_html"] ?? "");
  const sku        = raw["sku"] != null ? String(raw["sku"]) : undefined;
  const category   = raw["category"] ?? raw["category_name"] ?? raw["product_type"] ?? raw["item_type"];
  const priceCents = normalizePriceCents(raw["price"] ?? (raw["price_money"] as Record<string,unknown>|undefined)?.["amount"] ?? raw["price_cents"] ?? raw["unit_amount"]);
  const available  = raw["available"] ?? raw["in_stock"] ?? raw["is_active"] ?? true;
  const stock      = Number(raw["quantity"] ?? raw["quantity_on_hand"] ?? raw["inventory_quantity"] ?? 0);
  const imageUrl   = raw["image_url"] ?? raw["imageUrl"] ?? (Array.isArray(raw["images"]) ? (raw["images"] as unknown[])[0] : undefined);
  const tags       = Array.isArray(raw["tags"]) ? (raw["tags"] as string[]) : typeof raw["tags"] === "string" ? raw["tags"].split(",").map(t => t.trim()) : [];

  const catStr     = category != null ? String(category) : undefined;
  const craftType  = inferCraftType(name, catStr);

  return UniversalProductSchema.parse({
    id:           "",     // mapped to EEIS id by adapter layer
    posProductId: id,
    provider,
    venueId,
    name,
    description:  desc,
    sku,
    category:     catStr,
    craftType,
    priceCents,
    taxable:      Boolean(raw["taxable"] ?? raw["is_taxable"] ?? true),
    available:    Boolean(available),
    stockQuantity:Math.max(0, Math.round(stock)),
    unit:         String(raw["unit"] ?? raw["unit_type"] ?? "each"),
    imageUrl:     imageUrl ? String(imageUrl) : undefined,
    tags,
    sortOrder:    Number(raw["sort_order"] ?? raw["sort"] ?? 0),
    meta:         { originalId: id, provider },
    syncedAt:     now,
  });
}

/** Normalize a UniversalMenuItem into UniversalProduct (for menu→inventory merging) */
export function menuItemToProduct(
  item:    UniversalMenuItem,
  venueId: string,
): UniversalProduct {
  return UniversalProductSchema.parse({
    id:           item.eeisItemId ?? "",
    posProductId: item.posItemId,
    provider:     item.provider,
    venueId,
    name:         item.name,
    description:  item.description ?? "",
    sku:          item.sku,
    category:     item.category,
    craftType:    inferCraftType(item.name, item.category),
    priceCents:   item.priceCents,
    taxable:      item.isTaxable,
    available:    item.isAvailable,
    stockQuantity:0,
    imageUrl:     item.imageUrl,
    tags:         item.tags,
    sortOrder:    item.sortOrder,
    meta:         item.meta,
    syncedAt:     item.syncedAt,
  });
}
