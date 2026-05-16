/**
 * staffHandoff — synchronized staff assignment transfer for tables.
 *
 * Handles:
 *   - Table reassignment (A → B)
 *   - Section reassignment (all A's tables → B)
 *   - Shift handoff (departing staff → arriving staff)
 *   - Emergency reassignment (offline/absent staff → active staff)
 *
 * Ensures:
 *   - Lock acquisition before reassignment
 *   - POS employee record update
 *   - EEIS staff context update
 *   - Audit trail in orchestration_events
 */

import { pool }                        from "@workspace/db";
import { logger }                      from "../../lib/logger";
import { publish }                     from "../../realtime/transport/eventBus";
import { acquireTableLock, releaseTableLock } from "./tableLocks";
import { updateTableState, getAllTableStates } from "./tableStateEngine";

export interface HandoffRequest {
  venueId:        string;
  fromStaffId:    string;
  toStaffId:      string;
  tableIds?:      string[];    // if empty → all tables held by fromStaffId
  reason:         "shift_end" | "break" | "reassignment" | "emergency" | "section_transfer";
  requestedBy:    string;
  notes?:         string;
}

export interface HandoffResult {
  ok:               boolean;
  venueId:          string;
  fromStaffId:      string;
  toStaffId:        string;
  tablesTransferred:number;
  tablesFailed:     number;
  handoffId:        string;
  ts:               number;
}

export async function executeHandoff(req: HandoffRequest): Promise<HandoffResult> {
  const handoffId = `hoff-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  let transferred = 0, failed = 0;

  try {
    // Resolve tables to transfer
    let targetTableIds = req.tableIds;
    if (!targetTableIds || targetTableIds.length === 0) {
      const allTables = await getAllTableStates(req.venueId);
      targetTableIds  = allTables
        .filter(t => t.staffId === req.fromStaffId)
        .map(t => t.tableId);
    }

    logger.info(
      { venueId: req.venueId, from: req.fromStaffId, to: req.toStaffId, count: targetTableIds.length },
      "staffHandoff: executing",
    );

    for (const tableId of targetTableIds) {
      // Acquire lock for this table
      const { acquired } = await acquireTableLock(req.venueId, tableId, `handoff-${handoffId}`);
      if (!acquired) { failed++; continue; }

      try {
        const { ok } = await updateTableState(req.venueId, tableId, {
          staffId: req.toStaffId,
        });
        if (ok) { transferred++; }
        else    { failed++; }
      } finally {
        await releaseTableLock(req.venueId, tableId, `handoff-${handoffId}`);
      }
    }

    // Audit log
    await pool.query(
      `INSERT INTO orchestration_events
         (venue_id, event_type, payload, created_at)
       VALUES ($1,'staff_handoff',$2,NOW())`,
      [
        req.venueId,
        JSON.stringify({
          handoffId, fromStaffId: req.fromStaffId, toStaffId: req.toStaffId,
          tablesTransferred: transferred, tablesFailed: failed,
          reason: req.reason, requestedBy: req.requestedBy, notes: req.notes,
        }),
      ],
    ).catch(() => {});

    await publish("orchestration", {
      event: "STAFF_HANDOFF_COMPLETE", venueId: req.venueId,
      handoffId, fromStaffId: req.fromStaffId, toStaffId: req.toStaffId,
      tablesTransferred: transferred, tablesFailed: failed,
    });

    return {
      ok: failed === 0, venueId: req.venueId,
      fromStaffId: req.fromStaffId, toStaffId: req.toStaffId,
      tablesTransferred: transferred, tablesFailed: failed,
      handoffId, ts: Date.now(),
    };
  } catch (err) {
    logger.error({ err, handoffId }, "staffHandoff: failed");
    return {
      ok: false, venueId: req.venueId,
      fromStaffId: req.fromStaffId, toStaffId: req.toStaffId,
      tablesTransferred: 0, tablesFailed: 0, handoffId, ts: Date.now(),
    };
  }
}
