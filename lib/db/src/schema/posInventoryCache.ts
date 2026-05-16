import { pgTable, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const posInventoryCacheTable = pgTable("pos_inventory_cache", {
  id:           uuid("id").primaryKey().defaultRandom(),
  connectionId: uuid("connection_id").notNull(),
  venueId:      uuid("venue_id").notNull(),
  provider:     text("provider").notNull(),
  productId:    text("product_id").notNull(),
  productName:  text("product_name").notNull(),
  quantity:     integer("quantity").notNull().default(0),
  available:    boolean("available").notNull().default(true),
  priceCents:   integer("price_cents"),
  sku:          text("sku"),
  syncedAt:     timestamp("synced_at").notNull().defaultNow(),
  expiresAt:    timestamp("expires_at").notNull(),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});
