/**
 * guestTabs — open hospitality tabs for the Axiom Pay system.
 *
 * A tab is opened once per guest/session and accumulates line items
 * until the guest closes it (via payment or staff action).
 *
 * Status lifecycle: open → closed | voided
 * Payment lifecycle: unpaid → authorized → paid | refunded
 */

import {
  pgTable, uuid, text, integer, boolean, timestamp, index,
} from "drizzle-orm/pg-core";

export const TAB_STATUSES = ["open", "closed", "voided"] as const;
export type TabStatus = typeof TAB_STATUSES[number];

export const TAB_PAYMENT_STATUSES = ["unpaid", "authorized", "paid", "refunded"] as const;
export type TabPaymentStatus = typeof TAB_PAYMENT_STATUSES[number];

export const guestTabsTable = pgTable("guest_tabs", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  venueId:               uuid("venue_id").notNull(),
  userId:                uuid("user_id"),
  guestProfileId:        uuid("guest_profile_id"),
  sessionId:             uuid("session_id"),
  tableNumber:           text("table_number"),
  status:                text("status").notNull().default("open").$type<TabStatus>(),
  paymentStatus:         text("payment_status").notNull().default("unpaid").$type<TabPaymentStatus>(),
  subtotalCents:         integer("subtotal_cents").notNull().default(0),
  discountCents:         integer("discount_cents").notNull().default(0),
  totalCents:            integer("total_cents").notNull().default(0),
  platformFeeCents:      integer("platform_fee_cents").notNull().default(0),
  venueProceedsCents:    integer("venue_proceeds_cents").notNull().default(0),
  loyaltyCreditsUsed:    integer("loyalty_credits_used").notNull().default(0),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeChargeId:        text("stripe_charge_id"),
  stripeTransferId:      text("stripe_transfer_id"),
  notes:                 text("notes"),
  openedAt:              timestamp("opened_at").notNull().defaultNow(),
  closedAt:              timestamp("closed_at"),
  paidAt:                timestamp("paid_at"),
}, (t) => ({
  byVenue:   index("guest_tabs_venue_idx").on(t.venueId),
  byUser:    index("guest_tabs_user_idx").on(t.userId),
  byStatus:  index("guest_tabs_status_idx").on(t.status),
  bySession: index("guest_tabs_session_idx").on(t.sessionId),
}));

export type GuestTab       = typeof guestTabsTable.$inferSelect;
export type InsertGuestTab = typeof guestTabsTable.$inferInsert;

// ── Tab line items ─────────────────────────────────────────────────────────────

export const tabItemsTable = pgTable("tab_items", {
  id:           uuid("id").primaryKey().defaultRandom(),
  tabId:        uuid("tab_id").notNull(),
  productId:    text("product_id"),
  productName:  text("product_name").notNull(),
  craftType:    text("craft_type"),
  quantity:     integer("quantity").notNull().default(1),
  unitCents:    integer("unit_cents").notNull().default(0),
  totalCents:   integer("total_cents").notNull().default(0),
  notes:        text("notes"),
  fulfilled:    boolean("fulfilled").notNull().default(false),
  fulfilledAt:  timestamp("fulfilled_at"),
  addedAt:      timestamp("added_at").notNull().defaultNow(),
}, (t) => ({
  byTab: index("tab_items_tab_idx").on(t.tabId),
}));

export type TabItem       = typeof tabItemsTable.$inferSelect;
export type InsertTabItem = typeof tabItemsTable.$inferInsert;
