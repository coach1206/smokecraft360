import {
  pgTable, uuid, text, real, integer,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const engagementScoreHistoryTable = pgTable(
  "engagement_score_history",
  {
    id:              uuid("id").primaryKey().defaultRandom(),
    venueId:         text("venue_id").notNull(),
    guestId:         text("guest_id"),
    sessionId:       text("session_id"),
    score:           real("score").notNull().default(0),
    scoreComponents: jsonb("score_components").$type<Record<string, number>>().default({}),
    swipeVelocity:   real("swipe_velocity").notNull().default(0),
    addRate:         real("add_rate").notNull().default(0),
    retentionScore:  real("retention_score").notNull().default(0),
    interactionDepth:integer("interaction_depth").notNull().default(0),
    socialBoost:     real("social_boost").notNull().default(0),
    vipMultiplier:   real("vip_multiplier").notNull().default(1),
    trendDirection:  text("trend_direction").notNull().default("stable"),
    period:          text("period").notNull().default("5m"),
    createdAt:       timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("esh_venue_idx").on(t.venueId),
    index("esh_guest_idx").on(t.guestId),
    index("esh_session_idx").on(t.sessionId),
    index("esh_created_idx").on(t.createdAt),
    index("esh_score_idx").on(t.score),
  ],
);

export type EngagementScoreHistory       = typeof engagementScoreHistoryTable.$inferSelect;
export type InsertEngagementScoreHistory = typeof engagementScoreHistoryTable.$inferInsert;
