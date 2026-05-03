/**
 * exportLogsTable — audit trail for data exports.
 *
 * Each row records WHO exported WHAT scope in WHICH format, with the
 * filters applied, the resulting row/byte counts, and pass/fail status.
 * The export payload itself is streamed to the client at request time
 * and intentionally NOT persisted (avoid storing duplicate copies of
 * tenant data; the source tables remain the system of record).
 *
 * Tenant scoping is enforced at the route layer:
 *   - super_admin can export any scope, all tenants
 *   - venue_owner / manager can export `inventory` + `orders` for their
 *     own venueId only; `vendors` and `products` are super_admin-only.
 */

import { pgTable, uuid, text, integer, timestamp, json } from "drizzle-orm/pg-core";

export const EXPORT_SCOPES   = ["vendors", "products", "inventory", "orders"] as const;
export const EXPORT_FORMATS  = ["csv", "json"] as const;
export const EXPORT_STATUSES = ["completed", "failed"] as const;

export type ExportScope  = typeof EXPORT_SCOPES[number];
export type ExportFormat = typeof EXPORT_FORMATS[number];
export type ExportStatus = typeof EXPORT_STATUSES[number];

export const exportLogsTable = pgTable("export_logs", {
  id:           uuid("id").primaryKey().defaultRandom(),
  requestedBy:  uuid("requested_by").notNull(),
  scope:        text("scope").notNull().$type<ExportScope>(),
  format:       text("format").notNull().$type<ExportFormat>(),
  /** venueId scope for tenant-restricted exports; null when super_admin pulled global */
  venueId:      uuid("venue_id"),
  /** Arbitrary filter blob recorded for audit (status, dateRange, etc) */
  filters:      json("filters").$type<Record<string, unknown>>().notNull().default({}),
  rowCount:     integer("row_count").notNull().default(0),
  byteCount:    integer("byte_count").notNull().default(0),
  status:       text("status").notNull().$type<ExportStatus>().default("completed"),
  errorMessage: text("error_message"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export type ExportLog       = typeof exportLogsTable.$inferSelect;
export type InsertExportLog = typeof exportLogsTable.$inferInsert;
