import {
  pgTable, uuid, text, real, integer, boolean,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const predictiveScoresTable = pgTable(
  "predictive_scores",
  {
    id:                  uuid("id").primaryKey().defaultRandom(),
    venueId:             text("venue_id").notNull(),
    guestId:             text("guest_id"),
    scoreType:           text("score_type").notNull(),
    score:               real("score").notNull().default(0),
    confidence:          real("confidence").notNull().default(0),
    horizon:             text("horizon").notNull().default("15m"),
    modelVersion:        text("model_version").notNull().default("v1"),
    features:            jsonb("features").$type<Record<string, unknown>>().default({}),
    isActualized:        boolean("is_actualized").notNull().default(false),
    actualValue:         real("actual_value"),
    errorMargin:         real("error_margin"),
    validUntil:          timestamp("valid_until"),
    createdAt:           timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("ps_venue_idx").on(t.venueId),
    index("ps_type_idx").on(t.scoreType),
    index("ps_guest_idx").on(t.guestId),
    index("ps_created_idx").on(t.createdAt),
    index("ps_valid_idx").on(t.validUntil),
  ],
);

export type PredictiveScore       = typeof predictiveScoresTable.$inferSelect;
export type InsertPredictiveScore = typeof predictiveScoresTable.$inferInsert;
