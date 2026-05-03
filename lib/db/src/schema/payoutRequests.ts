/**
 * payout_requests — venue-initiated payout workflow.
 *
 * A venue_owner POSTs /api/payouts/request with an amount; super_admin
 * then POSTs /api/payouts/approve to mark it approved (and, when
 * Stripe Connect is wired in a later round, dispatch the actual transfer).
 *
 * Status lifecycle:
 *   pending → approved → paid
 *           ↘ rejected
 *           ↘ failed
 */

import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";

export const PAYOUT_REQUEST_STATUSES = [
  "pending", "approved", "paid", "rejected", "failed",
] as const;
export type PayoutRequestStatus = typeof PAYOUT_REQUEST_STATUSES[number];

export const payoutRequestsTable = pgTable("payout_requests", {
  id:               uuid("id").primaryKey().defaultRandom(),
  venueId:          uuid("venue_id").notNull(),
  amountCents:      integer("amount_cents").notNull(),
  currency:         text("currency").notNull().default("usd"),
  status:           text("status").notNull().default("pending").$type<PayoutRequestStatus>(),
  stripeTransferId: text("stripe_transfer_id"),
  requestedBy:      uuid("requested_by"),
  approvedBy:       uuid("approved_by"),
  notes:            text("notes"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  approvedAt:       timestamp("approved_at"),
  paidAt:           timestamp("paid_at"),
});

export type DbPayoutRequest     = typeof payoutRequestsTable.$inferSelect;
export type InsertPayoutRequest = typeof payoutRequestsTable.$inferInsert;
