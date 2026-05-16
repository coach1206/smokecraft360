/**
 * disputeProcessor — handles payment disputes (chargebacks) lifecycle.
 *
 * Integrates with the paymentStateMachine — opens disputes via
 * the state machine, then tracks evidence, deadlines, and outcomes.
 *
 * Persists to: payment_events (dispute lifecycle)
 * Publishes to: orchestration channel for ops alerts
 */

import { pool }                   from "@workspace/db";
import { logger }                 from "../../lib/logger";
import { publish }                from "../../realtime/transport/eventBus";
import { transitionPayment }      from "./paymentStateMachine";

export type DisputeReason =
  | "fraudulent"
  | "duplicate"
  | "product_not_received"
  | "product_unacceptable"
  | "unrecognized"
  | "subscription_canceled"
  | "general";

export type DisputeStatus =
  | "warning_needs_response"
  | "warning_under_review"
  | "warning_closed"
  | "needs_response"
  | "under_review"
  | "charge_refunded"
  | "won"
  | "lost";

export interface DisputeRecord {
  id:            string;
  paymentId:     string;
  venueId:       string;
  provider:      string;
  externalId:    string | null;
  reason:        DisputeReason;
  status:        DisputeStatus;
  amountCents:   number;
  currency:      string;
  deadline:      number | null;   // Unix ms — evidence submission deadline
  evidence:      DisputeEvidence[];
  createdAt:     number;
  updatedAt:     number;
}

export interface DisputeEvidence {
  type:        "receipt" | "delivery_proof" | "customer_communication" | "other";
  description: string;
  url?:        string;
  submittedAt: number;
}

export async function openDispute(
  paymentId: string,
  venueId:   string,
  opts: {
    provider:       string;
    externalId?:    string;
    reason:         DisputeReason;
    amountCents:    number;
    currency?:      string;
    deadlineDays?:  number;
    idempotencyKey: string;
  },
): Promise<DisputeRecord | null> {
  try {
    // Transition payment state
    await transitionPayment(paymentId, "dispute_opened", {
      venueId, amountCents: opts.amountCents,
      idempotencyKey: `dispute-open-${opts.idempotencyKey}`,
      notes: `Dispute opened: ${opts.reason}`,
    });

    const deadlineMs = opts.deadlineDays
      ? Date.now() + opts.deadlineDays * 24 * 60 * 60 * 1000
      : null;

    const { rows } = await pool.query(
      `INSERT INTO payment_disputes
         (payment_id, venue_id, provider, external_id, reason, status,
          amount_cents, currency, deadline_at, evidence, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'needs_response',$6,$7,$8,'[]'::jsonb,NOW(),NOW())
       RETURNING id`,
      [
        paymentId, venueId, opts.provider, opts.externalId ?? null,
        opts.reason, opts.amountCents, opts.currency ?? "USD",
        deadlineMs ? new Date(deadlineMs).toISOString() : null,
      ],
    );

    const disputeId = (rows[0] as Record<string, unknown>)?.["id"] as string;

    await publish("orchestration", {
      event: "DISPUTE_OPENED", venueId, paymentId, disputeId,
      reason: opts.reason, amountCents: opts.amountCents,
      deadline: deadlineMs,
    });

    logger.warn({ paymentId, venueId, reason: opts.reason }, "disputeProcessor: dispute opened");

    return {
      id: disputeId, paymentId, venueId,
      provider: opts.provider, externalId: opts.externalId ?? null,
      reason: opts.reason, status: "needs_response",
      amountCents: opts.amountCents, currency: opts.currency ?? "USD",
      deadline: deadlineMs, evidence: [],
      createdAt: Date.now(), updatedAt: Date.now(),
    };
  } catch (err) {
    logger.error({ err, paymentId }, "disputeProcessor: openDispute failed");
    return null;
  }
}

export async function submitEvidence(
  disputeId: string,
  evidence:  DisputeEvidence,
): Promise<boolean> {
  try {
    await pool.query(
      `UPDATE payment_disputes
       SET evidence   = evidence || $2::jsonb,
           status     = 'under_review',
           updated_at = NOW()
       WHERE id = $1`,
      [disputeId, JSON.stringify([evidence])],
    );
    logger.info({ disputeId, type: evidence.type }, "disputeProcessor: evidence submitted");
    return true;
  } catch (err) {
    logger.warn({ err, disputeId }, "disputeProcessor: submitEvidence failed");
    return false;
  }
}

export async function resolveDispute(
  disputeId: string,
  outcome:   "won" | "lost" | "charge_refunded",
  paymentId: string,
  venueId:   string,
): Promise<void> {
  try {
    await pool.query(
      `UPDATE payment_disputes
       SET status = $2, updated_at = NOW()
       WHERE id = $1`,
      [disputeId, outcome],
    );

    await transitionPayment(paymentId, "dispute_resolved", {
      venueId, idempotencyKey: `dispute-resolve-${disputeId}`,
      notes: `Dispute resolved: ${outcome}`,
    });

    if (outcome === "charge_refunded") {
      await transitionPayment(paymentId, "full_refund", {
        venueId, idempotencyKey: `dispute-refund-${disputeId}`,
        notes: "Forced refund by dispute resolution",
      });
    }

    await publish("orchestration", { event:"DISPUTE_RESOLVED", venueId, disputeId, outcome, paymentId });
    logger.info({ disputeId, outcome }, "disputeProcessor: resolved");
  } catch (err) {
    logger.error({ err, disputeId }, "disputeProcessor: resolveDispute failed");
  }
}

export async function getOpenDisputes(venueId: string): Promise<Record<string, unknown>[]> {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM payment_disputes
       WHERE venue_id = $1
         AND status NOT IN ('won','lost','charge_refunded','warning_closed')
       ORDER BY created_at DESC`,
      [venueId],
    );
    return rows as Record<string, unknown>[];
  } catch {
    return [];
  }
}
