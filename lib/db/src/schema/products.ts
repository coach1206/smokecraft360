import { pgTable, text, uuid, integer, boolean, timestamp, pgEnum, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productCategoryEnum = pgEnum("product_category", [
  "cigar",
  "alcohol",
  "food",
  "coffee",
  "tea",
  "scent",
  "candle",
]);

export const productTierEnum = pgEnum("product_tier", ["standard", "mid", "premium"]);

export const productsTable = pgTable("products", {
  id:          text("id").primaryKey(),
  venueId:     uuid("venue_id"),
  name:        text("name").notNull(),
  category:    productCategoryEnum("category").notNull(),
  flavorNotes: json("flavor_notes").$type<string[]>().notNull().default([]),
  strength:    integer("strength").notNull().default(3),
  moodTags:    json("mood_tags").$type<string[]>().notNull().default([]),
  pairingTags: json("pairing_tags").$type<string[]>().notNull().default([]),
  tier:        productTierEnum("tier").notNull().default("standard"),
  boostLevel:  integer("boost_level").notNull().default(0),
  sponsored:   boolean("sponsored").notNull().default(false),
  active:      boolean("active").notNull().default(true),
  brandId:     uuid("brand_id"),
  campaignId:  text("campaign_id"),
  imageUrl:    text("image_url"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type DbProduct    = typeof productsTable.$inferSelect;
