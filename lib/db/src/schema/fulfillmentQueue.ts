/**
 * fulfillmentQueue — bartender and server task queue for Axiom Order Layer.
 *
 * Each row is a fulfillment task derived from a tab item or order.
 * Staff (bartender/server) claim, progress, and complete tasks.
 *
 * Status: pending → claimed → preparing → ready → delivered | cancelled
 * Queue type: bar (bartender makes it) | floor (server delivers it)
 */

import {
  pgTable, uuid, text, integer, timestamp, index,
} from "drizzle-orm/pg-core";

export const FULFILLMENT_STATUSES = [
  "pending", "claimed", "preparing", "ready", "delivered", "cancelled",
] as const;
export type FulfillmentStatus = typeof FULFILLMENT_STATUSES[number];

export const QUEUE_TYPES = ["bar", "floor"] as const;
export type QueueType = typeof QUEUE_TYPES[number];

export const fulfillmentQueueTable = pgTable("fulfillment_queue", {
  id:            uuid("id").primaryKey().defaultRandom(),
  venueId:       uuid("venue_id").notNull(),
  tabId:         uuid("tab_id"),
  tabItemId:     uuid("tab_item_id"),
  orderId:       uuid("order_id"),
  queueType:     text("queue_type").notNull().default("bar").$type<QueueType>(),
  status:        text("status").notNull().default("pending").$type<FulfillmentStatus>(),
  productName:   text("product_name").notNull(),
  craftType:     text("craft_type"),
  quantity:      integer("quantity").notNull().default(1),
  tableNumber:   text("table_number"),
  guestNotes:    text("guest_notes"),
  claimedBy:     uuid("claimed_by"),
  claimedAt:     timestamp("claimed_at"),
  preparedAt:    timestamp("prepared_at"),
  readyAt:       timestamp("ready_at"),
  deliveredAt:   timestamp("delivered_at"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  byVenueStatus: index("fq_venue_status_idx").on(t.venueId, t.status),
  byTab:         index("fq_tab_idx").on(t.tabId),
}));

export type FulfillmentTask       = typeof fulfillmentQueueTable.$inferSelect;
export type InsertFulfillmentTask = typeof fulfillmentQueueTable.$inferInsert;
