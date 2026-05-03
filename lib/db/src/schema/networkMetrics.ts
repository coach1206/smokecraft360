/**
 * Network-wide and per-venue metric aggregations.
 *
 * Populated by the aggregationWorker (runs hourly) which scans
 * analytics_events, orders, and user_preferences and rolls them up
 * by metricType + timeframe.
 *
 * Two tables:
 *   networkMetricsTable — anonymous, aggregated across ALL venues
 *   venueMetricsTable   — per-venue rollup (private; only the venue + super_admin sees it)
 *
 * Cleared and re-inserted by the worker on each run for the rolling
 * timeframe, so a UNIQUE on (metricType, value, timeframe) prevents
 * duplicates within a single network rollup.
 */

import { pgTable, uuid, text, integer, timestamp, real, unique } from "drizzle-orm/pg-core";

export const METRIC_TIMEFRAMES = ["daily", "weekly", "monthly"] as const;
export type MetricTimeframe = typeof METRIC_TIMEFRAMES[number];

export const METRIC_TYPES = [
  "flavor",
  "cigar",
  "pairing",
  "score",
  "conversion",
] as const;
export type MetricType = typeof METRIC_TYPES[number];

export const networkMetricsTable = pgTable(
  "network_metrics",
  {
    id:         uuid("id").primaryKey().defaultRandom(),
    metricType: text("metric_type").notNull().$type<MetricType>(),
    value:      text("value").notNull(),                  // e.g. "cedar", "Robusto Maduro", "92"
    count:      integer("count").notNull().default(0),
    avgScore:   real("avg_score"),                        // optional avg for score-type metrics
    timeframe:  text("timeframe").notNull().$type<MetricTimeframe>(),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqMetric: unique("network_metrics_type_value_timeframe_unique").on(t.metricType, t.value, t.timeframe),
  }),
);

export const venueMetricsTable = pgTable(
  "venue_metrics",
  {
    id:         uuid("id").primaryKey().defaultRandom(),
    venueId:    uuid("venue_id").notNull(),
    metricType: text("metric_type").notNull().$type<MetricType>(),
    value:      text("value").notNull(),
    count:      integer("count").notNull().default(0),
    avgScore:   real("avg_score"),
    timeframe:  text("timeframe").notNull().$type<MetricTimeframe>(),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqMetric: unique("venue_metrics_venue_type_value_timeframe_unique").on(
      t.venueId, t.metricType, t.value, t.timeframe,
    ),
  }),
);

export type DbNetworkMetric = typeof networkMetricsTable.$inferSelect;
export type DbVenueMetric   = typeof venueMetricsTable.$inferSelect;
