import {
  pgTable, uuid, text, real,
  timestamp, jsonb, boolean, index,
} from "drizzle-orm/pg-core";

export const adaptiveOptimizationLogsTable = pgTable(
  "adaptive_optimization_logs",
  {
    id:            uuid("id").primaryKey().defaultRandom(),
    venueId:       uuid("venue_id").notNull(),
    optimizationType:text("optimization_type").notNull(),
    trigger:       text("trigger").notNull(),
    beforeState:   jsonb("before_state").$type<Record<string, unknown>>().notNull().default({}),
    afterState:    jsonb("after_state").$type<Record<string, unknown>>().notNull().default({}),
    deltaScore:    real("delta_score").notNull().default(0),
    confidence:    real("confidence").notNull().default(0),
    applied:       boolean("applied").notNull().default(false),
    rolledBack:    boolean("rolled_back").notNull().default(false),
    outcome:       text("outcome"),
    outcomeScore:  real("outcome_score"),
    metadata:      jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt:     timestamp("created_at").notNull().defaultNow(),
    resolvedAt:    timestamp("resolved_at"),
  },
  (t) => [
    index("aol_venue_idx").on(t.venueId, t.createdAt),
    index("aol_type_idx").on(t.venueId, t.optimizationType),
    index("aol_applied_idx").on(t.venueId, t.applied),
  ],
);

export type AdaptiveOptimizationLog       = typeof adaptiveOptimizationLogsTable.$inferSelect;
export type InsertAdaptiveOptimizationLog = typeof adaptiveOptimizationLogsTable.$inferInsert;
