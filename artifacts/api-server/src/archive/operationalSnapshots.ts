/**
 * operationalSnapshots — periodic state snapshots for fast replay bootstrapping.
 *
 * Instead of replaying from genesis for every diagnostic, the system periodically
 * snapshots current operational state. Replay can then start from the nearest
 * snapshot + delta events, drastically reducing replay time.
 *
 * Snapshot types:
 *   - venue_state:    current venue context, scores, active sessions
 *   - inventory_state:current stock levels (event-sourced reconciliation base)
 *   - session_state:  all active sessions for fast recovery
 *   - order_state:    open orders (for replay forensics)
 */

import { pool }       from "@workspace/db";
import { logger }     from "../lib/logger";
import { withLock }   from "../distributed/distributedLocks";
import { increment }  from "../platform/observability/metricsCollector";

export type SnapshotType = "venue_state" | "inventory_state" | "session_state" | "order_state";

export interface OperationalSnapshot {
  snapshotId: string;
  type:       SnapshotType;
  venueId:    string;
  data:       Record<string, unknown>;
  eventCursor:string | null;   // last event ID included in snapshot
  createdAt:  number;
}

const SNAPSHOT_LOCK   = "operational_snapshot";
const KEEP_PER_VENUE  = 5;   // max snapshots per (venue, type) pair

export async function takeVenueStateSnapshot(venueId: string): Promise<string | null> {
  try {
    // Gather current venue state
    const [contextRows, sessionRows, inventoryRows] = await Promise.all([
      pool.query(`SELECT * FROM venue_context_state WHERE venue_id=$1 LIMIT 1`, [venueId]).catch(() => ({ rows: [] })),
      pool.query(`SELECT id, status, created_at FROM sessions WHERE venue_id=$1 AND status='active'`, [venueId]).catch(() => ({ rows: [] })),
      pool.query(`SELECT product_id, quantity FROM inventory WHERE venue_id=$1`, [venueId]).catch(() => ({ rows: [] })),
    ]);

    const state = {
      context:   contextRows.rows[0] ?? null,
      sessions:  sessionRows.rows,
      inventory: inventoryRows.rows,
      ts:        Date.now(),
    };

    const { rows } = await pool.query(
      `INSERT INTO operational_snapshots
         (type, venue_id, data, event_cursor, created_at)
       VALUES ('venue_state',$1,$2,NULL,NOW())
       RETURNING snapshot_id`,
      [venueId, JSON.stringify(state)],
    );

    const snapshotId = String((rows[0] as Record<string, unknown>)["snapshot_id"]);
    increment("snapshots", "taken", 1, { type: "venue_state" });

    // Prune old snapshots for this venue
    await pruneOldSnapshots(venueId, "venue_state");

    return snapshotId;
  } catch (err) {
    logger.warn({ err, venueId }, "operationalSnapshots: snapshot failed");
    return null;
  }
}

async function pruneOldSnapshots(venueId: string, type: SnapshotType): Promise<void> {
  await pool.query(
    `DELETE FROM operational_snapshots
     WHERE venue_id=$1 AND type=$2
       AND snapshot_id NOT IN (
         SELECT snapshot_id FROM operational_snapshots
         WHERE venue_id=$1 AND type=$2
         ORDER BY created_at DESC LIMIT $3
       )`,
    [venueId, type, KEEP_PER_VENUE],
  ).catch(() => {});
}

export async function getNearestSnapshot(
  venueId: string,
  type:    SnapshotType,
  beforeMs?:number,
): Promise<OperationalSnapshot | null> {
  const params: unknown[] = [venueId, type];
  let sql = `SELECT * FROM operational_snapshots WHERE venue_id=$1 AND type=$2`;
  if (beforeMs) {
    sql += ` AND created_at <= $3`;
    params.push(new Date(beforeMs).toISOString());
  }
  sql += ` ORDER BY created_at DESC LIMIT 1`;

  const { rows } = await pool.query(sql, params).catch(() => ({ rows: [] }));
  if (rows.length === 0) return null;

  const r = rows[0] as Record<string, unknown>;
  return {
    snapshotId:  String(r["snapshot_id"]),
    type:        String(r["type"]) as SnapshotType,
    venueId:     String(r["venue_id"]),
    data:        (r["data"] as Record<string, unknown>) ?? {},
    eventCursor: r["event_cursor"] ? String(r["event_cursor"]) : null,
    createdAt:   new Date(r["created_at"] as string).getTime(),
  };
}

export async function runSnapshotBatch(): Promise<{ snapped: number; failed: number }> {
  let snapped = 0;
  let failed  = 0;

  const { acquired } = await withLock(SNAPSHOT_LOCK, 5 * 60_000, async () => {
    const { rows } = await pool.query(
      `SELECT id FROM venues WHERE is_active=TRUE ORDER BY id`,
    ).catch(() => ({ rows: [] }));

    for (const r of rows as Record<string, unknown>[]) {
      const venueId = String(r["id"]);
      const id      = await takeVenueStateSnapshot(venueId);
      if (id) snapped++; else failed++;
    }
    return null;
  });

  if (!acquired) logger.debug("operationalSnapshots: lock held, skipping batch");
  return { snapped, failed };
}
