/**
 * reconciliation.worker — POS/EEIS inventory reconciliation.
 *
 * Every 60 minutes, compares the cached EEIS inventory against live POS data.
 * Detects drift (items in EEIS as available that POS shows as out-of-stock).
 * Publishes reconciliation alerts via NeuralEventBus for operator visibility.
 * Writes a sync log with reconciliation results.
 */

import { db, posConnectionsTable, posSyncLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger }              from "../../lib/logger";
import { syncVenueInventory, getInventorySnapshot } from "../services/inventorySync";
import { NeuralEventBus }      from "../../services/neuralEventBus";

const RECONCILE_INTERVAL_MS = 60 * 60 * 1000;

async function reconcileVenue(venueId: string, connectionId: string, provider: string): Promise<void> {
  const before   = getInventorySnapshot(venueId);
  const after    = await syncVenueInventory(venueId, true);
  if (!before || !after) return;

  const beforeOutOfStock = new Set(before.outOfStockIds);
  const afterOutOfStock  = new Set(after.outOfStockIds);

  const newlyOutOfStock  = after.outOfStockIds.filter(id => !beforeOutOfStock.has(id));
  const newlyRestocked   = before.outOfStockIds.filter(id => !afterOutOfStock.has(id));
  const drift            = newlyOutOfStock.length + newlyRestocked.length;

  if (drift > 0) {
    NeuralEventBus.publish("pos.inventory.drift_detected", {
      venueId, provider, drift,
      newlyOutOfStock, newlyRestocked,
      outOfStockCount: after.outOfStockIds.length,
    }, venueId);

    logger.info({ venueId, provider, drift, newlyOutOfStock, newlyRestocked }, "reconciliation.worker: drift detected");
  }

  await db.insert(posSyncLogsTable).values({
    connectionId, venueId, provider,
    syncType:    "inventory",
    status:      "success",
    itemCount:   after.itemCount,
    triggeredBy: "reconciliation_worker",
  });
}

async function runReconciliation(): Promise<void> {
  const connections = await db.select().from(posConnectionsTable)
    .where(eq(posConnectionsTable.status, "active"));

  const seen = new Set<string>();
  for (const conn of connections) {
    if (seen.has(conn.venueId)) continue;
    seen.add(conn.venueId);
    try {
      await reconcileVenue(conn.venueId, conn.id, conn.provider);
    } catch (err) {
      logger.error({ err, venueId: conn.venueId, provider: conn.provider }, "reconciliation.worker: venue failed");
    }
  }
}

export function startReconciliationWorker(): void {
  setInterval(async () => {
    await runReconciliation().catch(err => logger.error({ err }, "reconciliation.worker: cycle failed"));
  }, RECONCILE_INTERVAL_MS);

  logger.info("POS reconciliation worker started (60-min interval)");
}
