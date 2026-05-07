/**
 * venueInventoryTable — tracks which products a venue stocks and at what quantity.
 *
 * flavorProfile JSONB maps to AI Sage nudge matching:
 *   { "body": "full", "notes": ["cocoa", "earth"] }
 *
 * premiumTier (1–5) drives upsell logic in the Nudge engine:
 *   1 = house / entry, 5 = ultra-premium / collector
 */

import { pgTable, uuid, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type FlavorProfile = {
  body?:  string;
  notes?: string[];
  [key: string]: unknown;
};

export const venueInventoryTable = pgTable("venue_inventory", {
  id:            uuid("id").primaryKey().defaultRandom(),
  venueId:       uuid("venue_id").notNull(),
  productId:     text("product_id").notNull(),
  quantity:      integer("quantity").notNull().default(0),
  available:     boolean("available").notNull().default(true),
  /** Price in cents (e.g. 2500 = $25.00) */
  priceCents:    integer("price_cents"),
  /** flavor_profile JSONB — { body, notes[] } — drives AI Sage nudge matching */
  flavorProfile: jsonb("flavor_profile").$type<FlavorProfile>(),
  /** 1–5 upsell tier for Revenue Brain premium scoring */
  premiumTier:   integer("premium_tier").notNull().default(1),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

export const insertVenueInventorySchema = createInsertSchema(venueInventoryTable).omit({
  id: true, updatedAt: true,
});
export type InsertVenueInventory = z.infer<typeof insertVenueInventorySchema>;
export type VenueInventory       = typeof venueInventoryTable.$inferSelect;
