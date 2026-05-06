import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id:        uuid("id").primaryKey().defaultRandom(),
  vendorId:  text("vendor_id").notNull(),
  productId: text("product_id").notNull(),
  quantity:  integer("quantity").notNull().default(1),
  status:    text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
