import {
  pgTable, uuid, text, real, integer, boolean,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const guestPreferenceProfilesTable = pgTable(
  "guest_preference_profiles",
  {
    id:                  uuid("id").primaryKey().defaultRandom(),
    venueId:             text("venue_id").notNull(),
    guestId:             text("guest_id").notNull(),
    craftAffinities:     jsonb("craft_affinities").$type<Record<string, number>>().default({}),
    flavorAffinities:    jsonb("flavor_affinities").$type<Record<string, number>>().default({}),
    strengthPreference:  real("strength_preference").notNull().default(0.5),
    socialScore:         real("social_score").notNull().default(0.5),
    premiumAffinity:     real("premium_affinity").notNull().default(0.5),
    adventureScore:      real("adventure_score").notNull().default(0.5),
    sessionCount:        integer("session_count").notNull().default(0),
    totalInteractions:   integer("total_interactions").notNull().default(0),
    conversionRate:      real("conversion_rate").notNull().default(0),
    avgSessionDurationMs: integer("avg_session_duration_ms").notNull().default(0),
    mentorId:            text("mentor_id"),
    isVip:               boolean("is_vip").notNull().default(false),
    vipDetectedAt:       timestamp("vip_detected_at"),
    confidence:          real("confidence").notNull().default(0),
    lastEvolved:         timestamp("last_evolved").notNull().defaultNow(),
    version:             integer("version").notNull().default(1),
    createdAt:           timestamp("created_at").notNull().defaultNow(),
    updatedAt:           timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("gpp_venue_idx").on(t.venueId),
    index("gpp_guest_idx").on(t.guestId),
    index("gpp_vip_idx").on(t.isVip),
    index("gpp_confidence_idx").on(t.confidence),
  ],
);

export type GuestPreferenceProfile       = typeof guestPreferenceProfilesTable.$inferSelect;
export type InsertGuestPreferenceProfile = typeof guestPreferenceProfilesTable.$inferInsert;
