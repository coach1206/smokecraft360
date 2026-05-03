import { pgTable, uuid, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const FRAUD_FLAG_KINDS = [
  "amount_mismatch",
  "duplicate_payment",
  "large_transaction",
  "repeated_failures",
  "anomaly",
] as const;
export type FraudFlagKind = typeof FRAUD_FLAG_KINDS[number];

export const FRAUD_FLAG_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type FraudFlagSeverity = typeof FRAUD_FLAG_SEVERITIES[number];

export const fraudFlagsTable = pgTable("fraud_flags", {
  id:         uuid("id").primaryKey().defaultRandom(),
  kind:       text("kind").notNull().$type<FraudFlagKind>(),
  severity:   text("severity").notNull().default("medium").$type<FraudFlagSeverity>(),
  orderId:    uuid("order_id"),
  venueId:    uuid("venue_id"),
  userId:     uuid("user_id"),
  details:    jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  resolved:   text("resolved").$type<"open" | "resolved" | "dismissed">().notNull().default("open"),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export type DbFraudFlag     = typeof fraudFlagsTable.$inferSelect;
export type InsertFraudFlag = typeof fraudFlagsTable.$inferInsert;
