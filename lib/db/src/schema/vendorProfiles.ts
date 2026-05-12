import { pgTable, uuid, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vendorOnboardingStatusEnum = pgEnum("vendor_onboarding_status", [
  "pending",
  "in_review",
  "approved",
  "suspended",
]);

export const vendorProfilesTable = pgTable("vendor_profiles", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  userId:             uuid("user_id").notNull().unique(),
  companyName:        text("company_name").notNull(),
  contactEmail:       text("contact_email").notNull(),
  contactPhone:       text("contact_phone"),
  website:            text("website"),
  productCategories:  text("product_categories"),
  catalogUrl:         text("catalog_url"),
  agreementSigned:    boolean("agreement_signed").notNull().default(false),
  status:             vendorOnboardingStatusEnum("status").notNull().default("pending"),
  brandId:            uuid("brand_id"),
  approvedBy:         uuid("approved_by"),
  approvedAt:         timestamp("approved_at"),
  notes:              text("notes"),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
});

export const insertVendorProfileSchema = createInsertSchema(vendorProfilesTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertVendorProfile = z.infer<typeof insertVendorProfileSchema>;
export type DbVendorProfile     = typeof vendorProfilesTable.$inferSelect;
