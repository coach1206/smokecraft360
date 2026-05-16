import {
  pgTable, uuid, text, real, boolean,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const predictiveContextScoresTable = pgTable(
  "predictive_context_scores",
  {
    id:                uuid("id").primaryKey().defaultRandom(),
    venueId:           text("venue_id").notNull(),
    guestId:           text("guest_id"),
    scoreType:         text("score_type").notNull(),
    horizon:           text("horizon").notNull().default("15m"),
    score:             real("score").notNull().default(0),
    confidence:        real("confidence").notNull().default(0),
    contextWindow:     jsonb("context_window").$type<Record<string, unknown>>().default({}),
    temporalFactors:   jsonb("temporal_factors").$type<Record<string, number>>().default({}),
    socialFactors:     jsonb("social_factors").$type<Record<string, number>>().default({}),
    environmentalFactors: jsonb("environmental_factors").$type<Record<string, number>>().default({}),
    isActualized:      boolean("is_actualized").notNull().default(false),
    actualScore:       real("actual_score"),
    validUntil:        timestamp("valid_until"),
    createdAt:         timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("pcs_venue_idx").on(t.venueId),
    index("pcs_type_idx").on(t.scoreType),
    index("pcs_guest_idx").on(t.guestId),
    index("pcs_created_idx").on(t.createdAt),
  ],
);

export type PredictiveContextScore       = typeof predictiveContextScoresTable.$inferSelect;
export type InsertPredictiveContextScore = typeof predictiveContextScoresTable.$inferInsert;
