/**
 * inventorySync — Inventory synchronization layer.
 *
 * Pulls stock from the POS adapter for a venue, writes to pos_inventory_cache,
 * publishes to NeuralEventBus, updates the EEIS real-time inventory filter,
 * and logs every sync to pos_sync_logs.
 *
 * AI recommendations always read from getAvailableInventory() —
 * never from raw POS payloads.
 */

import { db, posConnectionsTable, posInventoryCacheTable, posSyncLogsTable } from "@workspace/db";
import { eq, and }   from "drizzle-orm";
import { logger }    from "../../lib/logger";
import { tokenManager } from "./tokenManager";
import { enqueueRetry } from "./retryQueue";
import { getUniversalAdapter } from "./posRouter";
import { NeuralEventBus }      from "../../services/neuralEventBus";
import { buildSnapshot, type UniversalInventorySnapshot } from "../schemas/universalInventory";

const CACHE_TTL_MS = 30 * 60 * 1000;
const memoryCache  = new Map<string, UniversalInventorySnapshot>();

export async function syncVenueInventory(venueId: string, force = false): Promise<UniversalInventorySnapshot | null> {
  const cached = memoryCache.get(venueId);
  if (!force && cached && new Date(cached.expiresAt) > new Date()) {
    return cached;
  }

  const connections = await db.select()
    .from(posConnectionsTable)
    .where(and(eq(posConnectionsTable.venueId, venueId), eq(posConnectionsTable.status, "active"), eq(posConnectionsTable.isDefault, true)))
    .limit(1);

  const conn = connections[0];
  if (!conn) {
    logger.warn({ venueId }, "inventorySync: no active POS connection");
    return cached ?? null;
  }

  const adapter = getUniversalAdapter(conn.provider);
  if (!adapter || !adapter.capabilities.supportsInventorySync) {
    logger.warn({ venueId, provider: conn.provider }, "inventorySync: adapter does not support inventory sync");
    return cached ?? null;
  }

  const creds = await tokenManager.get(conn.id, venueId);
  if (!creds || creds.isExpired) {
    logger.warn({ venueId, provider: conn.provider }, "inventorySync: no valid credentials");
    return cached ?? null;
  }

  const start = Date.now();
  try {
    const items = await adapter.syncInventory({
      accessToken: creds.accessToken, refreshToken: creds.refreshToken,
      apiSecret: creds.apiSecret, merchantId: conn.merchantId ?? undefined,
      locationId: conn.locationId ?? undefined,
    }, venueId);

    const snapshot = buildSnapshot(venueId, conn.provider, items, CACHE_TTL_MS);
    memoryCache.set(venueId, snapshot);

    await db.delete(posInventoryCacheTable)
      .where(and(eq(posInventoryCacheTable.venueId, venueId), eq(posInventoryCacheTable.connectionId, conn.id)));

    if (items.length > 0) {
      await db.insert(posInventoryCacheTable).values(
        items.map(item => ({
          connectionId: conn.id,
          venueId,
          provider:     conn.provider,
          productId:    item.posProductId,
          productName:  item.name,
          quantity:     item.quantity,
          available:    item.available,
          priceCents:   item.priceCents ?? null,
          sku:          item.sku ?? null,
          expiresAt:    new Date(snapshot.expiresAt),
        })),
      );
    }

    await db.insert(posSyncLogsTable).values({
      connectionId: conn.id, venueId, provider: conn.provider,
      syncType: "inventory", status: "success",
      itemCount: items.length, durationMs: Date.now() - start,
      triggeredBy: "background",
    });

    await db.update(posConnectionsTable)
      .set({ lastSyncAt: new Date() })
      .where(eq(posConnectionsTable.id, conn.id));

    NeuralEventBus.publish("pos.inventory_synced", {
      venueId, provider: conn.provider, itemCount: items.length,
      outOfStockCount: snapshot.outOfStockIds.length,
      lowStockCount:   snapshot.lowStockIds.length,
    }, venueId);

    logger.info({ venueId, provider: conn.provider, itemCount: items.length, durationMs: Date.now() - start }, "Inventory synced");
    return snapshot;
  } catch (err) {
    const errorMessage = String(err);
    logger.error({ err, venueId, provider: conn.provider }, "inventorySync: sync failed");

    await db.insert(posSyncLogsTable).values({
      connectionId: conn.id, venueId, provider: conn.provider,
      syncType: "inventory", status: "failed",
      itemCount: 0, durationMs: Date.now() - start,
      errorMessage, triggeredBy: "background",
    });

    await enqueueRetry({
      connectionId:  conn.id,
      venueId,
      provider:      conn.provider,
      operation:     "sync_inventory",
      payload:       { venueId, connectionId: conn.id },
      idempotencyKey: `sync_inventory:${venueId}:${Date.now()}`,
    });

    return cached ?? null;
  }
}

export function getAvailableInventory(venueId: string) {
  const snap = memoryCache.get(venueId);
  if (!snap) return [];
  return snap.items.filter(i => i.available && i.quantity > 0);
}

export function getOutOfStockIds(venueId: string): Set<string> {
  const snap = memoryCache.get(venueId);
  if (!snap) return new Set();
  return new Set(snap.outOfStockIds);
}

export function getLowStockIds(venueId: string): Set<string> {
  const snap = memoryCache.get(venueId);
  if (!snap) return new Set();
  return new Set(snap.lowStockIds);
}

export function getInventorySnapshot(venueId: string): UniversalInventorySnapshot | null {
  return memoryCache.get(venueId) ?? null;
}
