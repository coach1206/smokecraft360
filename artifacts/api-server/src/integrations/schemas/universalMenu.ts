/**
 * universalMenu — Normalized menu format across all POS systems.
 *
 * Admins use this format when mapping EEIS products to POS item IDs.
 * Each adapter translates its native catalog response into UniversalMenuItems.
 */

import { z } from "zod/v4";

export const UniversalMenuModifierSchema = z.object({
  id:         z.string(),
  name:       z.string(),
  priceCents: z.number().int().default(0),
  required:   z.boolean().default(false),
});

export const UniversalMenuItemSchema = z.object({
  posItemId:     z.string().min(1),
  eeisItemId:    z.string().optional(),
  venueId:       z.string().uuid(),
  provider:      z.string(),
  name:          z.string().min(1),
  description:   z.string().optional(),
  sku:           z.string().optional(),
  category:      z.string().optional(),
  subcategory:   z.string().optional(),
  priceCents:    z.number().int().nonnegative(),
  isTaxable:     z.boolean().default(true),
  isAvailable:   z.boolean().default(true),
  modifiers:     z.array(UniversalMenuModifierSchema).default([]),
  imageUrl:      z.string().optional(),
  allergens:     z.array(z.string()).default([]),
  tags:          z.array(z.string()).default([]),
  sortOrder:     z.number().int().default(0),
  syncedAt:      z.string().datetime(),
  meta:          z.record(z.string(), z.unknown()).default({}),
});
export type UniversalMenuItem = z.infer<typeof UniversalMenuItemSchema>;

export const UniversalMenuCatalogSchema = z.object({
  venueId:     z.string().uuid(),
  provider:    z.string(),
  categories:  z.array(z.object({
    id:    z.string(),
    name:  z.string(),
    items: z.array(UniversalMenuItemSchema),
  })),
  totalItems:  z.number().int(),
  syncedAt:    z.string().datetime(),
});
export type UniversalMenuCatalog = z.infer<typeof UniversalMenuCatalogSchema>;
