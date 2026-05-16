import {
  pgTable, uuid, text, real, integer, boolean,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const aiBehaviorMemoryTable = pgTable(
  "ai_behavior_memory",
  {
    id:             uuid("id").primaryKey().defaultRandom(),
    venueId:        text("venue_id").notNull(),
    guestId:        text("guest_id").notNull(),
    craftType:      text("craft_type").notNull().default("smoke"),
    eventType:      text("event_type").notNull(),
    productId:      text("product_id"),
    affinityDelta:  real("affinity_delta").notNull().default(0),
    confidence:     real("confidence").notNull().default(0.5),
    decayFactor:    real("decay_factor").notNull().default(1.0),
    tags:           jsonb("tags").$type<string[]>().default([]),
    context:        jsonb("context").$type<Record<string, unknown>>().default({}),
    sessionId:      text("session_id"),
    isReplayed:     boolean("is_replayed").notNull().default(false),
    replayOf:       uuid("replay_of"),
    createdAt:      timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("abm_venue_idx").on(t.venueId),
    index("abm_guest_idx").on(t.guestId),
    index("abm_craft_idx").on(t.craftType),
    index("abm_created_idx").on(t.createdAt),
  ],
);

export type AiBehaviorMemory       = typeof aiBehaviorMemoryTable.$inferSelect;
export type InsertAiBehaviorMemory = typeof aiBehaviorMemoryTable.$inferInsert;
