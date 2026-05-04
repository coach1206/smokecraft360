/**
 * designDrafts — Pre-gameplay design playground saves.
 *
 * Users design their creation (band, box, label, glass, etc.) BEFORE
 * entering the guided build flow. Drafts are saved here so they can
 * resume their design on return visits.
 *
 * lockedFields lists the design properties that require a Signature
 * Studio unlock before they become editable (full palette, 3D box, etc.).
 */

import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { CRAFT_TYPES, type CraftType } from "./craftBuilds";

export const designDraftsTable = pgTable("design_drafts", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       uuid("user_id").notNull(),
  venueId:      uuid("venue_id"),
  craft:        text("craft").notNull().$type<CraftType>(),
  draftName:    text("draft_name").notNull().default("My Draft"),
  payload:      jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  lockedFields: text("locked_fields").array().notNull().default([]),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  byUser:  index("design_drafts_user_idx").on(t.userId),
  byVenue: index("design_drafts_venue_idx").on(t.venueId),
  byCraft: index("design_drafts_craft_idx").on(t.craft),
}));

export { CRAFT_TYPES };

export type DesignDraft = typeof designDraftsTable.$inferSelect;
export type InsertDesignDraft = typeof designDraftsTable.$inferInsert;
