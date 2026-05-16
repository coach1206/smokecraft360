/**
 * retry.worker — Processes the pos_retry_queue on a 30-second poll.
 *
 * Picks up to 50 due items, marks them "processing", executes the operation,
 * then calls markAttempt(success/fail). Uses per-operation handlers.
 * Abandoned items (>maxAttempts) are left in abandoned status for review.
 */

import { logger }          from "../../lib/logger";
import { fetchDue, markAttempt, markProcessing } from "../services/retryQueue";
import { syncVenueInventory }                    from "../services/inventorySync";
import { routeOrder }                            from "../services/posRouter";
import type { UniversalOrder }                   from "../schemas/universalOrder";

const POLL_INTERVAL_MS = 30 * 1000;

async function processDueItems(): Promise<void> {
  const items = await fetchDue(50);
  if (!items.length) return;

  logger.info({ count: items.length }, "retry.worker: processing due items");

  for (const item of items) {
    await markProcessing(item.id);
    try {
      switch (item.operation) {
        case "sync_inventory":
          await syncVenueInventory(item.venueId, true);
          await markAttempt(item.id, true);
          break;

        case "push_order": {
          const order = item.payload as unknown as UniversalOrder;
          const result = await routeOrder(item.venueId, order);
          await markAttempt(item.id, result.success, result.error);
          break;
        }

        case "sync_products":
          await syncVenueInventory(item.venueId, true);
          await markAttempt(item.id, true);
          break;

        default:
          logger.warn({ operation: item.operation, id: item.id }, "retry.worker: unknown operation type");
          await markAttempt(item.id, false, `Unknown operation: ${item.operation}`);
      }
    } catch (err) {
      await markAttempt(item.id, false, String(err));
      logger.error({ err, id: item.id, operation: item.operation }, "retry.worker: item processing threw");
    }
  }
}

export function startRetryWorker(): void {
  setInterval(async () => {
    await processDueItems().catch(err => logger.error({ err }, "retry.worker: poll failed"));
  }, POLL_INTERVAL_MS);

  logger.info("POS retry worker started (30-sec poll interval)");
}
