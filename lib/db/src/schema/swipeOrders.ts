/**
 * swipeOrders — tables for the Add-to-Order pipeline from the Swipe Experience Engine.
 *
 * Tables:
 *   swipeOrdersTable              — one order per swipe session
 *   swipeOrderItemsTable          — line items within an order
 *   inventoryReservationsTable    — temporary stock holds during checkout
 */

import {
  pgTable, uuid, text, integer, timestamp, numeric, index,
} from "drizzle-orm/pg-core";

// ── swipe_orders ──────────────────────────────────────────────────────────────

export const swipeOrdersTable = pgTable("swipe_orders", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      uuid("user_id"),                     // null = guest
  sessionId:   uuid("session_id"),                  // experience_sessions.id
  venueId:     uuid("venue_id"),
  status:      text("status").notNull().default("pending"),   // pending | confirmed | cancelled | refunded
  subtotal:    integer("subtotal_cents").notNull().default(0), // in cents
  notes:       text("notes"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  bySession: index("swipe_orders_session_idx").on(t.sessionId),
  byUser:    index("swipe_orders_user_idx").on(t.userId),
  byStatus:  index("swipe_orders_status_idx").on(t.status),
}));

export type SwipeOrder = typeof swipeOrdersTable.$inferSelect;

// ── swipe_order_items ─────────────────────────────────────────────────────────

export const swipeOrderItemsTable = pgTable("swipe_order_items", {
  id:              uuid("id").primaryKey().defaultRandom(),
  orderId:         uuid("order_id").notNull(),       // swipe_orders.id
  inventoryId:     text("inventory_id").notNull(),   // products.id or venue_inventory.id
  inventoryName:   text("inventory_name").notNull(),
  quantity:        integer("quantity").notNull().default(1),
  priceCents:      integer("price_cents").notNull().default(0),
  totalCents:      integer("total_cents").notNull().default(0),
  tags:            text("tags").array().default([]),
  craftType:       text("craft_type"),               // smoke | pour | brew | vape
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  byOrder: index("swipe_order_items_order_idx").on(t.orderId),
}));

export type SwipeOrderItem = typeof swipeOrderItemsTable.$inferSelect;

// ── inventory_reservations ────────────────────────────────────────────────────

export const inventoryReservationsTable = pgTable("inventory_reservations", {
  id:          uuid("id").primaryKey().defaultRandom(),
  inventoryId: text("inventory_id").notNull(),       // products.id
  sessionId:   uuid("session_id"),                   // experience_sessions.id
  orderId:     uuid("order_id"),                     // swipe_orders.id
  quantity:    integer("quantity").notNull().default(1),
  expiresAt:   timestamp("expires_at").notNull(),
  releasedAt:  timestamp("released_at"),             // null = still active
  createdAt:   timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  byInventory: index("inv_res_inventory_idx").on(t.inventoryId),
  bySession:   index("inv_res_session_idx").on(t.sessionId),
  byExpiry:    index("inv_res_expiry_idx").on(t.expiresAt),
}));

export type InventoryReservation = typeof inventoryReservationsTable.$inferSelect;
