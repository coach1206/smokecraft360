/**
 * axiom_credit_ledger — Tokenized Prestige currency.
 *
 * Axiom Credits are earned by accumulating Mastery Score and can be
 * spent within WifeX (Concierge/Legal) and DayOne360 (Leisure/Corp).
 *
 * Conversion: 1 mastery point = 10 Axiom Credits
 * Status lifecycle: pending → confirmed → spent | expired
 *
 * credit_type:
 *   earned_mastery   — automatic grant on mastery tier upgrade
 *   earned_session   — awarded for completing a craft session
 *   spent_wifex      — redeemed on WifeX platform
 *   spent_dayone360  — redeemed on DayOne360 platform
 *   bonus_referral   — bonus for facilitating a confirmed referral
 *   admin_grant      — manual super_admin grant
 */

import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const CREDIT_TYPES = [
  "earned_mastery",
  "earned_session",
  "spent_wifex",
  "spent_dayone360",
  "bonus_referral",
  "admin_grant",
] as const;
export type CreditType = typeof CREDIT_TYPES[number];

export const axiomCreditLedgerTable = pgTable(
  "axiom_credit_ledger",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    guestId:     uuid("guest_id").notNull(),
    creditType:  text("credit_type").notNull().$type<CreditType>(),
    amount:      integer("amount").notNull(),
    balanceAfter:integer("balance_after").notNull(),
    note:        text("note"),
    refId:       text("ref_id"),
    venueId:     uuid("venue_id"),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_credits_guest").on(t.guestId, t.createdAt),
  ],
);

export type AxiomCreditEntry     = typeof axiomCreditLedgerTable.$inferSelect;
export type InsertAxiomCreditEntry = typeof axiomCreditLedgerTable.$inferInsert;
