/**
 * shadow_tests — Manufacturer War Room: invisible A/B product placement tests.
 *
 * A shadow test inserts a product into the recommendation stream at a
 * configurable exposure rate WITHOUT surfacing it as a promoted item.
 * Guests interact with it organically — reveal rate, hesitation, and
 * pairing outcomes are captured and stored in `results` on conclusion.
 *
 * Status lifecycle:
 *   INVISIBLE_ACTIVE → product is live in shadow stream, guests unaware
 *   ACTIVE           → test promoted to visible A/B (optional escalation)
 *   CONCLUDED        → test ended normally, results frozen
 *   CANCELLED        → test aborted before natural completion
 *
 * createdBy: UUID of the super_admin who initiated the test (audit trail).
 */

import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const SHADOW_TEST_STATUSES = [
  "INVISIBLE_ACTIVE",
  "ACTIVE",
  "CONCLUDED",
  "CANCELLED",
] as const;

export type ShadowTestStatus = typeof SHADOW_TEST_STATUSES[number];

export type ShadowTestDemographic = {
  ageRange?:            string;   // e.g. "25-44"
  experienceLevel?:     string;   // "novice" | "enthusiast" | "connoisseur"
  region?:              string;
  craftType?:           string;   // smoke | pour | brew | vape
  pacingPreference?:    string;
  socialCluster?:       string;
  [key: string]: unknown;
};

export type ShadowTestResults = {
  revealRate?:      number;
  hesitationMs?:    number;
  emotionalMatch?:  number;
  pairingSuccess?:  number;
  totalImpressions?: number;
  concludedAt?:     string;
};

export const shadowTestsTable = pgTable(
  "shadow_tests",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    productId:   text("product_id").notNull(),
    demographic: jsonb("demographic")
      .$type<ShadowTestDemographic>()
      .notNull()
      .default({}),
    status:      text("status")
      .notNull()
      .$type<ShadowTestStatus>()
      .default("INVISIBLE_ACTIVE"),
    startTime:   timestamp("start_time",  { withTimezone: true }).notNull().defaultNow(),
    endTime:     timestamp("end_time",    { withTimezone: true }),
    results:     jsonb("results").$type<ShadowTestResults>(),
    createdBy:   uuid("created_by"),
    createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    productIdx:  index("st_product_idx").on(t.productId),
    statusIdx:   index("st_status_idx").on(t.status),
    createdIdx:  index("st_created_idx").on(t.createdAt),
  }),
);

export const insertShadowTestSchema = createInsertSchema(shadowTestsTable).omit({
  id: true, createdAt: true, startTime: true,
});

export type InsertShadowTest  = z.infer<typeof insertShadowTestSchema>;
export type ShadowTest        = typeof shadowTestsTable.$inferSelect;
