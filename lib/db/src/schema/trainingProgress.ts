import { pgTable, uuid, text, integer, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const trainingProgressTable = pgTable("training_progress", {
  id:          uuid("id").primaryKey().defaultRandom(),
  sessionId:   uuid("session_id").notNull(),
  userId:      uuid("user_id"),
  scenarioId:  text("scenario_id").notNull(),  // e.g. "first_time_pairing"
  stepIndex:   integer("step_index").notNull().default(0),
  totalSteps:  integer("total_steps").notNull().default(1),
  score:       integer("score").notNull().default(0),
  completed:   boolean("completed").notNull().default(false),
  attempts:    integer("attempts").notNull().default(1),
  metadata:    jsonb("metadata"),
  startedAt:   timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (t) => ({
  bySession: index("tp_session_idx").on(t.sessionId),
  byUser:    index("tp_user_idx").on(t.userId),
}));

export type TrainingProgress       = typeof trainingProgressTable.$inferSelect;
export type InsertTrainingProgress = typeof trainingProgressTable.$inferInsert;
