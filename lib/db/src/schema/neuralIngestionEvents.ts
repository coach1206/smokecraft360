/**
 * neural_ingestion_events — Phase 0: Neural Substrate.
 *
 * Raw behavioral events captured BEFORE AXIOM AI processing.
 * This is the "chaos" layer — unmanaged guest flow that the
 * ChaosAnalyticsService uses to establish the pre-AXIOM baseline.
 *
 * Every kiosk, terminal, and touchpoint feeds here first.
 * The Neural Ingestion Engine then classifies and forwards.
 */

import { pgTable, uuid, text, timestamp, jsonb, real, index } from "drizzle-orm/pg-core";

export const neuralIngestionEventsTable = pgTable("neural_ingestion_events", {
  id:            uuid("id").primaryKey().defaultRandom(),
  venueId:       uuid("venue_id"),
  sessionId:     text("session_id"),
  guestId:       text("guest_id"),
  deviceId:      text("device_id"),

  eventType:     text("event_type").notNull(),

  rawPayload:    jsonb("raw_payload").$type<Record<string, unknown>>(),
  dwellMs:       real("dwell_ms"),
  hesitationMs:  real("hesitation_ms"),
  interactionX:  real("interaction_x"),
  interactionY:  real("interaction_y"),

  axiomProcessed: text("axiom_processed").notNull().default("pending"),

  ingestionPhase: text("ingestion_phase").notNull().default("shadow"),

  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  byVenue:    index("nie_venue_idx").on(t.venueId),
  bySession:  index("nie_session_idx").on(t.sessionId),
  byType:     index("nie_type_idx").on(t.eventType),
  byPhase:    index("nie_phase_idx").on(t.axiomProcessed),
}));

export type NeuralIngestionEvent      = typeof neuralIngestionEventsTable.$inferSelect;
export type InsertNeuralIngestionEvent = typeof neuralIngestionEventsTable.$inferInsert;
