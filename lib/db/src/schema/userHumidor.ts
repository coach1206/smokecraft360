/**
 * userHumidor — personal purchase history per user.
 *
 * One row per (userId, productId). Upserted when a verified order is completed.
 * quantityPurchased is incremented on each verified purchase.
 *
 * Only verified orders contribute — unverified orders never touch this table.
 */

import { pgTable, uuid, text, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const userHumidorTable = pgTable(
  "user_humidor",
  {
    id:                uuid("id").primaryKey().defaultRandom(),
    userId:            uuid("user_id").notNull(),
    productId:         text("product_id").notNull(),
    productName:       text("product_name"),
    category:          text("category"),
    quantityPurchased: integer("quantity_purchased").notNull().default(1),
    lastPurchasedAt:   timestamp("last_purchased_at").notNull().defaultNow(),
    firstPurchasedAt:  timestamp("first_purchased_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqUserProduct: unique("humidor_user_product_unique").on(t.userId, t.productId),
  }),
);

export type UserHumidor = typeof userHumidorTable.$inferSelect;
