/**
 * xp_transactions — append-only XP event ledger for guests and users.
 * Every XP gain or loss is recorded here for auditability.
 */

import { pgTable, uuid, integer, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const xpTransactionsTable = pgTable("xp_transactions", {
  id:             uuid("id").primaryKey().defaultRandom(),
  guestProfileId: uuid("guest_profile_id"),
  userId:         uuid("user_id"),
  craftType:      text("craft_type"),
  amount:         integer("amount").notNull(),
  reason:         text("reason").notNull(),
  metadata:       jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
}, t => ({
  byGuest: index("xp_txn_guest_idx").on(t.guestProfileId),
  byUser:  index("xp_txn_user_idx").on(t.userId),
}));

export type XpTransaction = typeof xpTransactionsTable.$inferSelect;
export type InsertXpTransaction = typeof xpTransactionsTable.$inferInsert;
