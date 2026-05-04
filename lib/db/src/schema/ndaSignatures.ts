/**
 * ndaSignaturesTable — rich NDA signatures captured at the demo gate.
 *
 * Distinct from the lightweight per-user NDA on `users` (3 cols, used for the
 * IP-vault gate). This table stores the full ceremony: typed full name,
 * initials, drawn signature (base64 PNG from a canvas), explicit `agreed`
 * checkbox value, plus forensic fields (server timestamp, IP address,
 * device type from User-Agent, optional client session id).
 *
 * One row per signing event. Public (unauthenticated) writes are allowed
 * because the demo gate runs before any login; reads are admin-only.
 */

import { pgTable, uuid, text, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const ndaSignaturesTable = pgTable("nda_signatures", {
  id:            uuid("id").primaryKey().defaultRandom(),
  fullName:      text("full_name").notNull(),
  initials:      text("initials").notNull(),
  /** Base64-encoded PNG dataURL from the signature canvas. */
  signatureData: text("signature_data").notNull(),
  agreed:        boolean("agreed").notNull(),
  ipAddress:     text("ip_address"),
  /** Coarse device classification ("mobile" | "tablet" | "desktop") from UA. */
  deviceType:    text("device_type"),
  /** Optional client-supplied session id for tying the signature to a flow. */
  sessionId:     text("session_id"),
  deviceId:      uuid("device_id"),
  venueId:       uuid("venue_id"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  byCreatedAt: index("nda_signatures_created_at_idx").on(t.createdAt),
}));

export type NdaSignature       = typeof ndaSignaturesTable.$inferSelect;
export type InsertNdaSignature = typeof ndaSignaturesTable.$inferInsert;
