/**
 * commissions — platform commission ledger.
 *
 * One row per paid order. Created by the Stripe webhook when
 * `checkout.session.completed` fires. The platform takes a fixed
 * percentage of each order's gross amount; the venue keeps the rest.
 *
 * Status lifecycle:
 *   pending → paid (after admin POSTs /api/admin/payout)
 */

import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";

export const COMMISSION_STATUSES = ["pending", "paid"] as const;
export type CommissionStatus = typeof COMMISSION_STATUSES[number];

export const commissionsTable = pgTable("commissions", {
  id:               uuid("id").primaryKey().defaultRandom(),
  orderId:          uuid("order_id").notNull(),
  venueId:          uuid("venue_id"),
  grossAmountCents: integer("gross_amount_cents").notNull(),
  ratePctBps:       integer("rate_pct_bps").notNull().default(1000), // basis points: 1000 = 10.00%
  amountCents:      integer("amount_cents").notNull(),
  currency:         text("currency").notNull().default("usd"),
  stripeSessionId:  text("stripe_session_id"),
  status:           text("status").notNull().default("pending").$type<CommissionStatus>(),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  paidAt:           timestamp("paid_at"),
});

export type DbCommission     = typeof commissionsTable.$inferSelect;
export type InsertCommission = typeof commissionsTable.$inferInsert;
