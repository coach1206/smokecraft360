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
    const [rankRow] = await db.execute<{ rank: string; total: string }>(sql`
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
    `);

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

export default router;
