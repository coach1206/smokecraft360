import {
  pgTable, uuid, text, real, integer,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const venueBehaviorProfilesTable = pgTable(
  "venue_behavior_profiles",
  {
    id:                   uuid("id").primaryKey().defaultRandom(),
    venueId:              text("venue_id").notNull(),
    peakHours:            jsonb("peak_hours").$type<number[]>().default([]),
    craftAffinities:      jsonb("craft_affinities").$type<Record<string, number>>().default({}),
    avgSessionDurationMs: integer("avg_session_duration_ms").notNull().default(0),
    avgConversionRate:    real("avg_conversion_rate").notNull().default(0),
    avgRevenuePerSession: real("avg_revenue_per_session").notNull().default(0),
    socialDensityProfile: jsonb("social_density_profile").$type<Record<string, number>>().default({}),
    vipFrequency:         real("vip_frequency").notNull().default(0),
    ambientResponseMap:   jsonb("ambient_response_map").$type<Record<string, number>>().default({}),
    topPatterns:          jsonb("top_patterns").$type<string[]>().default([]),
    dnaVersion:           integer("dna_version").notNull().default(1),
    sampleSize:           integer("sample_size").notNull().default(0),
    confidence:           real("confidence").notNull().default(0),
    lastUpdated:          timestamp("last_updated").notNull().defaultNow(),
    createdAt:            timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("vbp_venue_idx").on(t.venueId),
    index("vbp_confidence_idx").on(t.confidence),
    index("vbp_updated_idx").on(t.lastUpdated),
  ],
);

export type VenueBehaviorProfile       = typeof venueBehaviorProfilesTable.$inferSelect;
export type InsertVenueBehaviorProfile = typeof venueBehaviorProfilesTable.$inferInsert;
