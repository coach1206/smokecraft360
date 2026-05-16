import {
  pgTable, uuid, text, real, integer,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const ambientSceneHistoryTable = pgTable(
  "ambient_scene_history",
  {
    id:              uuid("id").primaryKey().defaultRandom(),
    venueId:         text("venue_id").notNull(),
    sceneId:         text("scene_id").notNull(),
    sceneName:       text("scene_name").notNull(),
    craftType:       text("craft_type"),
    lightingProfile: jsonb("lighting_profile").$type<Record<string, unknown>>().default({}),
    soundProfile:    jsonb("sound_profile").$type<Record<string, unknown>>().default({}),
    moodScore:       real("mood_score").notNull().default(0.5),
    engagementDelta: real("engagement_delta"),
    conversionDelta: real("conversion_delta"),
    durationSeconds: integer("duration_seconds"),
    triggeredBy:     text("triggered_by").notNull().default("system"),
    decisionId:      uuid("decision_id"),
    endedAt:         timestamp("ended_at"),
    createdAt:       timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("ash_venue_idx").on(t.venueId),
    index("ash_scene_idx").on(t.sceneId),
    index("ash_created_idx").on(t.createdAt),
    index("ash_craft_idx").on(t.craftType),
  ],
);

export type AmbientSceneHistory       = typeof ambientSceneHistoryTable.$inferSelect;
export type InsertAmbientSceneHistory = typeof ambientSceneHistoryTable.$inferInsert;
