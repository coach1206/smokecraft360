import {
  pgTable, uuid, text, real, integer,
  timestamp, jsonb, boolean, index,
} from "drizzle-orm/pg-core";

export const staffContextProfilesTable = pgTable(
  "staff_context_profiles",
  {
    id:              uuid("id").primaryKey().defaultRandom(),
    venueId:         uuid("venue_id").notNull(),
    staffId:         uuid("staff_id").notNull(),
    role:            text("role").notNull().default("server"),
    zone:            text("zone"),
    shiftStartAt:    timestamp("shift_start_at"),
    shiftEndAt:      timestamp("shift_end_at"),
    activeGuests:    integer("active_guests").notNull().default(0),
    interactionRate: real("interaction_rate").notNull().default(0),
    upsellRate:      real("upsell_rate").notNull().default(0),
    satisfactionScore:real("satisfaction_score").notNull().default(0),
    recommendations: integer("recommendations").notNull().default(0),
    conversions:     integer("conversions").notNull().default(0),
    isOnFloor:       boolean("is_on_floor").notNull().default(false),
    energyLevel:     real("energy_level").notNull().default(0.5),
    contextMetadata: jsonb("context_metadata").$type<Record<string, unknown>>().notNull().default({}),
    updatedAt:       timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("scp_venue_idx").on(t.venueId),
    index("scp_staff_idx").on(t.venueId, t.staffId),
    index("scp_zone_idx").on(t.venueId, t.zone),
  ],
);

export type StaffContextProfile       = typeof staffContextProfilesTable.$inferSelect;
export type InsertStaffContextProfile = typeof staffContextProfilesTable.$inferInsert;
