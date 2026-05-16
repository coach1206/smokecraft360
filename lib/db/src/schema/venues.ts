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
  stripeCustomerId:         text("stripe_customer_id"),
  stripeConnectAccountId:   text("stripe_connect_account_id"),
  stripeConnectOnboarded:   boolean("stripe_connect_onboarded").notNull().default(false),
  platformFeeBps:           text("platform_fee_bps").default("500"), // basis points: 500 = 5.00%
  posMode:                  text("pos_mode").default("overlay"),
  posModeChangedBy:         text("pos_mode_changed_by"),
  posModeChangedAt:         timestamp("pos_mode_changed_at", { withTimezone: true }),
  createdAt:                timestamp("created_at").notNull().defaultNow(),
});

export const insertVenueSchema = createInsertSchema(venuesTable).omit({ id: true, createdAt: true });
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type Venue      = typeof venuesTable.$inferSelect;
