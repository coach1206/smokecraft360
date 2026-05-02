import { pgTable, uuid, text, timestamp, pgEnum, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventTypeEnum = pgEnum("event_type", [
  "view",
  "swipe_right",
  "swipe_left",
  "recommendation",
  "save",
  "order",
  "boost_click",
  "sponsored_view",
  "recommendation_view",
  "product_selected",
  "pairing_selected",
  "food_selected",
  "order_created",
]);

export const analyticsEventsTable = pgTable("analytics_events", {
  id:        uuid("id").primaryKey().defaultRandom(),
  venueId:   uuid("venue_id"),
  userId:    uuid("user_id"),
  productId: text("product_id"),
  eventType: eventTypeEnum("event_type").notNull(),
  metadata:  json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(analyticsEventsTable).omit({ id: true, createdAt: true });
export type InsertEvent    = z.infer<typeof insertEventSchema>;
export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
export type EventType      = typeof eventTypeEnum.enumValues[number];
