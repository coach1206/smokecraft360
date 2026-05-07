/**
 * sponsor_tickers — paid sponsor messages for the guest-facing ticker tape.
 *
 * Separate from brand_partners (which handles budget/billing) and
 * vendor_placements (which handles product boosts). This table stores the
 * creative assets — logo URL, promo text, CTA link — that appear in the
 * TickerTape component on guest-facing screens.
 *
 * craftTypes:       comma-separated filter — "smoke,pour" only shows on those crafts.
 *                   NULL = show on all crafts.
 * priority:         lower number = higher in rotation. Ties broken by created_at.
 * targetRegion:     ISO 3166-2 region code (e.g. "US-GA") for geo-targeting.
 *                   NULL = show globally.
 * prestigeMultiplier: XP multiplier for guests who choose this brand (1.0–3.0).
 * revealContent:    JSON string — { headline, body, ctaText } for the Special
 *                   Reveal overlay. NULL = generate from promoText.
 * impressionCount:  total scroll-past events (incremented by /api/ads/impression).
 * clickCount:       total tap events.
 */

import { pgTable, uuid, text, integer, real, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const sponsorTickersTable = pgTable(
  "sponsor_tickers",
  {
    id:                  uuid("id").primaryKey().defaultRandom(),
    /** FK to brand_partners (optional) */
    brandPartnerId:      uuid("brand_partner_id"),
    /** Display name shown in ticker */
    brandName:           text("brand_name").notNull(),
    /** Cloudinary / CDN URL for logo image (36×36 recommended) */
    logoUrl:             text("logo_url"),
    /** Short promo message — keep ≤80 chars for ticker readability */
    promoText:           text("promo_text").notNull(),
    /** Deep-link path or external URL */
    promoLink:           text("promo_link"),
    /** JSON: { headline, body, ctaText } for the Special Reveal overlay */
    revealContent:       text("reveal_content"),
    /** Comma-separated craft types to target, null = all */
    craftTypes:          text("craft_types"),
    /** ISO 3166-2 region code for geo-targeting, null = global */
    targetRegion:        text("target_region"),
    /** Base point bonus for selecting this brand's item */
    pointBonus:          integer("point_bonus").notNull().default(15),
    /** XP multiplier (1.0–3.0) applied on top of base bonus */
    prestigeMultiplier:  real("prestige_multiplier").notNull().default(1.0),
    priority:            integer("priority").notNull().default(100),
    active:              boolean("active").notNull().default(true),
    startsAt:            timestamp("starts_at", { withTimezone: true }),
    endsAt:              timestamp("ends_at",   { withTimezone: true }),
    venueId:             uuid("venue_id"),    // null = platform-wide
    /** Atomically incremented on impression events */
    impressionCount:     integer("impression_count").notNull().default(0),
    /** Atomically incremented on click events */
    clickCount:          integer("click_count").notNull().default(0),
    createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:           timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_sponsor_tickers_active").on(t.active, t.priority),
    index("idx_sponsor_tickers_venue").on(t.venueId),
    index("idx_sponsor_tickers_region").on(t.targetRegion),
  ],
);

export type SponsorTicker       = typeof sponsorTickersTable.$inferSelect;
export type InsertSponsorTicker = typeof sponsorTickersTable.$inferInsert;
