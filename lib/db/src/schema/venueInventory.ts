/**
 * venueInventoryTable — tracks which products a venue stocks and at what quantity.
 *
 * Joins to productsTable via productId.  Enables per-venue availability filtering
 * and price-point tracking without polluting the global products table.
 */

import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const venueInventoryTable = pgTable("venue_inventory", {
  id:          uuid("id").primaryKey().defaultRandom(),
  venueId:     uuid("venue_id").notNull(),
  productId:   text("product_id").notNull(),
  quantity:    integer("quantity").notNull().default(0),
  available:   boolean("available").notNull().default(true),
  /** Price in cents (e.g. 2500 = $25.00) */
  priceCents:  integer("price_cents"),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export const insertVenueInventorySchema = createInsertSchema(venueInventoryTable).omit({
  id: true, updatedAt: true,
});
export type InsertVenueInventory = z.infer<typeof insertVenueInventorySchema>;
export type VenueInventory       = typeof venueInventoryTable.$inferSelect;
