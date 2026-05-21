/**
 * AdapterRegistry — runtime plugin registry for NOVEE OS integration adapters.
 *
 * Manages the full lifecycle of IProviderAdapter instances:
 *   - Registration with credential initialization
 *   - Safe deregistration with teardown
 *   - Category-scoped lookup
 *   - Health sweep across all registered adapters
 *
 * This is a process-level singleton. Import the pre-built `adapterRegistry`
 * instance rather than constructing a new AdapterRegistry.
 */

import type {
  IProviderAdapter,
  ProviderCategory,
  ProviderCredentials,
  HealthCheckResult,
} from "./IProviderAdapter";

export interface RegisteredAdapter {
  adapter:      IProviderAdapter;
  registeredAt: Date;
  venueId?:     string;
}

export class AdapterRegistry {
  private readonly _adapters = new Map<string, RegisteredAdapter>();

  /**
   * Register and initialize an adapter.
   * If an adapter with the same providerId is already registered it will be
   * torn down and replaced.
   */
  async register(
    adapter:     IProviderAdapter,
    credentials: ProviderCredentials,
    venueId?:    string,
  ): Promise<void> {
    if (this._adapters.has(adapter.providerId)) {
      await this.deregister(adapter.providerId);
    }
    await adapter.initialize(credentials);
    this._adapters.set(adapter.providerId, {
      adapter,
      registeredAt: new Date(),
      venueId,
    });
  }

  /** Tear down and remove an adapter by providerId. */
  async deregister(providerId: string): Promise<boolean> {
    const entry = this._adapters.get(providerId);
    if (!entry) return false;
    await entry.adapter.teardown();
    this._adapters.delete(providerId);
    return true;
  }

  /** Retrieve a registered adapter by providerId. */
  get(providerId: string): IProviderAdapter | undefined {
    return this._adapters.get(providerId)?.adapter;
  }

  /** List all registered adapters, optionally filtered by category. */
  list(category?: ProviderCategory): RegisteredAdapter[] {
    const all = Array.from(this._adapters.values());
    return category ? all.filter(e => e.adapter.category === category) : all;
  }

  /** Returns true if an adapter with the given ID is registered. */
  has(providerId: string): boolean {
    return this._adapters.has(providerId);
  }

  /**
   * Run healthCheck() on every registered adapter in parallel.
   * Returns a map of providerId → HealthCheckResult.
   */
  async healthSweep(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>();
    await Promise.allSettled(
      Array.from(this._adapters.entries()).map(async ([id, entry]) => {
        try {
          const result = await entry.adapter.healthCheck();
          results.set(id, result);
        } catch (err) {
          results.set(id, {
            status:    "failed",
            latencyMs: null,
            message:   err instanceof Error ? err.message : String(err),
          });
        }
      }),
    );
    return results;
  }

  /** Tear down all registered adapters. Call during process shutdown. */
  async teardownAll(): Promise<void> {
    await Promise.allSettled(
      Array.from(this._adapters.keys()).map(id => this.deregister(id)),
    );
  }
}

/** Process-level singleton — import this, do not construct a new instance. */
export const adapterRegistry = new AdapterRegistry();
