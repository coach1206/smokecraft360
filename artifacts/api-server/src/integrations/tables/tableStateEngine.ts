/**
 * tableStateEngine — authoritative live table/seat state management.
 *
 * Tracks per-table:
 *   - Occupancy (empty / seated / ordering / check_requested / clearing)
 *   - Guest count + VIP flag
 *   - Assigned staff member
 *   - Open POS ticket linkage
 *   - Session association
 *   - Timestamp of each state change
 *
 * In-process state map (fast) with DB persistence for durability.
 * Multi-device conflict prevention via optimistic locking (version field).
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";

export type TableOccupancy =
  | "empty"
  | "reserved"
  | "seated"
  | "ordering"
  | "check_requested"
  | "clearing";

export interface TableState {
  tableId:       string;
  venueId:       string;
  tableNumber:   string;
  zone:          string | null;
  capacity:      number;
  occupancy:     TableOccupancy;
  guestCount:    number;
  isVip:         boolean;
  staffId:       string | null;
  posTicketId:   string | null;
  eeisSessionId: string | null;
  seatedAt:      number | null;
  lastEventAt:   number;
  version:       number;
}

const tableCache = new Map<string, TableState>(); // key: `${venueId}:${tableId}`

function cacheKey(venueId: string, tableId: string): string {
  return `${venueId}:${tableId}`;
}

const DEFAULT_STATE = (venueId: string, tableId: string, tableNumber: string): TableState => ({
  tableId, venueId, tableNumber, zone: null, capacity: 4,
  occupancy: "empty", guestCount: 0, isVip: false,
  staffId: null, posTicketId: null, eeisSessionId: null,
  seatedAt: null, lastEventAt: Date.now(), version: 0,
});

export async function getTableState(
  venueId: string,
  tableId: string,
): Promise<TableState> {
  const cached = tableCache.get(cacheKey(venueId, tableId));
  if (cached) return cached;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM pos_table_states WHERE venue_id=$1 AND table_id=$2 LIMIT 1`,
      [venueId, tableId],
    );
    if (rows.length === 0) return DEFAULT_STATE(venueId, tableId, tableId);
    const state = rowToState(rows[0] as Record<string, unknown>);
    tableCache.set(cacheKey(venueId, tableId), state);
    return state;
  } catch {
    return DEFAULT_STATE(venueId, tableId, tableId);
  }
}

export async function updateTableState(
  venueId:  string,
  tableId:  string,
  patch:    Partial<Omit<TableState, "tableId"|"venueId"|"version"|"lastEventAt">>,
): Promise<{ ok: boolean; state: TableState; conflict: boolean }> {
  const current = await getTableState(venueId, tableId);
  const next: TableState = {
    ...current,
    ...patch,
    tableId, venueId,
    lastEventAt: Date.now(),
    version:     current.version + 1,
  };

  tableCache.set(cacheKey(venueId, tableId), next);

  try {
    const result = await pool.query(
      `INSERT INTO pos_table_states
         (table_id, venue_id, table_number, zone, capacity, occupancy, guest_count,
          is_vip, staff_id, pos_ticket_id, eeis_session_id, seated_at, version, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
               $12, $13, NOW())
       ON CONFLICT (venue_id, table_id) DO UPDATE SET
         occupancy      = EXCLUDED.occupancy,
         guest_count    = EXCLUDED.guest_count,
         is_vip         = EXCLUDED.is_vip,
         staff_id       = EXCLUDED.staff_id,
         pos_ticket_id  = EXCLUDED.pos_ticket_id,
         eeis_session_id= EXCLUDED.eeis_session_id,
         seated_at      = EXCLUDED.seated_at,
         version        = EXCLUDED.version,
         updated_at     = NOW()
       WHERE pos_table_states.version = $13 - 1
       RETURNING version`,
      [
        next.tableId, next.venueId, next.tableNumber,
        next.zone, next.capacity, next.occupancy,
        next.guestCount, next.isVip, next.staffId,
        next.posTicketId, next.eeisSessionId,
        next.seatedAt ? new Date(next.seatedAt).toISOString() : null,
        next.version,
      ],
    );

    const conflict = (result.rowCount ?? 0) === 0;

    await publish("orchestration", {
      event: "TABLE_STATE_UPDATED", venueId, tableId,
      tableNumber: next.tableNumber, occupancy: next.occupancy,
      guestCount: next.guestCount, version: next.version,
    });

    return { ok: true, state: next, conflict };
  } catch (err) {
    logger.warn({ err, venueId, tableId }, "tableStateEngine: persist failed");
    return { ok: false, state: next, conflict: false };
  }
}

export async function getAllTableStates(venueId: string): Promise<TableState[]> {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM pos_table_states WHERE venue_id=$1 ORDER BY table_number`,
      [venueId],
    );
    return (rows as Record<string, unknown>[]).map(rowToState);
  } catch { return []; }
}

export async function clearTable(venueId: string, tableId: string): Promise<void> {
  await updateTableState(venueId, tableId, {
    occupancy: "clearing", guestCount: 0, staffId: null,
    posTicketId: null, eeisSessionId: null, seatedAt: null, isVip: false,
  });
}

function rowToState(r: Record<string, unknown>): TableState {
  return {
    tableId:       String(r["table_id"]),
    venueId:       String(r["venue_id"]),
    tableNumber:   String(r["table_number"]),
    zone:          r["zone"]     ? String(r["zone"])     : null,
    capacity:      Number(r["capacity"]   ?? 4),
    occupancy:     r["occupancy"] as TableOccupancy,
    guestCount:    Number(r["guest_count"] ?? 0),
    isVip:         Boolean(r["is_vip"] ?? false),
    staffId:       r["staff_id"]       ? String(r["staff_id"])       : null,
    posTicketId:   r["pos_ticket_id"]  ? String(r["pos_ticket_id"])  : null,
    eeisSessionId: r["eeis_session_id"]? String(r["eeis_session_id"]): null,
    seatedAt:      r["seated_at"]  ? new Date(r["seated_at"]  as string).getTime() : null,
    lastEventAt:   r["updated_at"] ? new Date(r["updated_at"] as string).getTime() : Date.now(),
    version:       Number(r["version"] ?? 0),
  };
}
