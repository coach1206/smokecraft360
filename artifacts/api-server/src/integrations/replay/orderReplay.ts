/**
 * orderReplay — reconstructs the complete state of an order from its
 * append-only mutation event stream.
 *
 * Used for:
 *   - Forensic debugging ("how did this order end up like this?")
 *   - Audit trails
 *   - Order state recovery after system failure
 *   - Verifying POS sync consistency
 *
 * Source tables: order_mutation_events, swipe_orders, swipe_order_items
 */

import { pool }   from "@workspace/db";
import { logger } from "../../lib/logger";
import { type UniversalOrder } from "../schemas/universalOrder";
import { type MutationPayload } from "../orders/orderMutationEngine";

export interface OrderReplayFrame {
  ts:           number;
  mutationType: string;
  payload:      Record<string, unknown>;
  requestedBy:  string;
  reason:       string;
  stateAfter:   Partial<UniversalOrder>;
}

export interface OrderReplayResult {
  orderId:       string;
  venueId:       string;
  replayedAt:    number;
  frames:        OrderReplayFrame[];
  finalState:    Partial<UniversalOrder>;
  itemCount:     number;
  totalMutations:number;
  anomalies:     string[];
}

export async function replayOrder(
  orderId: string,
  asOf?:   Date,
): Promise<OrderReplayResult> {
  const replayedAt = Date.now();
  const anomalies: string[] = [];

  try {
    // Fetch base order
    const { rows: baseRows } = await pool.query(
      `SELECT * FROM swipe_orders WHERE id=$1 LIMIT 1`,
      [orderId],
    );
    if (baseRows.length === 0) {
      return { orderId, venueId: "", replayedAt, frames: [], finalState: {}, itemCount: 0, totalMutations: 0, anomalies: ["Order not found"] };
    }
    const base = baseRows[0] as Record<string, unknown>;

    // Fetch mutation events in order
    const mutQuery = asOf
      ? `SELECT * FROM order_mutation_events WHERE order_id=$1 AND created_at <= $2 ORDER BY created_at ASC`
      : `SELECT * FROM order_mutation_events WHERE order_id=$1 ORDER BY created_at ASC`;
    const { rows: mutations } = await pool.query(
      mutQuery, asOf ? [orderId, asOf.toISOString()] : [orderId],
    );

    // Reconstruct state by replaying mutations
    const items = new Map<string, { name: string; qty: number; unitCents: number }>();
    const frames: OrderReplayFrame[] = [];
    let notes = String(base["notes"] ?? "");
    let discountCents = 0;

    for (const mut of mutations as Record<string, unknown>[]) {
      const payload = mut["payload"] as MutationPayload;
      const ts      = new Date(mut["created_at"] as string).getTime();

      switch (payload.type) {
        case "add_item":
          items.set(payload.item.posProductId, {
            name:      payload.item.name,
            qty:       payload.item.quantity,
            unitCents: payload.item.unitCents,
          });
          break;
        case "remove_item":
        case "void_item":
          items.delete(payload.posProductId);
          break;
        case "update_quantity":
          if (items.has(payload.posProductId)) {
            items.get(payload.posProductId)!.qty = payload.quantity;
          }
          break;
        case "apply_discount":
          discountCents += payload.amountCents;
          break;
        case "add_note":
          notes += ` ${payload.note}`;
          break;
        default:
          break;
      }

      const subtotal = [...items.values()].reduce((s, i) => s + i.qty * i.unitCents, 0);
      frames.push({
        ts,
        mutationType:  String(mut["mutation_type"]),
        payload:       payload as unknown as Record<string, unknown>,
        requestedBy:   String(mut["requested_by"]),
        reason:        String(mut["reason"]),
        stateAfter:    {
          subtotalCents:  subtotal,
          discountCents,
          totalCents:     Math.max(0, subtotal - discountCents),
          notes,
        },
      });
    }

    // Detect anomalies
    if (frames.length === 0) anomalies.push("No mutation events found — order may have been created directly");

    const finalSubtotal = [...items.values()].reduce((s, i) => s + i.qty * i.unitCents, 0);
    const dbSubtotal    = Number(base["subtotal_cents"] ?? 0);
    if (Math.abs(finalSubtotal - dbSubtotal) > 5) {
      anomalies.push(`Subtotal mismatch: replayed=${finalSubtotal} db=${dbSubtotal}`);
    }

    const venueId = String(base["venue_id"]);

    logger.info({ orderId, frames: frames.length, anomalies: anomalies.length }, "orderReplay: complete");

    return {
      orderId, venueId, replayedAt,
      frames, itemCount: items.size,
      finalState: {
        id:             orderId,
        venueId,
        status:         base["status"] as UniversalOrder["status"],
        subtotalCents:  finalSubtotal,
        discountCents,
        totalCents:     Math.max(0, finalSubtotal - discountCents),
        notes,
      },
      totalMutations: frames.length,
      anomalies,
    };
  } catch (err) {
    logger.error({ err, orderId }, "orderReplay: failed");
    return { orderId, venueId: "", replayedAt, frames: [], finalState: {}, itemCount: 0, totalMutations: 0, anomalies: [String(err)] };
  }
}
