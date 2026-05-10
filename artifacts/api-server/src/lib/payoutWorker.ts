/**
 * payoutWorker — Real Stripe Transfer payout pipeline.
 *
 * Runs every hour. For every approved payout request:
 *   1. Validates sufficient pending commissions exist
 *   2. Confirms venue has a Stripe Connect account onboarded
 *   3. Creates a real stripe.transfers.create() call with idempotency key
 *   4. Records stripe_transfer_id on success
 *   5. Marks commissions paid only after Stripe confirms transfer
 *   6. Marks payout "failed" on any Stripe error — never silently swallows
 *
 * Idempotency: each transfer uses key `novee-payout-{payoutRequestId}`.
 * Retrying a failed transfer with the same ID is safe — Stripe deduplicates.
 */

import Stripe                               from "stripe";
import { sql, eq, and }                     from "drizzle-orm";
import { db, commissionsTable, payoutRequestsTable } from "@workspace/db";
import { pool }                             from "@workspace/db";
import { logger }                           from "./logger";

const HOUR_MS = 60 * 60 * 1000;
let interval: NodeJS.Timeout | null = null;

function getStripe(): Stripe {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key || key.startsWith("<") || key === "sk_test_placeholder") {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(key);
}

export interface PayoutWorkerResult {
  processedCount: number;
  totalTransferredCents: number;
  skippedCount: number;
  errors: number;
  ranAt: string;
}

let lastResult: PayoutWorkerResult | null = null;

async function runPayoutCycle(): Promise<PayoutWorkerResult> {
  let processedCount = 0;
  let totalTransferredCents = 0;
  let skippedCount = 0;
  let errors = 0;

  try {
    const approved = await db
      .select()
      .from(payoutRequestsTable)
      .where(eq(payoutRequestsTable.status, "approved"));

    for (const payout of approved) {
      try {
        // ── 1. Commission availability check ────────────────────────────────
        const [commTotal] = await db
          .select({ total: sql<number>`COALESCE(SUM(${commissionsTable.amountCents}), 0)` })
          .from(commissionsTable)
          .where(and(
            eq(commissionsTable.venueId, payout.venueId),
            eq(commissionsTable.status, "pending"),
          ));

        const availableCents = Number(commTotal?.total ?? 0);
        if (availableCents < payout.amountCents) {
          skippedCount++;
          logger.warn(
            { payoutId: payout.id, venueId: payout.venueId, requested: payout.amountCents, available: availableCents },
            "[PayoutWorker] insufficient commissions — payout skipped",
          );
          continue;
        }

        // ── 2. Venue Stripe Connect account check ───────────────────────────
        const { rows: venueRows } = await pool.query<{
          stripe_connect_account_id: string | null;
          stripe_connect_onboarded: boolean;
        }>(
          `SELECT stripe_connect_account_id, stripe_connect_onboarded FROM venues WHERE id = $1`,
          [payout.venueId],
        ).catch(() => ({ rows: [] as { stripe_connect_account_id: string | null; stripe_connect_onboarded: boolean }[] }));

        const venue = venueRows[0];
        if (!venue?.stripe_connect_account_id || !venue.stripe_connect_onboarded) {
          skippedCount++;
          logger.warn(
            { payoutId: payout.id, venueId: payout.venueId, hasAccount: !!venue?.stripe_connect_account_id, onboarded: venue?.stripe_connect_onboarded },
            "[PayoutWorker] payout skipped — venue Stripe Connect not configured or not onboarded",
          );
          continue;
        }

        // ── 3. Execute Stripe Transfer ──────────────────────────────────────
        const stripe = getStripe();
        const idempotencyKey = `novee-payout-${payout.id}`;

        let stripeTransferId: string;
        try {
          const transfer = await stripe.transfers.create({
            amount:      payout.amountCents,
            currency:    payout.currency,
            destination: venue.stripe_connect_account_id,
            metadata:    {
              payoutRequestId: payout.id,
              venueId:         payout.venueId,
              platform:        "novee-os",
            },
          }, { idempotencyKey });
          stripeTransferId = transfer.id;
        } catch (stripeErr: unknown) {
          const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
          logger.error(
            { stripeError: msg, payoutId: payout.id, venueId: payout.venueId },
            "[PayoutWorker] Stripe transfer failed — marking payout failed",
          );
          await db
            .update(payoutRequestsTable)
            .set({ status: "failed" })
            .where(eq(payoutRequestsTable.id, payout.id))
            .catch(() => {});
          errors++;
          continue;
        }

        // ── 4. Mark paid in DB only after Stripe confirms ──────────────────
        await db
          .update(payoutRequestsTable)
          .set({ status: "paid", paidAt: new Date(), stripeTransferId })
          .where(eq(payoutRequestsTable.id, payout.id));

        await db
          .update(commissionsTable)
          .set({ status: "paid", paidAt: new Date() })
          .where(and(
            eq(commissionsTable.venueId, payout.venueId),
            eq(commissionsTable.status, "pending"),
          ));

        processedCount++;
        totalTransferredCents += payout.amountCents;

        logger.info(
          { payoutId: payout.id, stripeTransferId, amountCents: payout.amountCents, venueId: payout.venueId, event: "stripe_transfer_completed" },
          "[PayoutWorker] Stripe transfer successful",
        );
      } catch (err) {
        errors++;
        logger.error({ err, payoutId: payout.id }, "[PayoutWorker] payout processing error");
        await db
          .update(payoutRequestsTable)
          .set({ status: "failed" })
          .where(eq(payoutRequestsTable.id, payout.id))
          .catch(() => {});
      }
    }

    if (processedCount > 0 || errors > 0 || skippedCount > 0) {
      logger.info({ processedCount, totalTransferredCents, skippedCount, errors, event: "payout_cycle_complete" }, "[PayoutWorker] cycle complete");
    }
  } catch (err) {
    errors++;
    logger.error({ err, event: "payout_cycle_failed" }, "[PayoutWorker] cycle failed");
  }

  const result: PayoutWorkerResult = { processedCount, totalTransferredCents, skippedCount, errors, ranAt: new Date().toISOString() };
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
  logger.info("[PayoutWorker] started (1h interval) — real Stripe Transfers active");
}

export function stopPayoutWorker(): void {
  if (interval) clearInterval(interval);
  interval = null;
}
