import { pgTable, pgEnum, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const kernelModuleStatusEnum = pgEnum("kernel_module_status", [
  "active",
  "inactive",
  "suspended",
]);

export const kernelCraftTypeEnum = pgEnum("kernel_craft_type", [
  "smoke",
  "pour",
  "brew",
  "vape",
  "none",
]);

export const kernelModulesTable = pgTable("kernel_modules", {
  id:           uuid("id").primaryKey().defaultRandom(),
  name:         text("name").notNull(),
  craftType:    kernelCraftTypeEnum("craft_type").notNull().default("none"),
  slug:         text("slug").notNull().unique(),
  status:       kernelModuleStatusEnum("status").notNull().default("active"),
  description:  text("description"),
  launchUrl:    text("launch_url"),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKernelModuleSchema = createInsertSchema(kernelModulesTable).omit({ id: true, registeredAt: true, updatedAt: true });
export type InsertKernelModule = z.infer<typeof insertKernelModuleSchema>;
export type KernelModule = typeof kernelModulesTable.$inferSelect;
