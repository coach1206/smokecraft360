import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const ordersTable = pgTable("orders", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      uuid("user_id"),
  venueId:     uuid("venue_id"),
  cigarId:     text("cigar_id"),
  cigarName:   text("cigar_name"),
  drinkId:     text("drink_id"),
  drinkName:   text("drink_name"),
  foodId:      text("food_id"),
  foodName:    text("food_name"),
  orderType:   text("order_type").notNull().$type<"table" | "pickup" | "delivery">(),
  status:      text("status").notNull().default("pending").$type<"pending" | "in_progress" | "completed" | "cancelled">(),
  tableNumber: text("table_number"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export type DbOrder    = typeof ordersTable.$inferSelect;
export type InsertOrder = typeof ordersTable.$inferInsert;
