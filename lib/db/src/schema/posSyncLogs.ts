import { pgTable, uuid, text, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";

export const syncTypeEnum = pgEnum("pos_sync_type", [
  "inventory", "products", "orders", "menu", "full",
]);

export const syncStatusEnum = pgEnum("pos_sync_status", [
  "success", "partial", "failed", "skipped",
]);

export const posSyncLogsTable = pgTable("pos_sync_logs", {
  id:            uuid("id").primaryKey().defaultRandom(),
  connectionId:  uuid("connection_id").notNull(),
  venueId:       uuid("venue_id").notNull(),
  provider:      text("provider").notNull(),
  syncType:      syncTypeEnum("sync_type").notNull(),
  status:        syncStatusEnum("status").notNull(),
  itemCount:     integer("item_count").notNull().default(0),
  durationMs:    integer("duration_ms"),
  errorMessage:  text("error_message"),
  triggeredBy:   text("triggered_by").notNull().default("background"),
  isForced:      boolean("is_forced").notNull().default(false),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});
