/**
 * reservationEngine — reservation-aware inventory management.
 *
 * Extends base inventory with soft-reservation semantics:
 *   - Reserve stock when item is added to cart (15-min TTL)
 *   - Confirm reservation on payment capture
 *   - Release reservation on cart abandon / payment failure / refund
 *   - Ghost detection: expired reservations not yet released
 *
 * Integrates with: swipe_orders, inventory_reservations tables
 * Consumed by: inventoryConfidence, stockReconciliation, driftDetection
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";

export type ReservationStatus = "active" | "confirmed" | "released" | "expired";

export interface ReservationRequest {
  venueId:       string;
  orderId:       string;
  productId:     string;
  quantity:      number;
  ttlMs?:        number;      // default 15 min
  reservedBy:    string;      // guest_id or staff_id
  idempotencyKey:string;
}

export interface ReservationRecord {
  id:             string;
  venueId:        string;
  orderId:        string;
  productId:      string;
  reservedQty:    number;
  status:         ReservationStatus;
  expiresAt:      number;
  idempotencyKey: string;
  createdAt:      number;
}

const DEFAULT_TTL = 15 * 60 * 1000;

export async function reserveStock(
  req: ReservationRequest,
): Promise<{ ok: boolean; reservationId: string | null; available: number; error?: string }> {
  const { venueId, orderId, productId, quantity, reservedBy, idempotencyKey } = req;
  const ttl = req.ttlMs ?? DEFAULT_TTL;

  try {
    // Idempotency
    const { rows: idem } = await pool.query(
      `SELECT id FROM inventory_reservations WHERE idempotency_key=$1 LIMIT 1`,
      [idempotencyKey],
    );
    if (idem.length > 0) {
      return { ok: true, reservationId: String((idem[0] as Record<string, unknown>)["id"]), available: 0 };
    }

    // Check available stock (total - active reservations)
    const { rows: avail } = await pool.query(
      `SELECT
         vp.stock_quantity,
         COALESCE(SUM(ir.reserved_quantity),0) AS already_reserved
       FROM venue_products vp
       LEFT JOIN inventory_reservations ir
         ON ir.product_id = vp.product_id AND ir.status='active' AND ir.expires_at > NOW()
       WHERE vp.product_id=$1 AND vp.venue_id=$2
       GROUP BY vp.stock_quantity`,
      [productId, venueId],
    );

    const stockQty     = Number((avail[0] as Record<string, unknown>)?.["stock_quantity"]   ?? 0);
    const alreadyRes   = Number((avail[0] as Record<string, unknown>)?.["already_reserved"] ?? 0);
    const available    = Math.max(0, stockQty - alreadyRes);

    if (quantity > available) {
      return { ok: false, reservationId: null, available, error: `Only ${available} available` };
    }

    // Create reservation
    const { rows } = await pool.query(
      `INSERT INTO inventory_reservations
         (venue_id, order_id, product_id, reserved_quantity, reserved_by,
          status, idempotency_key, expires_at, created_at)
       VALUES ($1,$2,$3,$4,$5,'active',$6,NOW() + ($7||' milliseconds')::interval,NOW())
       RETURNING id`,
      [venueId, orderId, productId, quantity, reservedBy, idempotencyKey, ttl],
    );

    const reservationId = String((rows[0] as Record<string, unknown>)["id"]);
    logger.info({ venueId, productId, quantity, reservationId }, "reservationEngine: stock reserved");

    await publish("telemetry", { event:"STOCK_RESERVED", venueId, productId, quantity, orderId });

    return { ok: true, reservationId, available: available - quantity };
  } catch (err) {
    logger.error({ err, venueId, productId }, "reservationEngine: reserve failed");
    return { ok: false, reservationId: null, available: 0, error: String(err) };
  }
}

export async function confirmReservation(
  reservationId: string,
  venueId:       string,
): Promise<boolean> {
  try {
    const { rowCount } = await pool.query(
      `UPDATE inventory_reservations
       SET status='confirmed', confirmed_at=NOW()
       WHERE id=$1 AND venue_id=$2 AND status='active'`,
      [reservationId, venueId],
    );
    if (rowCount && rowCount > 0) {
      // Deduct from actual stock
      await pool.query(
        `UPDATE venue_products vp
         SET stock_quantity = stock_quantity - ir.reserved_quantity
         FROM inventory_reservations ir
         WHERE ir.id=$1 AND vp.product_id=ir.product_id`,
        [reservationId],
      );
    }
    return (rowCount ?? 0) > 0;
  } catch (err) {
    logger.error({ err, reservationId }, "reservationEngine: confirm failed");
    return false;
  }
}

export async function releaseReservation(
  reservationId: string,
  venueId:       string,
  reason = "released",
): Promise<boolean> {
  try {
    const { rowCount } = await pool.query(
      `UPDATE inventory_reservations
       SET status='released', released_at=NOW(), release_reason=$3
       WHERE id=$1 AND venue_id=$2 AND status='active'`,
      [reservationId, venueId, reason],
    );
    logger.info({ reservationId, reason }, "reservationEngine: reservation released");
    return (rowCount ?? 0) > 0;
  } catch (err) {
    logger.error({ err, reservationId }, "reservationEngine: release failed");
    return false;
  }
}

export async function cleanupExpiredReservations(venueId: string): Promise<number> {
  try {
    const { rowCount } = await pool.query(
      `UPDATE inventory_reservations
       SET status='expired', released_at=NOW(), release_reason='ttl_expired'
       WHERE venue_id=$1 AND status='active' AND expires_at < NOW()`,
      [venueId],
    );
    const expired = rowCount ?? 0;
    if (expired > 0) {
      logger.info({ venueId, expired }, "reservationEngine: expired reservations cleaned");
    }
    return expired;
  } catch {
    return 0;
  }
}

export async function getReservationsByOrder(
  orderId: string,
): Promise<ReservationRecord[]> {
  const { rows } = await pool.query(
    `SELECT id, venue_id, order_id, product_id, reserved_quantity AS reserved_qty,
            status, idempotency_key, EXTRACT(EPOCH FROM expires_at)*1000 AS expires_at,
            EXTRACT(EPOCH FROM created_at)*1000 AS created_at
     FROM inventory_reservations WHERE order_id=$1`,
    [orderId],
  ).catch(() => ({ rows: [] }));
  return (rows as Record<string, unknown>[]).map(r => ({
    id:             String(r["id"]),
    venueId:        String(r["venue_id"]),
    orderId:        String(r["order_id"]),
    productId:      String(r["product_id"]),
    reservedQty:    Number(r["reserved_qty"]),
    status:         r["status"] as ReservationStatus,
    expiresAt:      Number(r["expires_at"]),
    idempotencyKey: String(r["idempotency_key"]),
    createdAt:      Number(r["created_at"]),
  }));
}
