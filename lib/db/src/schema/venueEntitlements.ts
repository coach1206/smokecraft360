/**
 * venue_entitlements — per-venue feature package + a-la-carte overrides + pricing.
 *
 * Effective feature set = package features ∪ {overrides where enabled=true}
 *                        minus {overrides where enabled=false}
 *
 * Resolution order (highest wins):
 *   1. Individual override (featureOverrides[].enabled)
 *   2. Package bundle
 *   3. Default = denied (fail closed)
 */

import { pgTable, text, jsonb, numeric, timestamp } from "drizzle-orm/pg-core";

export const venueEntitlementsTable = pgTable("venue_entitlements", {
  venueId:          text("venue_id").primaryKey(),
  packageId:        text("package_id"),

  /**
   * JSON array of per-feature overrides:
   * [{ id: "AI_PAIRING", enabled: true }, { id: "EXPORTS", enabled: false }]
   *
   * Overrides are applied on top of the package; enabled=true grants a feature
   * not in the package; enabled=false revokes a feature the package grants.
   */
  featureOverrides: jsonb("feature_overrides").$type<
    Array<{ id: string; enabled: boolean }>
  >().notNull().default([]),

  monthlyPrice:     numeric("monthly_price"),
  transactionFee:   numeric("transaction_fee"),
  setupFee:         numeric("setup_fee"),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
  updatedBy:        text("updated_by"),
});

export type VenueEntitlement       = typeof venueEntitlementsTable.$inferSelect;
export type InsertVenueEntitlement = typeof venueEntitlementsTable.$inferInsert;
