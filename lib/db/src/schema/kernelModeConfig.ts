import { pgTable, pgEnum, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const kernelModeEnum = pgEnum("kernel_mode", [
  "sovereign",
  "essential",
]);

export const kernelModeConfigTable = pgTable("kernel_mode_config", {
  id:        uuid("id").primaryKey().defaultRandom(),
  venueId:   uuid("venue_id").notNull().unique(),
  mode:      kernelModeEnum("mode").notNull().default("sovereign"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by"),
});

export const insertKernelModeConfigSchema = createInsertSchema(kernelModeConfigTable).omit({ id: true });
export type InsertKernelModeConfig = z.infer<typeof insertKernelModeConfigSchema>;
export type KernelModeConfig = typeof kernelModeConfigTable.$inferSelect;
