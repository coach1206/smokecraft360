/**
 * dataConflictsTable — records mismatches between authoritative data sources.
 *
 * Brief A (post Brief 42): a single store for any cross-source conflict
 * (vendor vs POS price, distributor vs admin inventory count, etc). The
 * table is write-side only — detection callers call `recordConflict()` from
 * the api-server service, and a super_admin / venue_owner / manager
 * resolves them from the new "Conflicts" dashboard tab.
 *
 * No FK constraints (consistent with the rest of this repo's loose schema
 * — see orders/reservations) and no auto-detection wiring in this brief;
 * callers will be added incrementally.
 */

import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const CONFLICT_ENTITY_TYPES = [
  "product", "inventory", "price", "venue", "other",
] as const;
export type ConflictEntityType = typeof CONFLICT_ENTITY_TYPES[number];

export const CONFLICT_SOURCES = [
  "vendor", "pos", "distributor", "system", "admin", "manual",
] as const;
export type ConflictSource = typeof CONFLICT_SOURCES[number];

export const CONFLICT_STATUSES = ["open", "resolved", "dismissed"] as const;
export type ConflictStatus = typeof CONFLICT_STATUSES[number];

export const CONFLICT_RESOLUTIONS = [
  "use_a", "use_b", "use_custom", "dismissed",
] as const;
export type ConflictResolution = typeof CONFLICT_RESOLUTIONS[number];

export const dataConflictsTable = pgTable("data_conflicts", {
  id:           uuid("id").primaryKey().defaultRandom(),
  entityType:   text("entity_type").notNull().$type<ConflictEntityType>(),
  /** product.id (text) or inventory.id (uuid) — kept text so any id shape works. */
  entityId:     text("entity_id").notNull(),
  /** Optional venue scope; null for cross-venue / system-level conflicts. */
  venueId:      uuid("venue_id"),
  fieldName:    text("field_name").notNull(),
  sourceA:      text("source_a").notNull().$type<ConflictSource>(),
  /** Stringified value (numbers / json all serialized as text for portability). */
  valueA:       text("value_a").notNull(),
  sourceB:      text("source_b").notNull().$type<ConflictSource>(),
  valueB:       text("value_b").notNull(),
  detectedAt:   timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  detectedBy:   uuid("detected_by"),
  status:       text("status").notNull().default("open").$type<ConflictStatus>(),
  resolution:   text("resolution").$type<ConflictResolution>(),
  /** The value the resolver chose to keep (echo of valueA / valueB / custom). */
  resolvedValue: text("resolved_value"),
  resolvedBy:   uuid("resolved_by"),
  resolvedAt:   timestamp("resolved_at", { withTimezone: true }),
  notes:        text("notes"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  venueIdx:        index("conflicts_venue_idx").on(t.venueId),
  statusIdx:       index("conflicts_status_idx").on(t.status),
  venueStatusIdx:  index("conflicts_venue_status_idx").on(t.venueId, t.status),
}));

export const insertDataConflictSchema = createInsertSchema(dataConflictsTable).omit({
  id: true, createdAt: true, updatedAt: true,
  status: true, resolution: true, resolvedValue: true, resolvedBy: true, resolvedAt: true,
});
export type InsertDataConflict = z.infer<typeof insertDataConflictSchema>;
export type DbDataConflict     = typeof dataConflictsTable.$inferSelect;
