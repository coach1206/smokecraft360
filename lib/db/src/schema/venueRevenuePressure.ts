/**
 * venue_revenue_pressure — durable nudge-to-sale conversion ledger.
 *
 * Every confirmed nudge creates a row here, giving venue owners a precise
 * "Nudge → Sale" conversion rate and total revenue attributed to the
 * Service Sage system.
 *
 * masteryXpAwarded: the mastery points credited to the guest on confirmation.
 * revenueCents:     estimated item value in cents at time of sale.
 */

import { pgTable, uuid, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const venueRevenuePressureTable = pgTable(
  "venue_revenue_pressure",
  {
    id:               uuid("id").primaryKey().defaultRandom(),
    venueId:          uuid("venue_id"),
    tableId:          text("table_id"),
    guestProfileId:   uuid("guest_profile_id"),
    staffId:          uuid("staff_id"),
    /** The item recommended by Service Sage */
    recommendedItem:  text("recommended_item").notNull(),
    premiumTier:      integer("premium_tier").notNull().default(1),
    saleConfirmed:    boolean("sale_confirmed").notNull().default(true),
    /** Mastery XP awarded to the guest on this sale */
    masteryXpAwarded: integer("mastery_xp_awarded").notNull().default(0),
    /** Item price in cents — for ROI reporting */
    revenueCents:     integer("revenue_cents"),
    nudgeSentAt:      timestamp("nudge_sent_at", { withTimezone: true }),
    confirmedAt:      timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_vrp_venue").on(t.venueId),
    index("idx_vrp_guest").on(t.guestProfileId),
    index("idx_vrp_confirmed").on(t.confirmedAt),
  ],
);

export type VenueRevenuePressure = typeof venueRevenuePressureTable.$inferSelect;
