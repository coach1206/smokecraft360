/**
 * craftSessionStates — timer + streak + save/resume state for craft builds.
 *
 * One active row per (userId, craft) pair. When a new build begins, any
 * existing row is overwritten (upsert). On resume the row is restored so
 * the user continues from where they left off.
 *
 * timerDurationSecs defaults to 2100 (35 min). The actual duration is
 * chosen randomly between 1800–2280 s (30–38 min) at build start and
 * stored here so it is stable across page reloads.
 */

import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { type CraftType, type CraftPhase } from "./craftBuilds";

export const craftSessionStatesTable = pgTable("craft_session_states", {
  id:                uuid("id").primaryKey().defaultRandom(),
  userId:            uuid("user_id").notNull(),
  venueId:           uuid("venue_id"),
  craft:             text("craft").notNull().$type<CraftType>(),
  buildId:           uuid("build_id"),
  timerStartedAt:    timestamp("timer_started_at"),
  timerDurationSecs: integer("timer_duration_secs").notNull().default(2100),
  phase:             text("phase").notNull().default("intro").$type<CraftPhase>(),
  streakCount:       integer("streak_count").notNull().default(0),
  lastSavedAt:       timestamp("last_saved_at"),
  expiresAt:         timestamp("expires_at"),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  byUser:  index("craft_session_states_user_idx").on(t.userId),
  byVenue: index("craft_session_states_venue_idx").on(t.venueId),
  byCraft: index("craft_session_states_craft_idx").on(t.craft),
}));

export type CraftSessionState = typeof craftSessionStatesTable.$inferSelect;
export type InsertCraftSessionState = typeof craftSessionStatesTable.$inferInsert;
