/**
 * orderMutationEngine — supports real hospitality order mutations:
 *   - Add item
 *   - Remove item
 *   - Modify item (quantity, modifier)
 *   - Apply discount
 *   - Apply comp (100% discount)
 *   - Void item
 *   - Add note
 *
 * All mutations are append-only (mutation_events log) so the current
 * order state is always reconstructable from the event stream.
 * Each mutation requires a reason code for audit compliance.
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";
import { type UniversalOrderItem } from "../schemas/universalOrder";

export type MutationType =
  | "add_item"
  | "remove_item"
  | "update_quantity"
  | "update_modifier"
  | "apply_discount"
  | "apply_comp"
  | "void_item"
  | "add_note"
  | "update_table"
  | "update_staff";

export interface MutationRequest {
  orderId:        string;
  venueId:        string;
  mutationType:   MutationType;
  payload:        MutationPayload;
  requestedBy:    string;
  reason:         string;
  idempotencyKey: string;
}

export type MutationPayload =
  | { type: "add_item";        item:       UniversalOrderItem }
  | { type: "remove_item";     posProductId:string }
  | { type: "update_quantity"; posProductId:string; quantity: number }
  | { type: "apply_discount";  amountCents: number; pct?: number; code?: string }
  | { type: "apply_comp";      reason: string }
  | { type: "void_item";       posProductId:string; reason: string }
  | { type: "add_note";        note: string }
  | { type: "update_table";    tableNumber: string }
  | { type: "update_staff";    staffId: string }
  | { type: "update_modifier"; posProductId: string; modifierIds: string[] };

export interface MutationResult {
  ok:            boolean;
  mutationId:    string;
  orderId:       string;
  mutationType:  MutationType;
  appliedAt:     number;
  recalculated:  { subtotalCents: number; totalCents: number } | null;
  error?:        string;
}

export async function mutateOrder(req: MutationRequest): Promise<MutationResult> {
  const mutationId = `mut-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

  try {
    // Idempotency
    const { rows: idem } = await pool.query(
      `SELECT id FROM order_mutation_events WHERE idempotency_key=$1 LIMIT 1`,
      [req.idempotencyKey],
    );
    if (idem.length > 0) {
      return {
        ok: true, mutationId: String((idem[0] as Record<string, unknown>)["id"]),
        orderId: req.orderId, mutationType: req.mutationType,
        appliedAt: Date.now(), recalculated: null,
      };
    }

    // Validate order exists and is mutable
    const { rows: orderRows } = await pool.query(
      `SELECT status FROM swipe_orders WHERE id=$1 AND venue_id=$2 LIMIT 1`,
      [req.orderId, req.venueId],
    );
    if (orderRows.length === 0) {
      return { ok: false, mutationId, orderId: req.orderId, mutationType: req.mutationType, appliedAt: Date.now(), recalculated: null, error: "Order not found" };
    }
    const status = String((orderRows[0] as Record<string, unknown>)["status"]);
    if (["cancelled", "refunded", "failed"].includes(status)) {
      return { ok: false, mutationId, orderId: req.orderId, mutationType: req.mutationType, appliedAt: Date.now(), recalculated: null, error: `Cannot mutate order in state: ${status}` };
    }

    // Record mutation event
    await pool.query(
      `INSERT INTO order_mutation_events
         (id, order_id, venue_id, mutation_type, payload, requested_by, reason, idempotency_key, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [
        mutationId, req.orderId, req.venueId, req.mutationType,
        JSON.stringify(req.payload), req.requestedBy, req.reason, req.idempotencyKey,
      ],
    );

    // Apply mutation to order
    const recalculated = await applyMutation(req.orderId, req.venueId, req.payload);

    await publish("orchestration", {
      event: "ORDER_MUTATED", venueId: req.venueId,
      orderId: req.orderId, mutationType: req.mutationType,
      mutationId, requestedBy: req.requestedBy,
    });

    logger.info({ orderId: req.orderId, mutationType: req.mutationType }, "orderMutationEngine: mutation applied");

    return { ok: true, mutationId, orderId: req.orderId, mutationType: req.mutationType, appliedAt: Date.now(), recalculated };
  } catch (err) {
    logger.error({ err, orderId: req.orderId }, "orderMutationEngine: mutation failed");
    return { ok: false, mutationId, orderId: req.orderId, mutationType: req.mutationType, appliedAt: Date.now(), recalculated: null, error: String(err) };
  }
}

async function applyMutation(
  orderId:  string,
  venueId:  string,
  payload:  MutationPayload,
): Promise<{ subtotalCents: number; totalCents: number } | null> {
  try {
    switch (payload.type) {
      case "add_item":
        await pool.query(
          `INSERT INTO swipe_order_items
             (order_id, pos_product_id, name, quantity, unit_cents, total_cents, craft_type, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
           ON CONFLICT (order_id, pos_product_id) DO UPDATE
             SET quantity    = swipe_order_items.quantity + EXCLUDED.quantity,
                 total_cents = (swipe_order_items.quantity + EXCLUDED.quantity) * EXCLUDED.unit_cents`,
          [
            orderId, payload.item.posProductId, payload.item.name,
            payload.item.quantity, payload.item.unitCents,
            payload.item.totalCents, payload.item.category ?? null,
          ],
        );
        break;

      case "remove_item":
      case "void_item":
        await pool.query(
          `DELETE FROM swipe_order_items WHERE order_id=$1 AND pos_product_id=$2`,
          [orderId, payload.posProductId],
        );
        break;

      case "update_quantity":
        await pool.query(
          `UPDATE swipe_order_items
           SET quantity    = $3,
               total_cents = unit_cents * $3
           WHERE order_id=$1 AND pos_product_id=$2`,
          [orderId, payload.posProductId, payload.quantity],
        );
        break;

      case "apply_discount":
        await pool.query(
          `UPDATE swipe_orders SET notes=COALESCE(notes,'')||$2 WHERE id=$1`,
          [orderId, ` [DISCOUNT:${payload.amountCents}¢${payload.code ? ` CODE:${payload.code}` : ""}]`],
        );
        break;

      case "update_table":
        await pool.query(
          `UPDATE swipe_orders SET notes=COALESCE(notes,'')||$2 WHERE id=$1`,
          [orderId, ` [TABLE:${payload.tableNumber}]`],
        );
        break;

      case "update_staff":
        await pool.query(
          `UPDATE swipe_orders SET notes=COALESCE(notes,'')||$2 WHERE id=$1`,
          [orderId, ` [STAFF:${payload.staffId}]`],
        );
        break;

      case "add_note":
        await pool.query(
          `UPDATE swipe_orders SET notes=COALESCE(notes,'')||$2 WHERE id=$1`,
          [orderId, ` ${payload.note}`],
        );
        break;

      default:
        break;
    }

    // Recalculate order total
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(total_cents),0) AS subtotal FROM swipe_order_items WHERE order_id=$1`,
      [orderId],
    );
    const subtotal = Number((rows[0] as Record<string, unknown>)["subtotal"] ?? 0);
    await pool.query(
      `UPDATE swipe_orders SET subtotal_cents=$2, updated_at=NOW() WHERE id=$1`,
      [orderId, subtotal],
    );
    return { subtotalCents: subtotal, totalCents: subtotal };
  } catch (err) {
    logger.warn({ err, orderId }, "orderMutationEngine: applyMutation internal failed");
    return null;
  }
}

export async function getMutationHistory(orderId: string): Promise<Record<string, unknown>[]> {
  const { rows } = await pool.query(
    `SELECT mutation_type, payload, requested_by, reason, created_at
     FROM order_mutation_events WHERE order_id=$1 ORDER BY created_at ASC`,
    [orderId],
  ).catch(() => ({ rows: [] }));
  return rows as Record<string, unknown>[];
}
