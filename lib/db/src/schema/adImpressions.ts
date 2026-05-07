/**
 * ad_impressions — time-series event log for ticker/prestige ad analytics.
 *
 * Every impression (scroll-past), click (tap on ticker item), add_to_draft,
 * and nudge_converted event is recorded here, enabling per-campaign CTR and
 * nudge-to-purchase conversion metrics in the Revenue Control Center.
 *
 * Indexed for fast aggregation by tickerId and eventType.
 */

import { pgTable, uuid, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";

export const adEventTypeEnum = pgEnum("ad_event_type", [
  "impression",     // ticker item scrolled into view
  "click",          // guest tapped the item
  "add_to_draft",   // guest tapped "Add to Draft" in Special Reveal overlay
  "nudge_converted",// staff confirmed sale of this sponsored item
]);

export const adImpressionsTable = pgTable(
  "ad_impressions",
  {
    id:              uuid("id").primaryKey().defaultRandom(),
    tickerId:        uuid("ticker_id").notNull(),   // FK → sponsor_tickers.id
    eventType:       adEventTypeEnum("event_type").notNull(),
    venueId:         uuid("venue_id"),
    guestProfileId:  uuid("guest_profile_id"),
    craftType:       text("craft_type"),            // smoke | pour | brew | vape
    region:          text("region"),                // venue geo at time of event
    sessionId:       text("session_id"),            // browser session for dedup
    createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_ad_impressions_ticker").on(t.tickerId, t.eventType),
    index("idx_ad_impressions_venue").on(t.venueId, t.createdAt),
  ],
);

export type AdImpression       = typeof adImpressionsTable.$inferSelect;
export type InsertAdImpression = typeof adImpressionsTable.$inferInsert;
