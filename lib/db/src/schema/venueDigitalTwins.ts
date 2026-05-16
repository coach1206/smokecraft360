import {
  pgTable, uuid, text, real, integer, boolean,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const venueDigitalTwinsTable = pgTable(
  "venue_digital_twins",
  {
    id:                  uuid("id").primaryKey().defaultRandom(),
    venueId:             text("venue_id").notNull(),
    modelVersion:        integer("model_version").notNull().default(1),
    guestMap:            jsonb("guest_map").$type<Record<string, unknown>>().default({}),
    deviceMap:           jsonb("device_map").$type<Record<string, unknown>>().default({}),
    inventorySnapshot:   jsonb("inventory_snapshot").$type<Record<string, unknown>>().default({}),
    trafficHeatmap:      jsonb("traffic_heatmap").$type<number[][]>().default([]),
    engagementZones:     jsonb("engagement_zones").$type<Record<string, unknown>>().default({}),
    environmentalState:  jsonb("environmental_state").$type<Record<string, unknown>>().default({}),
    orchestrationStatus: jsonb("orchestration_status").$type<Record<string, unknown>>().default({}),
    predictedNextState:  jsonb("predicted_next_state").$type<Record<string, unknown>>(),
    simulationRunning:   boolean("simulation_running").notNull().default(false),
    lastSimulationAt:    timestamp("last_simulation_at"),
    syncHealth:          real("sync_health").notNull().default(1.0),
    staleSince:          timestamp("stale_since"),
    updatedAt:           timestamp("updated_at").notNull().defaultNow(),
    createdAt:           timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("vdt_venue_idx").on(t.venueId),
    index("vdt_updated_idx").on(t.updatedAt),
    index("vdt_version_idx").on(t.venueId, t.modelVersion),
  ],
);

export type VenueDigitalTwin       = typeof venueDigitalTwinsTable.$inferSelect;
export type InsertVenueDigitalTwin = typeof venueDigitalTwinsTable.$inferInsert;
