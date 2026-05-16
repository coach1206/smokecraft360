import { pgTable, uuid, text, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const posProviderEnum = pgEnum("pos_provider", [
  "clover", "toast", "square", "lightspeed", "shopify", "ncr", "micros", "manual_import",
]);

export const posConnectionStatusEnum = pgEnum("pos_connection_status", [
  "active", "inactive", "error", "pending_auth",
]);

export const posConnectionsTable = pgTable("pos_connections", {
  id:           uuid("id").primaryKey().defaultRandom(),
  venueId:      uuid("venue_id").notNull(),
  provider:     posProviderEnum("provider").notNull(),
  status:       posConnectionStatusEnum("status").notNull().default("pending_auth"),
  displayName:  text("display_name").notNull().default(""),
  merchantId:   text("merchant_id"),
  locationId:   text("location_id"),
  webhookUrl:   text("webhook_url"),
  meta:         jsonb("meta").$type<Record<string, unknown>>().default({}),
  lastSyncAt:   timestamp("last_sync_at"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
  createdBy:    uuid("created_by"),
  isDefault:    boolean("is_default").notNull().default(false),
});
