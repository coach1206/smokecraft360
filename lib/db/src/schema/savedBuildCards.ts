/**
 * savedBuildCards — snapshot of a completed craft build saved to a user's
 * loyalty profile.
 *
 * One row per completed build that the user opts to save (or is auto-saved
 * at the reveal phase). Unlike craftBuilds (which upserts a single row per
 * user+craft), this table accumulates a full history so guests can look back
 * at all past builds and re-export any build card at any time.
 */

import { pgTable, uuid, text, numeric, timestamp, index } from "drizzle-orm/pg-core";

export const CRAFT_TYPES_SAVED = ["smoke", "brew", "pour", "vape"] as const;
export type SavedCraftType = typeof CRAFT_TYPES_SAVED[number];

export const savedBuildCardsTable = pgTable("saved_build_cards", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  userId:             uuid("user_id").notNull(),
  craftType:          text("craft_type").notNull().$type<SavedCraftType>(),
  styleTitle:         text("style_title").notNull().default(""),
  moodTitle:          text("mood_title").notNull().default(""),
  recommendationName: text("recommendation_name").notNull().default(""),
  score:              numeric("score", { precision: 5, scale: 2 }).notNull().default("0"),
  savedAt:            timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byUser:  index("saved_build_cards_user_idx").on(t.userId),
  byCraft: index("saved_build_cards_craft_idx").on(t.craftType),
}));

export type SavedBuildCard = typeof savedBuildCardsTable.$inferSelect;
export type InsertSavedBuildCard = typeof savedBuildCardsTable.$inferInsert;
