import {
  pgTable, uuid, text, real, integer, boolean,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const environmentalContextTable = pgTable(
  "environmental_context",
  {
    id:                uuid("id").primaryKey().defaultRandom(),
    venueId:           text("venue_id").notNull(),
    lightingLevel:     real("lighting_level").notNull().default(0.7),
    lightingColor:     text("lighting_color").notNull().default("warm-amber"),
    soundLevel:        real("sound_level").notNull().default(0.5),
    soundGenre:        text("sound_genre").notNull().default("jazz"),
    temperature:       real("temperature"),
    humidity:          real("humidity"),
    crowdDensity:      real("crowd_density").notNull().default(0),
    noiseLevel:        real("noise_level").notNull().default(0),
    sceneId:           text("scene_id"),
    sceneName:         text("scene_name"),
    moodLabel:         text("mood_label").notNull().default("relaxed"),
    atmosphereScore:   real("atmosphere_score").notNull().default(0.5),
    isOptimal:         boolean("is_optimal").notNull().default(false),
    optimizedAt:       timestamp("optimized_at"),
    effectivenessScore:real("effectiveness_score").notNull().default(0),
    raw:               jsonb("raw").$type<Record<string, unknown>>().default({}),
    updatedAt:         timestamp("updated_at").notNull().defaultNow(),
    createdAt:         timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("ec_venue_idx").on(t.venueId),
    index("ec_scene_idx").on(t.sceneId),
    index("ec_mood_idx").on(t.moodLabel),
    index("ec_updated_idx").on(t.updatedAt),
  ],
);

export type EnvironmentalContext       = typeof environmentalContextTable.$inferSelect;
export type InsertEnvironmentalContext = typeof environmentalContextTable.$inferInsert;
