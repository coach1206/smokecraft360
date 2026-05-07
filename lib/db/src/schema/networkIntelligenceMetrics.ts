/**
 * network_intelligence_metrics — real-time venue/region-level intelligence layer.
 *
 * Tracks macro flavor-profile shifts (e.g. "Smoky" trending up in region "DR-North"),
 * emotional velocity (rate of engagement intensity change), and timestamps every
 * observation so the AI Orchestrator can detect momentum before it peaks.
 *
 * Populated by the predictiveOrchestrator service on each analysis cycle.
 * venueId is nullable — a null row represents a network-wide signal with no
 * single-venue attribution.
 */

import { pgTable, uuid, text, real, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type FlavorProfileTrend = {
  label: string;   // e.g. "Smoky", "Floral", "Prestige"
  delta: number;   // signed shift: +0.12 = trending up 12 %
  baseline: number;
  updatedAt: string;
};

export const networkIntelligenceMetricsTable = pgTable(
  "network_intelligence_metrics",
  {
    id:                  uuid("id").primaryKey().defaultRandom(),
    venueId:             uuid("venue_id"),
    regionId:            text("region_id"),
    flavorProfileTrend:  jsonb("flavor_profile_trend")
      .$type<FlavorProfileTrend[]>()
      .default([]),
    emotionalVelocity:   real("emotional_velocity"),
    timestamp:           timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    venueIdx:   index("nim_venue_idx").on(t.venueId),
    regionIdx:  index("nim_region_idx").on(t.regionId),
    timeIdx:    index("nim_timestamp_idx").on(t.timestamp),
  }),
);

export const insertNetworkIntelligenceMetricSchema = createInsertSchema(
  networkIntelligenceMetricsTable,
).omit({ id: true, timestamp: true });

export type InsertNetworkIntelligenceMetric = z.infer<typeof insertNetworkIntelligenceMetricSchema>;
export type NetworkIntelligenceMetric       = typeof networkIntelligenceMetricsTable.$inferSelect;
