import {
  pgTable, uuid, text, real, integer, boolean,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const guestContextProfilesTable = pgTable(
  "guest_context_profiles",
  {
    id:                  uuid("id").primaryKey().defaultRandom(),
    venueId:             text("venue_id").notNull(),
    guestId:             text("guest_id").notNull(),
    currentMood:         text("current_mood").notNull().default("neutral"),
    engagementLevel:     real("engagement_level").notNull().default(0.5),
    interactionVelocity: real("interaction_velocity").notNull().default(0),
    sessionDepth:        integer("session_depth").notNull().default(0),
    currentCraft:        text("current_craft"),
    isActive:            boolean("is_active").notNull().default(true),
    isVip:               boolean("is_vip").notNull().default(false),
    groupId:             text("group_id"),
    groupRole:           text("group_role"),
    socialInfluence:     real("social_influence").notNull().default(0),
    conversionReadiness: real("conversion_readiness").notNull().default(0),
    upsellReceptivity:   real("upsell_receptivity").notNull().default(0.5),
    temporalContext:     jsonb("temporal_context").$type<Record<string, unknown>>().default({}),
    recentEvents:        jsonb("recent_events").$type<string[]>().default([]),
    staffAlerts:         jsonb("staff_alerts").$type<string[]>().default([]),
    lastSeenAt:          timestamp("last_seen_at").notNull().defaultNow(),
    updatedAt:           timestamp("updated_at").notNull().defaultNow(),
    createdAt:           timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("gcp_venue_idx").on(t.venueId),
    index("gcp_guest_idx").on(t.guestId),
    index("gcp_active_idx").on(t.isActive),
    index("gcp_vip_idx").on(t.isVip),
    index("gcp_updated_idx").on(t.updatedAt),
  ],
);

export type GuestContextProfile       = typeof guestContextProfilesTable.$inferSelect;
export type InsertGuestContextProfile = typeof guestContextProfilesTable.$inferInsert;
