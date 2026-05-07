/**
 * venueStaffTable — staff members assigned to a venue.
 *
 * Separate from `users` (which covers app auth with email/password).
 * Staff here are kiosk-operational: PIN-login for fast floor access,
 * section/table assignment for Service Sage nudge routing.
 *
 * Universal Identity Key index lives on guest_profiles:
 *   idx_guest_key (last_name, phone_last4)
 */

import { pgTable, uuid, varchar, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const venueStaffTable = pgTable(
  "venue_staff",
  {
    staffId:         uuid("staff_id").primaryKey().defaultRandom(),
    venueId:         uuid("venue_id"),
    staffName:       varchar("staff_name", { length: 100 }).notNull(),
    staffPin:        varchar("staff_pin", { length: 4 }).notNull(),
    assignedSection: varchar("assigned_section", { length: 50 }),
    assignedTables:  varchar("assigned_tables", { length: 200 }), // comma-separated table IDs
    isActive:        boolean("is_active").notNull().default(true),
    createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_venue_staff_venue").on(t.venueId),
    index("idx_venue_staff_pin").on(t.venueId, t.staffPin),
  ],
);

export const insertVenueStaffSchema = createInsertSchema(venueStaffTable).omit({
  staffId: true, createdAt: true,
});
export type InsertVenueStaff = z.infer<typeof insertVenueStaffSchema>;
export type VenueStaff       = typeof venueStaffTable.$inferSelect;
