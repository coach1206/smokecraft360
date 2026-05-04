import { pgTable, uuid, integer, boolean, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brandProductsTable = pgTable(
  "brand_products",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    brandId:     uuid("brand_id").notNull(),
    productId:   text("product_id").notNull(),
    boostWeight: integer("boost_weight").notNull().default(0),
    isFeatured:  boolean("is_featured").notNull().default(false),
    campaignId:  uuid("campaign_id"),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("brand_products_brand_product_idx").on(t.brandId, t.productId),
  ],
);

export const insertBrandProductSchema = createInsertSchema(brandProductsTable).omit({
  id: true, createdAt: true,
});
export type InsertBrandProduct = z.infer<typeof insertBrandProductSchema>;
export type BrandProduct = typeof brandProductsTable.$inferSelect;
