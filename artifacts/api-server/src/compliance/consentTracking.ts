/**
 * consentTracking — consent lifecycle management.
 *
 * Records consent events (grant/revoke/expire) with full audit history.
 * Provides query surface for privacy controls and regional compliance.
 */

import { logger } from "../lib/logger";
import { pool }   from "@workspace/db";

export type ConsentType =
  | "data_collection" | "ai_profiling" | "marketing" | "analytics"
  | "third_party_sharing" | "location" | "biometric";

export type ConsentAction = "granted" | "revoked" | "expired" | "updated";

export interface ConsentRecord {
  consentId:   string;
  entityId:    string;
  entityType:  "guest" | "user" | "device";
  venueId:     string;
  type:        ConsentType;
  action:      ConsentAction;
  version:     string;
  channel:     string;
  ipHash?:     string;
  expiresAt?:  Date;
  metadata:    Record<string, unknown>;
  recordedAt:  Date;
}

export async function recordConsent(
  entityId:   string,
  entityType: ConsentRecord["entityType"],
  venueId:    string,
  type:       ConsentType,
  action:     ConsentAction,
  opts: {
    version?:  string;
    channel?:  string;
    ipHash?:   string;
    expiresAt?: Date;
    metadata?:  Record<string, unknown>;
  } = {},
): Promise<ConsentRecord> {
  const record: ConsentRecord = {
    consentId:  `cst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    entityId, entityType, venueId, type, action,
    version:    opts.version  ?? "1.0",
    channel:    opts.channel  ?? "system",
    ipHash:     opts.ipHash,
    expiresAt:  opts.expiresAt,
    metadata:   opts.metadata ?? {},
    recordedAt: new Date(),
  };

  // Store in the security_audit_trail table (pre-existing)
  await pool.query(
    `INSERT INTO security_audit_trail
       (action, actor_id, resource_type, resource_id, metadata, ip_address, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())`,
    [
      `consent:${action}:${type}`,
      entityId,
      `consent:${entityType}`,
      record.consentId,
      JSON.stringify(record),
      opts.ipHash ?? null,
    ],
  ).catch(err => logger.warn({ err }, "consentTracking: audit insert failed (non-fatal)"));

  logger.info({ entityId, type, action, venueId }, "consentTracking: recorded");
  return record;
}

export async function getConsentHistory(
  entityId:  string,
  type?:     ConsentType,
  limit = 50,
): Promise<ConsentRecord[]> {
  const typeFilter = type ? `AND action LIKE $3` : "";
  const params: unknown[] = [`consent%${entityId}%`, limit];
  if (type) params.push(`%:${type}`);

  const { rows } = await pool.query(
    `SELECT metadata FROM security_audit_trail
     WHERE actor_id = $1 AND action LIKE 'consent:%'
     ${typeFilter} ORDER BY created_at DESC LIMIT $2`,
    params,
  );
  return rows.map(r => r.metadata as ConsentRecord);
}

export async function hasActiveConsent(
  entityId: string,
  type:     ConsentType,
): Promise<boolean> {
  const history = await getConsentHistory(entityId, type, 1).catch(() => []);
  const latest  = history[0];
  if (!latest) return false;
  if (latest.action === "revoked" || latest.action === "expired") return false;
  if (latest.expiresAt && new Date(latest.expiresAt) < new Date()) return false;
  return latest.action === "granted" || latest.action === "updated";
}

export async function revokeAllConsent(entityId: string, venueId: string, reason: string): Promise<number> {
  const types: ConsentType[] = [
    "data_collection", "ai_profiling", "marketing", "analytics",
    "third_party_sharing", "location", "biometric",
  ];
  let count = 0;
  for (const type of types) {
    if (await hasActiveConsent(entityId, type)) {
      await recordConsent(entityId, "guest", venueId, type, "revoked",
        { metadata: { reason }, channel: "admin" });
      count++;
    }
  }
  logger.info({ entityId, venueId, count, reason }, "consentTracking: bulk revoke");
  return count;
}
