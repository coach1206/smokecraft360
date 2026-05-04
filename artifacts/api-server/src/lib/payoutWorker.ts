import { sql, eq, and } from "drizzle-orm";
import { db, commissionsTable, payoutRequestsTable } from "@workspace/db";
import { logger } from "./logger";

const HOUR_MS = 60 * 60 * 1000;
let interval: NodeJS.Timeout | null = null;

export interface PayoutWorkerResult {
  processedCount: number;
  totalTransferredCents: number;
  errors: number;
  ranAt: string;
}

let lastResult: PayoutWorkerResult | null = null;

async function runPayoutCycle(): Promise<PayoutWorkerResult> {
  const start = Date.now();
  let processedCount = 0;
  let totalTransferredCents = 0;
  let errors = 0;

  try {
    const approved = await db
      .select()
      .from(payoutRequestsTable)
      .where(eq(payoutRequestsTable.status, "approved"));

    for (const payout of approved) {
      try {
        const pendingCommissions = await db
          .select({ total: sql<number>`COALESCE(SUM(${commissionsTable.amountCents}), 0)` })
          .from(commissionsTable)
          .where(
            and(
              eq(commissionsTable.venueId, payout.venueId),
              eq(commissionsTable.status, "pending"),
            ),
          );

        const availableCents = Number(pendingCommissions[0]?.total ?? 0);

        if (availableCents < payout.amountCents) {
          logger.warn(
            { payoutId: payout.id, venueId: payout.venueId, requested: payout.amountCents, available: availableCents },
            "payout skipped: insufficient pending commissions",
          );
          continue;
        }

        await db
          .update(payoutRequestsTable)
          .set({ status: "paid", paidAt: new Date() })
          .where(eq(payoutRequestsTable.id, payout.id));

        await db
          .update(commissionsTable)
          .set({ status: "paid", paidAt: new Date() })
          .where(
            and(
              eq(commissionsTable.venueId, payout.venueId),
              eq(commissionsTable.status, "pending"),
            ),
          );

        processedCount++;
        totalTransferredCents += payout.amountCents;

        logger.info(
          { payoutId: payout.id, venueId: payout.venueId, amountCents: payout.amountCents, event: "payout_processed" },
          "payout processed",
        );
      } catch (err) {
        errors++;
        logger.error({ err, payoutId: payout.id }, "payout processing failed");

        try {
          await db
            .update(payoutRequestsTable)
            .set({ status: "failed" })
            .where(eq(payoutRequestsTable.id, payout.id));
        } catch (updateErr) {
          logger.error({ err: updateErr, payoutId: payout.id }, "failed to mark payout as failed");
        }
      }
    }

    if (processedCount > 0 || errors > 0) {
      logger.info(
        { processedCount, totalTransferredCents, errors, event: "payout_cycle_complete" },
        "payout cycle completed",
      );
    }
  } catch (err) {
    errors++;
    logger.error({ err, event: "payout_cycle_failed" }, "payout worker cycle failed");
  }

  const result: PayoutWorkerResult = {
    processedCount,
    totalTransferredCents,
    errors,
    ranAt: new Date().toISOString(),
  };
  lastResult = result;
  return result;
}

export function getPayoutWorkerStatus() {
  return { lastResult, intervalMs: HOUR_MS };
}

export function startPayoutWorker(): void {
  if (interval) return;
  setTimeout(() => { void runPayoutCycle(); }, 30_000);
  interval = setInterval(() => { void runPayoutCycle(); }, HOUR_MS);
  logger.info("payout worker scheduled (1h interval)");
}

export function stopPayoutWorker(): void {
  if (interval) clearInterval(interval);
  interval = null;
}
