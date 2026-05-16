/**
 * universalOrder — One internal order language for ALL POS systems.
 *
 * Every POS adapter translates its native order format into UniversalOrder
 * before it touches any EEIS/E.A.T business logic. This is the single
 * source of truth for what an order looks like inside the platform.
 */

import { z } from "zod/v4";

export const UniversalOrderItemSchema = z.object({
  posProductId:   z.string().min(1),
  eeisProductId:  z.string().optional(),
  name:           z.string().min(1),
  quantity:       z.number().int().positive(),
  unitCents:      z.number().int().nonnegative(),
  totalCents:     z.number().int().nonnegative(),
  sku:            z.string().optional(),
  category:       z.string().optional(),
  modifiers:      z.array(z.object({ name: z.string(), priceCents: z.number().int() })).default([]),
  meta:           z.record(z.string(), z.unknown()).default({}),
});
export type UniversalOrderItem = z.infer<typeof UniversalOrderItemSchema>;

export const UniversalOrderStatusSchema = z.enum([
  "draft", "open", "submitted", "accepted", "preparing",
  "ready", "completed", "cancelled", "refunded", "failed",
]);
export type UniversalOrderStatus = z.infer<typeof UniversalOrderStatusSchema>;

export const UniversalOrderSchema = z.object({
  id:               z.string().uuid(),
  externalOrderId:  z.string().optional(),
  venueId:          z.string().uuid(),
  sessionId:        z.string().uuid().optional(),
  userId:           z.string().uuid().optional(),
  guestProfileId:   z.string().uuid().optional(),
  provider:         z.string().min(1),
  status:           UniversalOrderStatusSchema.default("draft"),
  items:            z.array(UniversalOrderItemSchema),
  subtotalCents:    z.number().int().nonnegative(),
  taxCents:         z.number().int().nonnegative().default(0),
  tipCents:         z.number().int().nonnegative().default(0),
  discountCents:    z.number().int().nonnegative().default(0),
  totalCents:       z.number().int().nonnegative(),
  currency:         z.string().default("USD"),
  idempotencyKey:   z.string().optional(),
  tableNumber:      z.string().optional(),
  staffId:          z.string().optional(),
  notes:            z.string().optional(),
  craftType:        z.enum(["smoke", "pour", "brew", "vape"]).optional(),
  pairingContext:   z.record(z.string(), z.unknown()).default({}),
  createdAt:        z.string().datetime(),
  updatedAt:        z.string().datetime(),
});
export type UniversalOrder = z.infer<typeof UniversalOrderSchema>;

export function buildUniversalOrder(
  partial: Omit<UniversalOrder, "subtotalCents" | "totalCents" | "status" | "currency" | "createdAt" | "updatedAt"> & {
    status?: UniversalOrderStatus;
    currency?: string;
  },
): UniversalOrder {
  const now = new Date().toISOString();
  const subtotalCents = partial.items.reduce((s, i) => s + i.totalCents, 0);
  const totalCents    = subtotalCents + (partial.taxCents ?? 0) + (partial.tipCents ?? 0) - (partial.discountCents ?? 0);
  return UniversalOrderSchema.parse({
    ...partial,
    subtotalCents,
    totalCents: Math.max(0, totalCents),
    status:     partial.status ?? "draft",
    currency:   partial.currency ?? "USD",
    createdAt:  now,
    updatedAt:  now,
  });
}
