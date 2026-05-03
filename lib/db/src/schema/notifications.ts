/**
 * notifications — in-app + email message log for a venue.
 *
 * Currently only the `in_app` channel is actually surfaced (via
 * GET /api/notifications). Rows with channel='email' are written for
 * audit/future-implementation but no SMTP delivery happens yet — they're
 * marked status='sent' optimistically and represent intent.
 *
 * `read_at` is set when a venue owner views the notification in the
 * dashboard inbox so the unread badge can clear.
 */

import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email", "in_app",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "sent", "failed",
]);

export const notificationsTable = pgTable("notifications", {
  id:        uuid("id").primaryKey().defaultRandom(),
  venueId:   uuid("venue_id").notNull(),
  channel:   notificationChannelEnum("channel").notNull().default("in_app"),
  // Short title shown in inbox lists (e.g. "Payment Failed").
  title:     text("title").notNull(),
  // Body text shown when expanded.
  message:   text("message").notNull(),
  status:    notificationStatusEnum("status").notNull().default("sent"),
  // Free-form category so the UI can choose icons / colors.
  // Examples: 'reminder', 'failed', 'recovered', 'canceled', 'upsell'
  category:  text("category"),
  readAt:    timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DbNotification     = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
