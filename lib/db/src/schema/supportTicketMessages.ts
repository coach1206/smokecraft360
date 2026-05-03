/**
 * support_ticket_messages — Help Center Slice 2.
 *
 * Append-only message thread for a single support ticket. Each row is one
 * post by either the ticket opener (or another venue staff member) or a
 * super_admin replying. There is no edit / delete surface — once posted,
 * the message is part of the audit trail.
 *
 * Tenant scope is inherited from the parent ticket: the route layer checks
 * that the caller can see `support_tickets.id = ticket_id` before allowing
 * read or write here, so we don't duplicate the venue_id on the message
 * row (single source of truth lives on the ticket).
 *
 * Per-ticket cap of 200 messages is enforced atomically inside the INSERT
 * in routes/supportTicketMessages.ts (same pattern as G4 voice-queue and
 * the per-venue cap on support_tickets itself).
 *
 * Index:
 *   (ticket_id, created_at ASC) — natural thread reading order with
 *   keyset pagination.
 */

import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const supportTicketMessagesTable = pgTable(
  "support_ticket_messages",
  {
    id:        uuid("id").primaryKey().defaultRandom(),
    ticketId:  uuid("ticket_id").notNull(),
    authorId:  uuid("author_id").notNull(),
    body:      text("body").notNull(),                          // ≤5000 chars (route-enforced)
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    // Thread reading: oldest first inside one ticket.
    byTicketCreated: index("support_ticket_messages_ticket_created_idx")
      .on(t.ticketId, sql`${t.createdAt} ASC`),
  }),
);

export type DbSupportTicketMessage     = typeof supportTicketMessagesTable.$inferSelect;
export type InsertSupportTicketMessage = typeof supportTicketMessagesTable.$inferInsert;
