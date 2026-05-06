import { pgTable, uuid, text, integer, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const TRAINING_MODES = ["employee", "investor", "sales", "walkthrough", "scenarios", "demo"] as const;
export type TrainingMode = typeof TRAINING_MODES[number];

export const TRAINING_ROLES = [
  "bartender", "cigar_specialist", "vape_specialist", "server",
  "floor_manager", "venue_owner", "inventory_manager", "cashier",
] as const;
export type TrainingRole = typeof TRAINING_ROLES[number];

export const trainingSessionsTable = pgTable("training_sessions", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      uuid("user_id"),
  guestId:     uuid("guest_id"),
  venueId:     uuid("venue_id"),
  mode:        text("mode").notNull().$type<TrainingMode>(),
  role:        text("role").$type<TrainingRole>(),
  status:      text("status").notNull().default("active"),  // active | completed | abandoned
  scenariosCompleted: integer("scenarios_completed").notNull().default(0),
  totalScore:  integer("total_score").notNull().default(0),
  metadata:    jsonb("metadata"),
  startedAt:   timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (t) => ({
  byUser:  index("ts_user_idx").on(t.userId),
  byMode:  index("ts_mode_idx").on(t.mode),
}));

export type TrainingSession       = typeof trainingSessionsTable.$inferSelect;
export type InsertTrainingSession = typeof trainingSessionsTable.$inferInsert;
