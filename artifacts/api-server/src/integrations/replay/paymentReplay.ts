/**
 * paymentReplay — reconstructs complete payment lifecycle from the
 * append-only payment_events log.
 *
 * Used for:
 *   - Financial audit ("show me every state this payment went through")
 *   - Dispute evidence gathering
 *   - Reconciliation verification
 *   - Forensic debugging of stuck/partial payments
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { type PaymentState } from "../payments/paymentStateMachine";

export interface PaymentReplayFrame {
  ts:          number;
  eventType:   string;
  state:       PaymentState;
  amountCents: number | null;
  staffId:     string | null;
  externalRef: string | null;
  notes:       string | null;
}

export interface PaymentTimeline {
  paymentId:        string;
  replayedAt:       number;
  frames:           PaymentReplayFrame[];
  currentState:     PaymentState;
  totalAuthorized:  number;
  totalCaptured:    number;
  totalRefunded:    number;
  netAmount:        number;
  durationMs:       number;    // from first event to last
  anomalies:        string[];
}

export async function replayPaymentTimeline(
  paymentId: string,
): Promise<PaymentTimeline> {
  const replayedAt = Date.now();
  const anomalies: string[] = [];

  try {
    const { rows } = await pool.query(
      `SELECT event_type, state, amount_cents, staff_id, external_ref, notes, created_at
       FROM payment_events
       WHERE payment_id=$1
       ORDER BY created_at ASC`,
      [paymentId],
    );

    if (rows.length === 0) {
      return { paymentId, replayedAt, frames: [], currentState: "pending", totalAuthorized:0, totalCaptured:0, totalRefunded:0, netAmount:0, durationMs:0, anomalies:["No payment events found"] };
    }

    const frames: PaymentReplayFrame[] = (rows as Record<string, unknown>[]).map(r => ({
      ts:          new Date(r["created_at"] as string).getTime(),
      eventType:   String(r["event_type"]),
      state:       r["state"] as PaymentState,
      amountCents: r["amount_cents"] != null ? Number(r["amount_cents"]) : null,
      staffId:     r["staff_id"]     ? String(r["staff_id"])    : null,
      externalRef: r["external_ref"] ? String(r["external_ref"]): null,
      notes:       r["notes"]        ? String(r["notes"])        : null,
    }));

    // Aggregate amounts
    const totalAuthorized = frames.filter(f => f.eventType === "authorize").reduce((s, f) => s + (f.amountCents ?? 0), 0);
    const totalCaptured   = frames.filter(f => f.eventType === "capture")  .reduce((s, f) => s + (f.amountCents ?? 0), 0);
    const totalRefunded   = frames.filter(f => f.eventType === "partial_refund" || f.eventType === "full_refund").reduce((s, f) => s + (f.amountCents ?? 0), 0);

    // Anomaly detection
    if (totalRefunded > totalCaptured) anomalies.push(`Refunded (${totalRefunded}¢) > Captured (${totalCaptured}¢)`);

    const captureFrames = frames.filter(f => f.eventType === "capture");
    if (captureFrames.length > 1) anomalies.push("Multiple capture events detected");

    const currentState = frames[frames.length - 1]!.state;
    const durationMs   = frames[frames.length - 1]!.ts - frames[0]!.ts;

    return {
      paymentId, replayedAt, frames,
      currentState, totalAuthorized, totalCaptured, totalRefunded,
      netAmount: totalCaptured - totalRefunded,
      durationMs, anomalies,
    };
  } catch (err) {
    logger.error({ err, paymentId }, "paymentReplay: failed");
    return { paymentId, replayedAt, frames: [], currentState:"failed", totalAuthorized:0, totalCaptured:0, totalRefunded:0, netAmount:0, durationMs:0, anomalies:[String(err)] };
  }
}

export async function getPaymentsByOrder(orderId: string): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT DISTINCT payment_id FROM payment_events WHERE order_id=$1`,
    [orderId],
  ).catch(() => ({ rows: [] }));
  return (rows as Record<string, unknown>[]).map(r => String(r["payment_id"]));
}
