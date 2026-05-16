import {
  pgTable, uuid, text, real, integer,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const socialEngagementStateTable = pgTable(
  "social_engagement_state",
  {
    id:              uuid("id").primaryKey().defaultRandom(),
    venueId:         uuid("venue_id").notNull(),
    groupId:         text("group_id"),
    groupSize:       integer("group_size").notNull().default(1),
    socialEnergy:    real("social_energy").notNull().default(0),
    conversationRate:real("conversation_rate").notNull().default(0),
    sharedOrders:    integer("shared_orders").notNull().default(0),
    viralMoment:     real("viral_moment_score").notNull().default(0),
    clusterType:     text("cluster_type").notNull().default("solo"),
    dominantCraft:   text("dominant_craft"),
    peakMomentAt:    timestamp("peak_moment_at"),
    engagementArc:   jsonb("engagement_arc").$type<number[]>().notNull().default([]),
    metadata:        jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    windowStart:     timestamp("window_start").notNull().defaultNow(),
    updatedAt:       timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("ses_venue_idx").on(t.venueId, t.updatedAt),
    index("ses_group_idx").on(t.venueId, t.groupId),
    index("ses_cluster_idx").on(t.venueId, t.clusterType),
  ],
);

export type SocialEngagementState       = typeof socialEngagementStateTable.$inferSelect;
export type InsertSocialEngagementState = typeof socialEngagementStateTable.$inferInsert;
