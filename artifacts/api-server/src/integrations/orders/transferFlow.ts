/**
 * transferFlow — table transfer, check merge, and order reassignment.
 *
 * Operations:
 *   - Transfer order from table A → table B
 *   - Merge check (combine two open orders into one)
 *   - Split check (move items to a new order — delegates to orderMutationEngine)
 *   - Reassign staff on an open order
 *
 * All operations are audit-logged to orchestration_events.
 * Table locks are acquired before any transfer.
 */

import { pool }                         from "@workspace/db";
import { logger }                       from "../../lib/logger";
import { publish }                      from "../../realtime/transport/eventBus";
import { acquireTableLock, releaseTableLock } from "../tables/tableLocks";
import { updateTableState }             from "../tables/tableStateEngine";
import { mutateOrder }                  from "./orderMutationEngine";

export interface TransferResult {
  ok:        boolean;
  orderId:   string;
  venueId:   string;
  operation: string;
  details:   Record<string, unknown>;
  error?:    string;
}

export async function transferOrderToTable(
  orderId:         string,
  venueId:         string,
  fromTableNumber: string,
  toTableNumber:   string,
  requestedBy:     string,
): Promise<TransferResult> {
  const lockId = `transfer-${orderId}`;
  try {
    // Acquire locks on both tables
    const [fromLock, toLock] = await Promise.all([
      acquireTableLock(venueId, fromTableNumber, lockId),
      acquireTableLock(venueId, toTableNumber,   lockId),
    ]);

    if (!fromLock.acquired || !toLock.acquired) {
      return { ok: false, orderId, venueId, operation: "transfer_table",
        details: {}, error: "Could not acquire table locks" };
    }

    try {
      // Update order's table reference
      const mutation = await mutateOrder({
        orderId, venueId,
        mutationType: "update_table",
        payload:      { type: "update_table", tableNumber: toTableNumber },
        requestedBy,
        reason:       `Table transfer: ${fromTableNumber} → ${toTableNumber}`,
        idempotencyKey: `transfer-${orderId}-${toTableNumber}`,
      });

      // Update table states
      await updateTableState(venueId, fromTableNumber, { occupancy: "clearing", eeisSessionId: null });
      await updateTableState(venueId, toTableNumber,   { occupancy: "ordering",  posTicketId: null });

      await publish("orchestration", {
        event: "ORDER_TRANSFERRED", venueId, orderId,
        fromTable: fromTableNumber, toTable: toTableNumber, requestedBy,
      });

      return { ok: mutation.ok, orderId, venueId, operation: "transfer_table",
        details: { fromTableNumber, toTableNumber } };
    } finally {
      await releaseTableLock(venueId, fromTableNumber, lockId);
      await releaseTableLock(venueId, toTableNumber,   lockId);
    }
  } catch (err) {
    logger.error({ err, orderId }, "transferFlow: table transfer failed");
    return { ok: false, orderId, venueId, operation: "transfer_table", details: {}, error: String(err) };
  }
}

export async function mergeChecks(
  sourceOrderId: string,
  targetOrderId: string,
  venueId:       string,
  requestedBy:   string,
): Promise<TransferResult> {
  try {
    // Get all items from source order
    const { rows: sourceItems } = await pool.query(
      `SELECT pos_product_id, name, quantity, unit_cents, total_cents
       FROM swipe_order_items WHERE order_id=$1`,
      [sourceOrderId],
    );

    // Add each item to target order
    let moved = 0;
    for (const item of sourceItems as Record<string, unknown>[]) {
      const result = await mutateOrder({
        orderId: targetOrderId, venueId,
        mutationType: "add_item",
        payload: {
          type:        "add_item",
          item: {
            posProductId: String(item["pos_product_id"]),
            name:         String(item["name"]),
            quantity:     Number(item["quantity"]),
            unitCents:    Number(item["unit_cents"]),
            totalCents:   Number(item["total_cents"]),
            modifiers:    [],
            meta:         {},
          },
        },
        requestedBy,
        reason:         `Merged from order ${sourceOrderId}`,
        idempotencyKey: `merge-${sourceOrderId}-${targetOrderId}-${item["pos_product_id"]}`,
      });
      if (result.ok) moved++;
    }

    // Cancel source order
    await pool.query(
      `UPDATE swipe_orders SET status='cancelled', notes=COALESCE(notes,'')||$2, updated_at=NOW()
       WHERE id=$1`,
      [sourceOrderId, ` [MERGED INTO:${targetOrderId}]`],
    );

    await publish("orchestration", {
      event:"CHECKS_MERGED", venueId, sourceOrderId, targetOrderId, itemsMoved:moved, requestedBy,
    });

    logger.info({ sourceOrderId, targetOrderId, moved }, "transferFlow: checks merged");

    return { ok: true, orderId: targetOrderId, venueId, operation: "merge_checks",
      details: { sourceOrderId, itemsMoved: moved } };
  } catch (err) {
    logger.error({ err, sourceOrderId, targetOrderId }, "transferFlow: merge failed");
    return { ok: false, orderId: targetOrderId, venueId, operation: "merge_checks", details: {}, error: String(err) };
  }
}

export async function reassignStaff(
  orderId:     string,
  venueId:     string,
  newStaffId:  string,
  requestedBy: string,
): Promise<TransferResult> {
  const result = await mutateOrder({
    orderId, venueId,
    mutationType:   "update_staff",
    payload:        { type: "update_staff", staffId: newStaffId },
    requestedBy,
    reason:         "Staff reassignment",
    idempotencyKey: `reassign-${orderId}-${newStaffId}`,
  });
  return { ok: result.ok, orderId, venueId, operation: "reassign_staff",
    details: { newStaffId }, error: result.error };
}
