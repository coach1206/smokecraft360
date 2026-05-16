import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const eeisOrderEventTypeEnum = pgEnum("eeis_order_event_type", [
  "created", "pushed_to_pos", "pos_confirmed", "pos_failed",
  "payment_completed", "payment_failed", "webhook_received",
  "xp_awarded", "loyalty_awarded", "inventory_decremented",
  "cancelled", "refunded", "completed",
]);

export const eeisOrderEventsTable = pgTable("eeis_order_events", {
  id:              uuid("id").primaryKey().defaultRandom(),
  orderId:         uuid("order_id").notNull(),
  venueId:         uuid("venue_id").notNull(),
  userId:          uuid("user_id"),
  guestProfileId:  uuid("guest_profile_id"),
  sessionId:       uuid("session_id"),
  eventType:       eeisOrderEventTypeEnum("event_type").notNull(),
  provider:        text("provider"),
  externalOrderId: text("external_order_id"),
  totalCents:      integer("total_cents"),
  xpAwarded:       integer("xp_awarded"),
  loyaltyAwarded:  integer("loyalty_awarded"),
  itemCount:       integer("item_count"),
  idempotencyKey:  text("idempotency_key"),
  isReplayed:      boolean("is_replayed").notNull().default(false),
  meta:            jsonb("meta").$type<Record<string, unknown>>().default({}),
  errorMessage:    text("error_message"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});
