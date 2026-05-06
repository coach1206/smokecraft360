/**
 * guest_sessions — one row per kiosk craft session for a guest.
 *
 * Tracks swipe history and blend snapshot so mentors can recall what
 * a guest explored during any past visit.  Linked to guest_profiles
 * by guestProfileId (no FK constraint — resilient to profile deletes).
 *
 * status: "active" while in-progress, "completed" on RevealPage dismiss,
 *         "abandoned" if kiosk idles out before completion.
 */

import { pgTable, uuid, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export type SwipeHistoryEntry = {
  itemId: string;
  action: "add" | "skip";
  ts: string;
};

export const guestSessionsTable = pgTable("guest_sessions", {
  id:             uuid("id").primaryKey().defaultRandom(),
  guestProfileId: uuid("guest_profile_id").notNull(),
  craftType:      text("craft_type").notNull(),
  mentorId:       text("mentor_id").notNull(),
  swipeHistory:   jsonb("swipe_history")
    .$type<SwipeHistoryEntry[]>()
    .default([]),
  blendSnapshot:  jsonb("blend_snapshot")
    .$type<Record<string, number>>()
    .default({}),
  status:         text("status").notNull().default("active"),
  sessionNumber:  integer("session_number").notNull().default(1),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt:    timestamp("completed_at", { withTimezone: true }),
});

export type GuestSession       = typeof guestSessionsTable.$inferSelect;
export type InsertGuestSession = typeof guestSessionsTable.$inferInsert;
