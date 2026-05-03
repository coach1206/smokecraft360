/**
 * Network Insights — premium-gated, anonymized cross-venue benchmarks.
 *
 *   GET /api/network/insights              — top flavors / cigars / pairings / avg score
 *   GET /api/network/venue-performance     — "you vs network" comparison for the caller's venue
 *
 * Both endpoints require auth and a premium plan (or super_admin).
 * NEVER returns competitor venue names or per-competitor breakdowns —
 * only network-wide aggregates and the caller's relative position.
 */

import { Router, type IRouter, type Response } from "express";
import { and, desc, eq, sql }                  from "drizzle-orm";
import {
  db,
  networkMetricsTable,
  venueMetricsTable,
}                                               from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requirePremium }                       from "../middleware/premium";
import { computeVenueForecast, computeNetworkShortages } from "../services/venueForecast";
import { findProduct }                          from "../engine/registry";

const router: IRouter = Router();

// ── GET /api/network/insights ─────────────────────────────────────────────────

router.get(
  "/insights",
  requireAuth,
  requirePremium,
  async (req: AuthRequest, res: Response) => {
    const tf = (typeof req.query["timeframe"] === "string" ? req.query["timeframe"] : "weekly") as
      "daily" | "weekly" | "monthly";

    const [topFlavors, topCigars, topPairings, scoreAgg] = await Promise.all([
      db.select().from(networkMetricsTable)
        .where(and(eq(networkMetricsTable.metricType, "flavor"), eq(networkMetricsTable.timeframe, tf)))
        .orderBy(desc(networkMetricsTable.count)).limit(10),
      db.select().from(networkMetricsTable)
        .where(and(eq(networkMetricsTable.metricType, "cigar"), eq(networkMetricsTable.timeframe, tf)))
        .orderBy(desc(networkMetricsTable.count)).limit(10),
      db.select().from(networkMetricsTable)
        .where(and(eq(networkMetricsTable.metricType, "pairing"), eq(networkMetricsTable.timeframe, tf)))
        .orderBy(desc(networkMetricsTable.count)).limit(10),
      db.select().from(networkMetricsTable)
        .where(and(eq(networkMetricsTable.metricType, "score"), eq(networkMetricsTable.timeframe, tf)))
        .limit(1),
    ]);

    res.json({
      timeframe:      tf,
      topFlavors:     topFlavors.map((m) => ({ name: m.value, count: m.count })),
      topCigars:      topCigars.map((m)  => ({ name: m.value, count: m.count })),
      topPairings:    topPairings.map((m) => ({ name: m.value, count: m.count })),
      avgBlendScore:  scoreAgg[0]?.avgScore ?? null,
      sampleSize:     scoreAgg[0]?.count ?? 0,
    });
  },
);

// ── GET /api/network/venue-performance ────────────────────────────────────────

