import { pgTable, uuid, text, integer, timestamp, boolean, index } from "drizzle-orm/pg-core";

/**
 * training_sign_offs — persistent manager approvals for completed employee training.
 * Replaces localStorage-only approach with a real DB record that survives refreshes,
 * can be audited, and feeds into certification issuance.
 */
export const trainingSignOffsTable = pgTable("training_sign_offs", {
  id:            uuid("id").primaryKey().defaultRandom(),
  userId:        uuid("user_id"),                        // trainee (nullable for guest flow)
  sessionId:     uuid("session_id"),                     // training session that was completed
  role:          text("role").notNull(),                  // bartender | floor_manager | etc.
  roleTitle:     text("role_title").notNull(),
  modulesCount:  integer("modules_count").notNull().default(0),
  managerName:   text("manager_name").notNull(),
  managerPin:    text("manager_pin_hash"),               // hashed demo PIN (never store raw)
  venueId:       uuid("venue_id"),
  demoMode:      boolean("demo_mode").notNull().default(true),  // always true in training sandbox
  notes:         text("notes"),
  approvedAt:    timestamp("approved_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byUser:    index("tso_user_idx").on(t.userId),
  bySession: index("tso_session_idx").on(t.sessionId),
  byRole:    index("tso_role_idx").on(t.role),
}));

export type TrainingSignOff       = typeof trainingSignOffsTable.$inferSelect;
export type InsertTrainingSignOff = typeof trainingSignOffsTable.$inferInsert;
