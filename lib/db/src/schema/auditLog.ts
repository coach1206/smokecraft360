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

import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
}, (t) => ({
  // Read-path indexes for the GET /api/audit-log reader (G6). Each index
  // anchors on created_at DESC so the keyset cursor scan is index-only.
  venueCreatedIdx:  index("idx_audit_log_venue_created").on(t.venueId,  sql`${t.createdAt} DESC`),
  actionCreatedIdx: index("idx_audit_log_action_created").on(t.action,   sql`${t.createdAt} DESC`),
  actorCreatedIdx:  index("idx_audit_log_actor_created").on(t.actorId,  sql`${t.createdAt} DESC`),
}));

export type DbAuditLog     = typeof auditLogTable.$inferSelect;
export type InsertAuditLog = typeof auditLogTable.$inferInsert;
