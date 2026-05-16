/**
 * distributedQueues — claim-based work queue for multi-node event processing.
 *
 * Pattern: "competing consumers"
 *   - Multiple worker nodes poll the same queue table
 *   - Each item is claimed by exactly one node via atomic UPDATE + RETURNING
 *   - Claimed items are processed and then marked complete/failed
 *   - Unclaimed expired items are re-queued by the orchestration coordinator
 *
 * Queue operations are all Postgres-backed — no Redis required.
 * Each queue is a named partition of the `distributed_work_items` table.
 */

import { pool }    from "@workspace/db";
import { logger }  from "../lib/logger";
import { NODE_ID } from "./clusterMembership";
import { increment, observe } from "../platform/observability/metricsCollector";

export type WorkItemStatus = "pending" | "claimed" | "completed" | "failed" | "dead";
export type WorkItemPriority = "critical" | "high" | "normal" | "low";

export interface WorkItem<T = unknown> {
  itemId:      string;
  queueName:   string;
  priority:    WorkItemPriority;
  payload:     T;
  claimedBy:   string | null;
  claimedAt:   number | null;
  attempts:    number;
  maxAttempts: number;
  status:      WorkItemStatus;
  enqueuedAt:  number;
  expiresAt:   number | null;
}

export interface EnqueueOptions {
  priority?:    WorkItemPriority;
  maxAttempts?: number;
  ttlMs?:       number;
  dedupeKey?:   string;  // if set, skip if an identical item is already pending/claimed
}

const CLAIM_TTL_MS   = 5 * 60_000;   // 5 min — claims expire after this
const PRIORITY_ORDER  = { critical:0, high:1, normal:2, low:3 };

// ─── Enqueue ──────────────────────────────────────────────────────────────────

export async function enqueue<T>(
  queueName: string,
  payload:   T,
  opts:      EnqueueOptions = {},
): Promise<string | null> {
  const priority    = opts.priority    ?? "normal";
  const maxAttempts = opts.maxAttempts ?? 3;
  const expiresAt   = opts.ttlMs ? new Date(Date.now() + opts.ttlMs).toISOString() : null;

  try {
    // Deduplicate if dedupeKey provided
    if (opts.dedupeKey) {
      const { rows } = await pool.query(
        `SELECT item_id FROM distributed_work_items
         WHERE queue_name=$1 AND dedupe_key=$2 AND status IN ('pending','claimed')
         LIMIT 1`,
        [queueName, opts.dedupeKey],
      );
      if (rows.length > 0) {
        logger.debug({ queueName, dedupeKey: opts.dedupeKey }, "distributedQueues: deduplicated");
        return null;
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO distributed_work_items
         (queue_name, priority, priority_order, payload, max_attempts, expires_at, dedupe_key, status, enqueued_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NOW())
       RETURNING item_id`,
      [queueName, priority, PRIORITY_ORDER[priority], JSON.stringify(payload), maxAttempts, expiresAt, opts.dedupeKey ?? null],
    );

    const itemId = String((rows[0] as Record<string, unknown>)["item_id"]);
    increment("queue", "enqueued", 1, { queue: queueName, priority });
    return itemId;
  } catch (err) {
    logger.warn({ err, queueName }, "distributedQueues: enqueue failed");
    return null;
  }
}

// ─── Claim ────────────────────────────────────────────────────────────────────

export async function claim<T>(
  queueName: string,
  batchSize  = 1,
): Promise<WorkItem<T>[]> {
  const claimExpiry = new Date(Date.now() + CLAIM_TTL_MS).toISOString();

  try {
    const start = Date.now();
    const { rows } = await pool.query(
      `UPDATE distributed_work_items
       SET status='claimed', claimed_by=$1, claimed_at=NOW(), claim_expires_at=$2,
           attempts=attempts+1
       WHERE item_id IN (
         SELECT item_id FROM distributed_work_items
         WHERE queue_name=$3
           AND status='pending'
           AND (expires_at IS NULL OR expires_at > NOW())
           AND attempts < max_attempts
         ORDER BY priority_order ASC, enqueued_at ASC
         LIMIT $4
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
      [NODE_ID, claimExpiry, queueName, batchSize],
    );

    observe("queue", "claim_latency_ms", Date.now() - start, { queue: queueName });
    return rows.map(r => rowToWorkItem<T>(r as Record<string, unknown>));
  } catch (err) {
    logger.warn({ err, queueName }, "distributedQueues: claim failed");
    return [];
  }
}

// ─── Complete / Fail ──────────────────────────────────────────────────────────

export async function complete(itemId: string): Promise<void> {
  await pool.query(
    `UPDATE distributed_work_items
     SET status='completed', completed_at=NOW()
     WHERE item_id=$1 AND claimed_by=$2`,
    [itemId, NODE_ID],
  ).catch(() => {});
  increment("queue", "completed", 1);
}

export async function fail(itemId: string, error: string, retry = true): Promise<void> {
  await pool.query(
    `UPDATE distributed_work_items
     SET status = CASE WHEN attempts >= max_attempts THEN 'dead' ELSE CASE WHEN $3 THEN 'pending' ELSE 'failed' END END,
         last_error=$2, claimed_by=NULL, claimed_at=NULL, claim_expires_at=NULL
     WHERE item_id=$1`,
    [itemId, error, retry],
  ).catch(() => {});
  increment("queue", "failed", 1);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getQueueStats(queueName: string): Promise<{
  pending: number; claimed: number; completed: number; failed: number; dead: number;
}> {
  const { rows } = await pool.query(
    `SELECT status, COUNT(*) AS cnt FROM distributed_work_items
     WHERE queue_name=$1 GROUP BY status`,
    [queueName],
  ).catch(() => ({ rows: [] }));

  const stats = { pending:0, claimed:0, completed:0, failed:0, dead:0 };
  for (const r of rows as Record<string, unknown>[]) {
    const s = String(r["status"]) as keyof typeof stats;
    if (s in stats) stats[s] = Number(r["cnt"]);
  }
  return stats;
}

export async function rescueExpiredClaims(queueName?: string): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE distributed_work_items
     SET status='pending', claimed_by=NULL, claimed_at=NULL, claim_expires_at=NULL
     WHERE status='claimed'
       AND claim_expires_at < NOW()
       AND attempts < max_attempts
       ${queueName ? "AND queue_name=$1" : ""}`,
    queueName ? [queueName] : [],
  ).catch(() => ({ rowCount: 0 }));
  return rowCount ?? 0;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToWorkItem<T>(r: Record<string, unknown>): WorkItem<T> {
  return {
    itemId:      String(r["item_id"]),
    queueName:   String(r["queue_name"]),
    priority:    String(r["priority"]) as WorkItemPriority,
    payload:     r["payload"] as T,
    claimedBy:   r["claimed_by"] ? String(r["claimed_by"]) : null,
    claimedAt:   r["claimed_at"] ? new Date(r["claimed_at"] as string).getTime() : null,
    attempts:    Number(r["attempts"]),
    maxAttempts: Number(r["max_attempts"]),
    status:      String(r["status"]) as WorkItemStatus,
    enqueuedAt:  new Date(r["enqueued_at"] as string).getTime(),
    expiresAt:   r["expires_at"] ? new Date(r["expires_at"] as string).getTime() : null,
  };
}
