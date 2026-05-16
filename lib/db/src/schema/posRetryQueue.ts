import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const retryOperationEnum = pgEnum("pos_retry_operation", [
  "push_order", "sync_inventory", "sync_products", "webhook_delivery", "token_refresh",
]);

export const retryStatusEnum = pgEnum("pos_retry_status", [
  "pending", "processing", "success", "failed", "abandoned",
]);

export const posRetryQueueTable = pgTable("pos_retry_queue", {
  id:              uuid("id").primaryKey().defaultRandom(),
  connectionId:    uuid("connection_id").notNull(),
  venueId:         uuid("venue_id").notNull(),
  provider:        text("provider").notNull(),
  operation:       retryOperationEnum("operation").notNull(),
  status:          retryStatusEnum("status").notNull().default("pending"),
  payload:         jsonb("payload").$type<Record<string, unknown>>().notNull(),
  attemptCount:    integer("attempt_count").notNull().default(0),
  maxAttempts:     integer("max_attempts").notNull().default(5),
  nextRetryAt:     timestamp("next_retry_at").notNull().defaultNow(),
  lastAttemptAt:   timestamp("last_attempt_at"),
  lastError:       text("last_error"),
  resolvedAt:      timestamp("resolved_at"),
  idempotencyKey:  text("idempotency_key"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});
