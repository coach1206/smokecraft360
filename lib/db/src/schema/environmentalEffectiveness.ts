import {
  pgTable, uuid, text, real, integer,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const environmentalEffectivenessTable = pgTable(
  "environmental_effectiveness",
  {
    id:                 uuid("id").primaryKey().defaultRandom(),
    venueId:            text("venue_id").notNull(),
    sceneId:            text("scene_id").notNull(),
    lightingProfile:    text("lighting_profile").notNull(),
    soundProfile:       text("sound_profile").notNull(),
    craftType:          text("craft_type"),
    hourOfDay:          integer("hour_of_day").notNull(),
    dayOfWeek:          integer("day_of_week").notNull(),
    sampleCount:        integer("sample_count").notNull().default(0),
    avgEngagement:      real("avg_engagement").notNull().default(0),
    avgConversionRate:  real("avg_conversion_rate").notNull().default(0),
    avgRevenuePerGuest: real("avg_revenue_per_guest").notNull().default(0),
    avgSessionDurationS:integer("avg_session_duration_s").notNull().default(0),
    socialEnergyImpact: real("social_energy_impact").notNull().default(0),
    effectivenessScore: real("effectiveness_score").notNull().default(0),
    conditions:         jsonb("conditions").$type<Record<string, unknown>>().default({}),
    updatedAt:          timestamp("updated_at").notNull().defaultNow(),
    createdAt:          timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("ee_venue_idx").on(t.venueId),
    index("ee_scene_idx").on(t.sceneId),
    index("ee_craft_idx").on(t.craftType),
    index("ee_time_idx").on(t.hourOfDay, t.dayOfWeek),
    index("ee_score_idx").on(t.effectivenessScore),
  ],
);

export type EnvironmentalEffectiveness       = typeof environmentalEffectivenessTable.$inferSelect;
export type InsertEnvironmentalEffectiveness = typeof environmentalEffectivenessTable.$inferInsert;
