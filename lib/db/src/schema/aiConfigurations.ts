import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const aiConfigurationsTable = pgTable("ai_configurations", {
  id:         uuid("id").primaryKey().defaultRandom(),
  venueId:    uuid("venue_id"),
  configType: text("config_type").notNull().default("experience"),
  config:     jsonb("config").notNull().$type<Record<string, unknown>>(),
  appliedAt:  timestamp("applied_at").notNull().defaultNow(),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

export type AiConfiguration       = typeof aiConfigurationsTable.$inferSelect;
export type InsertAiConfiguration = typeof aiConfigurationsTable.$inferInsert;
