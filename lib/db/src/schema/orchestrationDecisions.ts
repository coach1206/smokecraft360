import {
  pgTable, uuid, text, real, boolean,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const orchestrationDecisionsTable = pgTable(
  "orchestration_decisions",
  {
    id:              uuid("id").primaryKey().defaultRandom(),
    venueId:         text("venue_id").notNull(),
    ruleId:          uuid("rule_id"),
    triggerType:     text("trigger_type").notNull(),
    triggerPayload:  jsonb("trigger_payload").$type<Record<string, unknown>>().default({}),
    actions:         jsonb("actions").$type<Record<string, unknown>[]>().default([]),
    confidence:      real("confidence").notNull().default(0),
    outcome:         text("outcome"),
    status:          text("status").notNull().default("pending"),
    appliedAt:       timestamp("applied_at"),
    rolledBackAt:    timestamp("rolled_back_at"),
    rollbackReason:  text("rollback_reason"),
    operatorOverride:boolean("operator_override").notNull().default(false),
    overrideBy:      text("override_by"),
    replayOf:        uuid("replay_of"),
    isReplayed:      boolean("is_replayed").notNull().default(false),
    guardHit:        boolean("guard_hit").notNull().default(false),
    guardReason:     text("guard_reason"),
    createdAt:       timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("orch_dec_venue_idx").on(t.venueId),
    index("orch_dec_status_idx").on(t.status),
    index("orch_dec_trigger_idx").on(t.triggerType),
    index("orch_dec_created_idx").on(t.createdAt),
    index("orch_dec_rule_idx").on(t.ruleId),
  ],
);

export type OrchestrationDecision       = typeof orchestrationDecisionsTable.$inferSelect;
export type InsertOrchestrationDecision = typeof orchestrationDecisionsTable.$inferInsert;
