/**
 * enterprise_security_logs — immutable security event ledger.
 *
 * Distinct from audit_log (which covers privileged business actions):
 *   - Tenant-scoped via tenant_id with strict row-level isolation on read
 *   - security_clearance_level gates which roles may query entries:
 *       1  — staff-visible (general access events)
 *       2  — manager-visible (role escalations, config changes)
 *       3  — venue_owner-visible (cross-staff actions, financial triggers)
 *       4  — super_admin-only (encryption key ops, tenant-wide changes)
 *   - encrypted_payload_hash: SHA-256 / AES-GCM tag of the full event payload
 *     stored by the caller after encrypting at rest. The hash is stored here
 *     for integrity verification — the plaintext never touches this table.
 *
 * Append-only: no UPDATE or DELETE routes are exposed. Rows are immutable.
 *
 * actor_id + actor_role: who triggered the event (null = system/automated).
 * action_type:           verb-noun identifier, e.g. "auth.mfa_bypass_attempt",
 *                        "session.force_terminate", "tenant.isolation_breach_probe".
 */

import {
  pgTable, uuid, text, integer, timestamp, index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const SECURITY_CLEARANCE_LEVELS = [1, 2, 3, 4] as const;
export type SecurityClearanceLevel = typeof SECURITY_CLEARANCE_LEVELS[number];

export const enterpriseSecurityLogsTable = pgTable(
  "enterprise_security_logs",
  {
    logId:                  uuid("log_id").primaryKey().defaultRandom(),
    tenantId:               uuid("tenant_id").notNull(),           // strict isolation — never nullable
    actorId:                uuid("actor_id"),                      // null = system
    actorRole:              text("actor_role"),
    actionType:             text("action_type").notNull(),
    securityClearanceLevel: integer("security_clearance_level")
      .notNull()
      .default(1)
      .$type<SecurityClearanceLevel>(),
    encryptedPayloadHash:   text("encrypted_payload_hash"),        // SHA-256 / AEAD tag
    ipAddress:              text("ip_address"),
    createdAt:              timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx:    index("esl_tenant_idx").on(t.tenantId),
    tenantCreated: index("esl_tenant_created_idx").on(t.tenantId, t.createdAt),
    actionIdx:    index("esl_action_idx").on(t.actionType),
    clearanceIdx: index("esl_clearance_idx").on(t.securityClearanceLevel),
  }),
);

export const insertEnterpriseSecurityLogSchema = createInsertSchema(
  enterpriseSecurityLogsTable,
).omit({ logId: true, createdAt: true });

export type InsertEnterpriseSecurityLog = z.infer<typeof insertEnterpriseSecurityLogSchema>;
export type EnterpriseSecurityLog       = typeof enterpriseSecurityLogsTable.$inferSelect;
