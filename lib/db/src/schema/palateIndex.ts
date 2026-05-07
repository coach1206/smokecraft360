/**
 * palate_index_snapshots — B2B flavor intelligence snapshots for brand partners.
 *
 * Aggregated hourly by the sentiment engine from analyticsEvents and
 * adImpressions. Each row is a regional taste-trend snapshot that brand
 * partners can query via the Manufacturer War Room B2B dashboard.
 *
 * Used for:
 *   - Real-time consumer taste trend visualization
 *   - Regional pairing shift heatmaps
 *   - Nudge-bidding auto-trigger (is_trending = true → bid engine activates)
 */

import { pgTable, uuid, text, real, boolean, integer, timestamp, index, jsonb } from "drizzle-orm/pg-core";

export const palateIndexSnapshotsTable = pgTable(
  "palate_index_snapshots",
  {
    id:              uuid("id").primaryKey().defaultRandom(),
    region:          text("region").notNull().default("GLOBAL"),
    craftType:       text("craft_type").notNull(),
    flavorTag:       text("flavor_tag").notNull(),
    trendScore:      real("trend_score").notNull().default(0),
    sampleSize:      integer("sample_size").notNull().default(0),
    isTrending:      boolean("is_trending").notNull().default(false),
    deltaVsPrevHour: real("delta_vs_prev_hour").notNull().default(0),
    topBrands:       jsonb("top_brands").$type<string[]>().default([]),
    topProducts:     jsonb("top_products").$type<string[]>().default([]),
    snapshotHour:    timestamp("snapshot_hour").notNull(),
    createdAt:       timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_palate_region_craft_hour").on(t.region, t.craftType, t.snapshotHour),
    index("idx_palate_trending").on(t.isTrending, t.craftType),
  ],
);

export type PalateIndexSnapshot     = typeof palateIndexSnapshotsTable.$inferSelect;
export type InsertPalateIndexSnapshot = typeof palateIndexSnapshotsTable.$inferInsert;
