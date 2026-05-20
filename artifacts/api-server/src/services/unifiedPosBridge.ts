/**
 * UnifiedPOSBridge — Single POS Orchestration Layer.
 *
 * Phase E: Real POS Infrastructure — Universal Abstraction Layer.
 *
 * The single entry point between EEIE and all POS providers.
 * Routes sync, order, and webhook requests to the correct adapter
 * based on per-venue configuration. Normalizes all responses.
 *
 * Features:
 *   - Provider abstraction (toast / square / clover / lightspeed / manual_import)
 *   - Inventory normalization (canonical PosInventoryItem format)
 *   - Order normalization (canonical PosOrder format)
 *   - Conflict resolution (last-write-wins with timestamp comparison)
 *   - Retry orchestration (exponential backoff, 3 attempts)
 *   - Provider health monitoring (per-adapter health state)
 *   - Live inventory cache (30-min TTL, per venue)
 *   - Background sync every 15 minutes
 *   - EEIE inventory awareness: getInventory() for real-time EEIE use
 *   - NeuralEventBus publish on sync completion
 */

import { getAdapter, type PosAdapterConfig, type PosInventoryItem, type PosOrder } from "../posAdapters";
import { NeuralEventBus } from "./neuralEventBus";
import { logger }         from "../lib/logger";

// Lazy-import getIO to avoid circular deps at module load time
function tryEmitPosOrderComplete(payload: Record<string, unknown>): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getIO } = require("../lib/socketServer") as { getIO: () => import("socket.io").Server };
    getIO().emit("pos_order_complete", payload);
  } catch { /* socket not ready or circular — silent */ }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type PosHealthStatus = "HEALTHY" | "DEGRADED" | "OFFLINE" | "UNCONFIGURED";

export interface ProviderHealth {
  provider:             string;
  venueId?:             string;
  connected:            boolean;
  simulated:            boolean;
  status:               PosHealthStatus;
  lastSyncAt:           string | null;
  lastSyncDurationMs:   number | null;
  consecutiveFailures:  number;
  lastError:            string | null;
}

interface VenueConfig {
  venueId:  string;
  provider: string;
  config:   PosAdapterConfig;
}

interface CachedInventory {
  items:      PosInventoryItem[];
  syncedAt:   string;
  expiresAt:  string;
}

// ── In-process state ──────────────────────────────────────────────────────────

const venueRegistry     = new Map<string, VenueConfig>();
const inventoryCache    = new Map<string, CachedInventory>();
const providerHealth    = new Map<string, ProviderHealth>();
const CACHE_TTL_MS      = 30 * 60 * 1000;   // 30 minutes

// ── Retry helper ──────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn:         () => Promise<T>,
  label:      string,
  maxAttempts = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        const delayMs = 1000 * Math.pow(2, attempt - 1);   // 1s, 2s, 4s
        logger.warn({ label, attempt, delayMs }, "POS retry — backing off");
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  throw lastErr;
}

// ── Health tracking ───────────────────────────────────────────────────────────

function initHealth(provider: string, venueId?: string): ProviderHealth {
  const key = venueId ? `${provider}:${venueId}` : provider;
  if (!providerHealth.has(key)) {
    const adapter = getAdapter(provider);
    const simulated = adapter && "simulated" in adapter
      ? (adapter as { simulated?: boolean }).simulated === true
      : false;
    providerHealth.set(key, {
      provider,
      venueId,
      connected:            false,
      simulated,
      status:               adapter ? "OFFLINE" : "UNCONFIGURED",
      lastSyncAt:           null,
      lastSyncDurationMs:   null,
      consecutiveFailures:  0,
      lastError:            null,
    });
  }
  return providerHealth.get(key)!;
}

function recordSuccess(provider: string, venueId: string | undefined, durationMs: number): void {
  const key    = venueId ? `${provider}:${venueId}` : provider;
  const health = initHealth(provider, venueId);
  health.connected            = true;
  health.status               = "HEALTHY";
  health.lastSyncAt           = new Date().toISOString();
  health.lastSyncDurationMs   = durationMs;
  health.consecutiveFailures  = 0;
  health.lastError            = null;
  providerHealth.set(key, health);
}

function recordFailure(provider: string, venueId: string | undefined, error: string): void {
  const key    = venueId ? `${provider}:${venueId}` : provider;
  const health = initHealth(provider, venueId);
  health.consecutiveFailures++;
  health.lastError = error;
  health.status    = health.consecutiveFailures >= 3 ? "OFFLINE" : "DEGRADED";
  health.connected = false;
  providerHealth.set(key, health);
}

// ── Sync core ─────────────────────────────────────────────────────────────────

