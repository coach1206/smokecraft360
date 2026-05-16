import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const deviceHeartbeatsTable = pgTable("device_heartbeats", {
  id:         uuid("id").primaryKey().defaultRandom(),
  deviceId:   uuid("device_id").notNull(),
  venueId:    uuid("venue_id").notNull(),
  deviceType: text("device_type").notNull().default("kiosk"),
  status:     text("status").notNull().default("online"),
  appVersion: text("app_version"),
  ipAddress:  text("ip_address"),
  meta:       jsonb("meta").$type<Record<string, unknown>>().default({}),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});
