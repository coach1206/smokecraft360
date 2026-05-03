import { pgTable, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const VERIFICATION_METHODS = ["staff", "qr", "pos"] as const;
export type VerificationMethod = typeof VERIFICATION_METHODS[number];

export const ordersTable = pgTable("orders", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  userId:             uuid("user_id"),
  venueId:            uuid("venue_id"),
  cigarId:            text("cigar_id"),
  cigarName:          text("cigar_name"),
  drinkId:            text("drink_id"),
  drinkName:          text("drink_name"),
  foodId:             text("food_id"),
  foodName:           text("food_name"),
  orderType:          text("order_type").notNull().$type<"table" | "pickup" | "delivery">(),
  status:             text("status").notNull().default("pending").$type<"initiated" | "pending" | "in_progress" | "completed" | "cancelled" | "paid" | "fulfilled" | "refunded">(),
  tableNumber:        text("table_number"),
  // ── Payment / escrow fields (production hardening) ─────────────────────────
  expectedAmountCents:    integer("expected_amount_cents"),
  stripePaymentIntentId:  text("stripe_payment_intent_id").unique(),
  fundsStatus:            text("funds_status").$type<"held" | "released" | "refunded">().notNull().default("held"),
  // ── Verification fields ────────────────────────────────────────────────────
  verified:           boolean("verified").notNull().default(false),
  verifiedAt:         timestamp("verified_at"),
  verificationMethod: text("verification_method").$type<VerificationMethod>(),
  verifiedBy:         uuid("verified_by"),       // staff userId who verified
  xpAwarded:          boolean("xp_awarded").notNull().default(false),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
});

export type DbOrder    = typeof ordersTable.$inferSelect;
export type InsertOrder = typeof ordersTable.$inferInsert;
