/**
 * demandRequestsTable — tracks guest requests for products not currently in venue inventory.
 *
 * Populated when a user taps "Request This Item" on an out-of-stock product.
 * Used by the Inventory Intelligence engine to surface high-demand missing items
 * and generate restock suggestions for venue owners.
 */

import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema }              from "drizzle-zod";
import { z }                               from "zod/v4";

export const demandRequestsTable = pgTable("demand_requests", {
  id:          uuid("id").primaryKey().defaultRandom(),
  venueId:     uuid("venue_id"),
  productId:   text("product_id").notNull(),
  productName: text("product_name"),
  category:    text("category"),
  userId:      uuid("user_id"),
  sessionId:   text("session_id"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const insertDemandRequestSchema = createInsertSchema(demandRequestsTable).omit({
  id: true, createdAt: true,
});
export type InsertDemandRequest = z.infer<typeof insertDemandRequestSchema>;
export type DemandRequest       = typeof demandRequestsTable.$inferSelect;
