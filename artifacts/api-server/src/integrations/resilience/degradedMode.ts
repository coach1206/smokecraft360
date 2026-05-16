/**
 * degradedMode — offline operational fallback for POS unavailability.
 *
 * When a provider is FAILED and no failover is available, the system
 * enters degraded mode. In this mode:
 *   - Orders are accepted locally (in-memory + DB queue)
 *   - Inventory deductions are made optimistically
 *   - All operations are queued for replay when provider recovers
 *   - Staff are notified via operational alert
 *   - Kiosk UI shows "Offline Mode" indicator
 *
 * Recovery: when provider health returns to "healthy", queued ops replay
 * in order via the existing retryQueue infrastructure.
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";

export type DegradedCapability =
  | "order_acceptance"     // can take orders (local queue)
  | "inventory_read"       // can read last-known inventory
  | "payment_processing"   // can process payments (offline tab)
  | "menu_display"         // can show cached menu
  | "loyalty_points"       // can award points locally
  | "reporting";           // can show cached reports

export interface DegradedModeState {
  venueId:          string;
  isActive:         boolean;
  activeSince:      number | null;
  triggeredBy:      string | null;      // provider that failed
  capabilities:     DegradedCapability[];
  queueDepth:       number;
  lastSyncAttempt:  number | null;
  estimatedRecovery:number | null;
}

const FULL_OFFLINE_CAPABILITIES: DegradedCapability[] = [
  "order_acceptance", "inventory_read", "menu_display",
];

const modeMap = new Map<string, DegradedModeState>();

export async function activateDegradedMode(
  venueId:     string,
  triggeredBy: string,
): Promise<DegradedModeState> {
  const existing = modeMap.get(venueId);
  if (existing?.isActive) return existing;

  const state: DegradedModeState = {
    venueId,
    isActive:          true,
    activeSince:       Date.now(),
    triggeredBy,
    capabilities:      FULL_OFFLINE_CAPABILITIES,
    queueDepth:        0,
    lastSyncAttempt:   null,
    estimatedRecovery: Date.now() + 10 * 60 * 1_000, // estimate 10 min
  };

  modeMap.set(venueId, state);

  logger.warn({ venueId, triggeredBy }, "degradedMode: ACTIVATED");

  await publish("orchestration", {
    event: "DEGRADED_MODE_ACTIVATED", venueId, triggeredBy,
    capabilities: state.capabilities,
  });

  await pool.query(
    `INSERT INTO operational_alerts
       (venue_id, alert_type, severity, message, metadata, created_at)
     VALUES ($1,'degraded_mode','high','POS system unavailable — operating in offline mode',$2,NOW())
     ON CONFLICT DO NOTHING`,
    [venueId, JSON.stringify({ triggeredBy })],
  ).catch(() => {});

  return state;
}

export async function deactivateDegradedMode(venueId: string): Promise<void> {
  const state = modeMap.get(venueId);
  if (!state?.isActive) return;

  modeMap.set(venueId, { ...state, isActive: false, activeSince: null, triggeredBy: null, queueDepth: 0 });

  logger.info({ venueId }, "degradedMode: DEACTIVATED — provider recovered");

  await publish("orchestration", { event: "DEGRADED_MODE_DEACTIVATED", venueId });

  // Trigger queue drain via retryQueue
  await publish("orchestration", { event: "OFFLINE_QUEUE_DRAIN_REQUESTED", venueId });
}

export function getDegradedModeState(venueId: string): DegradedModeState {
  return modeMap.get(venueId) ?? {
    venueId, isActive: false, activeSince: null, triggeredBy: null,
    capabilities: [], queueDepth: 0, lastSyncAttempt: null, estimatedRecovery: null,
  };
}

export function isCapabilityAvailable(
  venueId:    string,
  capability: DegradedCapability,
): boolean {
  const state = getDegradedModeState(venueId);
  if (!state.isActive) return true;  // normal mode: all available
  return state.capabilities.includes(capability);
}

/** Queue an operation for replay when provider recovers */
export async function enqueueOfflineOperation(
  venueId:   string,
  opType:    string,
  payload:   Record<string, unknown>,
): Promise<string | null> {
  const state = modeMap.get(venueId);
  if (!state?.isActive) return null;  // not in degraded mode, don't queue

  try {
    const { rows } = await pool.query(
      `INSERT INTO offline_queue
         (venue_id, op_type, payload, status, created_at)
       VALUES ($1,$2,$3,'pending',NOW())
       RETURNING id`,
      [venueId, opType, JSON.stringify(payload)],
    );

    const id = String((rows[0] as Record<string, unknown>)["id"]);
    // Update queue depth in state
    if (state) state.queueDepth++;

    return id;
  } catch (err) {
    logger.error({ err, venueId, opType }, "degradedMode: enqueueOfflineOperation failed");
    return null;
  }
}

/** Snapshot of offline queue depth + pending ops */
export async function getOfflineQueueStatus(venueId: string): Promise<{
  pending:   number;
  oldest:    number | null;
  opTypes:   Record<string, number>;
}> {
  try {
    const { rows } = await pool.query(
      `SELECT op_type, COUNT(*) AS cnt, MIN(created_at) AS oldest_at
       FROM offline_queue WHERE venue_id=$1 AND status='pending'
       GROUP BY op_type`,
      [venueId],
    );
    const opTypes: Record<string, number> = {};
    let total = 0, oldest: number | null = null;
    for (const r of rows as Record<string, unknown>[]) {
      const cnt  = Number(r["cnt"]);
      const type = String(r["op_type"]);
      opTypes[type] = cnt;
      total += cnt;
      const ts = r["oldest_at"] ? new Date(r["oldest_at"] as string).getTime() : null;
      if (ts && (oldest === null || ts < oldest)) oldest = ts;
    }
    return { pending: total, oldest, opTypes };
  } catch {
    return { pending: 0, oldest: null, opTypes: {} };
  }
}
