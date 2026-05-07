/**
 * guest_badges — earned achievement badges per guest profile.
 *
 * Badge IDs (stable):
 *   first_draft       — first completed craft session
 *   bold_five         — 5 sessions completed
 *   rare_palate       — harmony ≥80 AND complexity ≥70 in one session
 *   golden_box        — total_mastery reached 100
 *   regional_top10    — leaderboard rank ≤10
 *   prestige_pick     — chose a distributor-sponsored product
 */

import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { guestProfilesTable }                     from "./guestProfiles";

export const guestBadgesTable = pgTable("guest_badges", {
  id:             uuid("id").primaryKey().defaultRandom(),
  guestProfileId: uuid("guest_profile_id")
    .notNull()
    .references(() => guestProfilesTable.id, { onDelete: "cascade" }),
  badgeId:        text("badge_id").notNull(),
  earnedAt:       timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  meta:           jsonb("meta").$type<Record<string, unknown>>().default({}),
});

export type GuestBadge = typeof guestBadgesTable.$inferSelect;
