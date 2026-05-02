/**
 * userLoyaltyPoints — redeemable loyalty point balance per user.
 *
 * Points are SEPARATE from XP (XP gates tier progression; points are
 * spent on rewards). Both are awarded only from verified orders.
 *
 * Points schedule:
 *   cigar          → +10 pts
 *   drink          → +8  pts
 *   food           → +5  pts
 *   full combo     → +25 pts bonus (cigar + drink + food)
 *   welcome bonus  → +50 pts (first order ever, Explorer perk)
 *
 * pointsBalance = totalPoints - pointsRedeemed
 */

import { pgTable, uuid, integer, timestamp } from "drizzle-orm/pg-core";

export const userLoyaltyPointsTable = pgTable("user_loyalty_points", {
  id:             uuid("id").primaryKey().defaultRandom(),
  userId:         uuid("user_id").notNull().unique(),
  totalPoints:    integer("total_points").notNull().default(0),
  pointsRedeemed: integer("points_redeemed").notNull().default(0),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export type UserLoyaltyPoints = typeof userLoyaltyPointsTable.$inferSelect;
