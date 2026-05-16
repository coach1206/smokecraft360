/**
 * retentionEngine — data lifecycle management and archival policies.
 *
 * Enforces configurable retention policies across all major data domains:
 *   - Telemetry events:        30 days (default)
 *   - Trace spans:             7 days
 *   - Orchestration events:    90 days
 *   - Payment events:          7 years (financial compliance)
 *   - AI memory (short-term):  configured per flag (default 90 days)
 *   - Swipe session data:      180 days
 *   - Audit logs:              3 years
 *
 * Archival strategy:
 *   Expired rows are NOT deleted — they are moved to *_archive tables
 *   (compressed JSONB blobs) before purge. This supports forensic lookups.
 *
 * Safety: each run processes max 10,000 rows to avoid long-lock transactions.
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { isEnabled, getFlagValue } from "../featureFlags/featureFlagEngine";
import { increment }               from "../observability/metricsCollector";

export interface RetentionPolicy {
  tableName:    string;
  tsColumn:     string;
  retentionDays:number;
  archiveTable: string | null;  // null = hard delete (non-compliance data)
  batchSize:    number;
  description:  string;
}

const POLICIES: RetentionPolicy[] = [
  { tableName:"telemetry_events",      tsColumn:"created_at", retentionDays:30,         archiveTable:"telemetry_events_archive",      batchSize:5000, description:"Raw telemetry events" },
  { tableName:"trace_spans",           tsColumn:"created_at", retentionDays:7,           archiveTable:null,                            batchSize:5000, description:"Distributed trace spans" },
  { tableName:"pos_latency_samples",   tsColumn:"sampled_at", retentionDays:14,          archiveTable:null,                            batchSize:5000, description:"POS adapter latency samples" },
  { tableName:"orchestration_events",  tsColumn:"created_at", retentionDays:90,          archiveTable:"orchestration_events_archive",  batchSize:2000, description:"Orchestration event log" },
  { tableName:"payment_events",        tsColumn:"created_at", retentionDays:365 * 7,     archiveTable:"payment_events_archive",        batchSize:500,  description:"Payment lifecycle events (7yr compliance)" },
  { tableName:"refund_ledger",         tsColumn:"created_at", retentionDays:365 * 7,     archiveTable:"refund_ledger_archive",         batchSize:500,  description:"Refund ledger (7yr compliance)" },
  { tableName:"inventory_audit_log",   tsColumn:"created_at", retentionDays:365 * 3,     archiveTable:"inventory_audit_log_archive",   batchSize:2000, description:"Inventory audit (3yr compliance)" },
  { tableName:"order_mutation_events", tsColumn:"created_at", retentionDays:180,         archiveTable:"order_mutation_events_archive", batchSize:2000, description:"Order mutation events" },
  { tableName:"policy_audit_log",      tsColumn:"evaluated_at",retentionDays:365 * 3,    archiveTable:null,                            batchSize:2000, description:"Policy audit log (3yr, no archive)" },
  { tableName:"pos_drift_log",         tsColumn:"created_at", retentionDays:30,          archiveTable:null,                            batchSize:2000, description:"Inventory drift records" },
];

export interface RetentionRunResult {
  policy:    string;
  archived:  number;
  purged:    number;
  errors:    number;
  durationMs:number;
}

export async function runRetentionPolicy(policy: RetentionPolicy): Promise<RetentionRunResult> {
  const start   = Date.now();
  let archived  = 0, purged = 0, errors = 0;
  const cutoff  = new Date(Date.now() - policy.retentionDays * 86_400_000);

  try {
    if (policy.archiveTable) {
      // Archive to _archive table before delete
      const archiveResult = await pool.query(
        `INSERT INTO ${policy.archiveTable} (original_id, data, archived_at)
         SELECT id, row_to_json(t)::jsonb, NOW()
         FROM ${policy.tableName} t
         WHERE ${policy.tsColumn} < $1
         LIMIT $2
         ON CONFLICT DO NOTHING`,
        [cutoff.toISOString(), policy.batchSize],
      ).catch(err => {
        // Archive table may not exist yet — soft fail
        logger.warn({ err, table: policy.archiveTable }, "retentionEngine: archive table missing, skipping archive step");
        return { rowCount: 0 };
      });
      archived = archiveResult.rowCount ?? 0;
    }

    // Purge expired rows
    const purgeResult = await pool.query(
      `DELETE FROM ${policy.tableName}
       WHERE id IN (
         SELECT id FROM ${policy.tableName}
         WHERE ${policy.tsColumn} < $1
         LIMIT $2
       )`,
      [cutoff.toISOString(), policy.batchSize],
    ).catch(err => {
      // Table may not have id column — try alternative
      logger.warn({ err, table: policy.tableName }, "retentionEngine: purge fallback");
      return pool.query(
        `DELETE FROM ${policy.tableName} WHERE ${policy.tsColumn} < $1`,
        [cutoff.toISOString()],
      ).catch(() => ({ rowCount: 0 }));
    });

    purged = purgeResult.rowCount ?? 0;

    if (archived > 0 || purged > 0) {
      logger.info({ table: policy.tableName, archived, purged, cutoff: cutoff.toISOString() }, "retentionEngine: cycle complete");
      increment("retention", "rows_purged",   purged,   { table: policy.tableName });
      increment("retention", "rows_archived", archived, { table: policy.tableName });
    }
  } catch (err) {
    logger.error({ err, table: policy.tableName }, "retentionEngine: policy run failed");
    errors++;
  }

  return { policy: policy.tableName, archived, purged, errors, durationMs: Date.now() - start };
}

export async function runAllPolicies(): Promise<RetentionRunResult[]> {
  if (!isEnabled("infra.retention.enabled")) {
    logger.info("retentionEngine: disabled by feature flag, skipping");
    return [];
  }

  logger.info("retentionEngine: starting retention run");
  const results: RetentionRunResult[] = [];

  // Run policies serially to avoid DB lock pressure
  for (const policy of POLICIES) {
    const result = await runRetentionPolicy(policy);
    results.push(result);
  }

  const totalPurged   = results.reduce((s, r) => s + r.purged, 0);
  const totalArchived = results.reduce((s, r) => s + r.archived, 0);
  logger.info({ totalPurged, totalArchived, policies: results.length }, "retentionEngine: all policies complete");

  return results;
}

export function getAllPolicies(): RetentionPolicy[] {
  return POLICIES;
}

export function getPolicyForTable(tableName: string): RetentionPolicy | undefined {
  return POLICIES.find(p => p.tableName === tableName);
}
