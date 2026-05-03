/**
 * subscriptions — per-venue Stripe subscription state, the source of truth for
 * "is this venue allowed to use the platform right now?".
 *
 * Lifecycle (driven by Stripe webhooks):
 *
 *   incomplete  →  invoice.paid                    →  active
 *   active      →  invoice.payment_failed          →  past_due  (+grace 7d)
 *   past_due    →  invoice.paid (retry succeeded)  →  active
 *   *           →  customer.subscription.deleted   →  canceled
 *
 * Read model (computed in /api/license/status):
 *   - adminOverride === true        → effectively active
 *   - status === 'past_due' && grace expired → treat as canceled (hard lock)
 *
 * One subscription row per venue (venueId is unique).
 */

import { pgTable, uuid, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
]);

/** Brief uses starter/pro/premium; venues table uses basic/mid/premium.
 *  Mapping: starter↔basic, pro↔mid, premium↔premium. */
export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "starter", "pro", "premium",
]);

export const GRACE_PERIOD_DAYS = 7;

export const subscriptionsTable = pgTable("subscriptions", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  venueId:               uuid("venue_id").notNull().unique(),
  status:                subscriptionStatusEnum("status").notNull().default("incomplete"),
  plan:                  subscriptionPlanEnum("plan").notNull().default("starter"),
  stripeCustomerId:      text("stripe_customer_id"),
  stripeSubscriptionId:  text("stripe_subscription_id").unique(),
  currentPeriodEnd:      timestamp("current_period_end"),
  lastPaymentDate:       timestamp("last_payment_date"),
  // When status flips to past_due, this is set to now + GRACE_PERIOD_DAYS.
  // After this timestamp, the venue is hard-locked even though Stripe still
  // shows past_due, until either payment succeeds or it's manually cancelled.
  gracePeriodEndsAt:     timestamp("grace_period_ends_at"),
  // Super-admin manual override. When true, license status is forced to
  // "active" regardless of Stripe state. Used to unlock a venue while
  // billing issues are being resolved out-of-band.
  adminOverride:         boolean("admin_override").notNull().default(false),
  adminOverrideReason:   text("admin_override_reason"),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
  updatedAt:             timestamp("updated_at").notNull().defaultNow(),
});

export type DbSubscription     = typeof subscriptionsTable.$inferSelect;
export type InsertSubscription = typeof subscriptionsTable.$inferInsert;
