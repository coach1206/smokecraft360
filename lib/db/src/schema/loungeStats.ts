/**
 * loungeStats — aggregated performance metrics per venue for the Lounge League.
 *
 * Populated/updated by:
 *  1. xpEngine.ts on each verified order (upserts this row)
 *  2. GET /api/lounge-league endpoint (live-computes and caches)
 *
 * trendingScore (composite):
 *   weeklyOrders × 25 + totalVerifiedOrders × 8 + uniqueUsers × 5
 *
 * Badges:
 *   "top_rated"      — #1 trending score this week
 *   "most_active"    — most verified orders ever
 *   "best_experience"— highest avgExperienceScore
 *   "trending_venue" — largest weekly orders spike
 */

import { pgTable, uuid, integer, real, text, timestamp } from "drizzle-orm/pg-core";

export const LOUNGE_BADGES = [
  "top_rated",
  "most_active",
  "best_experience",
  "trending_venue",
] as const;

export type LoungeBadge = typeof LOUNGE_BADGES[number];

export const loungeStatsTable = pgTable("lounge_stats", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  loungeId:              uuid("lounge_id").notNull().unique(),
  totalOrders:           integer("total_orders").notNull().default(0),
  totalVerifiedOrders:   integer("total_verified_orders").notNull().default(0),
  weeklyOrders:          integer("weekly_orders").notNull().default(0),
  totalUsers:            integer("total_users").notNull().default(0),
  repeatCustomers:       integer("repeat_customers").notNull().default(0),
  averageExperienceScore: real("average_experience_score").notNull().default(0),
  trendingScore:         integer("trending_score").notNull().default(0),
  weeklyRank:            integer("weekly_rank"),
  monthlyRank:           integer("monthly_rank"),
  badges:                text("badges").notNull().default(""),
  updatedAt:             timestamp("updated_at").notNull().defaultNow(),
});

export type LoungeStats = typeof loungeStatsTable.$inferSelect;
