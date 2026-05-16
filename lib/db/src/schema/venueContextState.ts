import {
  pgTable, uuid, text, real, integer, boolean,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const venueContextStateTable = pgTable(
  "venue_context_state",
  {
    id:                   uuid("id").primaryKey().defaultRandom(),
    venueId:              text("venue_id").notNull(),
    activeGuests:         integer("active_guests").notNull().default(0),
    activeSessions:       integer("active_sessions").notNull().default(0),
    activeDevices:        integer("active_devices").notNull().default(0),
    engagementLevel:      real("engagement_level").notNull().default(0.5),
    socialEnergy:         real("social_energy").notNull().default(0.5),
    moodScore:            real("mood_score").notNull().default(0.5),
    vipCount:             integer("vip_count").notNull().default(0),
    operationalLoad:      real("operational_load").notNull().default(0),
    inventoryPressure:    real("inventory_pressure").notNull().default(0),
    ambientScene:         text("ambient_scene"),
    lightingProfile:      text("lighting_profile"),
    soundProfile:         text("sound_profile"),
    trafficTrend:         text("traffic_trend").notNull().default("stable"),
    revenueMomentum:      real("revenue_momentum").notNull().default(0),
    contextConfidence:    real("context_confidence").notNull().default(0),
    orchestrationActive:  boolean("orchestration_active").notNull().default(true),
    anomalyDetected:      boolean("anomaly_detected").notNull().default(false),
    anomalyDetails:       jsonb("anomaly_details").$type<Record<string, unknown>>(),
    snapshot:             jsonb("snapshot").$type<Record<string, unknown>>().default({}),
    updatedAt:            timestamp("updated_at").notNull().defaultNow(),
    createdAt:            timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("vcs_venue_idx").on(t.venueId),
    index("vcs_updated_idx").on(t.updatedAt),
    index("vcs_engagement_idx").on(t.engagementLevel),
  ],
);

export type VenueContextState       = typeof venueContextStateTable.$inferSelect;
export type InsertVenueContextState = typeof venueContextStateTable.$inferInsert;
