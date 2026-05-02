import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brandsTable = pgTable("brands", {
  id:            uuid("id").primaryKey().defaultRandom(),
  name:          text("name").notNull(),
  category:      text("category").notNull(),
  distributorId: uuid("distributor_id"),
  logoUrl:       text("logo_url"),
  website:       text("website"),
  contactEmail:  text("contact_email"),
  active:        boolean("active").notNull().default(true),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

export const insertBrandSchema = createInsertSchema(brandsTable).omit({ id: true, createdAt: true });
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Brand       = typeof brandsTable.$inferSelect;
