import { pgTable, uuid, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";

/**
 * training_analytics_events — append-only event log for all training activity.
 *
 * Event types:
 *   page_view        — user entered a training page
 *   slide_advance    — investor/sales slide moved forward
 *   step_complete    — employee/walkthrough/scenario step completed
 *   scenario_start   — scenario mission started
 *   scenario_complete— scenario mission finished with score
 *   sign_off         — manager sign-off submitted
 *   cert_issued      — certification generated
 *   reset            — training data reset performed
 *   account_activate — sandbox training account activated
 */
export const trainingAnalyticsEventsTable = pgTable("training_analytics_events", {
  id:          uuid("id").primaryKey().defaultRandom(),
  sessionId:   uuid("session_id"),               // training session (nullable for anonymous)
  userId:      uuid("user_id"),                  // nullable for guest/kiosk flow
  eventType:   text("event_type").notNull(),
  page:        text("page"),                     // "hub" | "employee" | "scenarios" | "investor" | "sales" | "walkthrough" | "certifications"
  role:        text("role"),                     // training role if applicable
  scenarioId:  text("scenario_id"),              // for scenario events
  stepIndex:   integer("step_index"),            // step number within page/scenario
  slideIndex:  integer("slide_index"),           // slide number for investor/sales
  score:       integer("score"),                 // points earned at event time
  durationMs:  integer("duration_ms"),           // time spent on this step/slide in ms
  metadata:    jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  bySession:   index("tae_session_idx").on(t.sessionId),
  byUser:      index("tae_user_idx").on(t.userId),
  byType:      index("tae_type_idx").on(t.eventType),
  byCreated:   index("tae_created_idx").on(t.createdAt),
}));

export type TrainingAnalyticsEvent       = typeof trainingAnalyticsEventsTable.$inferSelect;
export type InsertTrainingAnalyticsEvent = typeof trainingAnalyticsEventsTable.$inferInsert;
