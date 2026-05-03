/**
 * support_tickets — Help Center Slice 1.
 *
 * Per-venue support requests raised by venue staff (venue_owner, manager,
 * staff) and worked by super_admin. Single-table slice — the back-and-forth
 * thread (`support_ticket_messages`) is a deliberate Slice 2 follow-up so
 * thread CRUD gets its own owner-gating / pagination audit.
 *
 * Lifecycle:
 *   open        ─┬─► in_progress ──► resolved ──► closed
 *                │       │              │
 *                └◄──────┴◄─────────────┘
 *   - venue side may toggle open ↔ closed on their OWN tickets
 *     (close-out / reopen).
 *   - super_admin side may transition through any state. Setting status
 *     to `resolved` stamps `resolved_at = now()`; clearing back to
 *     `open` / `in_progress` clears `resolved_at`.
 *
 * Per-venue cap of 50 (open|in_progress) tickets is enforced atomically
 * inside the INSERT in routes/supportTickets.ts (same pattern as G4
 * voice-queue and G3 memories).
 *
 * Indexes:
 *   (venue_id, status, created_at DESC) — venue inbox: "show me my open tickets"
 *   (status, created_at DESC)           — super_admin queue: "show me ALL open"
 */

import { pgTable, uuid, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const supportTicketStatusEnum = pgEnum("support_ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const supportTicketPriorityEnum = pgEnum("support_ticket_priority", [
  "low",
  "normal",
  "high",
]);

export const SUPPORT_TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type SupportTicketStatus = typeof SUPPORT_TICKET_STATUSES[number];

export const SUPPORT_TICKET_PRIORITIES = ["low", "normal", "high"] as const;
export type SupportTicketPriority = typeof SUPPORT_TICKET_PRIORITIES[number];

export const supportTicketsTable = pgTable(
  "support_tickets",
  {
    id:         uuid("id").primaryKey().defaultRandom(),
    venueId:    uuid("venue_id").notNull(),
    openedBy:   uuid("opened_by").notNull(),
    subject:    text("subject").notNull(),                              // ≤200 chars (route-enforced)
    body:       text("body").notNull(),                                 // ≤5000 chars (route-enforced)
    status:     supportTicketStatusEnum("status").notNull().default("open"),
    priority:   supportTicketPriorityEnum("priority").notNull().default("normal"),
    assignedTo: uuid("assigned_to"),                                    // super_admin user id, null = unassigned
    createdAt:  timestamp("created_at").notNull().defaultNow(),
    updatedAt:  timestamp("updated_at").notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at"),
  },
  (t) => ({
    // Venue inbox query: status filter on own venueId, newest first.
    byVenueStatusCreated: index("support_tickets_venue_status_created_idx")
      .on(t.venueId, t.status, sql`${t.createdAt} DESC`),
    // Super_admin queue: cross-venue status filter, newest first.
    byStatusCreated: index("support_tickets_status_created_idx")
      .on(t.status, sql`${t.createdAt} DESC`),
  }),
);

export type DbSupportTicket     = typeof supportTicketsTable.$inferSelect;
export type InsertSupportTicket = typeof supportTicketsTable.$inferInsert;
