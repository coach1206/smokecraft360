/**
 * secret_passages — one-time exclusive access links generated on credit spend.
 *
 * When a guest spends Axiom Credits on WifeX or DayOne360, a Secret Passage
 * row is created with a UUID token. The target platform verifies the token
 * via GET /api/credits/passage/:token before granting access.
 *
 * Lifecycle: pending → used | expired
 * TTL: 24 hours from creation (enforced at verification time)
 */

import { pgTable, uuid, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const secretPassagesTable = pgTable(
  "secret_passages",
  {
    id:           uuid("id").primaryKey().defaultRandom(),
    token:        uuid("token").notNull().unique().defaultRandom(),
    guestId:      uuid("guest_id").notNull(),
    targetPillar: text("target_pillar").notNull(), // "wifex" | "dayone360_leisure" | "dayone360_corp"
    creditAmount: integer("credit_amount").notNull(),
    redirectUrl:  text("redirect_url").notNull(),
    used:         boolean("used").notNull().default(false),
    usedAt:       timestamp("used_at"),
    expiresAt:    timestamp("expires_at").notNull(),
    venueId:      uuid("venue_id"),
    createdAt:    timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_passage_token").on(t.token),
    index("idx_passage_guest").on(t.guestId),
  ],
);

export type SecretPassage       = typeof secretPassagesTable.$inferSelect;
export type InsertSecretPassage = typeof secretPassagesTable.$inferInsert;
