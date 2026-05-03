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

import { sql, and, eq, lt, isNull, or }        from "drizzle-orm";
import {
  db,
  analyticsEventsTable,
  ordersTable,
  networkMetricsTable,
  venueMetricsTable,
  subscriptionsTable,
  dunningEventsTable,
  notificationsTable,
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
  const networkRows = (await db.execute<{ value: string; count: string }>(sql`
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
  `)).rows;

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
  const venueRows = (await db.execute<{ venue_id: string; value: string; count: string }>(sql`
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
  `)).rows;

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

  const networkRows = (await db.execute<{ value: string; count: string }>(sql`
    SELECT cigar_id AS value, COUNT(*)::text AS count
    FROM orders
    WHERE created_at >= ${since} AND cigar_id IS NOT NULL
    GROUP BY cigar_id
    ORDER BY count DESC
    LIMIT 30
  `)).rows;

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

  const networkRows = (await db.execute<{ value: string; count: string }>(sql`
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
  `)).rows;

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
  const networkRows = (await db.execute<{ avg_score: string; n: string }>(sql`
    SELECT
      AVG((metadata->>'blendScore')::float)::text AS avg_score,
      COUNT(*)::text                              AS n
    FROM analytics_events
    WHERE event_type = 'recommendation'
      AND created_at >= ${since}
      AND metadata->>'blendScore' IS NOT NULL
  `)).rows;

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

/**
 * Reconciliation pass — payment/subscription cleanup.
 *
 * Finds every subscription stuck in `past_due` whose grace window has
 * expired (and which has not been admin-overridden) and flips it to
 * `canceled`. Writes a dunning event + in-app notification so the venue
 * owner sees the state change in their inbox.
 *
 * Idempotent: only acts on rows still in past_due. Re-running is safe.
 */
async function reconcileExpiredGrace(): Promise<number> {
  const now = new Date();
  const expired = await db
    .select()
    .from(subscriptionsTable)
    .where(and(
      eq(subscriptionsTable.status, "past_due"),
      eq(subscriptionsTable.adminOverride, false),
      // gracePeriodEndsAt is set AND in the past
      lt(subscriptionsTable.gracePeriodEndsAt, now),
    ));

  let canceled = 0;
  for (const sub of expired) {
    try {
      // Atomic guarded update: re-assert all selection criteria in WHERE so
      // a concurrent payment success / admin override / status change between
      // SELECT and UPDATE wins the race. Only emit dunning + notification
      // if THIS pass actually flipped the row.
      const flipped = await db.update(subscriptionsTable)
        .set({ status: "canceled", updatedAt: now })
        .where(and(
          eq(subscriptionsTable.id, sub.id),
          eq(subscriptionsTable.status, "past_due"),
          eq(subscriptionsTable.adminOverride, false),
          lt(subscriptionsTable.gracePeriodEndsAt, now),
        ))
        .returning({ id: subscriptionsTable.id });
      if (flipped.length === 0) continue;

      await db.insert(dunningEventsTable).values({
        venueId:   sub.venueId,
        type:      "canceled",
        metadata:  { reason: "grace_expired", subscriptionId: sub.id },
      });

      await db.insert(notificationsTable).values({
        venueId:  sub.venueId,
        channel:  "in_app",
        title:    "Service Paused",
        message:  "Your grace period has ended without a successful payment. Renew anytime to restore service.",
        category: "canceled",
        status:   "sent",
      }).catch(() => { /* notifications are best-effort */ });

      canceled++;
    } catch (err) {
      logger.error({ err, subId: sub.id }, "Failed to reconcile expired subscription");
    }
  }
  // Reference imports the linter would otherwise flag.
  void isNull; void or;
  return canceled;
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
    const canceled = await reconcileExpiredGrace();
    logger.info({ ms: Date.now() - start, expiredSubsCanceled: canceled }, "aggregation + reconciliation complete");
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
