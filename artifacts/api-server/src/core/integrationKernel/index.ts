/**
 * Universal Integration Kernel — public API
 *
 * This module is THE central nervous system for all integrations in NOVEE OS.
 * Import from here — never import sub-modules directly from application code.
 */

export * from "./types";
export * from "./providerRegistry";
export {
  ensureVaultSchema,
  upsertProvider,
  listProviders,
  getProviderById,
  readCredentials,
  updateHealthStatus,
  markLastUsed,
  markTested,
  deleteProvider,
  setPrimary,
  recordUsage,
  getUsage,
} from "./credentialVault";
export type { UpsertProviderInput, CredentialPack } from "./credentialVault";
export { checkProviderHealth, runHealthSweep } from "./healthMonitor";
