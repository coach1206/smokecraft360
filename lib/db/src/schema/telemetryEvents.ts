import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const telemetryEventsTable = pgTable("telemetry_events", {
  id:          uuid("id").primaryKey().defaultRandom(),
  moduleId:    uuid("module_id"),
  venueId:     uuid("venue_id"),
  eventType:   text("event_type").notNull(),
  payload:     jsonb("payload").$type<Record<string, unknown>>().default({}),
  occurredAt:  timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTelemetryEventSchema = createInsertSchema(telemetryEventsTable).omit({ id: true, occurredAt: true });
export type InsertTelemetryEvent = z.infer<typeof insertTelemetryEventSchema>;
export type TelemetryEvent = typeof telemetryEventsTable.$inferSelect;
