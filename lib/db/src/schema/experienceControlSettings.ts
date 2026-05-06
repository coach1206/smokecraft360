/**
 * experienceControlSettings — venue-level tuning for the Immersive Experience Engine.
 *
 * Rows with craftType = null are global settings for the venue.
 * Rows with a craftType value are per-craft overrides (smoke/pour/brew/vape).
 * Rows with venueId = null are platform-level defaults (super_admin only).
 *
 * Lookup priority: per-craft row > global row > platform defaults.
 */

import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const PERFORMANCE_MODES = ["cinematic", "balanced", "low-power"] as const;
export type PerformanceMode = typeof PERFORMANCE_MODES[number];

export const EXPERIENCE_CRAFT_TYPES = ["smoke", "pour", "brew", "vape"] as const;
export type ExperienceCraftType = typeof EXPERIENCE_CRAFT_TYPES[number];

export const experienceControlSettingsTable = pgTable("experience_control_settings", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  venueId:             uuid("venue_id"),          // null = platform default
  craftType:           text("craft_type"),         // null = global; or "smoke"|"pour"|"brew"|"vape"
  atmosphereIntensity: integer("atmosphere_intensity").notNull().default(70),
  particleDensity:     integer("particle_density").notNull().default(65),
  motionCalmness:      integer("motion_calmness").notNull().default(55),
  revealPacing:        integer("reveal_pacing").notNull().default(70),
  soundVolume:         integer("sound_volume").notNull().default(40),
  performanceMode:     text("performance_mode").notNull().default("balanced").$type<PerformanceMode>(),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
  updatedAt:           timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("exp_ctrl_venue_idx").on(t.venueId),
  index("exp_ctrl_craft_idx").on(t.craftType),
]);

export type ExperienceControlSettings      = typeof experienceControlSettingsTable.$inferSelect;
export type InsertExperienceControlSettings = typeof experienceControlSettingsTable.$inferInsert;
