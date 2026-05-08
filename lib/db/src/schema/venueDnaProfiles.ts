/**
 * venue_dna_profiles — Phase 1: Venue DNA.
 *
 * The evolving operational personality of each venue.
 * Updated continuously by VenueDNAService as guest signals accumulate.
 *
 * Personality types:
 *   sophisticated_lounge | high_energy_social | vip_centric |
 *   relaxed_premium | sensory_exploration | hybrid
 */

import { pgTable, uuid, text, timestamp, jsonb, real, index } from "drizzle-orm/pg-core";

export const venueDnaProfilesTable = pgTable("venue_dna_profiles", {
  id:      uuid("id").primaryKey().defaultRandom(),
  venueId: uuid("venue_id").notNull().unique(),

  personalityType: text("personality_type").notNull().default("relaxed_premium"),

  energyScore:       real("energy_score").notNull().default(50),
  luxuryScore:       real("luxury_score").notNull().default(50),
  socialScore:       real("social_score").notNull().default(50),
  explorationScore:  real("exploration_score").notNull().default(50),
  conversionScore:   real("conversion_score").notNull().default(50),

  dominantCraft:   text("dominant_craft"),
  peakHour:        text("peak_hour"),
  avgPaceMinutes:  real("avg_pace_minutes"),

  traitVector:   jsonb("trait_vector").$type<number[]>(),
  dnaSignature:  text("dna_signature"),

  evolutionStage: text("evolution_stage").notNull().default("seed"),

  lastSignalAt:  timestamp("last_signal_at", { withTimezone: true }),
  createdAt:     timestamp("created_at",     { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at",     { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  byVenue: index("vdp_venue_idx").on(t.venueId),
  byType:  index("vdp_type_idx").on(t.personalityType),
}));

export type VenueDnaProfile      = typeof venueDnaProfilesTable.$inferSelect;
export type InsertVenueDnaProfile = typeof venueDnaProfilesTable.$inferInsert;
