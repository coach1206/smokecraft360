/**
 * redemptions — records when a user spends points on a reward.
 *
 * status:
 *   "pending"   — claimed, awaiting staff fulfilment
 *   "fulfilled" — delivered by staff
 *   "cancelled" — voided (points NOT refunded by default)
 */

import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const REDEMPTION_STATUSES = ["pending", "fulfilled", "cancelled"] as const;
export type RedemptionStatus = typeof REDEMPTION_STATUSES[number];

export const redemptionsTable = pgTable("redemptions", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      uuid("user_id").notNull(),
  rewardId:    uuid("reward_id").notNull(),
  rewardName:  text("reward_name").notNull(),
  pointsSpent: integer("points_spent").notNull(),
  status:      text("status").notNull().default("pending").$type<RedemptionStatus>(),
  notes:       text("notes"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export type Redemption = typeof redemptionsTable.$inferSelect;
