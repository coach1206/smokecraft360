import { pgTable, text, uuid, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const venueTypeEnum = pgEnum("venue_type", [
  "cigar_lounge",
  "whiskey_bar",
  "wine_bar",
  "coffee_house",
  "scent_shop",
]);

export const venuePlanEnum = pgEnum("venue_plan", ["basic", "mid", "premium"]);

export const venuesTable = pgTable("venues", {
  id:               uuid("id").primaryKey().defaultRandom(),
  name:             text("name").notNull(),
  type:             venueTypeEnum("type").notNull(),
  plan:             venuePlanEnum("plan").notNull().default("basic"),
  themeProfile:     text("theme_profile"),
  active:           boolean("active").notNull().default(true),
  tagline:          text("tagline"),
  logoUrl:          text("logo_url"),
  primaryColor:     text("primary_color"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

export const insertVenueSchema = createInsertSchema(venuesTable).omit({ id: true, createdAt: true });
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type Venue      = typeof venuesTable.$inferSelect;
