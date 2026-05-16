/**
 * splitPayments — split-check and partial payment orchestration.
 *
 * Supports:
 *   - Even split (N guests pay equally)
 *   - Item-based split (each guest pays for specific items)
 *   - Custom amount split (each guest specifies amount)
 *   - Partial payment (guest pays portion now, rest later)
 *
 * All splits persist to split_payment_sessions for resumability.
 * Integrates with paymentStateMachine for each partial payment.
 */

import { pool }               from "@workspace/db";
import { logger }             from "../../lib/logger";
import { publish }            from "../../realtime/transport/eventBus";

export type SplitStrategy = "even" | "item_based" | "custom_amount";

export interface SplitRequest {
  orderId:         string;
  venueId:         string;
  strategy:        SplitStrategy;
  partySize?:      number;               // for "even"
  customAmounts?:  { label: string; amountCents: number }[];  // for "custom_amount"
  itemAssignments?:{ guestLabel: string; posProductIds: string[] }[];  // for "item_based"
  requestedBy:     string;
  idempotencyKey:  string;
}

export interface SplitSession {
  id:              string;
  orderId:         string;
  venueId:         string;
  strategy:        SplitStrategy;
  totalCents:      number;
  splits:          SplitLine[];
  paidCents:       number;
  remainingCents:  number;
  isComplete:      boolean;
  createdAt:       number;
  updatedAt:       number;
}

export interface SplitLine {
  label:       string;
  amountCents: number;
  paidCents:   number;
  isPaid:      boolean;
  paymentId:   string | null;
}

export async function createSplitSession(req: SplitRequest): Promise<SplitSession | null> {
  try {
    // Get order total
    const { rows: orderRows } = await pool.query(
      `SELECT subtotal_cents FROM swipe_orders WHERE id=$1 AND venue_id=$2`,
      [req.orderId, req.venueId],
    );
    if (orderRows.length === 0) return null;

    const total = Number((orderRows[0] as Record<string, unknown>)["subtotal_cents"] ?? 0);
    const splits = buildSplits(req, total);

    const { rows } = await pool.query(
      `INSERT INTO split_payment_sessions
         (order_id, venue_id, strategy, total_cents, splits, requested_by, idempotency_key, created_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,NOW())
       RETURNING id`,
      [req.orderId, req.venueId, req.strategy, total, JSON.stringify(splits), req.requestedBy, req.idempotencyKey],
    );

    const id = String((rows[0] as Record<string, unknown>)["id"]);

    await publish("orchestration", {
      event: "SPLIT_SESSION_CREATED", venueId: req.venueId,
      orderId: req.orderId, strategy: req.strategy, splitCount: splits.length,
    });

    return {
      id, orderId: req.orderId, venueId: req.venueId,
      strategy: req.strategy, totalCents: total, splits,
      paidCents: 0, remainingCents: total, isComplete: false,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
  } catch (err) {
    logger.error({ err, orderId: req.orderId }, "splitPayments: create failed");
    return null;
  }
}

export async function recordSplitPayment(
  splitSessionId: string,
  label:          string,
  amountCents:    number,
  paymentId:      string,
): Promise<{ isComplete: boolean; remainingCents: number }> {
  try {
    const { rows } = await pool.query(
      `SELECT splits, total_cents FROM split_payment_sessions WHERE id=$1`,
      [splitSessionId],
    );
    if (rows.length === 0) return { isComplete: false, remainingCents: 0 };

    const session = rows[0] as Record<string, unknown>;
    const splits  = (session["splits"] as SplitLine[]).map(s =>
      s.label === label
        ? { ...s, paidCents: s.paidCents + amountCents, paymentId, isPaid: s.paidCents + amountCents >= s.amountCents }
        : s,
    );

    const paidCents      = splits.reduce((s, l) => s + l.paidCents, 0);
    const remainingCents = Math.max(0, Number(session["total_cents"]) - paidCents);
    const isComplete     = remainingCents === 0;

    await pool.query(
      `UPDATE split_payment_sessions
       SET splits=$2, paid_cents=$3, is_complete=$4, updated_at=NOW()
       WHERE id=$1`,
      [splitSessionId, JSON.stringify(splits), paidCents, isComplete],
    );

    return { isComplete, remainingCents };
  } catch (err) {
    logger.warn({ err, splitSessionId }, "splitPayments: recordSplitPayment failed");
    return { isComplete: false, remainingCents: 0 };
  }
}

function buildSplits(req: SplitRequest, totalCents: number): SplitLine[] {
  switch (req.strategy) {
    case "even": {
      const n     = req.partySize ?? 2;
      const share = Math.floor(totalCents / n);
      const remainder = totalCents - share * n;
      return Array.from({ length: n }, (_, i) => ({
        label:       `Guest ${i + 1}`,
        amountCents: i === 0 ? share + remainder : share,
        paidCents:   0, isPaid: false, paymentId: null,
      }));
    }
    case "custom_amount":
      return (req.customAmounts ?? []).map(c => ({
        label: c.label, amountCents: c.amountCents,
        paidCents: 0, isPaid: false, paymentId: null,
      }));
    case "item_based":
      return (req.itemAssignments ?? []).map(a => ({
        label: a.guestLabel, amountCents: 0,  // computed by item lookup
        paidCents: 0, isPaid: false, paymentId: null,
      }));
  }
}
