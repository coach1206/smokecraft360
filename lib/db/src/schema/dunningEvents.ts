/**
 * dunning_events — append-only audit log of every payment-recovery action
 * taken for a venue. One row per discrete event (reminder sent, payment
 * failed, retry scheduled, recovered, canceled).
 *
 * Used to:
 *   - drive the "Next attempt in X hours" countdown in the UI (most-recent
 *     row with non-null next_retry_at)
 *   - track attempt_count for analytics ("how many times did we retry
 *     before recovering / canceling")
 *   - reconstruct the dunning timeline for support
 *
 * Source of truth for billing state itself remains `subscriptions`. This
 * table only records the events leading up to state transitions.
 */

import { pgTable, uuid, text, integer, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const dunningEventTypeEnum = pgEnum("dunning_event_type", [
  "reminder",   // invoice.upcoming → renewal coming
  "failed",     // invoice.payment_failed
  "retry",      // smart-retry scheduled
  "recovered",  // payment recovered after past_due
  "canceled",   // subscription terminated
]);

export const dunningEventsTable = pgTable("dunning_events", {
  id:           uuid("id").primaryKey().defaultRandom(),
  venueId:      uuid("venue_id").notNull(),
  type:         dunningEventTypeEnum("type").notNull(),
  attemptCount: integer("attempt_count").notNull().default(0),
  nextRetryAt:  timestamp("next_retry_at"),
  // Free-form context: stripe invoice/subscription id, amount, etc.
  metadata:     jsonb("metadata"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export type DbDunningEvent     = typeof dunningEventsTable.$inferSelect;
export type InsertDunningEvent = typeof dunningEventsTable.$inferInsert;
