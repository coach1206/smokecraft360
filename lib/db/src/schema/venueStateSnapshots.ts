import {
  pgTable, uuid, text, real, integer,
  timestamp, jsonb, index, boolean,
} from "drizzle-orm/pg-core";

export const venueStateSnapshotsTable = pgTable(
  "venue_state_snapshots",
  {
    id:            uuid("id").primaryKey().defaultRandom(),
    venueId:       text("venue_id").notNull(),
    snapshotType:  text("snapshot_type").notNull().default("periodic"),
    state:         jsonb("state").$type<Record<string, unknown>>().notNull().default({}),
    version:       integer("version").notNull().default(1),
    checksum:      text("checksum"),
    capturedBy:    text("captured_by").notNull().default("system"),
    rollbackTarget:boolean("rollback_target").notNull().default(false),
    expiresAt:     timestamp("expires_at"),
    createdAt:     timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("vss_venue_idx").on(t.venueId),
    index("vss_type_idx").on(t.snapshotType),
    index("vss_created_idx").on(t.createdAt),
    index("vss_rollback_idx").on(t.rollbackTarget),
  ],
);

export type VenueStateSnapshot       = typeof venueStateSnapshotsTable.$inferSelect;
export type InsertVenueStateSnapshot = typeof venueStateSnapshotsTable.$inferInsert;
