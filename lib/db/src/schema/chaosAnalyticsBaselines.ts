/**
 * chaos_analytics_baselines — Phase 0: Neural Substrate.
 *
 * Computed baseline metrics per venue, representing the
 * "un-managed" state before AXIOM OS takes control.
 *
 * The gap between these baseline values and live metrics
 * defines the measurable lift AXIOM OS delivers.
 * Recalculated by ChaosAnalyticsService on a rolling window.
 */

import { pgTable, uuid, text, timestamp, jsonb, real, integer, index } from "drizzle-orm/pg-core";

export const chaosAnalyticsBaselinesTable = pgTable("chaos_analytics_baselines", {
  id:      uuid("id").primaryKey().defaultRandom(),
  venueId: uuid("venue_id").notNull(),

  windowDays:            integer("window_days").notNull().default(7),

  avgSessionDurationMs:  real("avg_session_duration_ms"),
  avgInteractionsPerSession: real("avg_interactions_per_session"),
  avgHesitationMs:       real("avg_hesitation_ms"),
  conversionRate:        real("conversion_rate"),
  abandonmentRate:       real("abandonment_rate"),
  avgDwellMs:            real("avg_dwell_ms"),

  rawEventCount:         integer("raw_event_count").notNull().default(0),

  axiomLiftConversion:   real("axiom_lift_conversion"),
  axiomLiftEngagement:   real("axiom_lift_engagement"),
  axiomLiftRetention:    real("axiom_lift_retention"),

  distributionData:      jsonb("distribution_data").$type<Record<string, unknown>>(),

  computedAt:  timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  periodStart: timestamp("period_start", { withTimezone: true }),
  periodEnd:   timestamp("period_end",   { withTimezone: true }),
}, t => ({
  byVenue:  index("cab_venue_idx").on(t.venueId),
  byWindow: index("cab_window_idx").on(t.venueId, t.windowDays),
}));

export type ChaosAnalyticsBaseline      = typeof chaosAnalyticsBaselinesTable.$inferSelect;
export type InsertChaosAnalyticsBaseline = typeof chaosAnalyticsBaselinesTable.$inferInsert;
