import { pgTable, uuid, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const partnerTierEnum = pgEnum("partner_tier", [
  "LOCAL",
  "REGIONAL",
  "NATIONAL",
]);

export const brandPartnersTable = pgTable("brand_partners", {
  id:                uuid("id").primaryKey().defaultRandom(),
  name:              text("name").notNull(),
  tier:              partnerTierEnum("tier").notNull().default("LOCAL"),
  active:            boolean("active").notNull().default(true),
  placementPriority: integer("placement_priority").notNull().default(0),
  allowedCraftTypes: text("allowed_craft_types"),
  budgetMonthly:     integer("budget_monthly"),
  startDate:         timestamp("start_date"),
  endDate:           timestamp("end_date"),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
});

export const insertBrandPartnerSchema = createInsertSchema(brandPartnersTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertBrandPartner = z.infer<typeof insertBrandPartnerSchema>;
export type BrandPartner = typeof brandPartnersTable.$inferSelect;
