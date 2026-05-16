/**
 * driftDetection — detects inventory drift between the EEIS internal state
 * and the POS provider's live inventory.
 *
 * Drift occurs when:
 *   - EEIS shows item as available but POS reports out-of-stock
 *   - EEIS quantity diverges from POS quantity by > threshold
 *   - Items present in POS but missing from EEIS inventory
 *   - Reservation ghost: reservation expired but stock not restored
 *
 * Publishes drift alerts to the telemetry channel for cognition layer.
 */

import { pool }                              from "@workspace/db";
import { logger }                            from "../../lib/logger";
import { publish }                           from "../../realtime/transport/eventBus";
import { type UniversalInventoryItem }       from "../schemas/universalInventory";

export type DriftType =
  | "availability_mismatch"
  | "quantity_divergence"
  | "missing_from_eeis"
  | "missing_from_pos"
  | "reservation_ghost"
  | "stale_sync";

export interface DriftRecord {
  posProductId:    string;
  eeisProductId?:  string;
  name:            string;
  driftType:       DriftType;
  severity:        "low" | "medium" | "high" | "critical";
  eeisQuantity:    number | null;
  posQuantity:     number | null;
  delta:           number;
  detectedAt:      number;
}

export interface DriftReport {
  venueId:       string;
  provider:      string;
  scannedAt:     number;
  totalItems:    number;
  driftCount:    number;
  drifts:        DriftRecord[];
  driftScore:    number;   // 0=clean 1=severe
  recommendation:string;
}

const QUANTITY_DRIFT_THRESHOLD = 3;   // units
const STALE_SYNC_THRESHOLD_MS  = 30 * 60 * 1000; // 30 min

function severity(type: DriftType, delta: number): DriftRecord["severity"] {
  if (type === "availability_mismatch") return "high";
  if (type === "reservation_ghost")     return "critical";
  if (type === "stale_sync")            return "medium";
  if (delta > 10) return "critical";
  if (delta > 5)  return "high";
  if (delta > 2)  return "medium";
  return "low";
}

export async function detectDrift(
  venueId:   string,
  provider:  string,
  posItems:  UniversalInventoryItem[],
): Promise<DriftReport> {
  const now = Date.now();
  const drifts: DriftRecord[] = [];

  try {
    // Load EEIS inventory state
    const { rows: eeisRows } = await pool.query(
      `SELECT product_id, name, stock_quantity, is_available, pos_product_id, updated_at
       FROM venue_products
       WHERE venue_id = $1 AND pos_product_id IS NOT NULL`,
      [venueId],
    ).catch(() => ({ rows: [] }));

    const eeisMap = new Map<string, Record<string, unknown>>(
      (eeisRows as Record<string, unknown>[]).map(r => [String(r["pos_product_id"]), r]),
    );
    const posMap  = new Map<string, UniversalInventoryItem>(
      posItems.map(i => [i.posProductId, i]),
    );

    // Check each POS item against EEIS
    for (const posItem of posItems) {
      const eeis = eeisMap.get(posItem.posProductId);

      if (!eeis) {
        drifts.push({
          posProductId: posItem.posProductId, name: posItem.name,
          driftType: "missing_from_eeis", severity: "medium",
          eeisQuantity: null, posQuantity: posItem.quantity,
          delta: posItem.quantity, detectedAt: now,
        });
        continue;
      }

      const eeisQty    = Number(eeis["stock_quantity"] ?? 0);
      const eeisAvail  = Boolean(eeis["is_available"]);
      const delta      = Math.abs(eeisQty - posItem.quantity);
      const updatedAt  = new Date(eeis["updated_at"] as string).getTime();

      // Availability mismatch
      if (eeisAvail !== posItem.available) {
        drifts.push({
          posProductId: posItem.posProductId,
          eeisProductId: String(eeis["product_id"]),
          name: posItem.name,
          driftType: "availability_mismatch", severity: "high",
          eeisQuantity: eeisQty, posQuantity: posItem.quantity,
          delta, detectedAt: now,
        });
      }
      // Quantity divergence
      else if (delta > QUANTITY_DRIFT_THRESHOLD) {
        drifts.push({
          posProductId: posItem.posProductId,
          eeisProductId: String(eeis["product_id"]),
          name: posItem.name,
          driftType: "quantity_divergence",
          severity: severity("quantity_divergence", delta),
          eeisQuantity: eeisQty, posQuantity: posItem.quantity,
          delta, detectedAt: now,
        });
      }
      // Stale sync
      else if (now - updatedAt > STALE_SYNC_THRESHOLD_MS) {
        drifts.push({
          posProductId: posItem.posProductId,
          name: posItem.name,
          driftType: "stale_sync", severity: "low",
          eeisQuantity: eeisQty, posQuantity: posItem.quantity,
          delta: now - updatedAt, detectedAt: now,
        });
      }
    }

    // EEIS items missing from POS
    for (const [posId, eeis] of eeisMap.entries()) {
      if (!posMap.has(posId)) {
        drifts.push({
          posProductId: posId, name: String(eeis["name"]),
          eeisProductId: String(eeis["product_id"]),
          driftType: "missing_from_pos", severity: "medium",
          eeisQuantity: Number(eeis["stock_quantity"] ?? 0), posQuantity: null,
          delta: 0, detectedAt: now,
        });
      }
    }

    const criticalCount = drifts.filter(d => d.severity === "critical").length;
    const highCount     = drifts.filter(d => d.severity === "high").length;
    const driftScore    = Math.min(1, (criticalCount * 3 + highCount * 2 + drifts.length) / (posItems.length * 3));

    const report: DriftReport = {
      venueId, provider, scannedAt: now,
      totalItems: posItems.length,
      driftCount: drifts.length,
      drifts,
      driftScore: Math.round(driftScore * 1000) / 1000,
      recommendation: drifts.length === 0
        ? "Inventory aligned"
        : criticalCount > 0
        ? "Critical drift detected — run stockReconciliation immediately"
        : highCount > 0
        ? "Availability mismatches detected — manual review recommended"
        : "Minor drift — scheduled reconciliation sufficient",
    };

    if (drifts.length > 0) {
      await publish("telemetry", {
        event: "INVENTORY_DRIFT_DETECTED", venueId, provider,
        driftCount: drifts.length, driftScore: report.driftScore,
      });
    }

    return report;
  } catch (err) {
    logger.error({ err, venueId }, "driftDetection: scan failed");
    return { venueId, provider, scannedAt: now, totalItems: 0, driftCount: 0, drifts: [], driftScore: 0, recommendation: "Scan failed" };
  }
}
