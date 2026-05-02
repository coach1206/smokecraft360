/**
 * devices — registered venue hardware devices (mobile BYOD, tablet, kiosk).
 *
 * Status flow: active ↔ inactive
 * Types:
 *   mobile  — BYOD / QR scan (no hardware cost)
 *   tablet  — rented or purchased table unit
 *   kiosk   — full-screen front-of-house unit
 */

import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const DEVICE_TYPES   = ["mobile", "tablet", "kiosk"]    as const;
export const DEVICE_STATUSES = ["active", "inactive"]           as const;
export type DeviceType   = typeof DEVICE_TYPES[number];
export type DeviceStatus = typeof DEVICE_STATUSES[number];

export const devicesTable = pgTable("devices", {
  id:           uuid("id").primaryKey().defaultRandom(),
  venueId:      uuid("venue_id").notNull(),
  type:         text("type").notNull().$type<DeviceType>(),
  nickname:     text("nickname").notNull(),
  tableNumber:  text("table_number"),
  status:       text("status").notNull().default("active").$type<DeviceStatus>(),
  lastActiveAt: timestamp("last_active_at"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

export type Device       = typeof devicesTable.$inferSelect;
export type InsertDevice = typeof devicesTable.$inferInsert;

// ── Device Sessions ────────────────────────────────────────────────────────────

export const RESET_REASONS = ["inactivity", "order_complete", "staff_reset"] as const;
export type ResetReason = typeof RESET_REASONS[number];

export const deviceSessionsTable = pgTable("device_sessions", {
  id:          uuid("id").primaryKey().defaultRandom(),
  deviceId:    uuid("device_id").notNull(),
  venueId:     uuid("venue_id").notNull(),
  tableNumber: text("table_number"),
  userId:      uuid("user_id"),
  orderPlaced: boolean("order_placed").notNull().default(false),
  resetReason: text("reset_reason").$type<ResetReason>(),
  startedAt:   timestamp("started_at").notNull().defaultNow(),
  endedAt:     timestamp("ended_at"),
});

export type DeviceSession = typeof deviceSessionsTable.$inferSelect;
