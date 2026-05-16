/**
 * normalizeCategory — canonicalizes product category/department data from
 * any POS provider into a unified hierarchy.
 *
 * Providers use: departments, categories, product types, sections,
 * menu groups — all normalized to UniversalCategory.
 */

import { z } from "zod/v4";

export const UniversalCategorySchema = z.object({
  id:          z.string(),
  posCategoryId:z.string(),
  provider:    z.string(),
  venueId:     z.string(),
  name:        z.string(),
  slug:        z.string(),
  parentId:    z.string().optional(),
  craftType:   z.enum(["smoke","pour","brew","vape"]).optional(),
  description: z.string().optional(),
  imageUrl:    z.string().optional(),
  sortOrder:   z.number().int().default(0),
  isActive:    z.boolean().default(true),
  meta:        z.record(z.string(), z.unknown()).default({}),
  syncedAt:    z.string().datetime(),
});
export type UniversalCategory = z.infer<typeof UniversalCategorySchema>;

export interface CategoryTree {
  categories: UniversalCategory[];
  roots:      UniversalCategory[];
  byId:       Map<string, UniversalCategory>;
}

type RawProvider = Record<string, unknown>;

const CRAFT_MAP: Record<string, "smoke"|"pour"|"brew"|"vape"> = {
  "cigar":"smoke","tobacco":"smoke","pipe":"smoke","hookah":"smoke",
  "spirits":"pour","whiskey":"pour","wine":"pour","liquor":"pour","bar":"pour","cocktail":"pour",
  "beer":"brew","draft":"brew","brewing":"brew","craft beer":"brew",
  "vape":"vape","vapor":"vape","e-liquid":"vape",
};

function inferCraft(name: string): "smoke"|"pour"|"brew"|"vape"|undefined {
  const n = name.toLowerCase();
  for (const [kw, craft] of Object.entries(CRAFT_MAP)) {
    if (n.includes(kw)) return craft;
  }
  return undefined;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function normalizeCategory(
  raw:      RawProvider,
  provider: string,
  venueId:  string,
  parentId?: string,
): UniversalCategory {
  const now  = new Date().toISOString();
  const id   = String(raw["id"] ?? raw["category_id"] ?? raw["department_id"] ?? raw["section_id"] ?? "");
  const name = String(raw["name"] ?? raw["title"] ?? raw["category_name"] ?? "Uncategorized");

  return UniversalCategorySchema.parse({
    id,
    posCategoryId: id,
    provider,
    venueId,
    name,
    slug:        slugify(name),
    parentId:    parentId ?? (raw["parent_id"] != null ? String(raw["parent_id"]) : undefined),
    craftType:   inferCraft(name),
    description: raw["description"] != null ? String(raw["description"]) : undefined,
    imageUrl:    raw["image_url"] != null ? String(raw["image_url"]) : undefined,
    sortOrder:   Number(raw["sort_order"] ?? raw["sort"] ?? 0),
    isActive:    Boolean(raw["is_active"] ?? raw["available"] ?? raw["active"] ?? true),
    meta:        { provider, originalId: id },
    syncedAt:    now,
  });
}

export function buildCategoryTree(categories: UniversalCategory[]): CategoryTree {
  const byId = new Map<string, UniversalCategory>(categories.map(c => [c.id, c]));
  const roots = categories.filter(c => !c.parentId || !byId.has(c.parentId));
  return { categories, roots, byId };
}

/** Normalize a flat list of provider categories (handles parent/child nesting) */
export function normalizeCategoryList(
  rawList:  RawProvider[],
  provider: string,
  venueId:  string,
): UniversalCategory[] {
  const normalized: UniversalCategory[] = [];
  for (const raw of rawList) {
    const parentId = raw["parent_id"] != null ? String(raw["parent_id"]) : undefined;
    normalized.push(normalizeCategory(raw, provider, venueId, parentId));

    // Handle nested children
    const children = Array.isArray(raw["children"]) ? raw["children"] as RawProvider[] : [];
    for (const child of children) {
      const parentCatId = String(raw["id"] ?? "");
      normalized.push(normalizeCategory(child, provider, venueId, parentCatId));
    }
  }
  return normalized;
}
