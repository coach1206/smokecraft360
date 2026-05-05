/**
 * behavior_event_logs — privacy-safe behavioral event stream.
 *
 * Records user journey events without storing personal identity. Every event
 * is tied to a sessionId (generated per visit, not per user) and a venueId.
 * No names, emails, or device fingerprints are stored here.
 *
 * Event types:
 *   SESSION_START | SESSION_END | QUESTION_ANSWERED | PRODUCT_VIEWED |
 *   PRODUCT_SELECTED | PRODUCT_PURCHASED | UPSELL_ACCEPTED | LOYALTY_USED
 */

import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const behaviorEventLogsTable = pgTable(
  "behavior_event_logs",
  {
    id:        uuid("id").primaryKey().defaultRandom(),
    venueId:   text("venue_id").notNull(),
    sessionId: text("session_id").notNull(),
    eventType: text("event_type").notNull(),
    productId: text("product_id"),
    category:  text("category"),
    metadata:  jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    venueIdx:   index("bel_venue_idx").on(t.venueId),
    sessionIdx: index("bel_session_idx").on(t.sessionId),
    typeIdx:    index("bel_type_idx").on(t.eventType),
    createdIdx: index("bel_created_idx").on(t.createdAt),
  }),
);

export type BehaviorEventLog       = typeof behaviorEventLogsTable.$inferSelect;
export type InsertBehaviorEventLog = typeof behaviorEventLogsTable.$inferInsert;
