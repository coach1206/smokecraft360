/**
 * archivalJob — scheduled data archival and retention enforcement worker.
 *
 * Runs:
 *   - Retention sweep:   daily at 3am UTC
 *   - Snapshot archival: weekly (venue operational snapshots)
 *   - AI memory eviction:daily (evicts short-term memories beyond retention window)
 *
 * Designed to be called from the intelligence worker (30min cycle) or
 * directly triggered via admin API.
 *
 * Implements distributed lock so only ONE server runs archival at a time.
 */

import { pool }         from "@workspace/db";
import { logger }       from "../../lib/logger";
import { runAllPolicies } from "./retentionEngine";
import { getFlagValue }   from "../featureFlags/featureFlagEngine";

const ARCHIVAL_LOCK_KEY = "archival_job";
const LOCK_TTL_S        = 3600; // 1 hour

export interface ArchivalJobResult {
  ranAt:        number;
  retention:    { policies: number; purged: number; archived: number };
  memoryEviction:{ evicted: number };
  snapshotPurge:{ purged: number };
  durationMs:   number;
  skipped:      boolean;
  reason?:      string;
}

async function acquireDistributedLock(): Promise<boolean> {
  try {
    const { rows } = await pool.query(
      `INSERT INTO distributed_locks (lock_key, acquired_at, expires_at)
       VALUES ($1, NOW(), NOW() + ($2||' seconds')::interval)
       ON CONFLICT (lock_key) DO UPDATE
         SET acquired_at = NOW(), expires_at = NOW() + ($2||' seconds')::interval
         WHERE distributed_locks.expires_at < NOW()
       RETURNING lock_key`,
      [ARCHIVAL_LOCK_KEY, LOCK_TTL_S],
    );
    return rows.length > 0;
  } catch {
    return false; // non-critical — archival can skip if lock unavailable
  }
}

async function releaseDistributedLock(): Promise<void> {
  await pool.query(
    `DELETE FROM distributed_locks WHERE lock_key=$1`,
    [ARCHIVAL_LOCK_KEY],
  ).catch(() => {});
}

export async function runArchivalJob(): Promise<ArchivalJobResult> {
  const start = Date.now();

  // Distributed lock — only run on one instance
  const locked = await acquireDistributedLock();
  if (!locked) {
    return {
      ranAt: start, durationMs: Date.now() - start,
      retention: { policies:0, purged:0, archived:0 },
      memoryEviction: { evicted:0 }, snapshotPurge: { purged:0 },
      skipped: true, reason: "distributed lock held by another instance",
    };
  }

  try {
    // 1. Retention sweep
    const retentionResults = await runAllPolicies();
    const totalPurged      = retentionResults.reduce((s, r) => s + r.purged,   0);
    const totalArchived    = retentionResults.reduce((s, r) => s + r.archived, 0);

    // 2. AI memory eviction (short-term memories beyond retention window)
    const retentionDays    = getFlagValue("ai.memory.retention_days") as number ?? 90;
    const memResult = await pool.query(
      `UPDATE ai_behavior_memory
       SET archived = TRUE, archived_at = NOW()
       WHERE memory_type IN ('short_term','session')
         AND created_at < NOW() - ($1||' days')::interval
         AND archived = FALSE`,
      [retentionDays],
    ).catch(() => ({ rowCount: 0 }));
    const evicted = memResult.rowCount ?? 0;

    // 3. Operational snapshot purge (keep last 30 per venue)
    const snapshotResult = await pool.query(
      `DELETE FROM venue_context_snapshots
       WHERE id NOT IN (
         SELECT id FROM venue_context_snapshots vs2
         WHERE vs2.venue_id = venue_context_snapshots.venue_id
         ORDER BY created_at DESC
         LIMIT 30
       )`,
    ).catch(() => ({ rowCount: 0 }));

    logger.info({
      retention:      { policies: retentionResults.length, purged: totalPurged, archived: totalArchived },
      memoryEviction: { evicted },
      snapshotPurge:  { purged: snapshotResult.rowCount ?? 0 },
      durationMs:     Date.now() - start,
    }, "archivalJob: complete");

    return {
      ranAt: start, durationMs: Date.now() - start,
      retention: { policies: retentionResults.length, purged: totalPurged, archived: totalArchived },
      memoryEviction: { evicted },
      snapshotPurge:  { purged: snapshotResult.rowCount ?? 0 },
      skipped: false,
    };
  } finally {
    await releaseDistributedLock();
  }
}

/** Check if archival should run (once per day) */
export async function shouldRunToday(): Promise<boolean> {
  try {
    const { rows } = await pool.query(
      `SELECT acquired_at FROM distributed_locks
       WHERE lock_key='archival_last_run'
         AND acquired_at > NOW() - INTERVAL '23 hours'
       LIMIT 1`,
    );
    return rows.length === 0;
  } catch {
    return true; // default to running
  }
}
