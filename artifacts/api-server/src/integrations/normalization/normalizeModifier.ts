/**
 * normalizeModifier — canonicalizes modifier/add-on data from any POS provider.
 *
 * Modifiers (toppings, add-ons, customizations, options) have wildly different
 * representations across Toast, Square, Clover, Lightspeed, Shopify.
 * This module produces a canonical UniversalModifier for all of them.
 */

import { z } from "zod/v4";

export const UniversalModifierOptionSchema = z.object({
  id:           z.string(),
  name:         z.string(),
  priceCents:   z.number().int().default(0),
  isDefault:    z.boolean().default(false),
  isAvailable:  z.boolean().default(true),
  sku:          z.string().optional(),
  meta:         z.record(z.string(), z.unknown()).default({}),
});
export type UniversalModifierOption = z.infer<typeof UniversalModifierOptionSchema>;

export const UniversalModifierGroupSchema = z.object({
  id:            z.string(),
  name:          z.string(),
  posGroupId:    z.string(),
  provider:      z.string(),
  venueId:       z.string(),
  selectionType: z.enum(["single","multi","none"]).default("single"),
  minSelections: z.number().int().nonnegative().default(0),
  maxSelections: z.number().int().nonnegative().default(1),
  required:      z.boolean().default(false),
  options:       z.array(UniversalModifierOptionSchema),
  sortOrder:     z.number().int().default(0),
  syncedAt:      z.string().datetime(),
});
export type UniversalModifierGroup = z.infer<typeof UniversalModifierGroupSchema>;

type RawProvider = Record<string, unknown>;

function normalizePriceCents(raw: unknown): number {
  if (typeof raw === "number") return Math.round(raw < 100 ? raw * 100 : raw);
  if (typeof raw === "string") { const n = parseFloat(raw); return isNaN(n) ? 0 : Math.round(n < 100 ? n * 100 : n); }
  return 0;
}

function normalizeOption(raw: RawProvider, provider: string): UniversalModifierOption {
  return UniversalModifierOptionSchema.parse({
    id:           String(raw["id"] ?? raw["option_id"] ?? raw["modifier_option_id"] ?? ""),
    name:         String(raw["name"] ?? raw["title"] ?? "Option"),
    priceCents:   normalizePriceCents(raw["price"] ?? (raw["price_money"] as Record<string,unknown>|undefined)?.["amount"] ?? raw["price_cents"] ?? 0),
    isDefault:    Boolean(raw["is_default"] ?? raw["default"] ?? false),
    isAvailable:  Boolean(raw["is_available"] ?? raw["available"] ?? true),
    sku:          raw["sku"] != null ? String(raw["sku"]) : undefined,
    meta:         { provider, originalId: raw["id"] },
  });
}

export function normalizeModifierGroup(
  raw:      RawProvider,
  provider: string,
  venueId:  string,
): UniversalModifierGroup {
  const now = new Date().toISOString();

  // Options array — field name differs per provider
  const rawOptions =
    Array.isArray(raw["options"])         ? raw["options"] as RawProvider[] :
    Array.isArray(raw["modifier_options"]) ? raw["modifier_options"] as RawProvider[] :
    Array.isArray(raw["choices"])          ? raw["choices"]          as RawProvider[] :
    Array.isArray(raw["items"])            ? raw["items"]            as RawProvider[] : [];

  const minSel = Number(raw["min_permitted"] ?? raw["min_selections"] ?? raw["minimum"] ?? 0);
  const maxSel = Number(raw["max_permitted"] ?? raw["max_selections"] ?? raw["maximum"] ?? rawOptions.length);
  const selectionType = minSel === 1 && maxSel === 1 ? "single" : maxSel > 1 ? "multi" : "none";

  return UniversalModifierGroupSchema.parse({
    id:            String(raw["id"] ?? raw["modifier_group_id"] ?? raw["option_set_id"] ?? ""),
    name:          String(raw["name"] ?? raw["title"] ?? "Options"),
    posGroupId:    String(raw["id"] ?? raw["modifier_group_id"] ?? ""),
    provider,
    venueId,
    selectionType,
    minSelections: minSel,
    maxSelections: Math.max(minSel, maxSel),
    required:      Boolean(raw["required"] ?? raw["is_required"] ?? minSel > 0),
    options:       rawOptions.map(o => normalizeOption(o, provider)),
    sortOrder:     Number(raw["sort_order"] ?? raw["sort"] ?? 0),
    syncedAt:      now,
  });
}

/** Apply validated modifier selections to a line-item price */
export function applyModifiers(
  baseCents:   number,
  group:       UniversalModifierGroup,
  selectedIds: string[],
): { totalCents: number; applied: UniversalModifierOption[] } {
  const applied = group.options.filter(o => selectedIds.includes(o.id));
  const added   = applied.reduce((s, o) => s + o.priceCents, 0);
  return { totalCents: baseCents + added, applied };
}
