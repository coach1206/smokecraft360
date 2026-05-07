/**
 * security_audit_trail — anomaly detection and incident event ledger.
 *
 * Distinct from enterprise_security_logs (clearance-gated access events) and
 * audit_log (privileged business actions). This table focuses on DETECTED
 * anomalies and automated failover events:
 *
 *   event_type       MANIPULATION_DETECTED — tamper / replay / MITM signal
 *                    FAILOVER_TRIGGERED    — mesh failover initiated
 *                    UNAUTHORIZED_ACCESS   — credential or role boundary breach
 *                    THERMAL_ALERT         — device exceeded thermal threshold
 *                    PIXEL_SHIFT_DISABLED  — OLED protection bypassed
 *
 *   severity_level   1 (informational) → 5 (critical / requires immediate action)
 *   payload_hash     AES-GCM tag / SHA-256 of the encrypted incident snapshot;
 *                    the plaintext is never stored here
 *   resolved_at      null = open incident; set when acknowledged by super_admin
 *   device_id        optional — links to hardware_fleet when event is device-scoped
 *   venue_id         tenant scope; null = platform-wide (super_admin only)
 *
 * Append-only: no UPDATE route. resolved_at is set via a dedicated
 * PATCH /:auditId/resolve endpoint (not a general update) so the
 * original record stays immutable.
 */

import {
  pgTable, uuid, text, integer, timestamp, index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const AUDIT_EVENT_TYPES = [
  "MANIPULATION_DETECTED",
  "FAILOVER_TRIGGERED",
  "UNAUTHORIZED_ACCESS",
  "THERMAL_ALERT",
  "PIXEL_SHIFT_DISABLED",
] as const;

export const AUDIT_SEVERITY_LEVELS = [1, 2, 3, 4, 5] as const;

export type AuditEventType     = typeof AUDIT_EVENT_TYPES[number];
export type AuditSeverityLevel = typeof AUDIT_SEVERITY_LEVELS[number];

export const securityAuditTrailTable = pgTable(
  "security_audit_trail",
  {
    auditId:        uuid("audit_id").primaryKey().defaultRandom(),
    venueId:        uuid("venue_id"),                         // null = platform-wide
    deviceId:       uuid("device_id"),                        // soft FK → hardware_fleet
    eventType:      text("event_type")
      .notNull()
      .$type<AuditEventType>(),
    severityLevel:  integer("severity_level")
      .notNull()
      .default(1)
      .$type<AuditSeverityLevel>(),
    payloadHash:    text("payload_hash"),                     // AEAD tag of encrypted snapshot
    resolvedAt:     timestamp("resolved_at", { withTimezone: true }),  // null = open
    resolvedBy:     uuid("resolved_by"),                      // super_admin actor
    createdAt:      timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    venueIdx:      index("sat_venue_idx").on(t.venueId),
    severityIdx:   index("sat_severity_idx").on(t.severityLevel),
    eventIdx:      index("sat_event_idx").on(t.eventType),
    openIdx:       index("sat_open_idx").on(t.resolvedAt, t.severityLevel),
    deviceIdx:     index("sat_device_idx").on(t.deviceId),
  }),
);

export const insertSecurityAuditTrailSchema = createInsertSchema(
  securityAuditTrailTable,
).omit({ auditId: true, createdAt: true, resolvedAt: true, resolvedBy: true });

export type InsertSecurityAuditTrail = z.infer<typeof insertSecurityAuditTrailSchema>;
export type SecurityAuditTrail       = typeof securityAuditTrailTable.$inferSelect;
