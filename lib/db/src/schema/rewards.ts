/**
 * rewards — catalogue of redeemable perks created by venue admins or globally.
 *
 * type:
 *   "discount"   — percentage off next order (e.g. 10% off)
 *   "free_item"  — complimentary product (e.g. cigar pairing)
 *   "experience" — event access or VIP service (e.g. tasting event)
 *
 * levelRequired maps to the 0-based tier index:
 *   0 Explorer | 1 Enthusiast | 2 Aficionado | 3 Connoisseur | 4 Maestro
 */

import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const REWARD_TYPES = ["discount", "free_item", "experience"] as const;
export type RewardType = typeof REWARD_TYPES[number];

export const rewardsTable = pgTable("rewards", {
  id:            uuid("id").primaryKey().defaultRandom(),
  venueId:       uuid("venue_id"),           // null = global / available everywhere
  name:          text("name").notNull(),
  description:   text("description"),
  type:          text("type").notNull().default("discount").$type<RewardType>(),
  pointsCost:    integer("points_cost").notNull().default(100),
  levelRequired: integer("level_required").notNull().default(0),
  active:        boolean("active").notNull().default(true),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

export type Reward = typeof rewardsTable.$inferSelect;
