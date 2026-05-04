/**
 * campaignsTable — sponsored promotion campaigns.
 *
 * Future-ready structure allowing distributors and brands to run
 * time-boxed sponsored campaigns.  Products reference a campaignId
 * from the products table.
 *
 * Status lifecycle: draft → active → paused → completed | cancelled
 */

import { pgTable, uuid, text, integer, boolean, timestamp, pgEnum, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
]);

export const CAMPAIGN_TYPES = [
  "BRAND_SPOTLIGHT",
  "DOUBLE_XP",
  "FEATURED_PAIRING",
  "VENUE_CHALLENGE",
  "COMPETITION",
  "GENERAL",
] as const;
export type CampaignType = typeof CAMPAIGN_TYPES[number];

export const campaignsTable = pgTable("campaigns", {
  id:              uuid("id").primaryKey().defaultRandom(),
  name:            text("name").notNull(),
  type:            text("type").notNull().default("GENERAL").$type<CampaignType>(),
  brandId:         uuid("brand_id"),
  distributorId:   uuid("distributor_id"),
  venueId:         uuid("venue_id"),
  craftType:       text("craft_type"),
  status:          campaignStatusEnum("status").notNull().default("draft"),
  boostMultiplier: doublePrecision("boost_multiplier").notNull().default(1.0),
  xpMultiplier:    doublePrecision("xp_multiplier").notNull().default(1.0),
  rewardBonus:     integer("reward_bonus").notNull().default(0),
  budgetCents:     integer("budget_cents"),
  budgetLimit:     integer("budget_limit"),
  impressionGoal:  integer("impression_goal"),
  maxRedemptions:  integer("max_redemptions"),
  startDate:       timestamp("start_date"),
  endDate:         timestamp("end_date"),
  notes:           text("notes"),
  active:          boolean("active").notNull().default(true),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign       = typeof campaignsTable.$inferSelect;
