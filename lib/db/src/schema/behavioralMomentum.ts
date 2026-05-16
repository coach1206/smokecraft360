import {
  pgTable, uuid, text, real,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const behavioralMomentumTable = pgTable(
  "behavioral_momentum",
  {
    id:               uuid("id").primaryKey().defaultRandom(),
    venueId:          text("venue_id").notNull(),
    guestId:          text("guest_id"),
    momentumType:     text("momentum_type").notNull(),
    momentum:         real("momentum").notNull().default(0),
    velocity:         real("velocity").notNull().default(0),
    acceleration:     real("acceleration").notNull().default(0),
    trend:            text("trend").notNull().default("stable"),
    peakMomentum:     real("peak_momentum"),
    troughMomentum:   real("trough_momentum"),
    halfLifeSeconds:  real("half_life_seconds").notNull().default(1800),
    drivers:          jsonb("drivers").$type<Record<string, number>>().default({}),
    inhibitors:       jsonb("inhibitors").$type<Record<string, number>>().default({}),
    validUntil:       timestamp("valid_until"),
    updatedAt:        timestamp("updated_at").notNull().defaultNow(),
    createdAt:        timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("bm_venue_idx").on(t.venueId),
    index("bm_guest_idx").on(t.guestId),
    index("bm_type_idx").on(t.momentumType),
    index("bm_trend_idx").on(t.trend),
  ],
);

export type BehavioralMomentum       = typeof behavioralMomentumTable.$inferSelect;
export type InsertBehavioralMomentum = typeof behavioralMomentumTable.$inferInsert;
