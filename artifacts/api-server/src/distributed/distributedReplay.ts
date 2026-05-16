/**
 * distributedReplay — coordinates replay ownership across cluster nodes.
 *
 * Problem: if multiple nodes all try to replay the same event stream
 * simultaneously, you get duplicate side-effects (duplicate DB writes,
 * duplicate notifications, etc.).
 *
 * Solution:
 *   - Each replay job is owned by one node (distributed lock)
 *   - Ownership is published so other nodes know to skip
 *   - Replay progress is checkpointed to DB for resumption after failure
 *   - Stale replays (owner died) are auto-recovered after TTL
 */

import { pool }      from "@workspace/db";
import { logger }    from "../lib/logger";
import { NODE_ID }   from "./clusterMembership";
import { acquireLock, releaseLock, withLock, type DistributedLock } from "./distributedLocks";
import { increment, observe } from "../platform/observability/metricsCollector";

export type ReplayType = "order" | "payment" | "inventory" | "venue" | "session";
export type ReplayStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface ReplayJob {
  replayId:    string;
  replayType:  ReplayType;
  entityId:    string;
  ownerId:     string | null;
  status:      ReplayStatus;
  fromTs?:     number;
  toTs?:       number;
  progress:    number;       // 0–100
  error?:      string;
  startedAt:   number | null;
  completedAt: number | null;
}

const REPLAY_TTL_MS = 10 * 60_000;  // 10 min ownership TTL

// ─── Job management ───────────────────────────────────────────────────────────

export async function createReplayJob(
  replayType: ReplayType,
  entityId:   string,
  opts: { fromTs?: number; toTs?: number } = {},
): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO replay_jobs
       (replay_type, entity_id, status, progress, from_ts, to_ts, created_at)
     VALUES ($1,$2,'pending',0,$3,$4,NOW())
     RETURNING replay_id`,
    [replayType, entityId,
      opts.fromTs ? new Date(opts.fromTs).toISOString() : null,
      opts.toTs   ? new Date(opts.toTs).toISOString()   : null],
  ).catch(async () => {
    // Table may not exist — return a generated ID
    return { rows: [{ replay_id: `replay_${Date.now()}` }] };
  });
  return String((rows[0] as Record<string, unknown>)["replay_id"]);
}

export async function claimReplayJob(replayId: string): Promise<DistributedLock | null> {
  const lockKey = `replay:${replayId}`;
  const lock    = await acquireLock(lockKey, REPLAY_TTL_MS);
  if (!lock) return null;

  await pool.query(
    `UPDATE replay_jobs SET status='running', owner_id=$1, started_at=NOW(), progress=0
     WHERE replay_id=$2 AND status IN ('pending','failed')`,
    [NODE_ID, replayId],
  ).catch(() => {});

  increment("replay", "jobs_claimed", 1);
  return lock;
}

export async function updateReplayProgress(replayId: string, progress: number): Promise<void> {
  await pool.query(
    `UPDATE replay_jobs SET progress=$1, updated_at=NOW() WHERE replay_id=$2`,
    [Math.round(progress), replayId],
  ).catch(() => {});
}

export async function completeReplayJob(replayId: string, lock: DistributedLock): Promise<void> {
  await pool.query(
    `UPDATE replay_jobs SET status='completed', progress=100, completed_at=NOW()
     WHERE replay_id=$1`,
    [replayId],
  ).catch(() => {});

  await releaseLock(lock);
  increment("replay", "jobs_completed", 1);
  logger.info({ replayId }, "distributedReplay: job completed");
}

export async function failReplayJob(replayId: string, lock: DistributedLock, error: string): Promise<void> {
  await pool.query(
    `UPDATE replay_jobs SET status='failed', error=$1, updated_at=NOW()
     WHERE replay_id=$2`,
    [error, replayId],
  ).catch(() => {});

  await releaseLock(lock);
  increment("replay", "jobs_failed", 1);
  logger.warn({ replayId, error }, "distributedReplay: job failed");
}

/** Run a replay with automatic ownership, progress tracking, and lock management */
export async function runReplay<T>(
  replayId: string,
  fn:       (onProgress: (pct: number) => void) => Promise<T>,
): Promise<{ result: T | null; acquired: boolean }> {
  const lock = await claimReplayJob(replayId);
  if (!lock) {
    logger.debug({ replayId }, "distributedReplay: already owned by another node");
    return { result: null, acquired: false };
  }

  const start = Date.now();
  try {
    const result = await fn((pct) => updateReplayProgress(replayId, pct).catch(() => {}));
    observe("replay", "duration_ms", Date.now() - start);
    await completeReplayJob(replayId, lock);
    return { result, acquired: true };
  } catch (err) {
    await failReplayJob(replayId, lock, err instanceof Error ? err.message : String(err));
    return { result: null, acquired: true };
  }
}

// ─── Recovery ─────────────────────────────────────────────────────────────────

export async function recoverStaleReplays(): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE replay_jobs SET status='pending', owner_id=NULL, progress=0
     WHERE status='running'
       AND updated_at < NOW() - INTERVAL '15 minutes'`,
  ).catch(() => ({ rowCount: 0 }));

  if ((rowCount ?? 0) > 0) {
    logger.warn({ count: rowCount }, "distributedReplay: recovered stale replay jobs");
    increment("replay", "stale_recovered", rowCount ?? 0);
  }
  return rowCount ?? 0;
}

export async function getPendingReplays(limit = 10): Promise<ReplayJob[]> {
  const { rows } = await pool.query(
    `SELECT * FROM replay_jobs WHERE status IN ('pending','failed')
     ORDER BY created_at ASC LIMIT $1`,
    [limit],
  ).catch(() => ({ rows: [] }));
  return rows.map(r => rowToJob(r as Record<string, unknown>));
}

export async function getReplayJob(replayId: string): Promise<ReplayJob | null> {
  const { rows } = await pool.query(
    `SELECT * FROM replay_jobs WHERE replay_id=$1 LIMIT 1`,
    [replayId],
  ).catch(() => ({ rows: [] }));
  return rows.length > 0 ? rowToJob(rows[0] as Record<string, unknown>) : null;
}

function rowToJob(r: Record<string, unknown>): ReplayJob {
  return {
    replayId:    String(r["replay_id"]),
    replayType:  String(r["replay_type"]) as ReplayType,
    entityId:    String(r["entity_id"]),
    ownerId:     r["owner_id"] ? String(r["owner_id"]) : null,
    status:      String(r["status"]) as ReplayStatus,
    fromTs:      r["from_ts"]   ? new Date(r["from_ts"] as string).getTime()   : undefined,
    toTs:        r["to_ts"]     ? new Date(r["to_ts"] as string).getTime()     : undefined,
    progress:    Number(r["progress"] ?? 0),
    error:       r["error"] ? String(r["error"]) : undefined,
    startedAt:   r["started_at"]   ? new Date(r["started_at"] as string).getTime()   : null,
    completedAt: r["completed_at"] ? new Date(r["completed_at"] as string).getTime() : null,
  };
}
