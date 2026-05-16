import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { kernelModulesTable } from "./kernelModules";

export const kernelModuleSlugHistoryTable = pgTable("kernel_module_slug_history", {
  id:          uuid("id").primaryKey().defaultRandom(),
  moduleId:    uuid("module_id").notNull().references(() => kernelModulesTable.id, { onDelete: "cascade" }),
  oldSlug:     text("old_slug").notNull(),
  newSlug:     text("new_slug").notNull(),
  changedBy:   text("changed_by").notNull(),
  changedAt:   timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKernelModuleSlugHistorySchema = createInsertSchema(kernelModuleSlugHistoryTable).omit({
  id: true,
  changedAt: true,
});
export type InsertKernelModuleSlugHistory = z.infer<typeof insertKernelModuleSlugHistorySchema>;
export type KernelModuleSlugHistory = typeof kernelModuleSlugHistoryTable.$inferSelect;