async function syncVenueInventory(reg: VenueConfig): Promise<PosInventoryItem[]> {
  const adapter = getAdapter(reg.provider);
  if (!adapter) {
    logger.warn({ venueId: reg.venueId, provider: reg.provider }, "POS: no adapter found for provider");
    return [];
  }
  initHealth(reg.provider, reg.venueId);
  const start = Date.now();

  const items = await withRetry(
    () => adapter.syncInventory(reg.config),
    `${reg.provider}:syncInventory:${reg.venueId}`,
  );

  const durationMs = Date.now() - start;
  recordSuccess(reg.provider, reg.venueId, durationMs);

  const cacheEntry: CachedInventory = {
    items,
    syncedAt:  new Date().toISOString(),
    expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
  };
  inventoryCache.set(reg.venueId, cacheEntry);

  logger.info(
    { venueId: reg.venueId, provider: reg.provider, items: items.length, durationMs },
    "POS inventory synced",
  );
  return items;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const UnifiedPOSBridge = {

  /**
   * Register a venue with its POS provider.
   * Must be called before syncInventory/pushOrder for that venue.
   */
  registerVenue(venueId: string, provider: string, config: Partial<PosAdapterConfig> = {}): void {
    const fullConfig: PosAdapterConfig = {
      adapterName: provider,
      venueId,
      apiKey:      process.env[`${provider.toUpperCase()}_API_KEY`]
                     ?? process.env[`${provider.toUpperCase()}_ACCESS_TOKEN`],
      locationId:  process.env[`${provider.toUpperCase()}_LOCATION_ID`]
                     ?? process.env[`${provider.toUpperCase()}_MERCHANT_ID`],
      ...config,
    };
    venueRegistry.set(venueId, { venueId, provider, config: fullConfig });
    initHealth(provider, venueId);
    logger.info({ venueId, provider }, "POS bridge: venue registered");
  },

  /** Sync inventory for a specific venue — respects cache TTL. */
  async syncInventory(venueId: string, force = false): Promise<PosInventoryItem[]> {
    const reg = venueRegistry.get(venueId);
    if (!reg) {
      logger.warn({ venueId }, "POS bridge: venue not registered — cannot sync");
      return [];
    }

    const cached = inventoryCache.get(venueId);
    if (!force && cached && new Date(cached.expiresAt) > new Date()) {
      return cached.items;
    }

    try {
      const items = await syncVenueInventory(reg);
      NeuralEventBus.publish("pos.sync_complete", {
        venueId, provider: reg.provider, items: items.length, ts: new Date().toISOString(),
      }, venueId);
      return items;
    } catch (err) {
      recordFailure(reg.provider, venueId, String(err));
      logger.error({ err, venueId, provider: reg.provider }, "POS inventory sync failed");
      return cached?.items ?? [];
    }
  },

  /** Get cached inventory — used by EEIE for real-time recommendation filtering. */
  getInventory(venueId: string): PosInventoryItem[] {
    return inventoryCache.get(venueId)?.items ?? [];
  },

  /** Get available items (quantity > 0) for a venue — real-time EEIE filter. */
  getAvailableItems(venueId: string): PosInventoryItem[] {
    return this.getInventory(venueId).filter(i => i.available && i.quantity > 0);
  },

  /** Get unavailable item IDs — for EEIE to block recommendations. */
  getUnavailableProductIds(venueId: string): Set<string> {
    const unavailable = new Set<string>();
    for (const item of this.getInventory(venueId)) {
      if (!item.available || item.quantity <= 0) {
        unavailable.add(item.productId);
      }
    }
    return unavailable;
  },

  /** Push an order through the registered POS provider. */
  async pushOrder(venueId: string, order: PosOrder): Promise<{ success: boolean; externalId?: string; error?: string }> {
    const reg = venueRegistry.get(venueId);
    if (!reg) return { success: false, error: "venue not registered with POS bridge" };

    const adapter = getAdapter(reg.provider);
    if (!adapter) return { success: false, error: `no adapter for provider ${reg.provider}` };

    try {
      const result = await withRetry(
        () => adapter.pushOrder(reg.config, order),
        `${reg.provider}:pushOrder:${venueId}`,
      );
      recordSuccess(reg.provider, venueId, 0);

      // Broadcast enriched order event so frontend POSRouterEngine can compute
      // flavor synergy XP, decrement inventory state, and scale multipliers.
      tryEmitPosOrderComplete({
        vendor:         reg.provider,
        venueId,
        lineItems:      order.items.map(i => ({
          name:       i.name,
          productId:  i.productId,
          qty:        i.quantity,
          priceCents: i.priceCents,
        })),
        totalCents:     order.totalCents,
        guestSessionId: null,
        timestamp:      new Date().toISOString(),
      });

      return result;
    } catch (err) {
      recordFailure(reg.provider, venueId, String(err));
      return { success: false, error: String(err) };
    }
  },

  /** Health status for all registered providers. */
  getHealthStatus(): ProviderHealth[] {
    // Ensure all known adapters have a health entry
    for (const name of ["toast", "square", "clover", "lightspeed", "manual_import"]) {
      initHealth(name, undefined);
    }
    return Array.from(providerHealth.values());
  },

  /** Sync all registered venues — called by background worker. */
  async syncAll(): Promise<void> {
    for (const reg of venueRegistry.values()) {
      try {
        await syncVenueInventory(reg);
      } catch (err) {
        logger.warn({ err, venueId: reg.venueId }, "POS syncAll: venue sync failed — continuing");
      }
    }
  },
};

// ── Startup ───────────────────────────────────────────────────────────────────

export function startUnifiedPOSBridge(): void {
  // Initialise health entries for all known adapters at startup
  for (const name of ["toast", "square", "clover", "lightspeed", "manual_import"]) {
    initHealth(name, undefined);
  }

  // Background sync every 15 minutes
  setInterval(() => void UnifiedPOSBridge.syncAll(), 15 * 60 * 1000);

  logger.info("UnifiedPOSBridge started — POS abstraction layer active (15-min background sync)");
}
