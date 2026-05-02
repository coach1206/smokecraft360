/**
 * demandEvents — comprehensive demand capture table.
 *
 * Records every demand signal from user interactions:
 *   "selection"   — user swiped right or selected a product in recommendations
 *   "oos_request" — user tapped "Request This Item" (out-of-stock)
 *   "order"       — user placed an order for this product
 *   "blend_use"   — product used in a custom blend
 *   "search"      — user searched for or filtered toward this product
 *
 * flavorNotes is stored as a JSON text array (pipe-separated for simplicity).
 * Used by the Demand Proof Engine to compute demand scores, generate insight
 * statements, and surface distributor opportunities.
 */

import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema }                       from "drizzle-zod";
import { z }                                        from "zod/v4";

export const DEMAND_EVENT_TYPES = [
  "view",
  "selection",
  "oos_request",
  "order",
  "blend_use",
  "search",
] as const;

export type DemandEventType = typeof DEMAND_EVENT_TYPES[number];

export const demandEventsTable = pgTable("demand_events", {
  id:          uuid("id").primaryKey().defaultRandom(),
  venueId:     uuid("venue_id"),
  productId:   text("product_id").notNull(),
  productName: text("product_name"),
  category:    text("category"),
  /** Pipe-separated flavor notes: "cedar|leather|smoky" */
  flavorNotes: text("flavor_notes"),
  eventType:   text("event_type").notNull(),
  userId:      uuid("user_id"),
  sessionId:   text("session_id"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const insertDemandEventSchema = createInsertSchema(demandEventsTable).omit({
  id: true, createdAt: true,
});
export type InsertDemandEvent = z.infer<typeof insertDemandEventSchema>;
export type DemandEvent       = typeof demandEventsTable.$inferSelect;
