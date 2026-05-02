/**
 * Trend Store — global crowd-learning engine.
 *
 * Computes per-product trend scores from analytics_events across all users:
 *   +2  top 10 most-selected / swiped-right products  (hot trending)
 *   +1  products with above-median selection activity
 *    0  everything else
 *
 * Refreshed at server startup and every 10 minutes.
 * All lookups are synchronous O(1) map reads — never blocks the request path.
 *
 * Only products with score > 0 receive a boost (relevance guard is upstream
 * in boostService.applyBoosts — irrelevant trending products never surface).
 */

import { db, analyticsEventsTable } from "@workspace/db";
import { inArray, sql }              from "drizzle-orm";
import { logger }                    from "../lib/logger";

const trendBoostMap      = new Map<string, number>();
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export async function refreshTrends(): Promise<void> {
  try {
    const rows = await db
      .select({
        productId: analyticsEventsTable.productId,
        cnt:       sql<number>`cast(count(*) as integer)`,
      })
      .from(analyticsEventsTable)
      .where(inArray(analyticsEventsTable.eventType, [
        "swipe_right", "product_selected", "order_created",
      ]))
      .groupBy(analyticsEventsTable.productId)
      .orderBy(sql`count(*) desc`)
      .limit(100);

    trendBoostMap.clear();

    const active = rows.filter((r) => r.productId && r.cnt > 0);
    if (active.length === 0) return;

    const counts = active.map((r) => r.cnt);

    // Top 10 → +2, next 25% → +1
    const top10Idx = Math.min(9, active.length - 1);
    const top25Idx = Math.floor(active.length * 0.25);

    const hot10Threshold = counts[top10Idx] ?? 0;
    const top25Threshold = counts[top25Idx] ?? 0;

    for (const row of active) {
      if (!row.productId) continue;
      if (hot10Threshold > 0 && row.cnt >= hot10Threshold) {
        trendBoostMap.set(row.productId, 2);
      } else if (top25Threshold > 0 && row.cnt >= top25Threshold) {
        trendBoostMap.set(row.productId, 1);
      }
    }

    logger.info({ scoredProducts: trendBoostMap.size }, "Trend scores refreshed");
  } catch (err) {
    // Non-fatal — trend scores are an enhancement, never a hard dependency
    logger.warn({ err }, "Failed to refresh trend scores — using previous values");
  }
}

/** Returns the crowd trend boost for a product: 0, 1, or 2. */
export function getTrendBoost(productId: string): number {
  return trendBoostMap.get(productId) ?? 0;
}

/** Returns a copy of the full trend map (used by the intelligence endpoint). */
export function getTrendMap(): Map<string, number> {
  return new Map(trendBoostMap);
}

/** Schedule periodic refresh. Call once at startup after initial load. */
export function scheduleTrendRefresh(): void {
  setInterval(() => {
    refreshTrends().catch(() => {});
  }, REFRESH_INTERVAL_MS);
}
