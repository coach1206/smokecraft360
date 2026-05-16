/**
 * retentionCompliance — enforces data retention policies.
 *
 * Runs on a schedule to delete or anonymize data past its retention
 * window per entity type and regional policy.
 */

import { logger } from "../lib/logger";
import { pool }   from "@workspace/db";

export type RetentionPolicy = {
  entityType:   string;
  tableName:    string;
  timestampCol: string;
  retainDays:   number;
  action:       "delete" | "anonymize";
  conditions?:  string; // additional SQL WHERE clause
};

const DEFAULT_POLICIES: RetentionPolicy[] = [
  { entityType: "telemetry",       tableName: "device_heartbeats",       timestampCol: "created_at", retainDays: 90,  action: "delete" },
  { entityType: "security_audit",  tableName: "security_audit_trail",    timestampCol: "created_at", retainDays: 365, action: "delete" },
  { entityType: "ambient_history", tableName: "ambient_scene_history",   timestampCol: "created_at", retainDays: 180, action: "delete" },
  { entityType: "cognition",       tableName: "cognition_decisions",     timestampCol: "decided_at", retainDays: 90,  action: "delete" },
  { entityType: "replay_archive",  tableName: "replay_archive",          timestampCol: "archived_at",retainDays: 365, action: "delete" },
  { entityType: "op_snapshots",    tableName: "operational_snapshots",   timestampCol: "created_at", retainDays: 30,  action: "delete" },
  { entityType: "payment_audit",   tableName: "payment_audit_log",       timestampCol: "logged_at",  retainDays: 2555, action: "delete" }, // 7 years
];

const customPolicies = new Map<string, RetentionPolicy>();

export function registerPolicy(policy: RetentionPolicy): void {
  customPolicies.set(policy.entityType, policy);
}

export function getPolicies(): RetentionPolicy[] {
  return [...DEFAULT_POLICIES, ...customPolicies.values()];
}

export interface RetentionResult {
  entityType: string;
  deleted:    number;
  errors:     number;
}

export async function enforcePolicy(policy: RetentionPolicy): Promise<RetentionResult> {
  try {
    const result = await pool.query(
      `DELETE FROM ${policy.tableName}
       WHERE ${policy.timestampCol} < NOW() - INTERVAL '${policy.retainDays} days'
         ${policy.conditions ? `AND (${policy.conditions})` : ""}`,
    );
    const deleted = result.rowCount ?? 0;
    if (deleted > 0) {
      logger.info({ entityType: policy.entityType, deleted }, "retentionCompliance: records purged");
    }
    return { entityType: policy.entityType, deleted, errors: 0 };
  } catch (err) {
    logger.warn({ err, entityType: policy.entityType }, "retentionCompliance: policy enforce failed");
    return { entityType: policy.entityType, deleted: 0, errors: 1 };
  }
}

export async function runRetentionCycle(): Promise<RetentionResult[]> {
  const results: RetentionResult[] = [];
  for (const policy of getPolicies()) {
    results.push(await enforcePolicy(policy));
  }
  const total = results.reduce((s, r) => s + r.deleted, 0);
  logger.info({ totalDeleted: total, policies: results.length }, "retentionCompliance: cycle complete");
  return results;
}

let retentionTimer: ReturnType<typeof setInterval> | null = null;

export function startRetentionCompliance(): void {
  if (retentionTimer) return;
  // Run daily at ~2 AM (24h interval with initial delay)
  const now   = new Date();
  const msTo2AM = ((26 - now.getHours()) % 24) * 3_600_000;
  setTimeout(() => {
    runRetentionCycle().catch(err => logger.warn({ err }, "retentionCompliance: cycle error"));
    retentionTimer = setInterval(
      () => runRetentionCycle().catch(err => logger.warn({ err }, "retentionCompliance: cycle error")),
      24 * 3_600_000,
    );
  }, msTo2AM);
  logger.info({ msTo2AM }, "retentionCompliance: scheduler started");
}
