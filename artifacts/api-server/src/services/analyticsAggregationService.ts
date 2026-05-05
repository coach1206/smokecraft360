/**
 * Analytics aggregation service — all queries run against behavior_event_logs.
 * Every function is venue-scoped and returns real DB data, never mocks.
 */

import { db }  from "@workspace/db";
import { sql } from "drizzle-orm";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ── Overview KPIs ─────────────────────────────────────────────────────────────

export async function getVenueAnalytics(venueId: string, days = 30) {
  const since = daysAgo(days);
  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'SESSION_START')        AS total_sessions,
      COUNT(*) FILTER (WHERE event_type = 'PRODUCT_VIEWED')       AS product_views,
      COUNT(*) FILTER (WHERE event_type = 'PRODUCT_SELECTED')     AS product_selections,
      COUNT(*) FILTER (WHERE event_type = 'PRODUCT_PURCHASED')    AS purchases,
      COUNT(*) FILTER (WHERE event_type = 'UPSELL_ACCEPTED')      AS upsells,
      COUNT(*) FILTER (WHERE event_type = 'LOYALTY_USED')         AS loyalty_uses,
      COUNT(DISTINCT session_id)                                  AS unique_sessions,
      ROUND(
        CASE WHEN COUNT(*) FILTER (WHERE event_type = 'PRODUCT_VIEWED') > 0
          THEN COUNT(*) FILTER (WHERE event_type = 'PRODUCT_PURCHASED')::numeric
             / COUNT(*) FILTER (WHERE event_type = 'PRODUCT_VIEWED') * 100
          ELSE 0
        END, 1
      ) AS conversion_rate,
      ROUND(
        CASE WHEN COUNT(*) FILTER (WHERE event_type = 'PRODUCT_PURCHASED') > 0
          THEN COUNT(*) FILTER (WHERE event_type = 'UPSELL_ACCEPTED')::numeric
             / COUNT(*) FILTER (WHERE event_type = 'PRODUCT_PURCHASED') * 100
          ELSE 0
        END, 1
      ) AS upsell_rate
    FROM behavior_event_logs
    WHERE venue_id = ${venueId}
      AND created_at >= ${since}
  `);
  return result.rows[0] ?? {};
}

// ── Revenue from orders table ─────────────────────────────────────────────────

export async function getRevenueOverview(venueId: string, days = 30) {
  const since = daysAgo(days);
  const result = await db.execute(sql`
    SELECT
      COUNT(*)::int                                       AS order_count,
      COALESCE(SUM(expected_amount_cents), 0)::int        AS total_revenue_cents,
      COALESCE(AVG(expected_amount_cents), 0)::int        AS avg_order_cents,
      COALESCE(MAX(expected_amount_cents), 0)::int        AS max_order_cents
    FROM orders
    WHERE venue_id = ${venueId}
      AND created_at >= ${since}
      AND status NOT IN ('cancelled', 'refunded')
  `);
  return result.rows[0] ?? {};
}

// ── Daily revenue trend ───────────────────────────────────────────────────────

export async function getDailyRevenueTrend(venueId: string, days = 30) {
  const since = daysAgo(days);
  const result = await db.execute(sql`
    SELECT
      DATE_TRUNC('day', created_at)::date              AS day,
      COUNT(*)::int                                    AS orders,
      COALESCE(SUM(expected_amount_cents), 0)::int     AS revenue_cents
    FROM orders
    WHERE venue_id = ${venueId}
      AND created_at >= ${since}
      AND status NOT IN ('cancelled', 'refunded')
    GROUP BY day
    ORDER BY day ASC
  `);
  return result.rows;
}

// ── Top products by purchase count ────────────────────────────────────────────

export async function getTopProducts(venueId: string, limit = 10, days = 30) {
  const since = daysAgo(days);
  const result = await db.execute(sql`
    SELECT
      product_id,
      COUNT(*) FILTER (WHERE event_type = 'PRODUCT_VIEWED')    AS views,
      COUNT(*) FILTER (WHERE event_type = 'PRODUCT_SELECTED')  AS selections,
      COUNT(*) FILTER (WHERE event_type = 'PRODUCT_PURCHASED') AS purchases
    FROM behavior_event_logs
    WHERE venue_id = ${venueId}
      AND product_id IS NOT NULL
      AND created_at >= ${since}
    GROUP BY product_id
    ORDER BY purchases DESC, selections DESC
    LIMIT ${limit}
  `);
  return result.rows;
}

// ── Flavor profile trends ─────────────────────────────────────────────────────

export async function getFlavorTrends(venueId: string, days = 30) {
  const since = daysAgo(days);
  const result = await db.execute(sql`
    SELECT
      metadata->>'flavor' AS flavor,
      COUNT(*)::int        AS count
    FROM behavior_event_logs
    WHERE venue_id       = ${venueId}
      AND event_type     = 'PRODUCT_SELECTED'
      AND metadata->>'flavor' IS NOT NULL
      AND created_at    >= ${since}
    GROUP BY flavor
    ORDER BY count DESC
    LIMIT 10
  `);
  return result.rows;
}

// ── Strength profile trends ────────────────────────────────────────────────────

export async function getStrengthTrends(venueId: string, days = 30) {
  const since = daysAgo(days);
  const result = await db.execute(sql`
    SELECT
      metadata->>'strength' AS strength,
      COUNT(*)::int          AS count
    FROM behavior_event_logs
    WHERE venue_id       = ${venueId}
      AND event_type     = 'PRODUCT_PURCHASED'
      AND metadata->>'strength' IS NOT NULL
      AND created_at    >= ${since}
    GROUP BY strength
    ORDER BY count DESC
    LIMIT 10
  `);
  return result.rows;
}

// ── Category breakdown ─────────────────────────────────────────────────────────

export async function getCategoryBreakdown(venueId: string, days = 30) {
  const since = daysAgo(days);
  const result = await db.execute(sql`
    SELECT
      COALESCE(category, 'unknown') AS category,
      COUNT(*) FILTER (WHERE event_type = 'PRODUCT_PURCHASED') AS purchases,
      COUNT(*) FILTER (WHERE event_type = 'PRODUCT_VIEWED')    AS views
    FROM behavior_event_logs
    WHERE venue_id    = ${venueId}
      AND created_at >= ${since}
    GROUP BY category
    ORDER BY purchases DESC
  `);
  return result.rows;
}

// ── Hourly activity heatmap ────────────────────────────────────────────────────

export async function getHourlyActivity(venueId: string, days = 30) {
  const since = daysAgo(days);
  const result = await db.execute(sql`
    SELECT
      EXTRACT(HOUR FROM created_at)::int AS hour,
      COUNT(*)::int                      AS events
    FROM behavior_event_logs
    WHERE venue_id    = ${venueId}
      AND created_at >= ${since}
    GROUP BY hour
    ORDER BY hour ASC
  `);
  return result.rows;
}

// ── Session funnel ─────────────────────────────────────────────────────────────

export async function getSessionFunnel(venueId: string, days = 30) {
  const since = daysAgo(days);
  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'SESSION_START')     AS started,
      COUNT(*) FILTER (WHERE event_type = 'PRODUCT_VIEWED')    AS engaged,
      COUNT(*) FILTER (WHERE event_type = 'PRODUCT_SELECTED')  AS selected,
      COUNT(*) FILTER (WHERE event_type = 'PRODUCT_PURCHASED') AS converted,
      COUNT(*) FILTER (WHERE event_type = 'UPSELL_ACCEPTED')   AS upsold
    FROM behavior_event_logs
    WHERE venue_id    = ${venueId}
      AND created_at >= ${since}
  `);
  return result.rows[0] ?? {};
}
