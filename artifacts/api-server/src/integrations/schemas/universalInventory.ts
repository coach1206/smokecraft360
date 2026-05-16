/**
 * universalInventory — Canonical inventory format across all POS systems.
 *
 * AI recommendations always filter against UniversalInventoryItem[] —
 * never against raw provider formats. Each adapter maps its response here.
 */

import { z } from "zod/v4";

export const UniversalInventoryItemSchema = z.object({
  posProductId:   z.string().min(1),
  eeisProductId:  z.string().optional(),
  venueId:        z.string().uuid(),
  provider:       z.string().min(1),
  name:           z.string().min(1),
  sku:            z.string().optional(),
  category:       z.string().optional(),
  quantity:       z.number().int().nonnegative(),
  available:      z.boolean(),
  priceCents:     z.number().int().nonnegative().optional(),
  reorderPoint:   z.number().int().nonnegative().default(0),
  unit:           z.string().default("each"),
  lastSyncAt:     z.string().datetime(),
  meta:           z.record(z.string(), z.unknown()).default({}),
});
export type UniversalInventoryItem = z.infer<typeof UniversalInventoryItemSchema>;

export const UniversalInventorySnapshotSchema = z.object({
  venueId:    z.string().uuid(),
  provider:   z.string(),
  items:      z.array(UniversalInventoryItemSchema),
  syncedAt:   z.string().datetime(),
  expiresAt:  z.string().datetime(),
  itemCount:  z.number().int(),
  lowStockIds: z.array(z.string()).default([]),
  outOfStockIds: z.array(z.string()).default([]),
});
export type UniversalInventorySnapshot = z.infer<typeof UniversalInventorySnapshotSchema>;

export function buildSnapshot(venueId: string, provider: string, items: UniversalInventoryItem[], ttlMs = 30 * 60 * 1000): UniversalInventorySnapshot {
  const now = new Date();
  const lowStockIds   = items.filter(i => i.available && i.quantity > 0 && i.quantity <= i.reorderPoint).map(i => i.posProductId);
  const outOfStockIds = items.filter(i => !i.available || i.quantity <= 0).map(i => i.posProductId);
  return {
    venueId, provider, items,
    syncedAt:   now.toISOString(),
    expiresAt:  new Date(now.getTime() + ttlMs).toISOString(),
    itemCount:  items.length,
    lowStockIds,
    outOfStockIds,
  };
}
