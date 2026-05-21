/**
 * DeploymentManifest — venue bootstrap configuration for NOVEE OS.
 *
 * A DeploymentManifest describes everything needed to bootstrap a venue
 * environment: which integration adapters to activate, which features to
 * enable, demo mode settings, and per-category usage limits.
 *
 * Manifests are stored in the database and loaded by TenantInitializer at
 * venue bootstrap time. They can also be exported/imported as JSON for
 * offline provisioning of kiosk or air-gapped environments.
 */

import type { ProviderCategory } from "./IProviderAdapter";

/* ─── Usage limits (mirrors kernel UsageLimits) ────────────────────────────── */

export interface ManifestUsageLimits {
  dailyRequests?:   number;
  monthlyRequests?: number;
  monthlyTokens?:   number;
  alertThreshold?:  number; // 0–1, default 0.8
}

/* ─── Provider slot ─────────────────────────────────────────────────────────── */

export interface ManifestProviderSlot {
  /** Matches a providerId in the kernel provider registry (e.g. "openai"). */
  providerId:   string;
  category:     ProviderCategory;
  isPrimary?:   boolean;
  isActive?:    boolean;
  region?:      string;
  endpointUrl?: string;
  usageLimits?: ManifestUsageLimits;
  /**
   * Credential keys to read from the venue's encrypted credential vault.
   * Keys listed here will be fetched and passed to the adapter's `initialize()`.
   */
  credentialKeys?: string[];
}

/* ─── Feature flags ─────────────────────────────────────────────────────────── */

export interface ManifestFeatureFlags {
  enableSwipeExperience?:  boolean;
  enableLoyaltyEngine?:    boolean;
  enableRevenueForecasting?: boolean;
  enableOfflineMode?:      boolean;
  enableMultiUser?:        boolean;
  enableVenueLayout?:      boolean;
  enableKioskMode?:        boolean;
  enableCoachHelp?:        boolean;
  enableAIRecommendations?: boolean;
  custom?: Record<string, boolean>;
}

/* ─── Demo mode ─────────────────────────────────────────────────────────────── */

export interface ManifestDemoConfig {
  isDemoMode:     boolean;
  expiresAt?:     string; // ISO 8601
  syntheticDataSeed?: string;
}

/* ─── Deployment manifest ───────────────────────────────────────────────────── */

export interface DeploymentManifest {
  /** Manifest schema version — increment when structure changes. */
  schemaVersion:   string;

  /** Unique venue identifier this manifest applies to. */
  venueId:         string;

  /** Human-readable venue name. */
  venueName:       string;

  /**
   * Subscription package tier.
   * Controls which categories the venue may access.
   */
  packageTier:     "starter" | "professional" | "enterprise" | "custom";

  /**
   * Allowed provider categories for this venue.
   * If omitted, all categories are permitted (enterprise default).
   */
  allowedCategories?: ProviderCategory[];

  /** Integration provider slots to activate on boot. */
  providers: ManifestProviderSlot[];

  /** Feature flag overrides for this venue. */
  features?: ManifestFeatureFlags;

  /** Demo mode configuration. If omitted, venue is in production mode. */
  demo?: ManifestDemoConfig;

  /** ISO 8601 timestamp when this manifest was last modified. */
  updatedAt:       string;

  /** Actor who last modified this manifest. */
  updatedBy?:      string;
}

/* ─── Package tier defaults ─────────────────────────────────────────────────── */

export const PACKAGE_ALLOWED_CATEGORIES: Record<
  DeploymentManifest["packageTier"],
  ProviderCategory[]
> = {
  starter:      ["pos", "payment"],
  professional: ["ai", "pos", "payment", "music", "crm", "booking", "voice"],
  enterprise:   ["ai", "pos", "payment", "music", "lighting", "sensor", "crm", "booking", "voice", "analytics", "device", "custom"],
  custom:       [],
};

/** Return the set of allowed categories for a given tier. */
export function getAllowedCategoriesForTier(
  tier: DeploymentManifest["packageTier"],
  overrides?: ProviderCategory[],
): ProviderCategory[] {
  if (overrides && overrides.length > 0) return overrides;
  return PACKAGE_ALLOWED_CATEGORIES[tier] ?? [];
}

/** Validate that a manifest is structurally sound. Throws on invalid data. */
export function validateManifest(manifest: DeploymentManifest): void {
  if (!manifest.venueId)    throw new Error("DeploymentManifest: venueId is required");
  if (!manifest.venueName)  throw new Error("DeploymentManifest: venueName is required");
  if (!manifest.providers)  throw new Error("DeploymentManifest: providers array is required");

  const allowed = getAllowedCategoriesForTier(manifest.packageTier, manifest.allowedCategories);

  for (const slot of manifest.providers) {
    if (!slot.providerId) throw new Error(`DeploymentManifest: provider slot missing providerId`);
    if (allowed.length > 0 && !allowed.includes(slot.category)) {
      throw new Error(
        `DeploymentManifest: category '${slot.category}' for provider '${slot.providerId}' ` +
        `is not permitted under the '${manifest.packageTier}' package tier`,
      );
    }
  }

  if (manifest.demo?.isDemoMode && manifest.demo.expiresAt) {
    const exp = new Date(manifest.demo.expiresAt);
    if (isNaN(exp.getTime())) {
      throw new Error("DeploymentManifest: demo.expiresAt is not a valid ISO 8601 date");
    }
  }
}
