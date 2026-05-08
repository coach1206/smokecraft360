/**
 * biometric_pulse_maps — Phase 1: Venue DNA.
 *
 * Interaction timing rhythms — the "pulse" of the venue.
 * NOT physiological biometrics. Captures:
 *   - interaction cadence (how fast guests tap/swipe)
 *   - dwell zone distributions (where attention concentrates)
 *   - session rhythm signatures (acceleration/deceleration patterns)
 *
 * Used by PersonalityClassifierService to fingerprint venue energy.
 */

import { pgTable, uuid, text, timestamp, jsonb, real, index } from "drizzle-orm/pg-core";

export const biometricPulseMapsTable = pgTable("biometric_pulse_maps", {
  id:      uuid("id").primaryKey().defaultRandom(),
  venueId: uuid("venue_id").notNull(),

  pulseType: text("pulse_type").notNull(),

  avgInteractionIntervalMs: real("avg_interaction_interval_ms"),
  peakInteractionBpm:       real("peak_interaction_bpm"),
  restingCadenceBpm:        real("resting_cadence_bpm"),

  dwellHeatmap:      jsonb("dwell_heatmap").$type<number[][]>(),
  rhythmSignature:   jsonb("rhythm_signature").$type<number[]>(),
  cadenceVariance:   real("cadence_variance"),

  hourOfDay:  text("hour_of_day"),
  dayOfWeek:  text("day_of_week"),

  sampleWindow: text("sample_window").notNull().default("24h"),
  recordedAt:   timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  byVenue:  index("bpm_venue_idx").on(t.venueId),
  byPulse:  index("bpm_pulse_idx").on(t.venueId, t.pulseType),
  byTime:   index("bpm_time_idx").on(t.hourOfDay, t.dayOfWeek),
}));

export type BiometricPulseMap      = typeof biometricPulseMapsTable.$inferSelect;
export type InsertBiometricPulseMap = typeof biometricPulseMapsTable.$inferInsert;
