/**
 * distributedLocks — Postgres-backed advisory locks for cluster-safe operations.
 *
 * Design:
 *   - `distributed_locks` table is the single source of truth
 *   - Acquire: INSERT with ON CONFLICT check — only succeeds if not held or expired
 *   - Refresh: UPDATE last_refreshed to prevent TTL expiry during long operations
 *   - Release: DELETE by lock_key + holder_id (prevents foreign release)
 *   - Auto-expiry: locks with expires_at < NOW() are treated as released
 *
 * Usage:
 *   const lock = await acquireLock("reconciliation", 60_000);
 *   if (!lock) return; // someone else holds it
 *   try { ... } finally { await releaseLock(lock); }
 */

import { pool }      from "@workspace/db";
import { logger }    from "../lib/logger";
import { NODE_ID }   from "./clusterMembership";

export interface DistributedLock {
  lockKey:    string;
  holderId:   string;   // NODE_ID that holds the lock
  acquiredAt: number;
  expiresAt:  number;
  refreshTimer?: ReturnType<typeof setInterval>;
}

const REFRESH_INTERVAL_MS = 5_000;  // refresh before TTL expires

export async function acquireLock(
  lockKey: string,
  ttlMs:   number = 60_000,
  waitMs:  number = 0,      // poll interval if > 0, else single attempt
): Promise<DistributedLock | null> {
  const deadline = Date.now() + Math.max(waitMs, 0);
  const expiresAt = new Date(Date.now() + ttlMs);

  do {
    try {
      const { rows } = await pool.query(
        `INSERT INTO distributed_locks (lock_key, holder_id, acquired_at, expires_at)
         VALUES ($1,$2,NOW(),$3)
         ON CONFLICT (lock_key) DO UPDATE
           SET holder_id=EXCLUDED.holder_id,
               acquired_at=NOW(),
               expires_at=EXCLUDED.expires_at
           WHERE distributed_locks.expires_at < NOW()
         RETURNING lock_key`,
        [lockKey, NODE_ID, expiresAt.toISOString()],
      );

      if (rows.length > 0) {
        const lock: DistributedLock = {
          lockKey,
          holderId:   NODE_ID,
          acquiredAt: Date.now(),
          expiresAt:  expiresAt.getTime(),
        };

        // Background refresh to keep lock alive during long operations
        if (ttlMs > REFRESH_INTERVAL_MS * 2) {
          lock.refreshTimer = setInterval(
            () => refreshLock(lock, ttlMs).catch(() => {}),
            REFRESH_INTERVAL_MS,
          );
          lock.refreshTimer.unref();
        }

        logger.debug({ lockKey, ttlMs }, "distributedLocks: lock acquired");
        return lock;
      }
    } catch (err) {
      logger.warn({ err, lockKey }, "distributedLocks: acquire error");
      return null;
    }

    if (waitMs > 0 && Date.now() < deadline) {
      await sleep(500);
    } else {
      break;
    }
  } while (true);

  return null;
}

export async function releaseLock(lock: DistributedLock): Promise<void> {
  if (lock.refreshTimer) { clearInterval(lock.refreshTimer); }

  await pool.query(
    `DELETE FROM distributed_locks WHERE lock_key=$1 AND holder_id=$2`,
    [lock.lockKey, lock.holderId],
  ).catch(err => logger.warn({ err, lockKey: lock.lockKey }, "distributedLocks: release error"));

  logger.debug({ lockKey: lock.lockKey }, "distributedLocks: lock released");
}

async function refreshLock(lock: DistributedLock, ttlMs: number): Promise<void> {
  const newExpiry = new Date(Date.now() + ttlMs);
  await pool.query(
    `UPDATE distributed_locks SET expires_at=$1
     WHERE lock_key=$2 AND holder_id=$3`,
    [newExpiry.toISOString(), lock.lockKey, lock.holderId],
  );
  lock.expiresAt = newExpiry.getTime();
}

/** Convenience wrapper: acquire → execute → release */
export async function withLock<T>(
  lockKey: string,
  ttlMs:   number,
  fn:      () => Promise<T>,
): Promise<{ result: T; acquired: true } | { result: null; acquired: false }> {
  const lock = await acquireLock(lockKey, ttlMs);
  if (!lock) return { result: null, acquired: false };
  try {
    const result = await fn();
    return { result, acquired: true };
  } finally {
    await releaseLock(lock);
  }
}

export async function isLockHeld(lockKey: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM distributed_locks WHERE lock_key=$1 AND expires_at > NOW() LIMIT 1`,
    [lockKey],
  ).catch(() => ({ rows: [] }));
  return rows.length > 0;
}

export async function getLockHolder(lockKey: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT holder_id FROM distributed_locks WHERE lock_key=$1 AND expires_at > NOW() LIMIT 1`,
    [lockKey],
  ).catch(() => ({ rows: [] }));
  return rows.length > 0 ? String((rows[0] as Record<string, unknown>)["holder_id"]) : null;
}

export async function evictExpiredLocks(): Promise<number> {
  const { rowCount } = await pool.query(
    `DELETE FROM distributed_locks WHERE expires_at < NOW()`,
  ).catch(() => ({ rowCount: 0 }));
  return rowCount ?? 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms).unref());
}
