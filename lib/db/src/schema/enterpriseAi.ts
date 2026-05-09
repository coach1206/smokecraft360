/**
 * Enterprise AI Provider Ownership + API Responsibility System
 *
 * Tracks per-venue AI billing mode (AXIOM_MANAGED vs BYOK), connected
 * providers, encrypted BYOK keys, usage metering, and subscription-tier limits.
 */

import {
  pgTable, pgEnum, uuid, text, integer, boolean,
  timestamp, jsonb, bigint,
} from "drizzle-orm/pg-core";

/* ── Enums ──────────────────────────────────────────────────────────────────── */

export const aiBillingModeEnum = pgEnum("ai_billing_mode", [
  "axiom_managed",   // AXIOM pays — included in subscription
  "byok",            // Venue supplies own provider key + pays directly
]);

export const aiProviderNameEnum = pgEnum("ai_provider_name", [
  "openai",
  "anthropic",
  "gemini",
  "azure_openai",
]);

export const aiProviderStatusEnum = pgEnum("ai_provider_status", [
  "connected",
  "degraded",
  "disconnected",
  "pending_validation",
]);

export const axiomPackageEnum = pgEnum("axiom_package", [
  "axiom_core",   // AI included, limited cap
  "axiom_pro",    // AI included, expanded cap
  "axiom_xei",    // Either mode
  "axiom_black",  // BYOK strongly encouraged, multi-provider
]);

/* ── venue_ai_billing_modes ─────────────────────────────────────────────────── */

export const venueAiBillingModesTable = pgTable("venue_ai_billing_modes", {
  id:              uuid("id").primaryKey().defaultRandom(),
  venueId:         uuid("venue_id").notNull().unique(),
  mode:            aiBillingModeEnum("mode").notNull().default("axiom_managed"),
  axiomPackage:    axiomPackageEnum("axiom_package").notNull().default("axiom_core"),
  /** Super-admin can force override of auto-detected mode */
  adminForced:     boolean("admin_forced").notNull().default(false),
  adminForcedBy:   uuid("admin_forced_by"),
  adminForcedNote: text("admin_forced_note"),
  failoverEnabled: boolean("failover_enabled").notNull().default(false),
  /** Ordered list of fallback provider names when primary fails */
  failoverChain:   jsonb("failover_chain").$type<string[]>().default([]),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export type VenueAiBillingMode       = typeof venueAiBillingModesTable.$inferSelect;
export type InsertVenueAiBillingMode = typeof venueAiBillingModesTable.$inferInsert;

/* ── venue_ai_providers ─────────────────────────────────────────────────────── */

export const venueAiProvidersTable = pgTable("venue_ai_providers", {
  id:           uuid("id").primaryKey().defaultRandom(),
  venueId:      uuid("venue_id").notNull(),
  providerName: aiProviderNameEnum("provider_name").notNull(),
  status:       aiProviderStatusEnum("status").notNull().default("pending_validation"),
  isPrimary:    boolean("is_primary").notNull().default(false),
  /** Last successful API health check */
  lastCheckedAt: timestamp("last_checked_at"),
  lastErrorMsg:  text("last_error_msg"),
  /** Soft-delete — keeps history without dropping row */
  disconnectedAt: timestamp("disconnected_at"),
  connectedBy:   uuid("connected_by"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

export type VenueAiProvider       = typeof venueAiProvidersTable.$inferSelect;
export type InsertVenueAiProvider = typeof venueAiProvidersTable.$inferInsert;

/* ── venue_api_keys ─────────────────────────────────────────────────────────── */

export const venueApiKeysTable = pgTable("venue_api_keys", {
  id:           uuid("id").primaryKey().defaultRandom(),
  venueId:      uuid("venue_id").notNull(),
  providerId:   uuid("provider_id").notNull(),
  /** AES-256-GCM encrypted key blob — format: "iv:authTag:ciphertext" (base64 segments) */
  encryptedKey: text("encrypted_key").notNull(),
  /** Last 4 chars of the plaintext key for display ("sk-...XXXX") */
  keyHint:      text("key_hint"),
  /** Whether this key has passed a live validation call */
  validated:    boolean("validated").notNull().default(false),
  validatedAt:  timestamp("validated_at"),
  revokedAt:    timestamp("revoked_at"),
  createdBy:    uuid("created_by"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

export type VenueApiKey       = typeof venueApiKeysTable.$inferSelect;
export type InsertVenueApiKey = typeof venueApiKeysTable.$inferInsert;

/* ── venue_api_usage ────────────────────────────────────────────────────────── */

export const venueApiUsageTable = pgTable("venue_api_usage", {
  id:            uuid("id").primaryKey().defaultRandom(),
  venueId:       uuid("venue_id").notNull(),
  providerName:  aiProviderNameEnum("provider_name").notNull(),
  billingMode:   aiBillingModeEnum("billing_mode").notNull(),
  /** UTC date this bucket covers e.g. "2026-05-08" */
  bucketDate:    text("bucket_date").notNull(),
  requestCount:  integer("request_count").notNull().default(0),
  /** Total prompt + completion tokens */
  tokenCount:    bigint("token_count", { mode: "number" }).notNull().default(0),
  /** Estimated cost in USD cents (for AXIOM_MANAGED tracking / BYOK advisory) */
  estimatedCostCents: integer("estimated_cost_cents").notNull().default(0),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

export type VenueApiUsage       = typeof venueApiUsageTable.$inferSelect;
export type InsertVenueApiUsage = typeof venueApiUsageTable.$inferInsert;

/* ── venue_ai_limits ────────────────────────────────────────────────────────── */

export const venueAiLimitsTable = pgTable("venue_ai_limits", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  axiomPackage:       axiomPackageEnum("axiom_package").notNull().unique(),
  /** Monthly request cap for AXIOM_MANAGED mode. null = unlimited */
  monthlyRequestCap:  integer("monthly_request_cap"),
  /** Monthly token cap for AXIOM_MANAGED mode. null = unlimited */
  monthlyTokenCap:    bigint("monthly_token_cap", { mode: "number" }),
  /** Whether BYOK is permitted for this package */
  byokPermitted:      boolean("byok_permitted").notNull().default(false),
  /** Whether multi-provider routing is available */
  multiProviderEnabled: boolean("multi_provider_enabled").notNull().default(false),
  /** Human-readable description of AI entitlements */
  description:        text("description"),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
});

export type VenueAiLimit       = typeof venueAiLimitsTable.$inferSelect;
export type InsertVenueAiLimit = typeof venueAiLimitsTable.$inferInsert;
