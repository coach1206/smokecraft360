/**
 * supply360 — Sovereign Supply Chain & Verification Ledger schema.
 *
 * Two tables:
 *   supply_chain_entries      — current inventory state per SKU per venue.
 *   supply_verification_ledger — append-only mutation log; every stock change
 *                                writes here before (or concurrent with) the
 *                                SUPPLY_LEDGER_MUTATION pgPubSub broadcast.
 */

import {
  pgTable, uuid, text, timestamp, jsonb, integer, real, index, uniqueIndex, pgEnum,
} from "drizzle-orm/pg-core";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const supplyStatusEnum = pgEnum("supply_status", [
  "in_stock",
  "low_stock",
  "back_ordered",
  "allocated",
  "discontinued",
  "pending_verification",
]);

export const supplyMutationTypeEnum = pgEnum("supply_mutation_type", [
  "restock",
  "depletion",
  "back_order",
  "allocation",
  "deallocation",
  "verification",
  "adjustment",
  "transfer",
]);

// ── supply_chain_entries ──────────────────────────────────────────────────────

export const supplyChainEntriesTable = pgTable("supply_chain_entries", {
  id:        uuid("id").primaryKey().defaultRandom(),
  venueId:   uuid("venue_id").notNull(),

  sku:         text("sku").notNull(),
  productName: text("product_name").notNull(),
  category:    text("category").notNull(),

  quantityOnHand:  integer("quantity_on_hand").notNull().default(0),
  quantityReserved: integer("quantity_reserved").notNull().default(0),
  reorderThreshold: integer("reorder_threshold").notNull().default(5),
  unit:            text("unit").notNull().default("units"),

  status:          supplyStatusEnum("status").notNull().default("in_stock"),
  supplierName:    text("supplier_name"),
  supplierRef:     text("supplier_ref"),
  orderRef:        text("order_ref"),
  customAllocation: jsonb("custom_allocation").$type<Record<string, unknown>>(),

  verificationHash: text("verification_hash"),
  lastMutatedAt:    timestamp("last_mutated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  byVenue:      index("sce_venue_idx").on(t.venueId),
  byVenueSku:   uniqueIndex("sce_venue_sku_idx").on(t.venueId, t.sku),
  byStatus:     index("sce_status_idx").on(t.status),
  byMutatedAt:  index("sce_mutated_idx").on(t.lastMutatedAt),
}));

export type SupplyChainEntry       = typeof supplyChainEntriesTable.$inferSelect;
export type InsertSupplyChainEntry = typeof supplyChainEntriesTable.$inferInsert;

// ── supply_verification_ledger ────────────────────────────────────────────────

export const supplyVerificationLedgerTable = pgTable("supply_verification_ledger", {
  id:      uuid("id").primaryKey().defaultRandom(),
  entryId: uuid("entry_id").notNull(),
  venueId: uuid("venue_id").notNull(),

  mutationType:     supplyMutationTypeEnum("mutation_type").notNull(),
  quantityDelta:    integer("quantity_delta").notNull().default(0),
  previousQuantity: integer("previous_quantity").notNull().default(0),
  newQuantity:      integer("new_quantity").notNull().default(0),

  operatorId:       text("operator_id"),
  operatorRole:     text("operator_role"),
  supplierRef:      text("supplier_ref"),
  orderRef:         text("order_ref"),

  confidenceScore:  real("confidence_score"),
  verificationHash: text("verification_hash"),
  broadcastedAt:    timestamp("broadcasted_at", { withTimezone: true }),
  metadata:         jsonb("metadata").$type<Record<string, unknown>>(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  byEntry:    index("svl_entry_idx").on(t.entryId),
  byVenue:    index("svl_venue_idx").on(t.venueId),
  byType:     index("svl_type_idx").on(t.mutationType),
  byCreated:  index("svl_created_idx").on(t.createdAt),
}));

export type SupplyVerificationLedger       = typeof supplyVerificationLedgerTable.$inferSelect;
export type InsertSupplyVerificationLedger = typeof supplyVerificationLedgerTable.$inferInsert;
