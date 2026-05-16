/**
 * posSessionCorrelation — maps EEIS sessions to POS tickets/tabs.
 *
 * Tracks the binding between:
 *   - EEIS experience_session → POS ticket / tab / check
 *   - Guest profile → POS customer record
 *   - Device (kiosk/tablet) → POS terminal
 *   - Staff member → POS employee
 *   - Table/seat → POS table
 *
 * This is critical for true operational awareness — without this mapping
 * the EEIS intelligence layer cannot correlate activity with POS outcomes.
 *
 * Persists to: pos_session_correlations
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";

export interface SessionCorrelation {
  id:                   string;
  venueId:              string;
  provider:             string;
  eeisSessionId:        string;
  posTicketId:          string | null;
  posTabId:             string | null;
  posCheckId:           string | null;
  guestProfileId:       string | null;
  posCustomerId:        string | null;
  deviceId:             string | null;
  posTerminalId:        string | null;
  staffId:              string | null;
  posEmployeeId:        string | null;
  tableNumber:          string | null;
  posTableId:           string | null;
  seatNumber:           string | null;
  correlationStrength:  number;       // 0–1: how confident is this mapping
  status:               "active" | "completed" | "abandoned" | "transferred";
  openedAt:             number;
  closedAt:             number | null;
  metadata:             Record<string, unknown>;
}

export async function createSessionCorrelation(
  data: Omit<SessionCorrelation, "id" | "openedAt" | "closedAt">,
): Promise<SessionCorrelation | null> {
  try {
    const { rows } = await pool.query(
      `INSERT INTO pos_session_correlations
         (venue_id, provider, eeis_session_id, pos_ticket_id, pos_tab_id, pos_check_id,
          guest_profile_id, pos_customer_id, device_id, pos_terminal_id,
          staff_id, pos_employee_id, table_number, pos_table_id, seat_number,
          correlation_strength, status, metadata, opened_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
       ON CONFLICT (eeis_session_id, provider) DO UPDATE SET
         pos_ticket_id         = COALESCE(EXCLUDED.pos_ticket_id, pos_session_correlations.pos_ticket_id),
         pos_tab_id            = COALESCE(EXCLUDED.pos_tab_id,    pos_session_correlations.pos_tab_id),
         correlation_strength  = GREATEST(EXCLUDED.correlation_strength, pos_session_correlations.correlation_strength),
         status                = EXCLUDED.status,
         metadata              = pos_session_correlations.metadata || EXCLUDED.metadata
       RETURNING id, EXTRACT(EPOCH FROM opened_at)*1000 AS opened_ms`,
      [
        data.venueId, data.provider, data.eeisSessionId,
        data.posTicketId, data.posTabId, data.posCheckId,
        data.guestProfileId, data.posCustomerId,
        data.deviceId, data.posTerminalId,
        data.staffId, data.posEmployeeId,
        data.tableNumber, data.posTableId, data.seatNumber,
        data.correlationStrength, data.status,
        JSON.stringify(data.metadata),
      ],
    );

    const row = rows[0] as Record<string, unknown>;
    const correlation: SessionCorrelation = {
      ...data,
      id:       String(row["id"]),
      openedAt: Number(row["opened_ms"]),
      closedAt: null,
    };

    await publish("orchestration", {
      event: "SESSION_CORRELATED", venueId: data.venueId,
      eeisSessionId: data.eeisSessionId,
      posTicketId:   data.posTicketId,
      provider:      data.provider,
    });

    return correlation;
  } catch (err) {
    logger.error({ err, eeisSessionId: data.eeisSessionId }, "posSessionCorrelation: create failed");
    return null;
  }
}

export async function getCorrelation(
  eeisSessionId: string,
  provider:      string,
): Promise<SessionCorrelation | null> {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM pos_session_correlations
       WHERE eeis_session_id=$1 AND provider=$2 LIMIT 1`,
      [eeisSessionId, provider],
    );
    if (rows.length === 0) return null;
    return mapRow(rows[0] as Record<string, unknown>);
  } catch { return null; }
}

export async function closeCorrelation(
  eeisSessionId: string,
  provider:      string,
  status:        "completed" | "abandoned" | "transferred",
): Promise<void> {
  try {
    await pool.query(
      `UPDATE pos_session_correlations
       SET status=$3, closed_at=NOW()
       WHERE eeis_session_id=$1 AND provider=$2`,
      [eeisSessionId, provider, status],
    );
  } catch (err) {
    logger.warn({ err, eeisSessionId }, "posSessionCorrelation: close failed");
  }
}

export async function getActiveCorrelations(venueId: string): Promise<SessionCorrelation[]> {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM pos_session_correlations
       WHERE venue_id=$1 AND status='active'
         AND opened_at > NOW() - INTERVAL '8 hours'
       ORDER BY opened_at DESC LIMIT 100`,
      [venueId],
    );
    return (rows as Record<string, unknown>[]).map(mapRow);
  } catch { return []; }
}

function mapRow(r: Record<string, unknown>): SessionCorrelation {
  return {
    id:                   String(r["id"]),
    venueId:              String(r["venue_id"]),
    provider:             String(r["provider"]),
    eeisSessionId:        String(r["eeis_session_id"]),
    posTicketId:          r["pos_ticket_id"] ? String(r["pos_ticket_id"]) : null,
    posTabId:             r["pos_tab_id"]     ? String(r["pos_tab_id"])    : null,
    posCheckId:           r["pos_check_id"]   ? String(r["pos_check_id"])  : null,
    guestProfileId:       r["guest_profile_id"] ? String(r["guest_profile_id"]) : null,
    posCustomerId:        r["pos_customer_id"]  ? String(r["pos_customer_id"])  : null,
    deviceId:             r["device_id"]        ? String(r["device_id"])        : null,
    posTerminalId:        r["pos_terminal_id"]  ? String(r["pos_terminal_id"])  : null,
    staffId:              r["staff_id"]         ? String(r["staff_id"])         : null,
    posEmployeeId:        r["pos_employee_id"]  ? String(r["pos_employee_id"])  : null,
    tableNumber:          r["table_number"]     ? String(r["table_number"])     : null,
    posTableId:           r["pos_table_id"]     ? String(r["pos_table_id"])     : null,
    seatNumber:           r["seat_number"]      ? String(r["seat_number"])      : null,
    correlationStrength:  Number(r["correlation_strength"] ?? 0),
    status:               r["status"] as SessionCorrelation["status"],
    openedAt:             new Date(r["opened_at"] as string).getTime(),
    closedAt:             r["closed_at"] ? new Date(r["closed_at"] as string).getTime() : null,
    metadata:             (r["metadata"] ?? {}) as Record<string, unknown>,
  };
}
