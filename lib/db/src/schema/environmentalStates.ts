import {
  pgTable, uuid, text, real,
  timestamp, jsonb, boolean, index,
} from "drizzle-orm/pg-core";

export const environmentalStatesTable = pgTable(
  "environmental_states",
  {
    id:               uuid("id").primaryKey().defaultRandom(),
    venueId:          uuid("venue_id").notNull(),
    sceneId:          text("scene_id").notNull(),
    sceneName:        text("scene_name").notNull(),
    lightingPreset:   text("lighting_preset").notNull().default("warm"),
    musicGenre:       text("music_genre"),
    musicTempo:       text("music_tempo").notNull().default("moderate"),
    musicVolume:      real("music_volume").notNull().default(0.5),
    scentProfile:     text("scent_profile"),
    temperature:      real("temperature"),
    crowdDensity:     real("crowd_density").notNull().default(0),
    moodScore:        real("mood_score").notNull().default(0.5),
    atmosphereIndex:  real("atmosphere_index").notNull().default(0.5),
    isActive:         boolean("is_active").notNull().default(true),
    triggeredBy:      text("triggered_by").notNull().default("system"),
    effectivenessScore:real("effectiveness_score"),
    metadata:         jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    activatedAt:      timestamp("activated_at").notNull().defaultNow(),
    deactivatedAt:    timestamp("deactivated_at"),
  },
  (t) => [
    index("es_venue_idx").on(t.venueId, t.activatedAt),
    index("es_active_idx").on(t.venueId, t.isActive),
    index("es_scene_idx").on(t.venueId, t.sceneId),
  ],
);

export type EnvironmentalState       = typeof environmentalStatesTable.$inferSelect;
export type InsertEnvironmentalState = typeof environmentalStatesTable.$inferInsert;
