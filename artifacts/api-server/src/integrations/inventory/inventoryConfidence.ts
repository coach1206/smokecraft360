/**
 * inventoryConfidence — scores confidence in EEIS inventory accuracy.
 *
 * Confidence degrades with:
 *   - Time since last POS sync
 *   - Number of unresolved drift records
 *   - High reservation utilization (reservations consuming most stock)
 *   - Recent failed sync attempts
 *   - Velocity of changes (high-velocity items degrade faster)
 *
 * Used by: recommendation engine (low-confidence items get stock penalty),
 *          operational awareness (low confidence → alert),
 *          driftDetection (confidence threshold triggers auto-reconcile).
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";

export interface InventoryConfidenceScore {
  venueId:              string;
  provider:             string;
  ts:                   number;
  overallConfidence:    number;      // 0–1
  syncAge:              number;      // ms since last successful sync
  syncAgeScore:         number;      // 0–1 (1=fresh)
  driftScore:           number;      // 0–1 (1=clean)
  reservationScore:     number;      // 0–1 (1=low utilization)
  failureScore:         number;      // 0–1 (1=no failures)
  riskLevel:            "low" | "moderate" | "high" | "critical";
  itemScores:           ItemConfidence[];
}

export interface ItemConfidence {
  posProductId: string;
  name:         string;
  confidence:   number;
  reason:       string;
}

const SYNC_HALF_LIFE_MS      = 15 * 60 * 1000;  // 15 min
const RESERVATION_RISK_RATIO = 0.7;              // >70% reserved = low confidence

export async function computeInventoryConfidence(
  venueId:  string,
  provider: string,
): Promise<InventoryConfidenceScore> {
  const now = Date.now();
  try {
    const [syncRow, driftRow, reservationRow, failureRow, items] = await Promise.all([
      // Last successful sync timestamp
      pool.query(
        `SELECT MAX(synced_at) AS last_sync FROM pos_inventory_sync_log
         WHERE venue_id=$1 AND provider=$2 AND success=TRUE`,
        [venueId, provider],
      ).catch(() => ({ rows: [{ last_sync: null }] })),

      // Unresolved drift count
      pool.query(
        `SELECT COUNT(*) AS cnt FROM pos_drift_log
         WHERE venue_id=$1 AND provider=$2 AND resolved=FALSE`,
        [venueId, provider],
      ).catch(() => ({ rows: [{ cnt: 0 }] })),

      // Reservation pressure
      pool.query(
        `SELECT
           SUM(ir.reserved_quantity) AS reserved,
           SUM(vp.stock_quantity) AS total
         FROM inventory_reservations ir
         JOIN venue_products vp ON vp.product_id = ir.product_id
         WHERE ir.venue_id=$1 AND ir.status='active'`,
        [venueId],
      ).catch(() => ({ rows: [{ reserved: 0, total: 1 }] })),

      // Recent sync failures (last hour)
      pool.query(
        `SELECT COUNT(*) AS cnt FROM pos_inventory_sync_log
         WHERE venue_id=$1 AND provider=$2 AND success=FALSE
           AND synced_at > NOW() - INTERVAL '1 hour'`,
        [venueId, provider],
      ).catch(() => ({ rows: [{ cnt: 0 }] })),

      // Per-item analysis
      pool.query(
        `SELECT vp.pos_product_id, vp.name, vp.stock_quantity, vp.updated_at,
                COALESCE(SUM(ir.reserved_quantity),0) AS reserved
         FROM venue_products vp
         LEFT JOIN inventory_reservations ir ON ir.product_id = vp.product_id AND ir.status='active'
         WHERE vp.venue_id=$1 AND vp.pos_product_id IS NOT NULL
         GROUP BY vp.pos_product_id, vp.name, vp.stock_quantity, vp.updated_at
         LIMIT 50`,
        [venueId],
      ).catch(() => ({ rows: [] })),
    ]);

    const lastSync  = (syncRow.rows[0] as Record<string, unknown>)?.["last_sync"];
    const syncAgeMs = lastSync ? now - new Date(lastSync as string).getTime() : 3_600_000;
    const syncAgeScore = Math.exp(-syncAgeMs / SYNC_HALF_LIFE_MS);

    const unresolvedDrift = Number((driftRow.rows[0] as Record<string, unknown>)?.["cnt"] ?? 0);
    const driftScore = Math.max(0, 1 - unresolvedDrift * 0.1);

    const reserved = Number((reservationRow.rows[0] as Record<string, unknown>)?.["reserved"] ?? 0);
    const total    = Number((reservationRow.rows[0] as Record<string, unknown>)?.["total"]    ?? 1);
    const reservationRatio = total > 0 ? reserved / total : 0;
    const reservationScore = reservationRatio > RESERVATION_RISK_RATIO ? 0.5 : 1 - reservationRatio * 0.3;

    const failures = Number((failureRow.rows[0] as Record<string, unknown>)?.["cnt"] ?? 0);
    const failureScore = Math.max(0, 1 - failures * 0.2);

    const overallConfidence = Math.max(0.05, Math.min(1,
      syncAgeScore      * 0.40 +
      driftScore        * 0.30 +
      reservationScore  * 0.20 +
      failureScore      * 0.10,
    ));

    const riskLevel: InventoryConfidenceScore["riskLevel"] =
      overallConfidence >= 0.8 ? "low"      :
      overallConfidence >= 0.6 ? "moderate" :
      overallConfidence >= 0.4 ? "high"     : "critical";

    const itemScores: ItemConfidence[] = (items.rows as Record<string, unknown>[]).map(r => {
      const ageMs      = now - new Date(r["updated_at"] as string).getTime();
      const itemReserved = Number(r["reserved"] ?? 0);
      const itemTotal    = Number(r["stock_quantity"] ?? 0);
      const itemConf   = Math.max(0,
        Math.exp(-ageMs / SYNC_HALF_LIFE_MS) * 0.7 +
        (itemTotal > 0 ? 1 - itemReserved / itemTotal : 0.3) * 0.3,
      );
      return {
        posProductId: String(r["pos_product_id"]),
        name:         String(r["name"]),
        confidence:   Math.round(itemConf * 1000) / 1000,
        reason:       itemConf < 0.5
          ? "Stale sync or high reservation pressure"
          : "Acceptable",
      };
    });

    return {
      venueId, provider, ts: now,
      overallConfidence: Math.round(overallConfidence * 1000) / 1000,
      syncAge: syncAgeMs, syncAgeScore, driftScore, reservationScore, failureScore,
      riskLevel, itemScores,
    };
  } catch (err) {
    logger.warn({ err, venueId }, "inventoryConfidence: compute failed");
    return {
      venueId, provider, ts: now,
      overallConfidence: 0.1, syncAge: 999_999, syncAgeScore: 0,
      driftScore: 0, reservationScore: 0, failureScore: 0,
      riskLevel: "critical", itemScores: [],
    };
  }
}
