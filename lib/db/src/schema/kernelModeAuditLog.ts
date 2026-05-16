import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { kernelModeEnum } from "./kernelModeConfig";

export const kernelModeAuditLogTable = pgTable("kernel_mode_audit_log", {
  id:         uuid("id").primaryKey().defaultRandom(),
  venueId:    uuid("venue_id").notNull(),
  oldMode:    kernelModeEnum("old_mode"),
  newMode:    kernelModeEnum("new_mode").notNull(),
  changedBy:  uuid("changed_by"),
  changedByName: text("changed_by_name"),
  changedAt:  timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKernelModeAuditLogSchema = createInsertSchema(kernelModeAuditLogTable).omit({ id: true, changedAt: true });
export type InsertKernelModeAuditLog = z.infer<typeof insertKernelModeAuditLogSchema>;
export type KernelModeAuditLog = typeof kernelModeAuditLogTable.$inferSelect;