router.get(
  "/venue-performance",
  requireAuth,
  requirePremium,
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user?.venueId;
    if (!venueId) {
      res.status(400).json({ error: "User is not associated with a venue" });
      return;
    }
    const tf = "weekly" as const;

    // Network-wide avg blend score
    const [networkScore] = await db.select().from(networkMetricsTable).where(and(
      eq(networkMetricsTable.metricType, "score"),
      eq(networkMetricsTable.timeframe,  tf),
    )).limit(1);

    // This venue's top flavor
    const [venueTopFlavor] = await db.select().from(venueMetricsTable).where(and(
      eq(venueMetricsTable.venueId,    venueId),
      eq(venueMetricsTable.metricType, "flavor"),
      eq(venueMetricsTable.timeframe,  tf),
    )).orderBy(desc(venueMetricsTable.count)).limit(1);

    // This venue's order count rank vs all venues, derived from venue_metrics
    // (count any 'flavor' rollup as proxy for activity)
    const [rankRow] = (await db.execute<{ rank: string; total: string }>(sql`
      WITH venue_totals AS (
        SELECT venue_id, SUM(count)::int AS total
        FROM venue_metrics
        WHERE metric_type = 'flavor' AND timeframe = ${tf}
        GROUP BY venue_id
      )
      SELECT
        (SELECT COUNT(*) + 1 FROM venue_totals
          WHERE total > (SELECT total FROM venue_totals WHERE venue_id = ${venueId}))::text AS rank,
        (SELECT COUNT(*) FROM venue_totals)::text AS total
    `)).rows;

    const rank        = rankRow ? Number(rankRow.rank)  : null;
    const totalVenues = rankRow ? Number(rankRow.total) : 0;
    const percentile  = rank && totalVenues > 0
      ? Math.max(1, Math.round(100 - ((rank - 1) / totalVenues) * 100))
      : null;

    res.json({
      timeframe: tf,
      yourTopFlavor:        venueTopFlavor?.value ?? null,
      networkAvgBlendScore: networkScore?.avgScore ?? null,
      rank,
      totalVenues,
      percentile,                                            // e.g. 85 → "Top 15%"
      headline: percentile !== null
        ? `You are in the top ${100 - percentile + 1}% of lounges this week`
        : "Not enough data yet — keep building experiences",
    });
  },
);

// ── GET /api/network/venue-forecast ───────────────────────────────────────────
//
// Historical-data revenue projection for the caller's venue. Distinct from
// /api/session/forecast (which is per-session heuristic). Uses last N days
// of orders to project the next 24h / 7d. Bounded lookback (1..90 days).

router.get(
  "/venue-forecast",
  requireAuth,
  requirePremium,
  async (req: AuthRequest, res: Response) => {
    /* Tenant scoping: non-admins forecast their OWN venue only. Super
     * admins may pass ?venueId=… to forecast any venue. */
    const requested = typeof req.query.venueId === "string" ? req.query.venueId : null;
    const isAdmin   = req.user?.role === "super_admin";
    const venueId   = isAdmin ? (requested ?? req.user?.venueId ?? null) : (req.user?.venueId ?? null);

    if (!venueId) {
      res.status(400).json({ error: "User is not associated with a venue" });
      return;
    }
    if (requested && !isAdmin && requested !== venueId) {
      res.status(403).json({ error: "venue_forbidden" });
      return;
    }

    const lookbackRaw  = typeof req.query.lookbackDays === "string" ? parseInt(req.query.lookbackDays, 10) : 14;
    const lookbackDays = Number.isFinite(lookbackRaw) ? Math.max(1, Math.min(90, lookbackRaw)) : 14;

    try {
      const forecast = await computeVenueForecast(venueId, lookbackDays);
      res.json(forecast);
    } catch (err) {
      req.log.error({ err, venueId }, "venue-forecast failed");
      res.status(500).json({ error: "forecast_failed" });
    }
  },
);

// ── GET /api/network/inventory-shortages ──────────────────────────────────────
//
// Network-wide low-stock digest: products that are below reorder threshold
// at 2+ venues. Anonymized (no per-venue breakdown) so operators get a
// supplier-level signal without leaking competitor inventory. Premium-gated.

router.get(
  "/inventory-shortages",
  requireAuth,
  requirePremium,
  async (req: AuthRequest, res: Response) => {
    const thresholdRaw = typeof req.query.threshold === "string" ? parseInt(req.query.threshold, 10) : 5;
    const threshold = Number.isFinite(thresholdRaw) ? Math.max(1, Math.min(50, thresholdRaw)) : 5;

    try {
      const shortages = await computeNetworkShortages(threshold);
      // Hydrate names from registry where possible — keeps the response
      // actionable when the dashboard renders it. Fallback to the bare ID.
      const enriched = shortages.map((s) => ({
        ...s,
        name: findProduct(s.productId)?.name ?? s.productId,
      }));
      res.json({ threshold, shortages: enriched });
    } catch (err) {
      req.log.error({ err }, "inventory-shortages failed");
      res.status(500).json({ error: "shortages_failed" });
    }
  },
);

export default router;
