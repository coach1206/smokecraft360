import { pgTable, uuid, text, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";

export const healthCheckTypeEnum = pgEnum("pos_health_check_type", [
  "connectivity", "auth", "sync", "webhook", "token_expiry",
]);

export const healthResultEnum = pgEnum("pos_health_result", [
  "healthy", "degraded", "offline", "unconfigured",
]);

export const posHealthLogsTable = pgTable("pos_health_logs", {
  id:              uuid("id").primaryKey().defaultRandom(),
  connectionId:    uuid("connection_id").notNull(),
  venueId:         uuid("venue_id").notNull(),
  provider:        text("provider").notNull(),
  checkType:       healthCheckTypeEnum("check_type").notNull(),
  result:          healthResultEnum("result").notNull(),
  responseMs:      integer("response_ms"),
  errorMessage:    text("error_message"),
  tokenExpiresAt:  timestamp("token_expires_at"),
  isTokenExpired:  boolean("is_token_expired").notNull().default(false),
  consecutiveFails: integer("consecutive_fails").notNull().default(0),
  alertSent:       boolean("alert_sent").notNull().default(false),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});
