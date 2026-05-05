import { pgTable, uuid, text, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";

export const onboardingSessionsTable = pgTable("onboarding_sessions", {
  id:             uuid("id").primaryKey().defaultRandom(),
  venueId:        uuid("venue_id"),
  step:           text("step").notNull().default("venue_info"),
  /** Wizard-collected profile data keyed by step id */
  data:           jsonb("data").notNull().$type<Record<string, unknown>>().default({}),
  /** Crafts selected during onboarding e.g. ["cigar","beer","spirit"] */
  selectedCrafts: jsonb("selected_crafts").notNull().$type<string[]>().default([]),
  /** "in_progress" | "completed" | "abandoned" */
  status:         text("status").notNull().default("in_progress"),
  completed:      boolean("completed").notNull().default(false),
  completedAt:    timestamp("completed_at"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export type OnboardingSession       = typeof onboardingSessionsTable.$inferSelect;
export type InsertOnboardingSession = typeof onboardingSessionsTable.$inferInsert;
