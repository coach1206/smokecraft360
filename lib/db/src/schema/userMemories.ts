/**
 * user_memories — recallable facts about a user that an AI assistant can
 * pull on subsequent visits.
 *
 * Distinct from `userPreferences` (which is a fire-and-forget time-series
 * of recommendation snapshots). A memory is a single key→value statement
 * that survives across sessions:
 *
 *   key="preferred_origin"  value="cuban"
 *   key="allergy"           value="peanut"
 *   key="celebrating"       value="anniversary on march 4"
 *   key="dislikes"          value="peated whiskies"
 *
 * source:
 *   "manual"   — user explicitly set this (or staff set on their behalf)
 *   "inferred" — derived by an AI pipeline; lower confidence is expected
 *
 * confidence is a float 0..1; manual memories should default to 1.0.
 *
 * lastUsedAt is touched whenever the memory is surfaced into a prompt or
 * recommendation, so future slices can prune stale memories or rank by
 * recency-of-use.
 *
 * Per-user cap (enforced in the route, not the schema) is 50 rows.
 */

import { pgTable, uuid, text, doublePrecision, timestamp, unique, index } from "drizzle-orm/pg-core";

export const MEMORY_SOURCES = ["manual", "inferred"] as const;
export type MemorySource = typeof MEMORY_SOURCES[number];

export const userMemoriesTable = pgTable(
  "user_memories",
  {
    id:         uuid("id").primaryKey().defaultRandom(),
    userId:     uuid("user_id").notNull(),
    venueId:    uuid("venue_id"),                                 // null = no venue context
    key:        text("key").notNull(),                            // slug, ≤64 chars (route-enforced)
    value:      text("value").notNull(),                          // ≤500 chars (route-enforced)
    source:     text("source").notNull().default("manual").$type<MemorySource>(),
    confidence: doublePrecision("confidence").notNull().default(1.0),
    createdAt:  timestamp("created_at").notNull().defaultNow(),
    updatedAt:  timestamp("updated_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (t) => ({
    // Upserting the same key for the same user replaces the value — the
    // unique constraint is what makes ON CONFLICT possible in the route.
    uniqUserKey: unique("user_memories_user_key_unique").on(t.userId, t.key),
    byUser:      index("user_memories_user_idx").on(t.userId),
  }),
);

export type UserMemory = typeof userMemoriesTable.$inferSelect;
