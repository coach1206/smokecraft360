import { pgTable, text, uuid, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "venue_owner",
  "manager",
  "staff",
  "brand_partner",
  "customer",
]);

export const userLevelEnum = pgEnum("user_level", ["standard", "elite"]);

export const usersTable = pgTable("users", {
  id:           uuid("id").primaryKey().defaultRandom(),
  name:         text("name").notNull(),
  email:        text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role:         userRoleEnum("role").notNull().default("customer"),
  venueId:      uuid("venue_id"),
  score:        integer("score").notNull().default(0),
  level:        userLevelEnum("level").notNull().default("standard"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User     = typeof usersTable.$inferSelect;
export type UserRole = typeof userRoleEnum.enumValues[number];
