/**
 * reservationsTable — RSVP / hold-the-spot flow distinct from instant orders.
 *
 * Reservations are created by guests (or by venue staff for walk-ins) to
 * request a future time slot, optionally pinned to a specific product
 * (e.g. "reserve a Padron 1964 for 8pm tonight"). They flow through a
 * pending → accepted | rejected → fulfilled | no_show lifecycle, separate
 * from the instant ordersTable lifecycle (which is for in-the-moment
 * Stripe-paid sales).
 *
 * paymentMode lets the reservation carry one of three settlement intents:
 *   - "none"          : no money up front, fully settled at venue
 *   - "deposit"       : caller paid a Stripe deposit (depositCents,
 *                        depositPaymentIntentId), balance settled at venue
 *   - "pay_at_venue"  : explicit pay-on-arrival flag for staff awareness
 *
 * Stripe wiring for deposits is intentionally NOT activated in this brief —
 * the columns are present so the next brief can layer it on without a
 * second migration.
 */

import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const RESERVATION_STATUSES = [
  "pending", "accepted", "rejected", "cancelled", "fulfilled", "no_show",
] as const;
export type ReservationStatus = typeof RESERVATION_STATUSES[number];

export const RESERVATION_PAYMENT_MODES = [
  "none", "deposit", "pay_at_venue",
] as const;
export type ReservationPaymentMode = typeof RESERVATION_PAYMENT_MODES[number];

export const reservationsTable = pgTable("reservations", {
  id:          uuid("id").primaryKey().defaultRandom(),
  /** Null for walk-in reservations created by venue staff. */
  userId:      uuid("user_id"),
  venueId:     uuid("venue_id").notNull(),
  /** Optional: pinned product (cigar, bottle, table package). Text id to
   *  match productsTable.id which is text-typed. */
  productId:   text("product_id"),
  productName: text("product_name"),
  /** Walk-in / contact details (used when userId is null, optional otherwise). */
  guestName:   text("guest_name"),
  guestPhone:  text("guest_phone"),
  partySize:   integer("party_size").notNull().default(2),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
  paymentMode: text("payment_mode").notNull().default("none").$type<ReservationPaymentMode>(),
  depositCents:           integer("deposit_cents"),
  depositPaymentIntentId: text("deposit_payment_intent_id"),
  status:      text("status").notNull().default("pending").$type<ReservationStatus>(),
  notes:       text("notes"),
  /** Staff user id who accepted/rejected/marked fulfilled. */
  reviewedBy:  uuid("reviewed_by"),
  reviewedAt:  timestamp("reviewed_at", { withTimezone: true }),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReservationSchema = createInsertSchema(reservationsTable).omit({
  id: true, createdAt: true, updatedAt: true, reviewedBy: true, reviewedAt: true,
});
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type DbReservation     = typeof reservationsTable.$inferSelect;
