import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const demoSimEventsTable = pgTable("demo_sim_events", {
  id:        uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id").notNull(),
  eventType: text("event_type").notNull(),
  payload:   jsonb("payload").notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DemoSimEvent       = typeof demoSimEventsTable.$inferSelect;
export type InsertDemoSimEvent = typeof demoSimEventsTable.$inferInsert;
