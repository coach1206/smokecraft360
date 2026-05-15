import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { kernelModulesTable } from "./kernelModules";

export const kernelModuleAuditLogTable = pgTable("kernel_module_audit_log", {
  id:         uuid("id").primaryKey().defaultRandom(),
  moduleId:   uuid("module_id").notNull().references(() => kernelModulesTable.id, { onDelete: "cascade" }),
  changedBy:  text("changed_by").notNull(),
  changedAt:  timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  diff:       jsonb("diff").notNull(),
});

export const insertKernelModuleAuditLogSchema = createInsertSchema(kernelModuleAuditLogTable).omit({ id: true, changedAt: true });
export type InsertKernelModuleAuditLog = z.infer<typeof insertKernelModuleAuditLogSchema>;
export type KernelModuleAuditLog = typeof kernelModuleAuditLogTable.$inferSelect;
