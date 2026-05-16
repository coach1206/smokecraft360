import {
  pgTable, uuid, text, real, integer,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const operationalAwarenessScoresTable = pgTable(
  "operational_awareness_scores",
  {
    id:                uuid("id").primaryKey().defaultRandom(),
    venueId:           uuid("venue_id").notNull(),
    overallScore:      real("overall_score").notNull().default(0),
    staffReadiness:    real("staff_readiness").notNull().default(0),
    guestSatisfaction: real("guest_satisfaction").notNull().default(0),
    inventoryHealth:   real("inventory_health").notNull().default(0),
    socialMomentum:    real("social_momentum").notNull().default(0),
    temporalAlignment: real("temporal_alignment").notNull().default(0),
    environmentalFit:  real("environmental_fit").notNull().default(0),
    riskLevel:         text("risk_level").notNull().default("low"),
    activeAlerts:      integer("active_alerts").notNull().default(0),
    recommendations:   jsonb("recommendations").$type<string[]>().notNull().default([]),
    factors:           jsonb("factors").$type<Record<string, number>>().notNull().default({}),
    period:            text("period").notNull().default("5m"),
    windowStart:       timestamp("window_start").notNull().defaultNow(),
    createdAt:         timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("oas_venue_idx").on(t.venueId, t.createdAt),
    index("oas_risk_idx").on(t.venueId, t.riskLevel),
  ],
);

export type OperationalAwarenessScore       = typeof operationalAwarenessScoresTable.$inferSelect;
export type InsertOperationalAwarenessScore = typeof operationalAwarenessScoresTable.$inferInsert;
