import {
  pgTable, uuid, text, boolean,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const orchestrationAuditLogsTable = pgTable(
  "orchestration_audit_logs",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    venueId:     text("venue_id").notNull(),
    entityType:  text("entity_type").notNull(),
    entityId:    text("entity_id"),
    action:      text("action").notNull(),
    actor:       text("actor").notNull().default("system"),
    actorId:     text("actor_id"),
    before:      jsonb("before").$type<Record<string, unknown>>(),
    after:       jsonb("after").$type<Record<string, unknown>>(),
    metadata:    jsonb("metadata").$type<Record<string, unknown>>().default({}),
    isOperatorOverride: boolean("is_operator_override").notNull().default(false),
    isEmergency: boolean("is_emergency").notNull().default(false),
    isRollback:  boolean("is_rollback").notNull().default(false),
    correlationId: text("correlation_id"),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("oal_venue_idx").on(t.venueId),
    index("oal_entity_idx").on(t.entityType, t.entityId),
    index("oal_action_idx").on(t.action),
    index("oal_created_idx").on(t.createdAt),
    index("oal_actor_idx").on(t.actor),
  ],
);

export type OrchestrationAuditLog       = typeof orchestrationAuditLogsTable.$inferSelect;
export type InsertOrchestrationAuditLog = typeof orchestrationAuditLogsTable.$inferInsert;
