/**
 * @workspace/novee-sdk
 *
 * NOVEE OS Integration SDK — public API surface.
 *
 * Provides:
 *  - IProviderAdapter: interface all integrations must implement
 *  - AdapterRegistry: process-level runtime adapter store
 *  - DeploymentManifest: venue bootstrap configuration type + helpers
 *  - TenantInitializer: manifest-driven initialization engine
 */

export type {
  ProviderCategory,
  ProviderHealthStatus,
  ProviderCredentials,
  AdapterRequest,
  AdapterResponse,
  HealthCheckResult,
  IProviderAdapter,
} from "./IProviderAdapter";

export {
  AdapterRegistry,
  adapterRegistry,
} from "./AdapterRegistry";
export type { RegisteredAdapter } from "./AdapterRegistry";

export type {
  ManifestUsageLimits,
  ManifestProviderSlot,
  ManifestFeatureFlags,
  ManifestDemoConfig,
  DeploymentManifest,
} from "./DeploymentManifest";
export {
  PACKAGE_ALLOWED_CATEGORIES,
  getAllowedCategoriesForTier,
  validateManifest,
} from "./DeploymentManifest";

export { TenantInitializer } from "./TenantInitializer";
export type {
  SlotInitResult,
  TenantInitResult,
  CredentialResolver,
  AdapterFactory,
} from "./TenantInitializer";
