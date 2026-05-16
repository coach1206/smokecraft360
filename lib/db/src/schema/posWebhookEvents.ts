import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const webhookEventStatusEnum = pgEnum("pos_webhook_event_status", [
  "received", "processing", "processed", "failed", "ignored",
]);

export const posWebhookEventsTable = pgTable("pos_webhook_events", {
  id:              uuid("id").primaryKey().defaultRandom(),
  connectionId:    uuid("connection_id"),
  venueId:         uuid("venue_id"),
  provider:        text("provider").notNull(),
  eventType:       text("event_type").notNull(),
  externalEventId: text("external_event_id"),
  status:          webhookEventStatusEnum("status").notNull().default("received"),
  rawPayload:      jsonb("raw_payload").$type<Record<string, unknown>>(),
  processedAt:     timestamp("processed_at"),
  errorMessage:    text("error_message"),
  signatureValid:  boolean("signature_valid").notNull().default(false),
  idempotencyKey:  text("idempotency_key"),
  retryCount:      text("retry_count").notNull().default("0"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});
