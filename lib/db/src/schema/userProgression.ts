/**
 * userProgression — server-side XP and progression for the 5-tier level system.
 *
 * One row per userId. Upserted whenever a verified order is processed.
 *
 * XP is awarded ONLY when an order has verified = true.
 *
 * Level tiers (computed at query time or application layer):
 *   0  Explorer           — 0–4 verified orders  /   0–49 XP
 *   1  Enthusiast         — 5–14 verified orders  /  50–149 XP
 *   2  Aficionado         — 15–29 verified orders  / 150–349 XP
 *   3  Connoisseur        — 30–59 verified orders  / 350–699 XP
 *   4  Maestro del Fuego  — 60+ verified orders   /  700+ XP
 *
 * Both conditions (orders AND xp) must reach the tier threshold to advance.
 */

import { pgTable, uuid, integer, timestamp } from "drizzle-orm/pg-core";

export const userProgressionTable = pgTable("user_progression", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  userId:               uuid("user_id").notNull().unique(),
  xp:                   integer("xp").notNull().default(0),
  totalVerifiedOrders:  integer("total_verified_orders").notNull().default(0),
  totalCigarsSmoked:    integer("total_cigars_smoked").notNull().default(0),
  totalDrinksTried:     integer("total_drinks_tried").notNull().default(0),
  totalFoodOrders:      integer("total_food_orders").notNull().default(0),
  blendsCreated:        integer("blends_created").notNull().default(0),
  uniqueProductsTried:  integer("unique_products_tried").notNull().default(0),
  updatedAt:            timestamp("updated_at").notNull().defaultNow(),
  createdAt:            timestamp("created_at").notNull().defaultNow(),
});

export type UserProgression = typeof userProgressionTable.$inferSelect;
