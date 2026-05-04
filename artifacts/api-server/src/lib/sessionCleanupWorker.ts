import { and, eq, lt, inArray } from "drizzle-orm";
import { db, sessionsTable, redemptionsTable } from "@workspace/db";
import { logger } from "./logger";

const INTERVAL_MS = 30 * 60 * 1000;
const EXPIRY_HOURS = 4;

export interface CleanupResult {
  expiredCount: number;
  cancelledRedemptions: number;
  errors: number;
  durationMs: number;
  ranAt: string;
}

let lastResult: CleanupResult | null = null;
let running = false;
let interval: NodeJS.Timeout | null = null;

export async function runSessionCleanup(): Promise<CleanupResult> {
  if (running) {
    logger.warn("session cleanup skipped: previous run still in progress");
    return lastResult ?? { expiredCount: 0, cancelledRedemptions: 0, errors: 0, durationMs: 0, ranAt: new Date().toISOString() };
  }

  running = true;
  const start = Date.now();
  let expiredCount = 0;
  let cancelledRedemptions = 0;
  let errors = 0;

  try {
    const cutoff = new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
      const stale = await tx
        .update(sessionsTable)
        .set({ status: "closed" as const, closedAt: new Date() })
        .where(
          and(
            eq(sessionsTable.status, "active"),
            lt(sessionsTable.createdAt, cutoff),
          ),
        )
        .returning({ id: sessionsTable.id, hostUserId: sessionsTable.hostUserId });

      expiredCount = stale.length;

      if (expiredCount > 0) {
        const userIds = [...new Set(stale.map((s) => s.hostUserId).filter(Boolean))] as string[];

        if (userIds.length > 0) {
          const cancelled = await tx
            .update(redemptionsTable)
            .set({ status: "cancelled" as const, updatedAt: new Date() })
            .where(
              and(
                inArray(redemptionsTable.userId, userIds),
                eq(redemptionsTable.status, "pending"),
              ),
            )
            .returning({ id: redemptionsTable.id });

          cancelledRedemptions = cancelled.length;
        }

        logger.info(
          {
            expiredCount,
            cancelledRedemptions,
            cutoffHours: EXPIRY_HOURS,
            event: "session_cleanup_complete",
          },
          "session cleanup: expired sessions closed, pending redemptions cancelled",
        );
      }
    });
  } catch (err) {
    errors++;
    logger.error({ err, event: "session_cleanup_failed" }, "session cleanup worker failed");
  } finally {
    running = false;
  }

  const result: CleanupResult = {
    expiredCount,
    cancelledRedemptions,
    errors,
    durationMs: Date.now() - start,
    ranAt: new Date().toISOString(),
  };
  lastResult = result;

  return result;
}

export function getCleanupStatus(): {
  running: boolean;
  lastResult: CleanupResult | null;
  intervalMs: number;
  expiryHours: number;
} {
  return {
    running,
    lastResult,
    intervalMs: INTERVAL_MS,
    expiryHours: EXPIRY_HOURS,
  };
}

export function startSessionCleanupWorker(): void {
  if (interval) return;
  setTimeout(() => { void runSessionCleanup(); }, 15_000);
  interval = setInterval(() => { void runSessionCleanup(); }, INTERVAL_MS);
  logger.info("session cleanup worker scheduled (30m interval)");
}

export function stopSessionCleanupWorker(): void {
  if (interval) clearInterval(interval);
  interval = null;
}
