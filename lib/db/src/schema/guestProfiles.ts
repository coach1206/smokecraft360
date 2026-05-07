/**
 * guest_profiles — persistent kiosk guest identity.
 *
 * Distinct from `users` (which requires email + password and covers staff/admin).
 * A guest profile is created during kiosk enrollment and identified by
 * first name + phone last-4 for fast return.
 *
 * publicId format: "Marcus T · 4827"  (firstName + lastInitial + phoneLast4 or random 4-digit pin)
 * phoneHash: bcrypt of full phone number (never stored raw).
 *
 * flavorHistory: living array of { tag, count, lastSeen } entries that grow
 * as the guest swipes through craft sessions — drives mentor commentary and
 * auto-recommendation on future visits.
 */

import { pgTable, uuid, text, integer, real, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type FlavorHistoryEntry = {
  tag: string;
  count: number;
  lastSeen: string;
};

export const guestProfilesTable = pgTable(
  "guest_profiles",
  {
    id:                   uuid("id").primaryKey().defaultRandom(),
    publicId:             text("public_id").notNull().unique(),
    firstName:            text("first_name").notNull(),
    lastInitial:          text("last_initial").notNull(),
    lastName:             text("last_name"),           // Universal Identity Key: Last Name + Phone Last 4
    phoneLast4:           text("phone_last4"),
    phoneHash:            text("phone_hash"),
    email:                text("email"),
    ageRange:             text("age_range"),
    region:               text("region"),
    atmospherePreference: text("atmosphere_preference"),
    experienceLevel:      text("experience_level"),
    boldnessPreference:   text("boldness_preference"),
    assignedMentorId:     text("assigned_mentor_id"),
    gender:               text("gender"),
    venueId:              uuid("venue_id"),
    flavorHistory:        jsonb("flavor_history")
      .$type<FlavorHistoryEntry[]>()
      .default([]),
    sessionCount:         integer("session_count").notNull().default(0),
    totalMastery:         real("total_mastery").notNull().default(0),
    masteryTier:          text("mastery_tier").notNull().default("explorer"),
    lastSessionScore:     integer("last_session_score").notNull().default(0),
    createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt:           timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Universal Identity Key index — enables cross-venue guest lookup by Last Name + Phone Last 4
    index("idx_guest_key").on(t.lastName, t.phoneLast4),
  ],
);

export const insertGuestProfileSchema = createInsertSchema(guestProfilesTable).omit({
  id: true, createdAt: true, lastSeenAt: true,
});

export type InsertGuestProfile = z.infer<typeof insertGuestProfileSchema>;
export type GuestProfile       = typeof guestProfilesTable.$inferSelect;
