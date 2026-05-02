/**
 * missingDemand — persistent unfulfilled demand tracking.
 *
 * One row per (venueId, productId) pair. Upserted every time a user
 * requests a product that is not in the venue's inventory.
 *
 * requestCount is atomically incremented on each upsert so venues can
 * see at a glance how many times each missing product has been requested.
 */

import { pgTable, uuid, text, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema }                              from "drizzle-zod";
import { z }                                               from "zod/v4";

export const missingDemandTable = pgTable(
  "missing_demand",
  {
    id:              uuid("id").primaryKey().defaultRandom(),
    venueId:         uuid("venue_id"),
    productId:       text("product_id").notNull(),
    productName:     text("product_name"),
    category:        text("category"),
    requestCount:    integer("request_count").notNull().default(1),
    lastRequestedAt: timestamp("last_requested_at").notNull().defaultNow(),
    createdAt:       timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqVenueProduct: unique("missing_demand_venue_product_unique").on(t.venueId, t.productId),
  }),
);

export const insertMissingDemandSchema = createInsertSchema(missingDemandTable).omit({
  id: true, requestCount: true, createdAt: true,
});
export type InsertMissingDemand = z.infer<typeof insertMissingDemandSchema>;
export type MissingDemand       = typeof missingDemandTable.$inferSelect;
