import {
  pgTable, uuid, text, boolean, integer, real,
  timestamp, jsonb, index,
} from "drizzle-orm/pg-core";

export const automationGuardrailsTable = pgTable(
  "automation_guardrails",
  {
    id:                    uuid("id").primaryKey().defaultRandom(),
    venueId:               text("venue_id").notNull(),
    systemPaused:          boolean("system_paused").notNull().default(false),
    emergencyDisabled:     boolean("emergency_disabled").notNull().default(false),
    maxDecisionsPerMinute: integer("max_decisions_per_minute").notNull().default(10),
    minConfidenceThreshold:real("min_confidence_threshold").notNull().default(0.65),
    maxAmbientChangesPerHour: integer("max_ambient_changes_per_hour").notNull().default(4),
    maxUpsellPressure:     real("max_upsell_pressure").notNull().default(0.8),
    requireApprovalAbove:  real("require_approval_above").notNull().default(0.95),
    vipHandlingMode:       text("vip_handling_mode").notNull().default("auto"),
    anomalyThreshold:      real("anomaly_threshold").notNull().default(0.85),
    replayWindowSeconds:   integer("replay_window_seconds").notNull().default(3600),
    circuitBreakerErrors:  integer("circuit_breaker_errors").notNull().default(5),
    circuitBreakerWindowS: integer("circuit_breaker_window_s").notNull().default(60),
    circuitOpen:           boolean("circuit_open").notNull().default(false),
    circuitOpenAt:         timestamp("circuit_open_at"),
    pausedBy:              text("paused_by"),
    pausedAt:              timestamp("paused_at"),
    pauseReason:           text("pause_reason"),
    overrideConfig:        jsonb("override_config").$type<Record<string, unknown>>().default({}),
    updatedAt:             timestamp("updated_at").notNull().defaultNow(),
    createdAt:             timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("ag_venue_idx").on(t.venueId),
    index("ag_paused_idx").on(t.systemPaused),
    index("ag_emergency_idx").on(t.emergencyDisabled),
  ],
);

export type AutomationGuardrail       = typeof automationGuardrailsTable.$inferSelect;
export type InsertAutomationGuardrail = typeof automationGuardrailsTable.$inferInsert;
