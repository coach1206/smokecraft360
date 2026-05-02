/**
 * distributorsTable — tracks distribution partners for products.
 *
 * Products reference a distributorId so venue owners can see which
 * distributor supplies each product in their inventory reports.
 *
 * Fields required by spec: id, name, state, contactEmail, website.
 * Extras: region (legacy/internal), active, createdAt.
 */

import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const distributorsTable = pgTable("distributors", {
  id:           uuid("id").primaryKey().defaultRandom(),
  name:         text("name").notNull(),
  state:        text("state"),
  contactEmail: text("contact_email"),
  website:      text("website"),
  region:       text("region"),
  active:       boolean("active").notNull().default(true),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export const insertDistributorSchema = createInsertSchema(distributorsTable).omit({
  id: true, createdAt: true,
});
export type InsertDistributor = z.infer<typeof insertDistributorSchema>;
export type Distributor       = typeof distributorsTable.$inferSelect;
