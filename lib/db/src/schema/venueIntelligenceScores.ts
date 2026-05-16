import {
  pgTable, uuid, text, real, integer,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const venueIntelligenceScoresTable = pgTable(
  "venue_intelligence_scores",
  {
    id:                    uuid("id").primaryKey().defaultRandom(),
    venueId:               text("venue_id").notNull(),
    overallScore:          real("overall_score").notNull().default(0),
    engagementScore:       real("engagement_score").notNull().default(0),
    conversionScore:       real("conversion_score").notNull().default(0),
    ambientEffectiveness:  real("ambient_effectiveness").notNull().default(0),
    recommendationQuality: real("recommendation_quality").notNull().default(0),
    staffResponsiveness:   real("staff_responsiveness").notNull().default(0),
    inventoryHealth:       real("inventory_health").notNull().default(0),
    socialEnergy:          real("social_energy").notNull().default(0),
    vipSatisfaction:       real("vip_satisfaction").notNull().default(0),
    revenueVelocity:       real("revenue_velocity").notNull().default(0),
    activeGuests:          integer("active_guests").notNull().default(0),
    activeSessions:        integer("active_sessions").notNull().default(0),
    breakdown:             jsonb("breakdown").$type<Record<string, unknown>>().default({}),
    period:                text("period").notNull().default("15m"),
    windowStart:           timestamp("window_start").notNull().defaultNow(),
    windowEnd:             timestamp("window_end").notNull().defaultNow(),
    createdAt:             timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("vis_venue_idx").on(t.venueId),
    index("vis_created_idx").on(t.createdAt),
    index("vis_window_idx").on(t.windowStart),
    index("vis_score_idx").on(t.overallScore),
  ],
);

export type VenueIntelligenceScore       = typeof venueIntelligenceScoresTable.$inferSelect;
export type InsertVenueIntelligenceScore = typeof venueIntelligenceScoresTable.$inferInsert;
