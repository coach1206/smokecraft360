/**
 * referral_commissions — Axiom Revenue Bridge ledger.
 *
 * One row per outbound referral click or confirmed commission from
 * DayOne360 (Leisure & Corp) and WifeX. Created optimistically on
 * click (status = PENDING); upgraded to CONFIRMED via webhook;
 * upgraded to DISBURSED after admin payout.
 *
 * Index on (venue_id, status) for fast revenue queries in the
 * Executive War Room dashboard.
 */

import { pgTable, uuid, text, numeric, timestamp, index } from "drizzle-orm/pg-core";

export const REFERRAL_PILLAR_TYPES = [
  "DAYONE360_LEISURE",
  "DAYONE360_CORP",
  "WIFEX",
] as const;
export type ReferralPillarType = typeof REFERRAL_PILLAR_TYPES[number];

export const REFERRAL_STATUSES = ["PENDING", "CONFIRMED", "DISBURSED"] as const;
export type ReferralStatus = typeof REFERRAL_STATUSES[number];

export const referralCommissionsTable = pgTable(
  "referral_commissions",
  {
    id:               uuid("id").primaryKey().defaultRandom(),
    venueId:          uuid("venue_id").notNull(),
    guestKey:         text("guest_key").notNull(),
    pillarType:       text("pillar_type").notNull().$type<ReferralPillarType>(),
    commissionAmount: numeric("commission_amount", { precision: 10, scale: 2 })
                        .notNull().default("0.00"),
    status:           text("status").notNull().default("PENDING").$type<ReferralStatus>(),
    transactionId:    text("transaction_id").unique(),
    staffId:          text("staff_id"),
    source:           text("source").default("axiom_crafthub"),
    webhookPayload:   text("webhook_payload"),
    createdAt:        timestamp("created_at").notNull().defaultNow(),
    updatedAt:        timestamp("updated_at").notNull().defaultNow(),
    confirmedAt:      timestamp("confirmed_at"),
  },
  (t) => [
    index("idx_venue_revenue").on(t.venueId, t.status),
  ],
);

export type DbReferralCommission     = typeof referralCommissionsTable.$inferSelect;
export type InsertReferralCommission = typeof referralCommissionsTable.$inferInsert;
