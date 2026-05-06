/**
 * payment_events — immutable financial lifecycle timeline per tab.
 *
 * Every financial action (tab open, authorize, webhook, payout, refund, dispute)
 * appends a row. Never updated or deleted — append-only for audit/dispute integrity.
 *
 * Event types map the full Axiom Pay lifecycle:
 *   tab_opened → item_added → payment_authorized → webhook_received →
 *   payout_initiated → payout_completed → loyalty_credited →
 *   receipt_delivered → refund_processed → dispute_created
 */

import { pgTable, uuid, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const PAYMENT_EVENT_TYPES = [
  "tab_opened",
  "item_added",
  "item_removed",
  "discount_applied",
  "payment_authorized",
  "payment_captured",
  "payment_failed",
  "webhook_received",
  "webhook_failed",
  "payout_initiated",
  "payout_completed",
  "payout_failed",
  "loyalty_credited",
  "receipt_delivered",
  "refund_initiated",
  "refund_processed",
  "dispute_created",
  "dispute_resolved",
  "tab_voided",
  "tab_closed",
  "reconciliation_flag",
] as const;

export type PaymentEventType = typeof PAYMENT_EVENT_TYPES[number];

export const paymentEventsTable = pgTable("payment_events", {
  id:              uuid("id").primaryKey().defaultRandom(),
  tabId:           uuid("tab_id"),
  venueId:         uuid("venue_id").notNull(),
  guestProfileId:  uuid("guest_profile_id"),
  userId:          uuid("user_id"),
  eventType:       text("event_type").notNull().$type<PaymentEventType>(),
  amountCents:     integer("amount_cents"),
  stripeReference: text("stripe_reference"),    // chargeId / transferId / refundId / eventId
  actor:           text("actor"),               // "guest" | "staff" | "system" | "stripe"
  actorId:         uuid("actor_id"),
  metadata:        jsonb("metadata"),           // structured payload (webhook body, item info, etc.)
  note:            text("note"),                // human-readable summary
  occurredAt:      timestamp("occurred_at").notNull().defaultNow(),
}, (t) => ({
  byTab:     index("pe_tab_idx").on(t.tabId),
  byVenue:   index("pe_venue_idx").on(t.venueId),
  byType:    index("pe_type_idx").on(t.eventType),
  byOccurred:index("pe_occurred_idx").on(t.occurredAt),
}));

export type PaymentEvent       = typeof paymentEventsTable.$inferSelect;
export type InsertPaymentEvent = typeof paymentEventsTable.$inferInsert;
