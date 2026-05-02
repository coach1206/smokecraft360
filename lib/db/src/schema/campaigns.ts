/**
 * campaignsTable — sponsored promotion campaigns.
 *
 * Future-ready structure allowing distributors and brands to run
 * time-boxed sponsored campaigns.  Products reference a campaignId
 * from the products table.
 *
 * Status lifecycle: draft → active → paused → completed | cancelled
 */

import { pgTable, uuid, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
]);

export const campaignsTable = pgTable("campaigns", {
  id:             uuid("id").primaryKey().defaultRandom(),
  name:           text("name").notNull(),
  brandId:        uuid("brand_id"),
  distributorId:  uuid("distributor_id"),
  status:         campaignStatusEnum("status").notNull().default("draft"),
  budgetCents:    integer("budget_cents"),
  impressionGoal: integer("impression_goal"),
  startDate:      timestamp("start_date"),
  endDate:        timestamp("end_date"),
  notes:          text("notes"),
  active:         boolean("active").notNull().default(true),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign       = typeof campaignsTable.$inferSelect;
