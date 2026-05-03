import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";

export const commissionReversalsTable = pgTable("commission_reversals", {
  id:               uuid("id").primaryKey().defaultRandom(),
  commissionId:     uuid("commission_id").notNull(),
  orderId:          uuid("order_id").notNull(),
  venueId:          uuid("venue_id"),
  amountCents:      integer("amount_cents").notNull(),
  currency:         text("currency").notNull().default("usd"),
  reason:           text("reason").notNull().$type<"refund" | "chargeback" | "manual">(),
  stripeRefundId:   text("stripe_refund_id").unique(),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

export type DbCommissionReversal     = typeof commissionReversalsTable.$inferSelect;
export type InsertCommissionReversal = typeof commissionReversalsTable.$inferInsert;
