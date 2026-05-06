/**
 * craftBuilds — per-step build state for the Universal Craft Experience Engine.
 *
 * One row per build attempt across SmokeCraft, BrewCraft, PourCraft, and
 * VapeCraft. A new row is created when the user advances past the intro phase
 * and is upserted at every subsequent phase transition.
 *
 * Phase lifecycle:  intro → style → profile → match → reveal
 */

import { pgTable, uuid, text, numeric, jsonb, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const CRAFT_TYPES = ["smoke", "brew", "pour", "vape"] as const;
export type CraftType = typeof CRAFT_TYPES[number];

export const CRAFT_PHASES = ["intro", "style", "profile", "match", "reveal"] as const;
export type CraftPhase = typeof CRAFT_PHASES[number];

export const craftBuildsTable = pgTable("craft_builds", {
  id:              uuid("id").primaryKey().defaultRandom(),
  userId:          uuid("user_id").notNull(),
  venueId:         uuid("venue_id"),
  sessionId:       uuid("session_id"),
  craft:           text("craft").notNull().$type<CraftType>(),
  phase:           text("phase").notNull().default("intro").$type<CraftPhase>(),
  styleChoice:     text("style_choice"),
  moodChoice:      text("mood_choice"),
  profileAnswers:  jsonb("profile_answers").$type<Record<string, unknown>>().default({}),
  score:           numeric("score", { precision: 5, scale: 3 }),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  byUser:     index("craft_builds_user_idx").on(t.userId),
  byVenue:    index("craft_builds_venue_idx").on(t.venueId),
  byCraft:    index("craft_builds_craft_idx").on(t.craft),
  byPhase:    index("craft_builds_phase_idx").on(t.phase),
  // Prevent non-numeric or out-of-range text from reaching the score column.
  // Postgres numeric columns reject non-castable strings at insert time, but
  // this explicit constraint makes the rule visible in the schema and ensures
  // scores are bounded to the 0–10 range enforced by the application layer.
  scoreRange: check(
    "craft_builds_score_range",
    sql`${t.score} IS NULL OR (${t.score} >= 0 AND ${t.score} <= 10)`,
  ),
}));

export type CraftBuild = typeof craftBuildsTable.$inferSelect;
export type InsertCraftBuild = typeof craftBuildsTable.$inferInsert;
