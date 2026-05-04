import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const touchscreenFlowSessionsTable = pgTable("touchscreen_flow_sessions", {
  id:         uuid("id").primaryKey().defaultRandom(),
  flowId:     text("flow_id").notNull(),
  role:       text("role").notNull(),
  userId:     uuid("user_id"),
  venueId:    uuid("venue_id"),
  vendorId:   uuid("vendor_id"),
  deviceId:   text("device_id"),
  sessionId:  text("session_id"),
  status:     text("status").notNull().default("in_progress"),
  currentStep: text("current_step").notNull().default("0"),
  progress:   jsonb("progress").$type<Record<string, unknown>>().default({}),
  metadata:   jsonb("metadata").$type<Record<string, unknown>>().default({}),
  completedAt: timestamp("completed_at"),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
  updatedAt:  timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  byUser:   index("tfs_user_idx").on(t.userId),
  byVenue:  index("tfs_venue_idx").on(t.venueId),
  byDevice: index("tfs_device_idx").on(t.deviceId),
  byStatus: index("tfs_status_idx").on(t.status),
}));

export type TouchscreenFlowSession = typeof touchscreenFlowSessionsTable.$inferSelect;
export type InsertTouchscreenFlowSession = typeof touchscreenFlowSessionsTable.$inferInsert;
