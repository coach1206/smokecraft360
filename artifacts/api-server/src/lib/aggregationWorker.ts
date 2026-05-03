/**
 * Background aggregation worker.
 *
 * Runs every hour inside the API server process (no separate scheduler
 * required for current scale). Scans recent events + orders and rolls
 * them up into network_metrics and venue_metrics for the daily/weekly
 * timeframes the dashboard needs.
 *
 * Each run is idempotent: rows are upserted on (metricType, value, timeframe)
 * for network and (venueId, metricType, value, timeframe) for venue,
 * so re-running just refreshes the counts.
 */

import { sql }                                 from "drizzle-orm";
import {
  db,
  analyticsEventsTable,
  ordersTable,
  networkMetricsTable,
  venueMetricsTable,
}                                              from "@workspace/db";
import { logger }                              from "./logger";

const HOUR_MS = 60 * 60 * 1000;

const TIMEFRAMES = [
  { name: "daily"   as const, days: 1  },
  { name: "weekly"  as const, days: 7  },
  { name: "monthly" as const, days: 30 },
];

async function aggregateFlavors(timeframe: "daily" | "weekly" | "monthly", days: number): Promise<void> {
  const since = new Date(Date.now() - days * 24 * HOUR_MS);

  // Network: count product_selected events grouped by metadata.flavor
  // (falls back to productId where flavor is absent — still useful as a "cigar" rollup)
  const networkRows = await db.execute<{ value: string; count: string }>(sql`
    SELECT
      COALESCE(metadata->>'flavor', product_id) AS value,
      COUNT(*)::text                            AS count
    FROM analytics_events
    WHERE event_type IN ('product_selected', 'recommendation', 'swipe_right')
      AND created_at >= ${since}
      AND COALESCE(metadata->>'flavor', product_id) IS NOT NULL
    GROUP BY value
    ORDER BY count DESC
    LIMIT 50
  `);

  for (const r of networkRows) {
    await db.insert(networkMetricsTable).values({
      metricType: "flavor",
      value:      r.value,
      count:      Number(r.count),
      timeframe,
    }).onConflictDoUpdate({
      target: [networkMetricsTable.metricType, networkMetricsTable.value, networkMetricsTable.timeframe],
      set:    { count: Number(r.count), computedAt: new Date() },
    });
  }

  // Per-venue: same rollup but grouped by venue_id
  const venueRows = await db.execute<{ venue_id: string; value: string; count: string }>(sql`
    SELECT
      venue_id,
      COALESCE(metadata->>'flavor', product_id) AS value,
      COUNT(*)::text                            AS count
    FROM analytics_events
    WHERE event_type IN ('product_selected', 'recommendation', 'swipe_right')
      AND created_at >= ${since}
      AND venue_id  IS NOT NULL
      AND COALESCE(metadata->>'flavor', product_id) IS NOT NULL
    GROUP BY venue_id, value
    ORDER BY count DESC
  `);

  for (const r of venueRows) {
    await db.insert(venueMetricsTable).values({
      venueId:    r.venue_id,
      metricType: "flavor",
      value:      r.value,
      count:      Number(r.count),
      timeframe,
    }).onConflictDoUpdate({
      target: [venueMetricsTable.venueId, venueMetricsTable.metricType, venueMetricsTable.value, venueMetricsTable.timeframe],
      set:    { count: Number(r.count), computedAt: new Date() },
    });
  }
}

async function aggregateCigars(timeframe: "daily" | "weekly" | "monthly", days: number): Promise<void> {
  const since = new Date(Date.now() - days * 24 * HOUR_MS);

  const networkRows = await db.execute<{ value: string; count: string }>(sql`
    SELECT cigar_id AS value, COUNT(*)::text AS count
    FROM orders
    WHERE created_at >= ${since} AND cigar_id IS NOT NULL
    GROUP BY cigar_id
    ORDER BY count DESC
    LIMIT 30
  `);

  for (const r of networkRows) {
    await db.insert(networkMetricsTable).values({
      metricType: "cigar",
      value:      r.value,
      count:      Number(r.count),
      timeframe,
    }).onConflictDoUpdate({
      target: [networkMetricsTable.metricType, networkMetricsTable.value, networkMetricsTable.timeframe],
      set:    { count: Number(r.count), computedAt: new Date() },
    });
  }
}

async function aggregatePairings(timeframe: "daily" | "weekly" | "monthly", days: number): Promise<void> {
  const since = new Date(Date.now() - days * 24 * HOUR_MS);

  const networkRows = await db.execute<{ value: string; count: string }>(sql`
    SELECT
      cigar_name || ' + ' || drink_name AS value,
      COUNT(*)::text                    AS count
    FROM orders
    WHERE created_at >= ${since}
      AND cigar_name IS NOT NULL
      AND drink_name IS NOT NULL
    GROUP BY value
    ORDER BY count DESC
    LIMIT 20
  `);

  for (const r of networkRows) {
    await db.insert(networkMetricsTable).values({
      metricType: "pairing",
      value:      r.value,
      count:      Number(r.count),
      timeframe,
    }).onConflictDoUpdate({
      target: [networkMetricsTable.metricType, networkMetricsTable.value, networkMetricsTable.timeframe],
      set:    { count: Number(r.count), computedAt: new Date() },
    });
  }
}

async function aggregateScores(timeframe: "daily" | "weekly" | "monthly", days: number): Promise<void> {
  const since = new Date(Date.now() - days * 24 * HOUR_MS);

  // Average blendScore from analytics_events metadata where present
  const networkRows = await db.execute<{ avg_score: string; n: string }>(sql`
    SELECT
      AVG((metadata->>'blendScore')::float)::text AS avg_score,
      COUNT(*)::text                              AS n
    FROM analytics_events
    WHERE event_type = 'recommendation'
      AND created_at >= ${since}
      AND metadata->>'blendScore' IS NOT NULL
  `);

  const row = networkRows[0];
  if (row?.avg_score) {
    await db.insert(networkMetricsTable).values({
      metricType: "score",
      value:      "avg_blend_score",
      count:      Number(row.n),
      avgScore:   Number(row.avg_score),
      timeframe,
    }).onConflictDoUpdate({
      target: [networkMetricsTable.metricType, networkMetricsTable.value, networkMetricsTable.timeframe],
      set:    {
        count:      Number(row.n),
        avgScore:   Number(row.avg_score),
        computedAt: new Date(),
      },
    });
  }
}

let running = false;

export async function runAggregation(): Promise<void> {
  if (running) {
    logger.warn("aggregation worker skipped: previous run still in progress");
    return;
  }
  running = true;
  const start = Date.now();
  try {
    for (const { name, days } of TIMEFRAMES) {
      await aggregateFlavors(name, days);
      await aggregateCigars(name, days);
      await aggregatePairings(name, days);
      await aggregateScores(name, days);
    }
    logger.info({ ms: Date.now() - start }, "aggregation worker complete");
  } catch (err) {
    logger.error({ err }, "aggregation worker failed");
  } finally {
    running = false;
  }
}

let interval: NodeJS.Timeout | null = null;

export function startAggregationWorker(): void {
  if (interval) return;
  // Run once at startup (after a brief delay so server is ready), then hourly
  setTimeout(() => { void runAggregation(); }, 10_000);
  interval = setInterval(() => { void runAggregation(); }, HOUR_MS);
  logger.info("aggregation worker scheduled (hourly)");
}

export function stopAggregationWorker(): void {
  if (interval) clearInterval(interval);
  interval = null;
}

// Reference unused imports to satisfy lint
void analyticsEventsTable; void ordersTable;
