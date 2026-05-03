/**
 * menuItemsTable — venue food/bar menu items the kiosk can suggest and sell.
 *
 * Distinct from `data/foods.ts` (which carries pairing-only flavor tags used
 * by the recommendation engine). This table holds REAL orderable items per
 * venue: name, description, price, imageUrl, plus a tags array that overlaps
 * with the engine's flavor / pairing tags so the menu-suggestion service can
 * filter by current pairing context.
 *
 * Filtering pattern (services/menuSuggestion.ts):
 *   menu.filter(item => pairingTags.some(t => item.tags.includes(t)))
 *
 * NOT renaming or replacing the food pairing engine — these two systems
 * cooperate: the engine recommends *what kind* of food, this table is the
 * vendor's actual orderable item list.
 */

import { pgTable, uuid, text, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const menuItemsTable = pgTable("menu_items", {
  id:          uuid("id").primaryKey().defaultRandom(),
  /** Optional venue scope. NULL = available to every venue (default house menu). */
  venueId:     uuid("venue_id"),
  name:        text("name").notNull(),
  description: text("description"),
  /** Loose category — kitchen / bar / dessert / appetizer. Free text so
   *  vendors can tune their own taxonomy without a migration. */
  category:    text("category").notNull().default("kitchen"),
  /** Pairing/flavor tags — overlap intentional with the engine's flavor
   *  taxonomy (smoky, sweet, citrus, etc.) so menu items match the
   *  pairing context returned by /api/recommend. */
  tags:        json("tags").$type<string[]>().notNull().default([]),
  /** Price in cents. Required (we sell these). */
  priceCents:  integer("price_cents").notNull(),
  imageUrl:    text("image_url"),
  available:   boolean("available").notNull().default(true),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export const insertMenuItemSchema = createInsertSchema(menuItemsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem       = typeof menuItemsTable.$inferSelect;
