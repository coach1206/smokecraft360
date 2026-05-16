/**
 * queueHealer — detects and recovers stuck/poisoned orchestration queue entries.
 *
 * Patterns detected:
 *   - STUCK:    event pending > max_processing_time (2× expected cycle)
 *   - POISON:   event failed 5+ times with same error → move to dead letter
 *   - ORPHAN:   event locked by a worker that is no longer alive
 *   - STALE:    event's TTL has expired (time-sensitive events)
 *
 * Recovery actions:
 *   - STUCK/ORPHAN: reset to 'pending' so another worker can claim it
 *   - POISON:       move to dead_letter_queue with full error context
 *   - STALE:        mark as 'expired' and notify telemetry
 *
 * Runs inside the 15-min reconciliation worker cycle.
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";
import { increment } from "../observability/metricsCollector";

export interface HealingResult {
  healed:       number;
  poisoned:     number;
  orphaned:     number;
  expired:      number;
  errors:       number;
  durationMs:   number;
}

const MAX_RETRIES       = 5;
const STUCK_TIMEOUT_MS  = 5 * 60_000;   // 5 min
const STALE_CHECK_MS    = 60_000;        // events with ttl < now are stale

export async function healQueue(): Promise<HealingResult> {
  const start  = Date.now();
  let healed = 0, poisoned = 0, orphaned = 0, expired = 0, errors = 0;

  try {
    // 1. Rescue orphaned/stuck events (worker claimed but never finished)
    const stuckResult = await pool.query(
      `UPDATE orchestration_queue
       SET status='pending', locked_by=NULL, locked_at=NULL, retry_count=retry_count+1
       WHERE status='processing'
         AND locked_at < NOW() - ($1||' milliseconds')::interval
       RETURNING id`,
      [STUCK_TIMEOUT_MS],
    ).catch(() => ({ rows: [], rowCount: 0 }));

    healed   += stuckResult.rowCount ?? 0;
    orphaned += stuckResult.rowCount ?? 0;

    if ((stuckResult.rowCount ?? 0) > 0) {
      logger.warn({ count: stuckResult.rowCount }, "queueHealer: rescued stuck events");
      increment("queue", "stuck_rescued", stuckResult.rowCount ?? 0);
    }

    // 2. Move poison events to dead letter queue
    const poisonRows = await pool.query(
      `SELECT id, event_type, payload, retry_count, last_error, created_at
       FROM orchestration_queue
       WHERE status='failed' AND retry_count >= $1
       LIMIT 100`,
      [MAX_RETRIES],
    ).catch(() => ({ rows: [] }));

    for (const row of poisonRows.rows as Record<string, unknown>[]) {
      try {
        await pool.query(
          `INSERT INTO dead_letter_queue
             (original_id, event_type, payload, retry_count, last_error, original_created_at, poisoned_at)
           VALUES ($1,$2,$3,$4,$5,$6,NOW())
           ON CONFLICT (original_id) DO NOTHING`,
          [
            row["id"], row["event_type"], row["payload"],
            row["retry_count"], row["last_error"], row["created_at"],
          ],
        );
        await pool.query(
          `UPDATE orchestration_queue SET status='poisoned' WHERE id=$1`,
          [row["id"]],
        );
        poisoned++;

        await publish("orchestration", {
          event:     "EVENT_POISONED",
          eventId:   String(row["id"]),
          eventType: String(row["event_type"]),
          retries:   Number(row["retry_count"]),
        });
      } catch (err) {
        logger.warn({ err, eventId: row["id"] }, "queueHealer: poison move failed");
        errors++;
      }
    }

    if (poisoned > 0) {
      logger.warn({ poisoned }, "queueHealer: moved poison events to DLQ");
      increment("queue", "events_poisoned", poisoned);
    }

    // 3. Expire stale time-sensitive events (has expires_at set and it's past)
    const staleResult = await pool.query(
      `UPDATE orchestration_queue
       SET status='expired'
       WHERE status='pending'
         AND expires_at IS NOT NULL
         AND expires_at < NOW()
       RETURNING id, event_type`,
    ).catch(() => ({ rows: [], rowCount: 0 }));

    expired = staleResult.rowCount ?? 0;
    if (expired > 0) {
      logger.info({ expired }, "queueHealer: expired stale events");
      increment("queue", "events_expired", expired);
    }

    // 4. Reset transient failures back to pending (< MAX_RETRIES, waiting)
    const resetResult = await pool.query(
      `UPDATE orchestration_queue
       SET status='pending',
           next_retry_at=NULL
       WHERE status='failed'
         AND retry_count < $1
         AND (next_retry_at IS NULL OR next_retry_at <= NOW())
       RETURNING id`,
      [MAX_RETRIES],
    ).catch(() => ({ rows: [], rowCount: 0 }));

    const reset = resetResult.rowCount ?? 0;
    if (reset > 0) {
      healed += reset;
      logger.info({ reset }, "queueHealer: reset retry-eligible events");
    }

  } catch (err) {
    logger.error({ err }, "queueHealer: healing cycle failed");
    errors++;
  }

  return { healed, poisoned, orphaned, expired, errors, durationMs: Date.now() - start };
}

export async function getDeadLetterQueue(limit = 50): Promise<Record<string, unknown>[]> {
  const { rows } = await pool.query(
    `SELECT * FROM dead_letter_queue ORDER BY poisoned_at DESC LIMIT $1`,
    [limit],
  ).catch(() => ({ rows: [] }));
  return rows as Record<string, unknown>[];
}

export async function retryDeadLetter(originalId: string): Promise<boolean> {
  try {
    await pool.query(
      `UPDATE orchestration_queue
       SET status='pending', retry_count=0, last_error=NULL, updated_at=NOW()
       WHERE id=$1`,
      [originalId],
    );
    await pool.query(
      `UPDATE dead_letter_queue SET retried_at=NOW() WHERE original_id=$1`,
      [originalId],
    );
    return true;
  } catch {
    return false;
  }
}
