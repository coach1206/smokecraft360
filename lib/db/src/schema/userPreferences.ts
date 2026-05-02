/**
 * userPreferencesTable — captures every preference snapshot a user submits.
 *
 * Written each time /api/recommend is called, giving us a time-series of
 * what guests are asking for, which drives flavor trend analytics.
 */

import { pgTable, uuid, text, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productCategoryEnum } from "./products";

export const userPreferencesTable = pgTable("user_preferences", {
  id:               uuid("id").primaryKey().defaultRandom(),
  userId:           uuid("user_id"),            // null for anonymous guests
  venueId:          uuid("venue_id"),
  sessionId:        text("session_id"),          // opaque browser session token
  category:         productCategoryEnum("category").notNull(),
  flavorPreferences: json("flavor_preferences")
                       .$type<string[]>()
                       .notNull()
                       .default([]),
  strength:         integer("strength").notNull().default(3),
  mood:             text("mood").notNull(),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

export const insertUserPreferenceSchema = createInsertSchema(userPreferencesTable).omit({
  id: true, createdAt: true,
});
export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;
export type UserPreference       = typeof userPreferencesTable.$inferSelect;
