/**
 * orchestratorEvents — persisted orchestration profiles for analytics.
 *
 * One row is written per session when the orchestrator computes a profile.
 * Enables analytics: mood distribution, premium intent trends, pacing effectiveness.
 */

import { pgTable, uuid, text, integer, numeric, timestamp, index } from "drizzle-orm/pg-core";

export const orchestratorEventsTable = pgTable("orchestrator_events", {
  id:                     uuid("id").primaryKey().defaultRandom(),
  sessionId:              uuid("session_id"),
  venueId:                uuid("venue_id"),
  craftType:              text("craft_type").notNull().default("smoke"),
  mood:                   text("mood").notNull().default("focused"),
  pacing:                 text("pacing").notNull().default("balanced"),
  confidence:             integer("confidence").notNull().default(40),
  premiumIntent:          integer("premium_intent").notNull().default(30),
  socialEnergy:           integer("social_energy").notNull().default(40),
  recommendationPressure: integer("recommendation_pressure").notNull().default(50),
  atmosphereIntensity:    integer("atmosphere_intensity").notNull().default(65),
  venueMode:              text("venue_mode"),
  sessionDepth:           integer("session_depth").notNull().default(0),
  avgSwipeMs:             integer("avg_swipe_ms").notNull().default(1500),
  skipRatio:              numeric("skip_ratio", { precision: 4, scale: 3 }).notNull().default("0.5"),
  createdAt:              timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("orc_evt_venue_idx").on(t.venueId),
  index("orc_evt_session_idx").on(t.sessionId),
  index("orc_evt_created_idx").on(t.createdAt),
]);

export type OrchestratorEvent      = typeof orchestratorEventsTable.$inferSelect;
export type InsertOrchestratorEvent = typeof orchestratorEventsTable.$inferInsert;
