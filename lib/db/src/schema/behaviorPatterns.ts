/**
 * behavior_patterns — Phase 1: Venue DNA.
 *
 * Detected behavioral patterns from accumulated guest interactions.
 * PatternClassifier identifies recurring sequences and encodes them.
 *
 * Examples:
 *   - "guests hesitate before second swipe" → hesitation_cliff
 *   - "VIP conversion peaks at minute 8"   → conversion_window
 *   - "cigar guests return within 48h"     → rapid_return_loop
 */

import { pgTable, uuid, text, timestamp, jsonb, real, integer, boolean, index } from "drizzle-orm/pg-core";

export const behaviorPatternsTable = pgTable("behavior_patterns", {
  id:      uuid("id").primaryKey().defaultRandom(),
  venueId: uuid("venue_id").notNull(),

  patternKey:    text("pattern_key").notNull(),
  patternFamily: text("pattern_family").notNull(),

  description:  text("description"),
  confidence:   real("confidence").notNull().default(0),
  frequency:    real("frequency").notNull().default(0),
  strength:     real("strength").notNull().default(0),
  sampleSize:   integer("sample_size").notNull().default(0),

  triggerConditions: jsonb("trigger_conditions").$type<Record<string, unknown>>(),
  responseProfile:   jsonb("response_profile").$type<Record<string, unknown>>(),

  active:    boolean("active").notNull().default(true),
  firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
  lastSeen:  timestamp("last_seen",  { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  byVenue:   index("bp_venue_idx").on(t.venueId),
  byPattern: index("bp_pattern_idx").on(t.venueId, t.patternKey),
  byFamily:  index("bp_family_idx").on(t.patternFamily),
}));

export type BehaviorPattern      = typeof behaviorPatternsTable.$inferSelect;
export type InsertBehaviorPattern = typeof behaviorPatternsTable.$inferInsert;
