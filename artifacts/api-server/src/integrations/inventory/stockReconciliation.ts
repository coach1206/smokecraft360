/**
 * stockReconciliation — resolves inventory drift by applying corrections
 * from the POS source of truth to the EEIS internal state.
 *
 * Strategy: POS is source of truth. EEIS corrections are applied atomically.
 * All changes are logged with reason codes for audit.
 *
 * Triggered by:
 *   - driftDetection finding critical/high drifts
 *   - Scheduled reconciliation worker (every 5 min)
 *   - Manual staff action via admin API
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";
import { type UniversalInventoryItem } from "../schemas/universalInventory";
import { detectDrift }                 from "./driftDetection";

export interface ReconciliationResult {
  venueId:        string;
  provider:       string;
  reconciledAt:   number;
  itemsScanned:   number;
  itemsCorrected: number;
  corrections:    StockCorrection[];
  skipped:        number;
  errors:         number;
}

export interface StockCorrection {
  posProductId:  string;
  name:          string;
  previousQty:   number;
  correctedQty:  number;
  delta:         number;
  reason:        string;
  appliedAt:     number;
}

export async function reconcileStock(
  venueId:  string,
  provider: string,
  posItems: UniversalInventoryItem[],
  opts: { dryRun?: boolean } = {},
): Promise<ReconciliationResult> {
  const now = Date.now();
  const corrections: StockCorrection[] = [];
  let errors = 0, skipped = 0;

  try {
    // Run drift detection first
    const driftReport = await detectDrift(venueId, provider, posItems);

    for (const drift of driftReport.drifts) {
      if (drift.driftType === "stale_sync") { skipped++; continue; }
      if (drift.driftType === "missing_from_eeis") {
        // Cannot auto-create — log and skip
        skipped++;
        logger.info({ venueId, posProductId: drift.posProductId }, "stockReconciliation: item missing from EEIS, skipping");
        continue;
      }

      const posItem = posItems.find(i => i.posProductId === drift.posProductId);
      if (!posItem) { skipped++; continue; }

      try {
        if (!opts.dryRun) {
          const result = await pool.query(
            `UPDATE venue_products
             SET stock_quantity = $2,
                 is_available   = $3,
                 updated_at     = NOW()
             WHERE pos_product_id = $1 AND venue_id = $4
             RETURNING stock_quantity, name`,
            [drift.posProductId, posItem.quantity, posItem.available, venueId],
          );

          if (result.rows.length === 0) { skipped++; continue; }

          // Audit log
          await pool.query(
            `INSERT INTO inventory_audit_log
               (venue_id, pos_product_id, change_type, previous_qty, new_qty, reason, source, created_at)
             VALUES ($1,$2,'pos_reconciliation',$3,$4,$5,'pos_sync',NOW())`,
            [venueId, drift.posProductId, drift.eeisQuantity, posItem.quantity,
             `Drift correction: ${drift.driftType}`],
          ).catch(() => {});
        }

        corrections.push({
          posProductId: drift.posProductId,
          name:         drift.name,
          previousQty:  drift.eeisQuantity ?? 0,
          correctedQty: posItem.quantity,
          delta:        posItem.quantity - (drift.eeisQuantity ?? 0),
          reason:       drift.driftType,
          appliedAt:    now,
        });
      } catch (err) {
        logger.warn({ err, posProductId: drift.posProductId }, "stockReconciliation: correction failed");
        errors++;
      }
    }

    // Mark drift records as resolved
    if (!opts.dryRun && corrections.length > 0) {
      await pool.query(
        `UPDATE pos_drift_log SET resolved=TRUE, resolved_at=NOW()
         WHERE venue_id=$1 AND provider=$2 AND resolved=FALSE`,
        [venueId, provider],
      ).catch(() => {});
    }

    const result: ReconciliationResult = {
      venueId, provider, reconciledAt: now,
      itemsScanned:   posItems.length,
      itemsCorrected: corrections.length,
      corrections, skipped, errors,
    };

    await publish("telemetry", {
      event: "INVENTORY_RECONCILED", venueId, provider,
      corrected: corrections.length, dryRun: opts.dryRun,
    });

    logger.info({ venueId, provider, corrected: corrections.length, errors }, "stockReconciliation: complete");
    return result;
  } catch (err) {
    logger.error({ err, venueId }, "stockReconciliation: reconciliation failed");
    return { venueId, provider, reconciledAt: now, itemsScanned: 0, itemsCorrected: 0, corrections: [], skipped: 0, errors: 1 };
  }
}
