/**
 * offlineQueueTable — server-side audit trail for actions captured by a
 * kiosk while it was offline and replayed when network returned.
 *
 * Source of truth for the actual entity (e.g. the order) remains its own
 * table; this table is the FORENSIC LOG of replay attempts plus the
 * idempotency cache that prevents double-charging when a kiosk retries.
 *
 * `idempotencyKey` is client-generated (UUID per queued action). We index
 * uniquely so a replay of the same key is a no-op that returns the prior
 * result instead of inserting again.
 */

import { pgTable, uuid, text, jsonb, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const offlineQueueTable = pgTable("offline_queue", {
  id:               uuid("id").primaryKey().defaultRandom(),
  /** Client-generated UUID — the idempotency unit. */
  idempotencyKey:   text("idempotency_key").notNull(),
  deviceId:         text("device_id"),
  venueId:          uuid("venue_id"),
  /** Action discriminator. Currently: "order". Extensible. */
  kind:             text("kind").notNull(),
  /** Original action payload as it would have been POSTed. */
  payload:          jsonb("payload").notNull(),
  /** "pending" → "synced" | "failed" */
  status:           text("status").notNull().default("pending"),
  attempts:         integer("attempts").notNull().default(0),
  lastError:        text("last_error"),
  /** Resulting entity id (e.g. orders.id) once successfully replayed. */
  resultId:         text("result_id"),
  /** Wall-clock time on the kiosk when the action was originally captured. */
  clientCreatedAt:  timestamp("client_created_at"),
  syncedAt:         timestamp("synced_at"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  byIdempotency: uniqueIndex("offline_queue_idempotency_idx").on(t.idempotencyKey),
  byStatus:      index("offline_queue_status_idx").on(t.status),
  byVenue:       index("offline_queue_venue_idx").on(t.venueId),
}));

export type OfflineQueueRow    = typeof offlineQueueTable.$inferSelect;
export type InsertOfflineQueue = typeof offlineQueueTable.$inferInsert;
