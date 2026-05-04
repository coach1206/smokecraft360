import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campaignEntriesTable = pgTable("campaign_entries", {
  id:        uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull(),
  userId:    uuid("user_id").notNull(),
  venueId:   uuid("venue_id"),
  style:     text("style").notNull(),
  score:     integer("score").notNull().default(0),
  answers:   text("answers"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCampaignEntrySchema = createInsertSchema(campaignEntriesTable).omit({
  id: true, createdAt: true,
});
export type InsertCampaignEntry = z.infer<typeof insertCampaignEntrySchema>;
export type CampaignEntry = typeof campaignEntriesTable.$inferSelect;
