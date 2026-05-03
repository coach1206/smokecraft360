/**
 * sessions — multi-user lounge sessions ("parties").
 *
 * A session is an ephemeral group rooted at a venue, created by a host
 * (any authed user) and joined by guests via a 6-character alphanumeric
 * code. Sessions exist so future slices (group orders, shared
 * recommendations, joint loyalty, etc.) have a single grouping primitive
 * to hang behaviour off.
 *
 * Lifecycle:
 *   active  — accepting joins, host can close
 *   closed  — terminal, code is freed for re-issue
 *
 * The join `code` is unique ONLY among active sessions (enforced by a
 * partial unique index in the migration). Once closed, the same string
 * can be re-used by a new session — collision avoidance during draw is
 * handled in the route by retrying on conflict.
 */

import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const SESSION_STATUSES = ["active", "closed"] as const;
export type SessionStatus = typeof SESSION_STATUSES[number];

export const sessionsTable = pgTable(
  "sessions",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    venueId:     uuid("venue_id"),                                // null = no venue context (still valid)
    hostUserId:  uuid("host_user_id").notNull(),
    code:        text("code").notNull(),                          // 6-char A-Z0-9, partial-unique on active rows
    status:      text("status").notNull().default("active").$type<SessionStatus>(),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
    closedAt:    timestamp("closed_at"),
  },
  (t) => ({
    byCode:   index("sessions_code_idx").on(t.code),
    byVenue:  index("sessions_venue_idx").on(t.venueId),
    byHost:   index("sessions_host_idx").on(t.hostUserId),
    // Partial unique index: codes are unique only among active sessions, so
    // closed sessions free their code for re-issue. Declared in Drizzle so
    // a future `drizzle-kit push` doesn't see it as drift and drop it.
    // (Architect HIGH fix.)
    uniqActiveCode: uniqueIndex("sessions_code_active_unique")
      .on(t.code)
      .where(sql`status = 'active'`),
  }),
);

export type Session = typeof sessionsTable.$inferSelect;
