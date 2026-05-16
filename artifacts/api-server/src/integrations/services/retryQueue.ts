/**
 * retryQueue — Persistent DB-backed retry queue for failed POS operations.
 *
 * Enqueues failed ticket pushes, inventory syncs, and webhook deliveries.
 * Uses exponential backoff: 30s, 2m, 10m, 30m, 2h.
 * Abandoned after maxAttempts (default 5).
 * Idempotency key prevents duplicate enqueues for the same operation.
 */

import { db, posRetryQueueTable } from "@workspace/db";
import { eq, and, lte, inArray } from "drizzle-orm";
import { logger } from "../../lib/logger";

const BACKOFF_SCHEDULE_MS = [30_000, 120_000, 600_000, 1_800_000, 7_200_000];

export type RetryOperation = "push_order" | "sync_inventory" | "sync_products" | "webhook_delivery" | "token_refresh";

export async function enqueueRetry(params: {
  connectionId:  string;
  venueId:       string;
  provider:      string;
  operation:     RetryOperation;
  payload:       Record<string, unknown>;
  idempotencyKey?: string;
  maxAttempts?:  number;
}): Promise<string> {
  if (params.idempotencyKey) {
    const existing = await db.select({ id: posRetryQueueTable.id, status: posRetryQueueTable.status })
      .from(posRetryQueueTable)
      .where(and(
        eq(posRetryQueueTable.idempotencyKey, params.idempotencyKey),
        inArray(posRetryQueueTable.status, ["pending", "processing"]),
      ))
      .limit(1);
    if (existing[0]) {
      logger.debug({ idempotencyKey: params.idempotencyKey }, "Retry already enqueued — skipping duplicate");
      return existing[0].id;
    }
  }

  const rows = await db.insert(posRetryQueueTable).values({
    connectionId:   params.connectionId,
    venueId:        params.venueId,
    provider:       params.provider,
    operation:      params.operation,
    status:         "pending",
    payload:        params.payload,
    maxAttempts:    params.maxAttempts ?? 5,
    nextRetryAt:    new Date(),
    idempotencyKey: params.idempotencyKey ?? null,
  }).returning({ id: posRetryQueueTable.id });

  const id = rows[0]!.id;
  logger.info({ id, operation: params.operation, provider: params.provider }, "Retry enqueued");
  return id;
}

export async function markAttempt(id: string, success: boolean, error?: string): Promise<void> {
  const rows = await db.select({
    attemptCount: posRetryQueueTable.attemptCount,
    maxAttempts:  posRetryQueueTable.maxAttempts,
  })
    .from(posRetryQueueTable)
    .where(eq(posRetryQueueTable.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return;

  const nextAttempt  = row.attemptCount + 1;
  const isAbandoned  = !success && nextAttempt >= row.maxAttempts;
  const delayMs      = BACKOFF_SCHEDULE_MS[nextAttempt - 1] ?? BACKOFF_SCHEDULE_MS.at(-1)!;
  const nextRetryAt  = new Date(Date.now() + delayMs);

  await db.update(posRetryQueueTable)
    .set({
      status:        success ? "success" : (isAbandoned ? "abandoned" : "pending"),
      attemptCount:  nextAttempt,
      lastAttemptAt: new Date(),
      lastError:     error ?? null,
      nextRetryAt:   success || isAbandoned ? undefined : nextRetryAt,
      resolvedAt:    success ? new Date() : undefined,
      updatedAt:     new Date(),
    })
    .where(eq(posRetryQueueTable.id, id));
}

export async function fetchDue(limit = 50): Promise<typeof posRetryQueueTable.$inferSelect[]> {
  return db.select()
    .from(posRetryQueueTable)
    .where(and(
      eq(posRetryQueueTable.status, "pending"),
      lte(posRetryQueueTable.nextRetryAt, new Date()),
    ))
    .limit(limit);
}

export async function markProcessing(id: string): Promise<void> {
  await db.update(posRetryQueueTable)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(posRetryQueueTable.id, id));
}

export async function getQueueStats(venueId?: string): Promise<{ pending: number; failed: number; abandoned: number }> {
  const rows = await db.select({ status: posRetryQueueTable.status })
    .from(posRetryQueueTable)
    .where(venueId ? eq(posRetryQueueTable.venueId, venueId) : undefined);

  const counts = { pending: 0, failed: 0, abandoned: 0 };
  for (const r of rows) {
    if (r.status === "pending" || r.status === "processing") counts.pending++;
    else if (r.status === "failed")    counts.failed++;
    else if (r.status === "abandoned") counts.abandoned++;
  }
  return counts;
}
