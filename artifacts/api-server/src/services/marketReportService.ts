/**
 * Market Report Service — privacy-safe aggregated market intelligence.
 *
 * Raw user data is NEVER returned. Only aggregated, anonymous insights
 * suitable for distribution to brand partners and distributors.
 *
 * All queries: no user_id, session_id, or device_id in response.
 */

import { db }  from "@workspace/db";
import { sql } from "drizzle-orm";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export interface MarketReport {
  generatedAt:     string;
  region:          string;
  category:        string;
  topCategories:   Array<{ category: string; total: number }>;
  flavorTrends:    Array<{ flavor: string; total: number }>;
  strengthTrends:  Array<{ strength: string; total: number }>;
  topProducts:     Array<{ product_id: string; purchases: number }>;
  sessionActivity: Array<{ hour: number; events: number }>;
  conversionBenchmarks: {
    platform_avg_conversion: number;
    platform_avg_upsell:     number;
  };
}

export async function generateMarketReport(
  region: string,
  category: string,
): Promise<MarketReport> {
  const since = daysAgo(30);

  // Build optional category filter
  const catFilter = category && category !== "ALL"
    ? sql` AND category = ${category}`
    : sql``;

  const [topCategories, flavorTrends, strengthTrends, topProducts, hourlyActivity, benchmarks] =
    await Promise.all([
      // Top categories by purchase volume (all venues, aggregated)
      db.execute(sql`
        SELECT
          COALESCE(category, 'unknown') AS category,
          COUNT(*) FILTER (WHERE event_type = 'PRODUCT_PURCHASED')::int AS total
        FROM behavior_event_logs
        WHERE created_at >= ${since}
        GROUP BY category
        ORDER BY total DESC
        LIMIT 10
      `),

      // Top flavors across platform (aggregated, no venue breakdown)
      db.execute(sql`
        SELECT
          metadata->>'flavor' AS flavor,
          COUNT(*)::int        AS total
        FROM behavior_event_logs
        WHERE event_type = 'PRODUCT_SELECTED'
          AND metadata->>'flavor' IS NOT NULL
          AND created_at >= ${since}
          ${catFilter}
        GROUP BY flavor
        ORDER BY total DESC
        LIMIT 10
      `),

      // Strength distribution
      db.execute(sql`
        SELECT
          metadata->>'strength' AS strength,
          COUNT(*)::int          AS total
        FROM behavior_event_logs
        WHERE event_type = 'PRODUCT_PURCHASED'
          AND metadata->>'strength' IS NOT NULL
          AND created_at >= ${since}
          ${catFilter}
        GROUP BY strength
        ORDER BY total DESC
        LIMIT 5
      `),

      // Top products by purchase (anonymized — no venue or user context)
      db.execute(sql`
        SELECT
          product_id,
          COUNT(*) FILTER (WHERE event_type = 'PRODUCT_PURCHASED')::int AS purchases
        FROM behavior_event_logs
        WHERE product_id IS NOT NULL
          AND created_at >= ${since}
          ${catFilter}
        GROUP BY product_id
        ORDER BY purchases DESC
        LIMIT 10
      `),

      // Hourly activity heatmap (no venue/user breakdown)
      db.execute(sql`
        SELECT
          EXTRACT(HOUR FROM created_at)::int AS hour,
          COUNT(*)::int                      AS events
        FROM behavior_event_logs
        WHERE created_at >= ${since}
        GROUP BY hour
        ORDER BY hour ASC
      `),

      // Platform-wide conversion benchmarks
      db.execute(sql`
        SELECT
          ROUND(
            CASE WHEN COUNT(*) FILTER (WHERE event_type = 'PRODUCT_VIEWED') > 0
              THEN COUNT(*) FILTER (WHERE event_type = 'PRODUCT_PURCHASED')::numeric
                   / COUNT(*) FILTER (WHERE event_type = 'PRODUCT_VIEWED') * 100
              ELSE 0 END, 1
          ) AS platform_avg_conversion,
          ROUND(
            CASE WHEN COUNT(*) FILTER (WHERE event_type = 'PRODUCT_PURCHASED') > 0
              THEN COUNT(*) FILTER (WHERE event_type = 'UPSELL_ACCEPTED')::numeric
                   / COUNT(*) FILTER (WHERE event_type = 'PRODUCT_PURCHASED') * 100
              ELSE 0 END, 1
          ) AS platform_avg_upsell
        FROM behavior_event_logs
        WHERE created_at >= ${since}
      `),
    ]);

  const bm = benchmarks.rows[0] as Record<string, unknown> | undefined;

  return {
    generatedAt:     new Date().toISOString(),
    region,
    category,
    topCategories:   topCategories.rows   as MarketReport["topCategories"],
    flavorTrends:    flavorTrends.rows    as MarketReport["flavorTrends"],
    strengthTrends:  strengthTrends.rows  as MarketReport["strengthTrends"],
    topProducts:     topProducts.rows     as MarketReport["topProducts"],
    sessionActivity: hourlyActivity.rows  as MarketReport["sessionActivity"],
    conversionBenchmarks: {
      platform_avg_conversion: Number(bm?.["platform_avg_conversion"] ?? 0),
      platform_avg_upsell:     Number(bm?.["platform_avg_upsell"]     ?? 0),
    },
  };
}
