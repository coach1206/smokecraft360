/**
 * tournaments — craft competition events.
 *
 * Types:
 *   live      — 30-minute real-time sprint
 *   daily     — 24-hour rolling window
 *   weekly    — 7-day window, reset every Monday
 *   venue     — 60–90-day venue championship
 *   grand     — 6-month grand championship
 *
 * Status lifecycle: upcoming → active → scoring → completed | cancelled
 */

import {
  pgTable, uuid, text, integer, boolean,
  timestamp, pgEnum, index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tournamentTypeEnum = pgEnum("tournament_type", [
  "live",
  "daily",
  "weekly",
  "venue",
  "grand",
]);

export const tournamentStatusEnum = pgEnum("tournament_status", [
  "upcoming",
  "active",
  "scoring",
  "completed",
  "cancelled",
]);

export const tournamentsTable = pgTable("tournaments", {
  id:          uuid("id").primaryKey().defaultRandom(),
  title:       text("title").notNull(),
  description: text("description"),
  type:        tournamentTypeEnum("type").notNull(),
  craftType:   text("craft_type"),
  venueId:     uuid("venue_id"),
  status:      tournamentStatusEnum("status").notNull().default("upcoming"),
  startAt:     timestamp("start_at", { withTimezone: true }).notNull(),
  endAt:       timestamp("end_at", { withTimezone: true }).notNull(),
  maxEntrants: integer("max_entrants"),
  prizeFirst:  text("prize_first"),
  prizeSecond: text("prize_second"),
  prizeThird:  text("prize_third"),
  featured:    boolean("featured").notNull().default(false),
  createdBy:   uuid("created_by"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byStatus:    index("tournaments_status_idx").on(t.status),
  byType:      index("tournaments_type_idx").on(t.type),
  byVenue:     index("tournaments_venue_idx").on(t.venueId),
  byStartAt:   index("tournaments_start_at_idx").on(t.startAt),
}));

export const insertTournamentSchema = createInsertSchema(tournamentsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament       = typeof tournamentsTable.$inferSelect;

/**
 * tournamentEntries — one row per user per tournament.
 * score is updated each time the user completes a craft build during the window.
 */
export const tournamentEntriesTable = pgTable("tournament_entries", {
  id:           uuid("id").primaryKey().defaultRandom(),
  tournamentId: uuid("tournament_id").notNull().references(() => tournamentsTable.id, { onDelete: "cascade" }),
  userId:       uuid("user_id").notNull(),
  userName:     text("user_name"),
  craftBuildId: uuid("craft_build_id"),
  score:        integer("score").notNull().default(0),
  rank:         integer("rank"),
  joinedAt:     timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byTournament: index("tournament_entries_tournament_idx").on(t.tournamentId),
  byUser:       index("tournament_entries_user_idx").on(t.userId),
  byScore:      index("tournament_entries_score_idx").on(t.score),
}));

export const insertTournamentEntrySchema = createInsertSchema(tournamentEntriesTable).omit({
  id: true, joinedAt: true, updatedAt: true,
});
export type InsertTournamentEntry = z.infer<typeof insertTournamentEntrySchema>;
export type TournamentEntry       = typeof tournamentEntriesTable.$inferSelect;
