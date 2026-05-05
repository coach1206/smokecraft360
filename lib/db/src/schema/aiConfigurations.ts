import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const aiConfigurationsTable = pgTable("ai_configurations", {
  id:           uuid("id").primaryKey().defaultRandom(),
  venueId:      uuid("venue_id"),
  configType:   text("config_type").notNull().default("experience"),
  /** Venue location/region for regional pricing calibration */
  location:     text("location"),
  /** Pricing tier: "budget" | "mid" | "premium" | "luxury" */
  pricingTier:  text("pricing_tier").notNull().default("premium"),
  /** Full structured config — tone, pricing strategy, recommended products, upsell sequences, experience flow weights */
  config:       jsonb("config").notNull().$type<Record<string, unknown>>(),
  /** Whether this config is currently active for the venue */
  isActive:     text("is_active").notNull().default("true"),
  appliedAt:    timestamp("applied_at").notNull().defaultNow(),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export type AiConfiguration       = typeof aiConfigurationsTable.$inferSelect;
export type InsertAiConfiguration = typeof aiConfigurationsTable.$inferInsert;
