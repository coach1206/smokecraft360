import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const experiencesTable = pgTable("experiences", {
  id:                uuid("id").primaryKey().defaultRandom(),
  userId:            uuid("user_id").notNull(),
  venueId:           uuid("venue_id"),
  selectedProductId: text("selected_product_id").notNull(),
  pairingProductId:  text("pairing_product_id"),
  foodPairingId:     text("food_pairing_id"),
  score:             integer("score").notNull().default(0),
  saved:             boolean("saved").notNull().default(false),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
});

export const insertExperienceSchema = createInsertSchema(experiencesTable).omit({ id: true, createdAt: true });
export type InsertExperience = z.infer<typeof insertExperienceSchema>;
export type Experience       = typeof experiencesTable.$inferSelect;
