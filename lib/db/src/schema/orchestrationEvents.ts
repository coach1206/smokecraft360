import {
  pgTable, uuid, text, real,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const orchestrationEventsTable = pgTable(
  "orchestration_events",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    venueId:     uuid("venue_id").notNull(),
    sessionId:   uuid("session_id"),
    guestId:     text("guest_id"),
    eventType:   text("event_type").notNull(),
    craftType:   text("craft_type"),
    payload:     jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    score:       real("score"),
    metadata:    jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("oe_venue_idx").on(t.venueId, t.createdAt),
    index("oe_session_idx").on(t.sessionId),
    index("oe_type_idx").on(t.eventType),
    index("oe_craft_idx").on(t.craftType),
    index("oe_guest_idx").on(t.guestId),
  ],
);

export type OrchestrationEvent       = typeof orchestrationEventsTable.$inferSelect;
export type InsertOrchestrationEvent = typeof orchestrationEventsTable.$inferInsert;
