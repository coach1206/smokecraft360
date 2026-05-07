/**
 * sponsor_tickers — paid sponsor messages for the guest-facing ticker tape.
 *
 * Separate from brand_partners (which handles budget/billing) and
 * vendor_placements (which handles product boosts). This table stores the
 * creative assets — logo URL, promo text, CTA link — that appear in the
 * TickerTape component on guest-facing screens.
 *
 * craftTypes: comma-separated filter — "smoke,pour" only shows on those crafts.
 *             NULL = show on all crafts.
 * priority:   lower number = higher in rotation. Ties broken by created_at.
 */

import { pgTable, uuid, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const sponsorTickersTable = pgTable(
  "sponsor_tickers",
  {
    id:               uuid("id").primaryKey().defaultRandom(),
    /** FK to brand_partners (optional — allows venue-created promos without a brand partner) */
    brandPartnerId:   uuid("brand_partner_id"),
    /** Display name shown in ticker */
    brandName:        text("brand_name").notNull(),
    /** Cloudinary / CDN URL for logo image (36×36 recommended). Null = initials fallback */
    logoUrl:          text("logo_url"),
    /** Short promo message — keep ≤80 chars for ticker readability */
    promoText:        text("promo_text").notNull(),
    /** Deep-link path within the app, e.g. "/promo/macallan" */
    promoLink:        text("promo_link"),
    /** Comma-separated craft types to target ("smoke", "pour", "brew", "vape"), null = all */
    craftTypes:       text("craft_types"),
    /** Point bonus awarded to guest who selects this brand's item */
    pointBonus:       integer("point_bonus").notNull().default(15),
    priority:         integer("priority").notNull().default(100),
    active:           boolean("active").notNull().default(true),
    startsAt:         timestamp("starts_at", { withTimezone: true }),
    endsAt:           timestamp("ends_at",   { withTimezone: true }),
    venueId:          uuid("venue_id"),    // null = platform-wide
    createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_sponsor_tickers_active").on(t.active, t.priority),
    index("idx_sponsor_tickers_venue").on(t.venueId),
  ],
);

export type SponsorTicker       = typeof sponsorTickersTable.$inferSelect;
export type InsertSponsorTicker = typeof sponsorTickersTable.$inferInsert;
