/**
 * userVenueVisits — cross-venue identity ledger.
 *
 * One row per (userId, venueId). First time a user starts an experience at
 * a venue, a row is inserted. Subsequent visits bump visitCount and
 * lastVisitAt. The user's home venue (users.venueId) is unrelated — this
 * table records WHERE they've actually shown up, which can be ANY venue
 * once true cross-venue auth flows ship.
 *
 * For now, write hook = POST /api/sessions (the moment a user starts an
 * experience). Read API surfaces visited-venues list so the kiosk can
 * greet returning users with "Welcome back from <home venue name>".
 *
 * Composite PK on (userId, venueId) — natural key, idempotent upsert.
 * No surrogate id needed; no row will ever be addressed by a single id.
 */

import { pgTable, uuid, integer, timestamp, primaryKey, index } from "drizzle-orm/pg-core";

export const userVenueVisitsTable = pgTable(
  "user_venue_visits",
  {
    userId:        uuid("user_id").notNull(),
    venueId:       uuid("venue_id").notNull(),
    firstVisitAt:  timestamp("first_visit_at").notNull().defaultNow(),
    lastVisitAt:   timestamp("last_visit_at").notNull().defaultNow(),
    visitCount:    integer("visit_count").notNull().default(1),
  },
  (t) => ({
    pk:           primaryKey({ columns: [t.userId, t.venueId] }),
    byUserRecent: index("user_venue_visits_user_recent_idx").on(t.userId, t.lastVisitAt),
    byVenue:      index("user_venue_visits_venue_idx").on(t.venueId),
  }),
);

export type UserVenueVisit = typeof userVenueVisitsTable.$inferSelect;
