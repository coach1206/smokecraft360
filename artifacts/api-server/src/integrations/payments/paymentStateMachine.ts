/**
 * paymentStateMachine — full lifecycle state machine for POS payments.
 *
 * States: authorized → pending → captured → partially_refunded →
 *         refunded → voided | disputed → failed
 *
 * Transitions are append-only (payment_events log). The current state
 * is always derived from the latest event — never updated in-place.
 * Idempotency enforced via idempotency_key on payment_events.
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";

export type PaymentState =
  | "pending"
  | "authorized"
  | "captured"
  | "partially_refunded"
  | "refunded"
  | "voided"
  | "disputed"
  | "failed";

export type PaymentEvent =
  | "authorize"
  | "capture"
  | "partial_refund"
  | "full_refund"
  | "void"
  | "dispute_opened"
  | "dispute_resolved"
  | "fail";

export interface PaymentRecord {
  id:             string;
  venueId:        string;
  orderId:        string;
  provider:       string;
  externalRef:    string | null;
  state:          PaymentState;
  amountCents:    number;
  capturedCents:  number;
  refundedCents:  number;
  currency:       string;
  idempotencyKey: string;
  createdAt:      number;
  updatedAt:      number;
}

// Valid transitions: from → allowed events
const TRANSITIONS: Record<PaymentState, PaymentEvent[]> = {
  pending:            ["authorize", "fail", "void"],
  authorized:         ["capture", "void", "fail"],
  captured:           ["partial_refund", "full_refund", "dispute_opened"],
  partially_refunded: ["partial_refund", "full_refund", "dispute_opened"],
  refunded:           [],
  voided:             [],
  disputed:           ["dispute_resolved", "full_refund"],
  failed:             [],
};

const EVENT_NEXT: Record<PaymentEvent, (current: PaymentState) => PaymentState> = {
  authorize:        ()  => "authorized",
  capture:          ()  => "captured",
  partial_refund:   (s) => s === "partially_refunded" ? "partially_refunded" : "partially_refunded",
  full_refund:      ()  => "refunded",
  void:             ()  => "voided",
  dispute_opened:   ()  => "disputed",
  dispute_resolved: (s) => s,     // stays disputed until refund or resolution
  fail:             ()  => "failed",
};

export async function transitionPayment(
  paymentId:     string,
  event:         PaymentEvent,
  meta: {
    venueId:        string;
    amountCents?:   number;
    staffId?:       string;
    externalRef?:   string;
    idempotencyKey: string;
    notes?:         string;
  },
): Promise<{ ok: boolean; state: PaymentState; error?: string }> {
  try {
    // Load current state
    const { rows } = await pool.query(
      `SELECT state, amount_cents, captured_cents, refunded_cents, currency
       FROM payment_events
       WHERE payment_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [paymentId],
    );

    const current: PaymentState = rows.length > 0
      ? (rows[0] as Record<string, unknown>)["state"] as PaymentState
      : "pending";

    // Guard invalid transitions
    const allowed = TRANSITIONS[current];
    if (!allowed.includes(event)) {
      return { ok: false, state: current, error: `Cannot apply ${event} from state ${current}` };
    }

    const next = EVENT_NEXT[event](current);

    // Idempotency check
    const { rows: idem } = await pool.query(
      `SELECT id FROM payment_events WHERE idempotency_key = $1 LIMIT 1`,
      [meta.idempotencyKey],
    );
    if (idem.length > 0) {
      return { ok: true, state: next }; // already applied
    }

    // Append event
    await pool.query(
      `INSERT INTO payment_events
         (payment_id, venue_id, event_type, state, amount_cents, staff_id,
          external_ref, idempotency_key, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
      [
        paymentId, meta.venueId, event, next,
        meta.amountCents ?? null, meta.staffId ?? null,
        meta.externalRef ?? null, meta.idempotencyKey,
        meta.notes ?? null,
      ],
    );

    logger.info({ paymentId, event, from: current, to: next }, "paymentStateMachine: transition applied");

    await publish("orchestration", {
      event:     "PAYMENT_STATE_CHANGED",
      venueId:   meta.venueId,
      paymentId,
      from:      current,
      to:        next,
      eventType: event,
    });

    return { ok: true, state: next };
  } catch (err) {
    logger.error({ err, paymentId, event }, "paymentStateMachine: transition failed");
    return { ok: false, state: "failed", error: String(err) };
  }
}

export async function getPaymentState(paymentId: string): Promise<PaymentState> {
  try {
    const { rows } = await pool.query(
      `SELECT state FROM payment_events
       WHERE payment_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [paymentId],
    );
    return rows.length > 0
      ? (rows[0] as Record<string, unknown>)["state"] as PaymentState
      : "pending";
  } catch {
    return "pending";
  }
}

export async function getPaymentHistory(paymentId: string): Promise<Record<string, unknown>[]> {
  try {
    const { rows } = await pool.query(
      `SELECT event_type, state, amount_cents, staff_id, notes, created_at
       FROM payment_events WHERE payment_id = $1 ORDER BY created_at ASC`,
      [paymentId],
    );
    return rows as Record<string, unknown>[];
  } catch {
    return [];
  }
}

export function canTransition(current: PaymentState, event: PaymentEvent): boolean {
  return TRANSITIONS[current].includes(event);
}
