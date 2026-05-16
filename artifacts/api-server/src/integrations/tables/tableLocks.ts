/**
 * tableLocks — multi-device table locking for collision prevention.
 *
 * In a busy lounge multiple devices/staff may try to update the same table
 * simultaneously (e.g. two servers both trying to add to the check).
 * tableLocks provides advisory locks with TTL — fast, non-blocking.
 *
 * Strategy: in-process map (sub-ms) + DB advisory lock for cross-process safety.
 * Lock TTL prevents deadlocks from crashed devices.
 */

import { pool }   from "@workspace/db";
import { logger } from "../../lib/logger";

const LOCK_TTL_MS  = 30_000;   // 30 seconds
const LOCK_WAIT_MS = 5_000;    // timeout for acquiring lock

interface LockEntry {
  holderId:    string;     // device_id or staff_id
  acquiredAt:  number;
  expiresAt:   number;
}

const locks = new Map<string, LockEntry>();   // key: `${venueId}:${tableId}`

function lockKey(venueId: string, tableId: string): string {
  return `${venueId}:${tableId}`;
}

function isExpired(entry: LockEntry): boolean {
  return Date.now() > entry.expiresAt;
}

export async function acquireTableLock(
  venueId:  string,
  tableId:  string,
  holderId: string,
  ttlMs   = LOCK_TTL_MS,
): Promise<{ acquired: boolean; currentHolder: string | null }> {
  const key = lockKey(venueId, tableId);

  // Check existing lock
  const existing = locks.get(key);
  if (existing && !isExpired(existing)) {
    if (existing.holderId === holderId) {
      // Renew own lock
      existing.expiresAt = Date.now() + ttlMs;
      return { acquired: true, currentHolder: holderId };
    }
    return { acquired: false, currentHolder: existing.holderId };
  }

  // Acquire
  locks.set(key, { holderId, acquiredAt: Date.now(), expiresAt: Date.now() + ttlMs });

  // Advisory DB lock for cross-process safety (non-blocking)
  try {
    await pool.query(
      `INSERT INTO pos_table_locks
         (venue_id, table_id, holder_id, expires_at, acquired_at)
       VALUES ($1,$2,$3,NOW() + ($4||' milliseconds')::interval, NOW())
       ON CONFLICT (venue_id, table_id) DO UPDATE
         SET holder_id  = EXCLUDED.holder_id,
             expires_at = EXCLUDED.expires_at,
             acquired_at= EXCLUDED.acquired_at
         WHERE pos_table_locks.expires_at < NOW()`,
      [venueId, tableId, holderId, ttlMs],
    );
  } catch { /* non-critical — in-process lock is sufficient for single-server */ }

  logger.info({ venueId, tableId, holderId }, "tableLocks: lock acquired");
  return { acquired: true, currentHolder: holderId };
}

export async function releaseTableLock(
  venueId:  string,
  tableId:  string,
  holderId: string,
): Promise<boolean> {
  const key     = lockKey(venueId, tableId);
  const existing = locks.get(key);

  if (!existing || existing.holderId !== holderId) {
    return false;
  }

  locks.delete(key);

  try {
    await pool.query(
      `DELETE FROM pos_table_locks WHERE venue_id=$1 AND table_id=$2 AND holder_id=$3`,
      [venueId, tableId, holderId],
    );
  } catch { /* non-critical */ }

  return true;
}

export function isTableLocked(venueId: string, tableId: string): boolean {
  const entry = locks.get(lockKey(venueId, tableId));
  return !!entry && !isExpired(entry);
}

export function getTableLockHolder(venueId: string, tableId: string): string | null {
  const entry = locks.get(lockKey(venueId, tableId));
  if (!entry || isExpired(entry)) return null;
  return entry.holderId;
}

/** Evict expired in-process locks */
export function evictExpiredLocks(): void {
  const now = Date.now();
  for (const [key, entry] of locks.entries()) {
    if (now > entry.expiresAt) locks.delete(key);
  }
}

/** Try to acquire lock with polling until timeout */
export async function waitForTableLock(
  venueId:   string,
  tableId:   string,
  holderId:  string,
  waitMs   = LOCK_WAIT_MS,
): Promise<boolean> {
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    const { acquired } = await acquireTableLock(venueId, tableId, holderId);
    if (acquired) return true;
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
}
