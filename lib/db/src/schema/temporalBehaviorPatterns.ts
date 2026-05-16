import {
  pgTable, uuid, text, real, integer,
  timestamp, jsonb, index, unique,
} from "drizzle-orm/pg-core";

export const temporalBehaviorPatternsTable = pgTable(
  "temporal_behavior_patterns",
  {
    id:              uuid("id").primaryKey().defaultRandom(),
    venueId:         uuid("venue_id").notNull(),
    patternType:     text("pattern_type").notNull(),
    hourOfDay:       integer("hour_of_day"),
    dayOfWeek:       integer("day_of_week"),
    weekOfYear:      integer("week_of_year"),
    avgEngagement:   real("avg_engagement").notNull().default(0),
    avgRevenue:      real("avg_revenue").notNull().default(0),
    avgGuestCount:   real("avg_guest_count").notNull().default(0),
    peakCraft:       text("peak_craft"),
    conversionRate:  real("conversion_rate").notNull().default(0),
    sampleCount:     integer("sample_count").notNull().default(0),
    confidence:      real("confidence").notNull().default(0),
    features:        jsonb("features").$type<Record<string, number>>().notNull().default({}),
    updatedAt:       timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("tbp_venue_idx").on(t.venueId, t.patternType),
    index("tbp_hour_idx").on(t.venueId, t.hourOfDay),
    index("tbp_day_idx").on(t.venueId, t.dayOfWeek),
    unique("tbp_venue_pattern_hour_day").on(t.venueId, t.patternType, t.hourOfDay, t.dayOfWeek),
  ],
);

export type TemporalBehaviorPattern       = typeof temporalBehaviorPatternsTable.$inferSelect;
export type InsertTemporalBehaviorPattern = typeof temporalBehaviorPatternsTable.$inferInsert;
