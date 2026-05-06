/**
 * systemValidation — records of one-click smoke test runs.
 *
 * One row per invocation of POST /api/admin/system-validation/run.
 * Enables ops to track platform health over time and prove reliability to stakeholders.
 */

import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export interface SystemCheckResult {
  system:     string;
  status:     "passed" | "failed" | "warning" | "skipped";
  message:    string;
  durationMs: number;
  detail?:    string;
}

export const systemValidationRunsTable = pgTable("system_validation_runs", {
  id:        uuid("id").primaryKey().defaultRandom(),
  status:    text("status").notNull(),                   // "passed" | "failed" | "partial"
  summary:   text("summary").notNull(),
  details:   jsonb("details").$type<SystemCheckResult[]>().notNull().default([]),
  ranBy:     uuid("ran_by"),                             // user_id who triggered; null = system
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("val_runs_created_idx").on(t.createdAt),
  index("val_runs_status_idx").on(t.status),
]);

export type SystemValidationRun       = typeof systemValidationRunsTable.$inferSelect;
export type InsertSystemValidationRun = typeof systemValidationRunsTable.$inferInsert;
