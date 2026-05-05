/**
 * craftShareEvents — records each time a user shares or downloads a build card.
 *
 * Logged fire-and-forget from the ShareCard component immediately after the
 * export succeeds. No auth required — anonymous shares are tracked via a
 * guest session id that the client generates and reuses for the session.
 *
 * shareMethod:
 *   "download" — user clicked "Save PNG" and the file was downloaded locally
 *   "native"   — user clicked "Share" and navigator.share() completed
 */

import { pgTable, uuid, text, numeric, timestamp, index } from "drizzle-orm/pg-core";

export const craftShareEventsTable = pgTable("craft_share_events", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  craftType:          text("craft_type").notNull(),
  score:              numeric("score", { precision: 5, scale: 2 }).notNull(),
  recommendationName: text("recommendation_name").notNull(),
  shareMethod:        text("share_method").notNull().$type<"download" | "native">(),
  sessionId:          uuid("session_id"),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  byCraft:  index("craft_share_events_craft_idx").on(t.craftType),
  byMethod: index("craft_share_events_method_idx").on(t.shareMethod),
  byDate:   index("craft_share_events_date_idx").on(t.createdAt),
}));

export type CraftShareEvent = typeof craftShareEventsTable.$inferSelect;
export type InsertCraftShareEvent = typeof craftShareEventsTable.$inferInsert;
