/**
 * audit_log — append-only record of every privileged action taken in the
 * platform. Source of truth for "who did what, when, and why" — used for
 * compliance, post-incident review, and vendor/venue dispute resolution.
 *
 * Convention:
 *   - action       short verb-noun like "subscription.override", "payout.approve"
 *   - entityType   e.g. "subscription", "payout_request", "vendor_placement"
 *   - entityId     primary key of the affected row (text so we can store
 *                  composite or non-uuid ids)
 *   - before/after JSON snapshots; both nullable. For destructive actions
 *                  store at minimum the row that's being changed in `before`.
 *   - venueId      multi-tenant scoping where applicable
 *
 * Writes are best-effort and must never block the underlying operation.
 */

import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const auditLogTable = pgTable("audit_log", {
  id:          uuid("id").primaryKey().defaultRandom(),
  actorId:     uuid("actor_id"),                 // nullable for system actions
  actorRole:   text("actor_role"),               // e.g. 'super_admin', 'system'
  action:      text("action").notNull(),
  entityType:  text("entity_type").notNull(),
  entityId:    text("entity_id"),
  beforeState: jsonb("before_state"),
  afterState:  jsonb("after_state"),
  venueId:     uuid("venue_id"),
  ipAddress:   text("ip_address"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export type DbAuditLog     = typeof auditLogTable.$inferSelect;
export type InsertAuditLog = typeof auditLogTable.$inferInsert;
