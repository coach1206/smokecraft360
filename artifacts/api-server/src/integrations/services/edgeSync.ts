/**
 * edgeSync — Local edge sync layer for offline lounges.
 *
 * Buffers orders and inventory changes locally when the POS is unreachable.
 * On reconnect, replays buffered operations in order (FIFO).
 * Integrates with offlineQueue table for persistent storage across restarts.
 *
 * Also exposes a device heartbeat tracker (device_heartbeats table)
 * for tablet, kiosk, TV, and staff device synchronization.
 */

import { db, offlineQueueTable, deviceHeartbeatsTable, posConnectionsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { logger }        from "../../lib/logger";
import { routeOrder }    from "./posRouter";
import type { UniversalOrder } from "../schemas/universalOrder";

const REPLAY_INTERVAL_MS  = 2 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

export async function bufferOrder(venueId: string, order: UniversalOrder): Promise<void> {
  await db.insert(offlineQueueTable).values({
    idempotencyKey: order.id,
    venueId,
    kind:    "pos_order",
    payload: order as unknown as Record<string, unknown>,
    status:  "pending",
  });
  logger.info({ venueId, orderId: order.id }, "edgeSync: order buffered to offline queue");
}

export async function replayBufferedOrders(venueId: string): Promise<{ replayed: number; failed: number }> {
  const rows = await db.select()
    .from(offlineQueueTable)
    .where(and(eq(offlineQueueTable.venueId, venueId), eq(offlineQueueTable.kind, "pos_order")))
    .orderBy(asc(offlineQueueTable.createdAt))
    .limit(50);

  let replayed = 0;
  let failed   = 0;

  for (const row of rows) {
    try {
      const order = row.payload as unknown as UniversalOrder;
      const result = await routeOrder(venueId, order);
      if (result.success) {
        await db.delete(offlineQueueTable).where(eq(offlineQueueTable.id, row.id));
        replayed++;
      } else {
        failed++;
        logger.warn({ venueId, orderId: order.id, error: result.error }, "edgeSync: replay failed — keeping in queue");
      }
    } catch (err) {
      failed++;
      logger.error({ err, venueId, rowId: row.id }, "edgeSync: replay threw");
    }
  }

  if (replayed > 0 || failed > 0) {
    logger.info({ venueId, replayed, failed }, "edgeSync: replay complete");
  }

  return { replayed, failed };
}

export async function recordHeartbeat(params: {
  deviceId:    string;
  venueId:     string;
  deviceType?: string;
  status?:     string;
  appVersion?: string;
  ipAddress?:  string;
  meta?:       Record<string, unknown>;
}): Promise<void> {
  await db.insert(deviceHeartbeatsTable).values({
    deviceId:   params.deviceId as `${string}-${string}-${string}-${string}-${string}`,
    venueId:    params.venueId as `${string}-${string}-${string}-${string}-${string}`,
    deviceType: params.deviceType ?? "kiosk",
    status:     params.status     ?? "online",
    appVersion: params.appVersion ?? null,
    ipAddress:  params.ipAddress  ?? null,
    meta:       params.meta       ?? {},
  });
}

export async function getOfflineQueueDepth(venueId: string): Promise<number> {
  const rows = await db.select({ id: offlineQueueTable.id })
    .from(offlineQueueTable)
    .where(and(eq(offlineQueueTable.venueId, venueId), eq(offlineQueueTable.kind, "pos_order")));
  return rows.length;
}

export function startEdgeSyncReplay(): void {
  setInterval(async () => {
    try {
      const activeConns = await db.select({ venueId: posConnectionsTable.venueId })
        .from(posConnectionsTable)
        .where(eq(posConnectionsTable.status, "active"));

      const seen = new Set<string>();
      for (const c of activeConns) {
        if (seen.has(c.venueId)) continue;
        seen.add(c.venueId);
        const depth = await getOfflineQueueDepth(c.venueId);
        if (depth > 0) {
          await replayBufferedOrders(c.venueId);
        }
      }
    } catch (err) {
      logger.error({ err }, "edgeSync: replay interval failed");
    }
  }, REPLAY_INTERVAL_MS);

  logger.info("Edge sync replay started (2-min interval)");
}
