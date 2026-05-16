/**
 * posOrderCorrelation — maps EEIS swipe_orders to POS external order IDs.
 *
 * Tracks the full lifecycle of an order across the EEIS→POS boundary:
 *   - EEIS swipe_order_id → POS order/ticket/check id
 *   - POS confirmation → EEIS order status update
 *   - Payment correlation (EEIS payment → POS tender)
 *   - Refund correlation
 *
 * Persists to: pos_order_correlations
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";

export interface OrderCorrelation {
  id:                string;
  venueId:           string;
  provider:          string;
  eeisOrderId:       string;
  posOrderId:        string | null;
  posTicketId:       string | null;
  posCheckNumber:    string | null;
  eeisSessionId:     string | null;
  posSessionId:      string | null;
  submittedAt:       number | null;
  acceptedAt:        number | null;
  completedAt:       number | null;
  syncStatus:        "pending" | "synced" | "failed" | "partial";
  lastSyncAt:        number | null;
  retryCount:        number;
  errorLog:          string[];
  metadata:          Record<string, unknown>;
}

export async function correlateOrder(
  eeisOrderId:  string,
  posOrderId:   string,
  venueId:      string,
  provider:     string,
  opts: {
    posTicketId?:    string;
    posCheckNumber?: string;
    eeisSessionId?:  string;
    posSessionId?:   string;
    metadata?:       Record<string, unknown>;
  } = {},
): Promise<OrderCorrelation | null> {
  try {
    const { rows } = await pool.query(
      `INSERT INTO pos_order_correlations
         (venue_id, provider, eeis_order_id, pos_order_id, pos_ticket_id,
          pos_check_number, eeis_session_id, pos_session_id,
          sync_status, retry_count, error_log, metadata, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'synced',0,'[]'::jsonb,$9,NOW())
       ON CONFLICT (eeis_order_id, provider) DO UPDATE SET
         pos_order_id    = EXCLUDED.pos_order_id,
         pos_ticket_id   = COALESCE(EXCLUDED.pos_ticket_id, pos_order_correlations.pos_ticket_id),
         sync_status     = 'synced',
         last_sync_at    = NOW(),
         metadata        = pos_order_correlations.metadata || EXCLUDED.metadata
       RETURNING id, EXTRACT(EPOCH FROM submitted_at)*1000 AS sub_ms`,
      [
        venueId, provider, eeisOrderId, posOrderId,
        opts.posTicketId ?? null, opts.posCheckNumber ?? null,
        opts.eeisSessionId ?? null, opts.posSessionId ?? null,
        JSON.stringify(opts.metadata ?? {}),
      ],
    );

    const row = rows[0] as Record<string, unknown>;

    await publish("orchestration", {
      event: "ORDER_CORRELATED", venueId, eeisOrderId, posOrderId, provider,
    });

    return {
      id: String(row["id"]), venueId, provider, eeisOrderId, posOrderId,
      posTicketId: opts.posTicketId ?? null,
      posCheckNumber: opts.posCheckNumber ?? null,
      eeisSessionId: opts.eeisSessionId ?? null,
      posSessionId: opts.posSessionId ?? null,
      submittedAt: Number(row["sub_ms"]),
      acceptedAt: null, completedAt: null,
      syncStatus: "synced", lastSyncAt: Date.now(),
      retryCount: 0, errorLog: [],
      metadata: opts.metadata ?? {},
    };
  } catch (err) {
    logger.error({ err, eeisOrderId }, "posOrderCorrelation: correlate failed");
    return null;
  }
}

export async function markOrderFailed(
  eeisOrderId: string,
  provider:    string,
  error:       string,
): Promise<void> {
  try {
    await pool.query(
      `UPDATE pos_order_correlations
       SET sync_status='failed',
           retry_count = retry_count + 1,
           error_log   = error_log || $3::jsonb,
           last_sync_at= NOW()
       WHERE eeis_order_id=$1 AND provider=$2`,
      [eeisOrderId, provider, JSON.stringify([error])],
    );
  } catch (err) {
    logger.warn({ err, eeisOrderId }, "posOrderCorrelation: markFailed failed");
  }
}

export async function getOrderCorrelation(
  eeisOrderId: string,
  provider:    string,
): Promise<OrderCorrelation | null> {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM pos_order_correlations
       WHERE eeis_order_id=$1 AND provider=$2 LIMIT 1`,
      [eeisOrderId, provider],
    );
    if (rows.length === 0) return null;
    return mapOrderRow(rows[0] as Record<string, unknown>);
  } catch { return null; }
}

export async function getPendingCorrelations(
  venueId:  string,
  provider: string,
  limit = 50,
): Promise<OrderCorrelation[]> {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM pos_order_correlations
       WHERE venue_id=$1 AND provider=$2
         AND sync_status IN ('pending','failed')
         AND retry_count < 5
       ORDER BY submitted_at ASC LIMIT $3`,
      [venueId, provider, limit],
    );
    return (rows as Record<string, unknown>[]).map(mapOrderRow);
  } catch { return []; }
}

function mapOrderRow(r: Record<string, unknown>): OrderCorrelation {
  return {
    id:            String(r["id"]),
    venueId:       String(r["venue_id"]),
    provider:      String(r["provider"]),
    eeisOrderId:   String(r["eeis_order_id"]),
    posOrderId:    r["pos_order_id"]     ? String(r["pos_order_id"])    : null,
    posTicketId:   r["pos_ticket_id"]    ? String(r["pos_ticket_id"])   : null,
    posCheckNumber:r["pos_check_number"] ? String(r["pos_check_number"]): null,
    eeisSessionId: r["eeis_session_id"]  ? String(r["eeis_session_id"]) : null,
    posSessionId:  r["pos_session_id"]   ? String(r["pos_session_id"])  : null,
    submittedAt:   r["submitted_at"] ? new Date(r["submitted_at"] as string).getTime() : null,
    acceptedAt:    r["accepted_at"]  ? new Date(r["accepted_at"]  as string).getTime() : null,
    completedAt:   r["completed_at"] ? new Date(r["completed_at"] as string).getTime() : null,
    syncStatus:    r["sync_status"] as OrderCorrelation["syncStatus"],
    lastSyncAt:    r["last_sync_at"] ? new Date(r["last_sync_at"] as string).getTime() : null,
    retryCount:    Number(r["retry_count"] ?? 0),
    errorLog:      (r["error_log"] as string[] | null) ?? [],
    metadata:      (r["metadata"] ?? {}) as Record<string, unknown>,
  };
}
