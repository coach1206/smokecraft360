/**
 * entitlement_audit_logs — immutable record of every entitlement change.
 *
 * Every PUT to /api/admin/entitlements/:venueId appends a row here so the
 * super_admin can reconstruct how any venue's feature set evolved over time.
 */

import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const entitlementAuditLogsTable = pgTable("entitlement_audit_logs", {
  id:        uuid("id").primaryKey().defaultRandom(),
  venueId:   text("venue_id").notNull(),
  adminId:   text("admin_id").notNull(),
  adminName: text("admin_name"),
  action:    text("action").notNull(),
  before:    jsonb("before").$type<Record<string, unknown>>(),
  after:     jsonb("after").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type EntitlementAuditLog = typeof entitlementAuditLogsTable.$inferSelect;
