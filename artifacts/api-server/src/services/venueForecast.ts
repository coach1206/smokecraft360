/**
 * Venue Revenue Forecast — historical-data based projection.
 *
 * Distinct from `sessionEconomics.predictSessionRevenue` (which is a
 * per-session heuristic from interaction count). This one queries actual
 * orders for a venue over a lookback window and projects forward by
 * combining:
 *
 *   avgOrdersPerDay × avgOrderValueCents
 *
 * Where avgOrderValueCents falls back to a sensible default when an
 * order has no `expectedAmountCents` recorded (legacy orders / kiosk
 * flows that don't yet pass through Stripe).
 *
 * Pure-ish: takes a DB handle, no other side effects, fully testable
 * against a fixture pool.
 */

import { and, eq, gte, sql } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";

/** Fallback ticket size when expectedAmountCents is null on a row.
 *  Mirrors sessionEconomics' DEFAULT_AVG_UPSELL_CENTS magnitude. */
const DEFAULT_TICKET_CENTS = 4500; // $45 — typical pour + cigar combo.

export interface VenueForecast {
  venueId:                string;
  lookbackDays:           number;
  observedOrders:         number;
  observedRevenueCents:   number;
  avgOrdersPerDay:        number;
  avgOrderValueCents:     number;
  /** Projected revenue for the next 24 hours (cents, integer). */
  projectedDailyCents:    number;
  /** Projected revenue for the next 7 days (cents, integer). */
  projectedWeeklyCents:   number;
  /** "low" if observedOrders < 10, "medium" < 50, "high" otherwise.
   *  Surfaces the fact that small samples produce noisy projections. */
  confidence:             "low" | "medium" | "high";
}

export async function computeVenueForecast(
  venueId:      string,
  lookbackDays: number = 14,
): Promise<VenueForecast> {
  const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  /* Single SQL pass: count orders, sum expectedAmountCents (treating
   * NULL as the default ticket so totals don't collapse for legacy data).
   * Excludes cancelled orders — they don't represent realised revenue. */
  const [row] = (await db.execute<{ order_count: string; total_cents: string }>(sql`
    SELECT
      COUNT(*)::text AS order_count,
      COALESCE(SUM(COALESCE(expected_amount_cents, ${DEFAULT_TICKET_CENTS})), 0)::text AS total_cents
    FROM ${ordersTable}
    WHERE venue_id = ${venueId}
      AND created_at >= ${lookbackDate}
      AND status NOT IN ('cancelled', 'refunded')
  `)).rows;

  const observedOrders       = row ? Number(row.order_count) : 0;
  const observedRevenueCents = row ? Number(row.total_cents) : 0;

  const avgOrdersPerDay    = observedOrders > 0 ? observedOrders / lookbackDays : 0;
  const avgOrderValueCents = observedOrders > 0 ? Math.round(observedRevenueCents / observedOrders) : 0;

  const projectedDailyCents  = Math.round(avgOrdersPerDay * avgOrderValueCents);
  const projectedWeeklyCents = projectedDailyCents * 7;

  const confidence: VenueForecast["confidence"] =
    observedOrders < 10 ? "low" :
    observedOrders < 50 ? "medium" : "high";

  return {
    venueId,
    lookbackDays,
    observedOrders,
    observedRevenueCents,
    avgOrdersPerDay,
    avgOrderValueCents,
    projectedDailyCents,
    projectedWeeklyCents,
    confidence,
  };
}

/**
 * Network-wide low-stock digest. For every product that is below its
 * reorder threshold at MULTIPLE venues, returns the venue count and the
 * total deficit. Powers the "your supplier should pre-stage these"
 * dashboard widget without exposing per-venue detail to other operators.
 *
 * Default threshold mirrors reorderAlerts: stock < 5 = low.
 */
export interface NetworkShortage {
  productId:    string;
  venuesLow:    number;
  totalUnits:   number;
}

export async function computeNetworkShortages(threshold: number = 5): Promise<NetworkShortage[]> {
  /* COUNT(DISTINCT venue_id) — not COUNT(*) — because venue_inventory
   * does not enforce a unique (venue_id, product_id) at the schema level,
   * so a duplicate row would falsely inflate "low at 2+ venues" using
   * COUNT(*). DISTINCT is the only way to guarantee the contract. */
  const rows = (await db.execute<{ product_id: string; venues_low: string; total_units: string }>(sql`
    SELECT
      product_id,
      COUNT(DISTINCT venue_id)::text AS venues_low,
      SUM(quantity)::text            AS total_units
    FROM venue_inventory
    WHERE quantity < ${threshold} AND available = true
    GROUP BY product_id
    HAVING COUNT(DISTINCT venue_id) >= 2
    ORDER BY COUNT(DISTINCT venue_id) DESC, SUM(quantity) ASC
    LIMIT 50
  `)).rows;

  return rows.map((r) => ({
    productId:  r.product_id,
    venuesLow:  Number(r.venues_low),
    totalUnits: Number(r.total_units),
  }));
}
