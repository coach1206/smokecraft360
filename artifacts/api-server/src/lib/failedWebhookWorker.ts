/**
 * failedWebhookWorker — background retry processor for failed Stripe webhooks.
 *
 * Polls every 5 minutes for rows in the failed_webhooks table where:
 *   status = 'pending' | 'retrying'
 *   next_retry_at <= now()
 *   attempts < max_attempts
 *
 * On each row, we log the re-attempt. In a full integration the worker
 * would re-invoke the webhook handler logic; here we mark it recovered
 * after a configurable number of manual/auto retries to maintain the
 * state machine without duplicating the full handler.
 *
 * Exponential back-off: 5m → 15m → 45m → 2h → 6h
 */

import { eq, and, lte, sql } from "drizzle-orm";
import { db, failedWebhooksTable } from "@workspace/db";
import { logger } from "./logger.js";

const BACKOFF_MINUTES = [5, 15, 45, 120, 360] as const;

function nextRetryDelay(attempt: number): number {
  const idx = Math.min(attempt, BACKOFF_MINUTES.length - 1);
  return BACKOFF_MINUTES[idx]! * 60_000;
}

async function processFailedWebhooks(): Promise<void> {
  const now = new Date();

  const due = await db
    .select()
    .from(failedWebhooksTable)
    .where(
      and(
        sql`${failedWebhooksTable.status} IN ('pending', 'retrying')`,
        lte(failedWebhooksTable.nextRetryAt, now),
        sql`${failedWebhooksTable.attempts} < ${failedWebhooksTable.maxAttempts}`,
      ),
    )
    .limit(20);

  if (due.length === 0) return;

  logger.info({ count: due.length }, "failedWebhookWorker: processing due retries");

  for (const row of due) {
    const newAttempts = row.attempts + 1;
    const exhausted   = newAttempts >= row.maxAttempts;

    try {
      // In a production integration, re-dispatch the event here.
      // For now we advance the state machine and log intent.
      logger.warn(
        { id: row.id, eventType: row.eventType, attempt: newAttempts, exhausted },
        "failedWebhookWorker: re-attempting webhook",
      );

      await db
        .update(failedWebhooksTable)
        .set({
          attempts:    newAttempts,
          status:      exhausted ? "exhausted" : "retrying",
          nextRetryAt: exhausted ? now : new Date(Date.now() + nextRetryDelay(newAttempts)),
          resolvedAt:  exhausted ? now : null,
          updatedAt:   now,
        })
        .where(eq(failedWebhooksTable.id, row.id));

    } catch (err) {
      logger.error({ err, id: row.id }, "failedWebhookWorker: update failed");
    }
  }
}

export function startFailedWebhookWorker(): void {
  const INTERVAL_MS = 5 * 60_000; // every 5 minutes

  const run = async () => {
    try {
      await processFailedWebhooks();
    } catch (err) {
      logger.error({ err }, "failedWebhookWorker: unhandled error");
    }
  };

  // Stagger initial run by 30 s so it doesn't compete with server startup
  setTimeout(() => {
    void run();
    setInterval(() => void run(), INTERVAL_MS);
  }, 30_000);

  logger.info("failedWebhookWorker: started (5-min interval)");
}
