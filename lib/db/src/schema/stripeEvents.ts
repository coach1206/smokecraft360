import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const stripeEventsTable = pgTable("stripe_events", {
  id:        text("id").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DbStripeEvent = typeof stripeEventsTable.$inferSelect;
