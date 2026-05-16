import {
  pgTable, uuid, text, boolean, integer, real,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const orchestrationRulesTable = pgTable(
  "orchestration_rules",
  {
    id:               uuid("id").primaryKey().defaultRandom(),
    venueId:          text("venue_id").notNull(),
    name:             text("name").notNull(),
    description:      text("description"),
    triggerType:      text("trigger_type").notNull(),
    conditions:       jsonb("conditions").$type<Record<string, unknown>>().notNull().default({}),
    actions:          jsonb("actions").$type<Record<string, unknown>[]>().notNull().default([]),
    priority:         integer("priority").notNull().default(50),
    confidenceMin:    real("confidence_min").notNull().default(0.6),
    cooldownSeconds:  integer("cooldown_seconds").notNull().default(300),
    maxFiresPerHour:  integer("max_fires_per_hour").notNull().default(12),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    isEnabled:        boolean("is_enabled").notNull().default(true),
    isGlobal:         boolean("is_global").notNull().default(false),
    createdBy:        text("created_by"),
    lastFiredAt:      timestamp("last_fired_at"),
    fireCount:        integer("fire_count").notNull().default(0),
    createdAt:        timestamp("created_at").notNull().defaultNow(),
    updatedAt:        timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("orch_rules_venue_idx").on(t.venueId),
    index("orch_rules_trigger_idx").on(t.triggerType),
    index("orch_rules_enabled_idx").on(t.isEnabled),
    index("orch_rules_priority_idx").on(t.priority),
  ],
);

export type OrchestrationRule       = typeof orchestrationRulesTable.$inferSelect;
export type InsertOrchestrationRule = typeof orchestrationRulesTable.$inferInsert;
