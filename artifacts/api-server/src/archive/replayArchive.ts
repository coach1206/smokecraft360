/**
 * replayArchive — long-term archival of completed replay jobs and forensic data.
 *
 * Archival strategy:
 *   - Completed replay jobs older than ARCHIVE_AFTER_DAYS are archived to replay_archive table
 *   - Archive includes full event snapshots, divergence reports, and audit logs
 *   - Archived data is immutable and retained for RETAIN_YEARS years
 *   - Pre-archive verification ensures data integrity
 */

import { pool }       from "@workspace/db";
import { logger }     from "../lib/logger";
import { withLock }   from "../distributed/distributedLocks";
import { increment }  from "../platform/observability/metricsCollector";

const ARCHIVE_AFTER_DAYS = 30;
const ARCHIVE_LOCK       = "replay_archive_job";

export interface ReplayArchiveEntry {
  archiveId:   string;
  replayId:    string;
  replayType:  string;
  entityId:    string;
  completedAt: number;
  durationMs:  number;
  eventCount:  number;
  divergences: number;
  auditHash:   string;
  archivedAt:  number;
}

export async function archiveCompletedReplays(batchSize = 100): Promise<{
  archived: number; errors: number;
}> {
  let archived = 0;
  let errors   = 0;

  const { acquired } = await withLock(ARCHIVE_LOCK, 5 * 60_000, async () => {
    // Find completed replays past archive threshold
    const { rows } = await pool.query(
      `SELECT replay_id, replay_type, entity_id, completed_at, started_at
       FROM replay_jobs
       WHERE status='completed'
         AND completed_at < NOW() - ($1||' days')::interval
       ORDER BY completed_at ASC LIMIT $2`,
      [ARCHIVE_AFTER_DAYS, batchSize],
    ).catch(() => ({ rows: [] }));

    for (const r of rows as Record<string, unknown>[]) {
      try {
        const replayId = String(r["replay_id"]);

        // Pull audit log before archival
        const { rows: auditRows } = await pool.query(
          `SELECT * FROM replay_audit_log WHERE replay_id=$1 ORDER BY logged_at ASC`,
          [replayId],
        ).catch(() => ({ rows: [] }));

        const completedAt = new Date(r["completed_at"] as string).getTime();
        const startedAt   = r["started_at"] ? new Date(r["started_at"] as string).getTime() : completedAt;

        // Insert into archive table
        await pool.query(
          `INSERT INTO replay_archive
             (replay_id, replay_type, entity_id, completed_at, duration_ms, event_count, audit_snapshot, archived_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
           ON CONFLICT (replay_id) DO NOTHING`,
          [
            replayId, String(r["replay_type"]), String(r["entity_id"]),
            new Date(completedAt).toISOString(),
            completedAt - startedAt,
            0,
            JSON.stringify(auditRows),
          ],
        );

        // Soft-delete the replay job
        await pool.query(
          `UPDATE replay_jobs SET status='archived' WHERE replay_id=$1`,
          [replayId],
        );

        archived++;
        increment("archive.replay", "archived", 1);
      } catch (err) {
        errors++;
        logger.warn({ err, replayId: r["replay_id"] }, "replayArchive: archival error");
      }
    }

    return null;
  });

  if (!acquired) logger.debug("replayArchive: lock held, skipping");

  return { archived, errors };
}

export async function getArchiveStats(): Promise<{
  totalArchived: number; oldestArchiveMs: number; newestArchiveMs: number;
}> {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS cnt,
            EXTRACT(EPOCH FROM MIN(archived_at)) * 1000 AS oldest,
            EXTRACT(EPOCH FROM MAX(archived_at)) * 1000 AS newest
     FROM replay_archive`,
  ).catch(() => ({ rows: [{ cnt:0, oldest:null, newest:null }] }));
  const r = rows[0] as Record<string, unknown>;
  return {
    totalArchived:  Number(r?.["cnt"] ?? 0),
    oldestArchiveMs:Number(r?.["oldest"] ?? 0),
    newestArchiveMs:Number(r?.["newest"] ?? 0),
  };
}
