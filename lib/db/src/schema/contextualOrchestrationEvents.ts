import {
  pgTable, uuid, text, real, integer,
  timestamp, jsonb, boolean, index,
} from "drizzle-orm/pg-core";

export const contextualOrchestrationEventsTable = pgTable(
  "contextual_orchestration_events",
  {
    id:             uuid("id").primaryKey().defaultRandom(),
    venueId:        uuid("venue_id").notNull(),
    eventType:      text("event_type").notNull(),
    sourceSystem:   text("source_system").notNull().default("eeis"),
    contextSnapshot:jsonb("context_snapshot").$type<Record<string, unknown>>().notNull().default({}),
    trigger:        text("trigger").notNull(),
    confidence:     real("confidence").notNull().default(0),
    priority:       integer("priority").notNull().default(0),
    actions:        jsonb("actions").$type<Array<Record<string, unknown>>>().notNull().default([]),
    executed:       boolean("executed").notNull().default(false),
    executedAt:     timestamp("executed_at"),
    result:         text("result"),
    replayKey:      text("replay_key"),
    idempotencyKey: text("idempotency_key").unique(),
    ttlMs:          integer("ttl_ms").notNull().default(300_000),
    createdAt:      timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("coe_venue_idx").on(t.venueId, t.createdAt),
    index("coe_type_idx").on(t.venueId, t.eventType),
    index("coe_source_idx").on(t.sourceSystem),
    index("coe_replay_idx").on(t.replayKey),
  ],
);

export type ContextualOrchestrationEvent       = typeof contextualOrchestrationEventsTable.$inferSelect;
export type InsertContextualOrchestrationEvent = typeof contextualOrchestrationEventsTable.$inferInsert;
