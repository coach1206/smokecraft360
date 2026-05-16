import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const posTokensTable = pgTable("pos_tokens", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  connectionId:         uuid("connection_id").notNull(),
  venueId:              uuid("venue_id").notNull(),
  provider:             text("provider").notNull(),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token"),
  encryptedApiSecret:   text("encrypted_api_secret"),
  tokenType:            text("token_type").notNull().default("Bearer"),
  scopes:               text("scopes"),
  expiresAt:            timestamp("expires_at"),
  refreshExpiresAt:     timestamp("refresh_expires_at"),
  isRevoked:            boolean("is_revoked").notNull().default(false),
  lastRefreshedAt:      timestamp("last_refreshed_at"),
  createdAt:            timestamp("created_at").notNull().defaultNow(),
  updatedAt:            timestamp("updated_at").notNull().defaultNow(),
});
