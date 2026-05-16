import {
  pgTable, uuid, text, real,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const engagementScoresTable = pgTable(
  "engagement_scores",
  {
    id:              uuid("id").primaryKey().defaultRandom(),
    venueId:         uuid("venue_id").notNull(),
    entityId:        text("entity_id").notNull(),
    entityType:      text("entity_type").notNull().default("venue"),
    scoreType:       text("score_type").notNull().default("composite"),
    overallScore:    real("overall_score").notNull().default(0),
    interactionScore:real("interaction_score").notNull().default(0),
    retentionScore:  real("retention_score").notNull().default(0),
    socialScore:     real("social_score").notNull().default(0),
    craftScore:      real("craft_score").notNull().default(0),
    velocityDelta:   real("velocity_delta").notNull().default(0),
    factors:         jsonb("factors").$type<Record<string, number>>().notNull().default({}),
    windowMinutes:   real("window_minutes").notNull().default(5),
    period:          text("period").notNull().default("5m"),
    createdAt:       timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("egs_venue_idx").on(t.venueId, t.createdAt),
    index("egs_entity_idx").on(t.entityId, t.entityType),
    index("egs_type_idx").on(t.venueId, t.scoreType),
  ],
);

export type EngagementScore       = typeof engagementScoresTable.$inferSelect;
export type InsertEngagementScore = typeof engagementScoresTable.$inferInsert;
