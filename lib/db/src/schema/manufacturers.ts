/**
 * manufacturers — partner fulfillment studios that can produce signature cigars.
 */

import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const MANUFACTURER_SPECIALTIES = [
  "premium",
  "boutique",
  "limited-edition",
  "large-production",
] as const;
export type ManufacturerSpecialty = typeof MANUFACTURER_SPECIALTIES[number];

export const manufacturersTable = pgTable("manufacturers", {
  id:           uuid("id").primaryKey().defaultRandom(),
  name:         text("name").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  country:      text("country").default("US"),
  specialty:    text("specialty").$type<ManufacturerSpecialty>().default("premium"),
  notes:        text("notes"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

export type Manufacturer = typeof manufacturersTable.$inferSelect;
