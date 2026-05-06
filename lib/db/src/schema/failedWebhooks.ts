/**
 * failedWebhooks — dead-letter queue for Stripe webhook events that
 * could not be processed on first delivery.
 *
 * A background retry worker re-attempts rows in "pending" state with
 * exponential back-off (max 5 attempts, then "exhausted").
 *
 * Status machine: pending → retrying → recovered | exhausted
 */

import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const failedWebhooksTable = pgTable("failed_webhooks", {
  id:            uuid("id").primaryKey().defaultRandom(),
  stripeEventId: text("stripe_event_id").notNull(),
  eventType:     text("event_type").notNull(),
  payload:       text("payload").notNull(),
  errorMessage:  text("error_message").notNull(),
  status:        text("status").notNull().default("pending"),
  attempts:      integer("attempts").notNull().default(0),
  maxAttempts:   integer("max_attempts").notNull().default(5),
  nextRetryAt:   timestamp("next_retry_at").notNull().defaultNow(),
  resolvedAt:    timestamp("resolved_at"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  byStatus:   index("failed_webhooks_status_idx").on(t.status),
  byRetry:    index("failed_webhooks_retry_idx").on(t.nextRetryAt),
  byEventId:  index("failed_webhooks_event_id_idx").on(t.stripeEventId),
}));

export type FailedWebhook       = typeof failedWebhooksTable.$inferSelect;
export type InsertFailedWebhook = typeof failedWebhooksTable.$inferInsert;
