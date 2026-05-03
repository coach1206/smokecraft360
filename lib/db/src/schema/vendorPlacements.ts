/**
 * vendor_placements — paid placement purchases by brand_partners.
 *
 * Brand vendors purchase featured/premium/sponsored slots via Stripe.
 * On successful payment (webhook), status flips pending_payment → active,
 * the linked product gets a boost applied, and (optionally) a campaign
 * row is created/activated for impression tracking.
 *
 * Pricing tiers (set in route logic, not the DB):
 *   featured  — $99  / 7 days   → boostLevel 1
 *   premium   — $249 / 14 days  → boostLevel 2
 *   sponsored — $499 / 30 days  → boostLevel 3 + sponsored flag
 */

import { pgTable, uuid, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const placementTypeEnum = pgEnum("placement_type", [
  "featured", "premium", "sponsored",
]);

export const placementStatusEnum = pgEnum("placement_status", [
  "pending_payment", "active", "expired", "cancelled", "refunded",
]);

export const vendorPlacementsTable = pgTable("vendor_placements", {
  id:               uuid("id").primaryKey().defaultRandom(),
  brandId:          uuid("brand_id").notNull(),
  productId:        text("product_id").notNull(),
  placementType:    placementTypeEnum("placement_type").notNull(),
  durationDays:     integer("duration_days").notNull(),
  priceCents:       integer("price_cents").notNull(),
  status:           placementStatusEnum("status").notNull().default("pending_payment"),
  stripeSessionId:  text("stripe_session_id"),
  // PaymentIntent id when paid via the Elements flow instead of Checkout.
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  campaignId:       uuid("campaign_id"),                   // populated when activated
  startDate:        timestamp("start_date"),
  endDate:          timestamp("end_date"),
  purchasedBy:      uuid("purchased_by"),                  // user id of brand_partner
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  activatedAt:      timestamp("activated_at"),
});

export type DbVendorPlacement     = typeof vendorPlacementsTable.$inferSelect;
export type InsertVendorPlacement = typeof vendorPlacementsTable.$inferInsert;
