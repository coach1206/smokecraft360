/**
 * inventory.worker — Background inventory synchronization worker.
 *
 * Syncs inventory for every active POS connection on a 15-minute schedule.
 * Triggered on startup after a 60-second delay to allow the server to warm up.
 * Also handles on-demand venue-specific sync requests.
 */

import { db, posConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger }              from "../../lib/logger";
import { syncVenueInventory }  from "../services/inventorySync";

const SYNC_INTERVAL_MS = 15 * 60 * 1000;
const STARTUP_DELAY_MS = 60 * 1000;

async function runInventorySync(): Promise<void> {
  const connections = await db.select({
    venueId: posConnectionsTable.venueId,
    id:      posConnectionsTable.id,
    provider: posConnectionsTable.provider,
  })
    .from(posConnectionsTable)
    .where(eq(posConnectionsTable.status, "active"));

  const seen = new Set<string>();
  let success = 0;
  let failed  = 0;

  for (const conn of connections) {
    if (seen.has(conn.venueId)) continue;
    seen.add(conn.venueId);
    try {
      await syncVenueInventory(conn.venueId);
      success++;
    } catch (err) {
      failed++;
      logger.warn({ err, venueId: conn.venueId, provider: conn.provider }, "inventory.worker: venue sync failed");
    }
  }

  logger.info({ success, failed, total: seen.size }, "inventory.worker: cycle complete");
}

export function startInventoryWorker(): void {
  setTimeout(async () => {
    await runInventorySync().catch(err => logger.error({ err }, "inventory.worker: initial sync failed"));

    setInterval(async () => {
      await runInventorySync().catch(err => logger.error({ err }, "inventory.worker: periodic sync failed"));
    }, SYNC_INTERVAL_MS);
  }, STARTUP_DELAY_MS);

  logger.info("Inventory worker started (15-min sync, 60s startup delay)");
}
