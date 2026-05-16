/**
 * inventoryReplay — reconstructs inventory state at any point in time from
 * the append-only inventory_audit_log.
 *
 * Used for:
 *   - Shrinkage investigation ("how did we go from 50 to 0 cigars?")
 *   - Drift investigation (comparing reconciliation snapshots)
 *   - Financial audit (cost of goods)
 *   - Identifying unauthorized stock changes
 */

import { pool }   from "@workspace/db";
import { logger } from "../../lib/logger";

export interface InventoryAuditEntry {
  ts:            number;
  changeType:    string;
  posProductId:  string;
  productName:   string;
  previousQty:   number;
  newQty:        number;
  delta:         number;
  source:        string;
  reason:        string | null;
  staffId:       string | null;
}

export interface InventoryReplayResult {
  venueId:        string;
  replayedAt:     number;
  asOf:           number;
  entries:        InventoryAuditEntry[];
  productSummary: ProductSummary[];
  totalMovements: number;
  anomalies:      string[];
}

export interface ProductSummary {
  posProductId:  string;
  productName:   string;
  netDelta:      number;
  addedQty:      number;
  removedQty:    number;
  startQty:      number | null;
  endQty:        number | null;
  movementCount: number;
  hasAnomaly:    boolean;
}

export async function replayInventory(
  venueId:      string,
  fromTs:       Date,
  toTs:         Date,
  posProductId?: string,
): Promise<InventoryReplayResult> {
  const replayedAt = Date.now();
  const anomalies: string[] = [];

  try {
    const params: unknown[] = [venueId, fromTs.toISOString(), toTs.toISOString()];
    let query = `SELECT * FROM inventory_audit_log
       WHERE venue_id=$1 AND created_at BETWEEN $2 AND $3`;
    if (posProductId) { query += ` AND pos_product_id=$4`; params.push(posProductId); }
    query += ` ORDER BY created_at ASC LIMIT 1000`;

    const { rows } = await pool.query(query, params);

    const entries: InventoryAuditEntry[] = (rows as Record<string, unknown>[]).map(r => {
      const prev = Number(r["previous_qty"] ?? 0);
      const next = Number(r["new_qty"]      ?? 0);
      return {
        ts:           new Date(r["created_at"] as string).getTime(),
        changeType:   String(r["change_type"]),
        posProductId: String(r["pos_product_id"]),
        productName:  String(r["product_name"] ?? r["pos_product_id"]),
        previousQty:  prev,
        newQty:       next,
        delta:        next - prev,
        source:       String(r["source"]),
        reason:       r["reason"]   ? String(r["reason"])   : null,
        staffId:      r["staff_id"] ? String(r["staff_id"]) : null,
      };
    });

    // Build per-product summary
    const byProduct = new Map<string, InventoryAuditEntry[]>();
    for (const e of entries) {
      const arr = byProduct.get(e.posProductId) ?? [];
      arr.push(e);
      byProduct.set(e.posProductId, arr);
    }

    const productSummary: ProductSummary[] = [];
    for (const [pid, evts] of byProduct.entries()) {
      const added   = evts.filter(e => e.delta > 0).reduce((s, e) => s + e.delta, 0);
      const removed = evts.filter(e => e.delta < 0).reduce((s, e) => s + Math.abs(e.delta), 0);
      const net     = evts.reduce((s, e) => s + e.delta, 0);
      const hasAnomaly = removed > added * 2; // 2x removals vs additions = suspicious

      if (hasAnomaly) anomalies.push(`Suspicious removal pattern for ${pid}`);

      productSummary.push({
        posProductId:  pid,
        productName:   evts[0]!.productName,
        netDelta:      net,
        addedQty:      added,
        removedQty:    removed,
        startQty:      evts[0]!.previousQty,
        endQty:        evts[evts.length - 1]!.newQty,
        movementCount: evts.length,
        hasAnomaly,
      });
    }

    return {
      venueId, replayedAt, asOf: toTs.getTime(),
      entries, productSummary, totalMovements: entries.length, anomalies,
    };
  } catch (err) {
    logger.error({ err, venueId }, "inventoryReplay: failed");
    return { venueId, replayedAt, asOf: toTs.getTime(), entries: [], productSummary: [], totalMovements: 0, anomalies: [String(err)] };
  }
}
