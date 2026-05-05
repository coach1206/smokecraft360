/**
 * ai_insights — deterministic AI-generated insight records derived from
 * real event_logs aggregations. No LLM calls — insights are computed from
 * thresholds applied to behavioral data, then stored here so the dashboard
 * can display them without re-running heavy queries on every page load.
 *
 * Severity levels: INFO | ALERT | OPPORTUNITY
 */

import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const aiInsightsTable = pgTable("ai_insights", {
  id:          uuid("id").primaryKey().defaultRandom(),
  venueId:     text("venue_id").notNull(),
  insightType: text("insight_type").notNull(),
  title:       text("title").notNull(),
  summary:     text("summary").notNull(),
  severity:    text("severity").notNull().default("INFO"),
  sourceData:  jsonb("source_data").$type<Record<string, unknown>>(),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export type AiInsight       = typeof aiInsightsTable.$inferSelect;
export type InsertAiInsight = typeof aiInsightsTable.$inferInsert;
