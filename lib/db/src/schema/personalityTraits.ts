/**
 * personality_traits — Phase 1: Venue DNA.
 *
 * Individual trait scores that compose a venue's DNA profile.
 * Each trait is independently tracked and weighted.
 * VenueDNAService aggregates these into the composite profile.
 */

import { pgTable, uuid, text, timestamp, real, integer, index } from "drizzle-orm/pg-core";

export const personalityTraitsTable = pgTable("personality_traits", {
  id:      uuid("id").primaryKey().defaultRandom(),
  venueId: uuid("venue_id").notNull(),

  traitName:     text("trait_name").notNull(),
  traitCategory: text("trait_category").notNull(),

  score:      real("score").notNull().default(50),
  confidence: real("confidence").notNull().default(0),
  sampleSize: integer("sample_size").notNull().default(0),

  trend:     text("trend").notNull().default("stable"),
  delta7d:   real("delta_7d").notNull().default(0),
  delta30d:  real("delta_30d").notNull().default(0),

  measuredAt: timestamp("measured_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  byVenue:     index("pt_venue_idx").on(t.venueId),
  byVenueTrait: index("pt_venue_trait_idx").on(t.venueId, t.traitName),
}));

export type PersonalityTrait      = typeof personalityTraitsTable.$inferSelect;
export type InsertPersonalityTrait = typeof personalityTraitsTable.$inferInsert;
