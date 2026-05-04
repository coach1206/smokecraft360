/**
 * feature_flags — toggleable capabilities scoped by theme and/or venue.
 *
 * Resolution precedence (highest wins):
 *   1. (themeSlug = X, venueId = Y)  — venue override of a theme flag
 *   2. (themeSlug = X, venueId = NULL) — theme-wide default
 *   3. (themeSlug = NULL, venueId = Y) — venue-wide override across themes
 *   4. (themeSlug = NULL, venueId = NULL) — global default
 *
 * Convention:
 *   - name      stable kebab-case identifier ("sound", "animations", "premium-vault")
 *   - enabled   boolean toggle
 *   - The composite uniqueness constraint (theme_slug, venue_id, name) prevents
 *     duplicate scoped rows; nulls are treated as distinct values for grouping.
 */

import { pgTable, text, uuid, boolean, timestamp, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const featureFlagsTable = pgTable(
  "feature_flags",
  {
    id:        uuid("id").primaryKey().defaultRandom(),
    themeSlug: text("theme_slug"),                    // null = applies to all themes
    venueId:   uuid("venue_id"),                      // null = applies to all venues
    name:      text("name").notNull(),
    enabled:   boolean("enabled").notNull().default(false),
    metadata:  jsonb("metadata"),                     // optional structured payload (e.g. intensity config)
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    // Postgres treats NULLs as distinct, so we use COALESCE in a functional
    // unique index to enforce true uniqueness across the (scope, name) pair.
    uniqScope: uniqueIndex("feature_flags_scope_name_uniq").on(
      sql`COALESCE(${t.themeSlug}, '')`,
      sql`COALESCE(${t.venueId}::text, '')`,
      t.name,
    ),
  }),
);

export type DbFeatureFlag     = typeof featureFlagsTable.$inferSelect;
export type InsertFeatureFlag = typeof featureFlagsTable.$inferInsert;
