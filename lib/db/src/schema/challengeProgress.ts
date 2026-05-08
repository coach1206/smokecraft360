/**
 * challenge_progress — AI-generated challenge questions and guest answers.
 * Records every challenge attempt with full question/answer context.
 */

import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const challengeProgressTable = pgTable("challenge_progress", {
  id:             uuid("id").primaryKey().defaultRandom(),
  guestProfileId: uuid("guest_profile_id"),
  sessionId:      uuid("session_id"),
  craftType:      text("craft_type").notNull(),
  skillLevel:     text("skill_level").notNull().default("explorer"),
  question:       text("question").notNull(),
  options:        jsonb("options").$type<string[]>().notNull(),
  correctIndex:   integer("correct_index").notNull(),
  selectedIndex:  integer("selected_index"),
  wasCorrect:     boolean("was_correct"),
  xpAwarded:      integer("xp_awarded").notNull().default(0),
  explanation:    text("explanation"),
  answeredAt:     timestamp("answered_at"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
}, t => ({
  byGuest:   index("challenge_guest_idx").on(t.guestProfileId),
  bySession: index("challenge_session_idx").on(t.sessionId),
}));

export type ChallengeProgress = typeof challengeProgressTable.$inferSelect;
export type InsertChallengeProgress = typeof challengeProgressTable.$inferInsert;
