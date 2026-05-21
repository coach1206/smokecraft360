/**
 * TenantInitializer — tenant-aware bootstrap for NOVEE OS venue environments.
 *
 * Reads a DeploymentManifest and drives the full initialization sequence:
 *   1. Validate the manifest
 *   2. Apply venue access controls (demo mode, allowed categories, etc.)
 *   3. Register each provider slot into the AdapterRegistry
 *   4. Report initialization results
 *
 * Designed to run at venue boot time and on manifest changes.
 */

import type { DeploymentManifest, ManifestProviderSlot } from "./DeploymentManifest";
import { validateManifest, getAllowedCategoriesForTier } from "./DeploymentManifest";
import { adapterRegistry }  from "./AdapterRegistry";
import type { IProviderAdapter, ProviderCredentials } from "./IProviderAdapter";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export interface SlotInitResult {
  providerId: string;
  success:    boolean;
  error?:     string;
}

export interface TenantInitResult {
  venueId:          string;
  packageTier:      string;
  isDemoMode:       boolean;
  allowedCategories: string[];
  totalSlots:       number;
  successful:       number;
  failed:           number;
  results:          SlotInitResult[];
  initializedAt:    string;
}

export interface CredentialResolver {
  /** Fetch decrypted credentials for a provider in the given venue. */
  resolve(venueId: string, providerId: string, keys: string[]): Promise<ProviderCredentials>;
}

export interface AdapterFactory {
  /** Build an IProviderAdapter instance for the given providerId. */
  build(providerId: string): IProviderAdapter | undefined;
}

/* ─── TenantInitializer ─────────────────────────────────────────────────────── */

export class TenantInitializer {
  constructor(
    private readonly credentialResolver: CredentialResolver,
    private readonly adapterFactory:     AdapterFactory,
  ) {}

  /**
   * Bootstrap a venue from its DeploymentManifest.
   * Returns a detailed result report.
   */
  async initialize(manifest: DeploymentManifest): Promise<TenantInitResult> {
    validateManifest(manifest);

    const { venueId, packageTier, allowedCategories: overrides, providers, demo } = manifest;
    const allowedCategories = getAllowedCategoriesForTier(packageTier, overrides);
    const isDemoMode        = demo?.isDemoMode ?? false;

    const demoExpired =
      isDemoMode &&
      demo?.expiresAt != null &&
      new Date(demo.expiresAt) < new Date();

    const results: SlotInitResult[] = [];

    for (const slot of providers) {
      const result = await this._initSlot(slot, venueId, isDemoMode && !demoExpired);
      results.push(result);
    }

    return {
      venueId,
      packageTier,
      isDemoMode: isDemoMode && !demoExpired,
      allowedCategories,
      totalSlots:   providers.length,
      successful:   results.filter(r => r.success).length,
      failed:       results.filter(r => !r.success).length,
      results,
      initializedAt: new Date().toISOString(),
    };
  }

  /** Tear down and deregister all adapters for a venue. */
  async teardown(venueId: string): Promise<void> {
    const registered = adapterRegistry.list();
    await Promise.allSettled(
      registered
        .filter(e => e.venueId === venueId)
        .map(e => adapterRegistry.deregister(e.adapter.providerId)),
    );
  }

  private async _initSlot(
    slot:       ManifestProviderSlot,
    venueId:    string,
    isDemoMode: boolean,
  ): Promise<SlotInitResult> {
    if (!slot.isActive && slot.isActive !== undefined) {
      return { providerId: slot.providerId, success: true };
    }

    const adapter = this.adapterFactory.build(slot.providerId);
    if (!adapter) {
      return {
        providerId: slot.providerId,
        success:    false,
        error:      `No adapter factory registered for '${slot.providerId}'`,
      };
    }

    try {
      let credentials: ProviderCredentials = {};
      if (!isDemoMode && slot.credentialKeys && slot.credentialKeys.length > 0) {
        credentials = await this.credentialResolver.resolve(
          venueId,
          slot.providerId,
          slot.credentialKeys,
        );
      }

      await adapterRegistry.register(adapter, credentials, venueId);
      return { providerId: slot.providerId, success: true };
    } catch (err) {
      return {
        providerId: slot.providerId,
        success:    false,
        error:      err instanceof Error ? err.message : String(err),
      };
    }
  }
}
