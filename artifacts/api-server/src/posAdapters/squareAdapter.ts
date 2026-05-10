/**
 * squareAdapter — Real Square POS API integration.
 *
 * Phase E: Real POS Infrastructure.
 *
 * Connects to the Square Connect API v2 when credentials are provisioned.
 * Gates all calls on SQUARE_ACCESS_TOKEN + SQUARE_LOCATION_ID env vars.
 * When credentials are absent: logs a warning and returns empty arrays.
 * No fixture data — explicit failure over silent fake data.
 *
 * Square API base: https://connect.squareup.com
 * Docs: https://developer.squareup.com/reference/square
 *
 * Required secrets (add via environment-secrets skill):
 *   SQUARE_ACCESS_TOKEN — Square OAuth or personal access token
 *   SQUARE_LOCATION_ID  — Square location ID
 */

import type { BasePosAdapter, PosAdapterConfig, PosProduct, PosInventoryItem, PosOrder, PosSalesReport } from "./baseAdapter";
import { logger } from "../lib/logger";

const SQUARE_BASE = "https://connect.squareup.com";

function credentials(): { token: string; locationId: string } | null {
  const token      = process.env["SQUARE_ACCESS_TOKEN"];
  const locationId = process.env["SQUARE_LOCATION_ID"];
  if (!token || !locationId) {
    logger.warn("[SquareAdapter] SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID not set — returning empty results. Provision secrets to enable real Square POS.");
    return null;
  }
  return { token, locationId };
}

async function squareFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SQUARE_BASE}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Square-Version": "2024-01-17",
      "Content-Type":   "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Square API ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

interface SquareCatalogItemVariation { id: string; item_variation_data?: { price_money?: { amount: number } } }
interface SquareCatalogItem { id: string; item_data?: { name: string; category_id?: string; variations?: SquareCatalogItemVariation[] } }
interface SquareCatalogResponse  { objects?: SquareCatalogItem[] }
interface SquareInventoryCount   { catalog_object_id: string; quantity: string }
interface SquareInventoryResponse { counts?: SquareInventoryCount[] }
interface SquareOrderLineItem    { catalog_object_id?: string; name?: string; quantity: string; base_price_money?: { amount: number } }
interface SquareOrder            { id: string; reference_id?: string; line_items?: SquareOrderLineItem[]; total_money?: { amount: number }; state?: string; created_at?: string }
interface SquareOrdersResponse   { orders?: SquareOrder[] }

export const squareAdapter: BasePosAdapter & { simulated: false } = {
  name:        "square",
  displayName: "Square POS",
  connected:   false,
  simulated:   false,

  async syncProducts(_config: PosAdapterConfig): Promise<PosProduct[]> {
    const creds = credentials(); if (!creds) return [];
    try {
      const data = await squareFetch<SquareCatalogResponse>(`/v2/catalog/list?types=ITEM`, creds.token);
      const products: PosProduct[] = (data.objects ?? []).map(obj => {
        const variation = obj.item_data?.variations?.[0];
        return {
          id:         obj.id,
          name:       obj.item_data?.name ?? "Unknown",
          category:   obj.item_data?.category_id ?? "Uncategorized",
          priceCents: Number(variation?.item_variation_data?.price_money?.amount ?? 0),
        };
      });
      squareAdapter.connected = true;
      logger.info({ count: products.length }, "Square: products synced");
      return products;
    } catch (err) { squareAdapter.connected = false; logger.error({ err }, "Square: syncProducts failed"); return []; }
  },

  async syncInventory(_config: PosAdapterConfig): Promise<PosInventoryItem[]> {
    const creds    = credentials(); if (!creds) return [];
    const products = await squareAdapter.syncProducts(_config);
    if (!products.length) return [];
    try {
      const body = { location_ids: [creds.locationId], catalog_object_ids: products.map(p => p.id) };
      const data = await squareFetch<SquareInventoryResponse>(`/v2/inventory/counts/batch-retrieve`, creds.token, { method: "POST", body: JSON.stringify(body) });
      const countMap = new Map((data.counts ?? []).map(c => [c.catalog_object_id, Number(c.quantity)]));
      const result: PosInventoryItem[] = products.map(p => ({
        productId:   p.id,
        productName: p.name,
        quantity:    countMap.get(p.id) ?? 0,
        available:   (countMap.get(p.id) ?? 0) > 0,
        lastUpdated: new Date().toISOString(),
      }));
      squareAdapter.connected = true;
      logger.info({ count: result.length }, "Square: inventory synced");
      return result;
    } catch (err) { squareAdapter.connected = false; logger.error({ err }, "Square: syncInventory failed"); return []; }
  },

  async syncOrders(_config: PosAdapterConfig): Promise<PosOrder[]> {
    const creds = credentials(); if (!creds) return [];
    try {
      const body = {
        location_ids: [creds.locationId],
        query: { filter: { date_time_filter: { created_at: { start_at: new Date(Date.now() - 86400_000).toISOString() } } } },
      };
      const data = await squareFetch<SquareOrdersResponse>(`/v2/orders/search`, creds.token, { method: "POST", body: JSON.stringify(body) });
      const orders: PosOrder[] = (data.orders ?? []).map(o => ({
        id:          o.id,
        externalId:  o.reference_id ?? o.id,
        items:       (o.line_items ?? []).map(li => ({
          productId:  li.catalog_object_id ?? "",
          name:       li.name ?? "Item",
          quantity:   Number(li.quantity) || 1,
          priceCents: Number(li.base_price_money?.amount ?? 0),
        })),
        totalCents:  Number(o.total_money?.amount ?? 0),
        status:      o.state === "COMPLETED" ? "completed" : "open",
        createdAt:   o.created_at ?? new Date().toISOString(),
      }));
      squareAdapter.connected = true;
      logger.info({ count: orders.length }, "Square: orders synced");
      return orders;
    } catch (err) { squareAdapter.connected = false; logger.error({ err }, "Square: syncOrders failed"); return []; }
  },

  async pushOrder(_config: PosAdapterConfig, order: PosOrder): Promise<{ success: boolean; externalId?: string; error?: string }> {
    const creds = credentials();
    if (!creds) return { success: false, error: "Square credentials not configured" };
    try {
      const body = {
        idempotency_key: `novee-${order.id}`,
        order: {
          location_id: creds.locationId,
          reference_id: order.id,
          line_items: order.items.map(i => ({ catalog_object_id: i.productId || undefined, name: i.name, quantity: String(i.quantity), base_price_money: { amount: i.priceCents, currency: "USD" } })),
        },
      };
      const result = await squareFetch<{ order?: { id: string } }>(`/v2/orders`, creds.token, { method: "POST", body: JSON.stringify(body) });
      squareAdapter.connected = true;
      return { success: true, externalId: result.order?.id };
    } catch (err) { squareAdapter.connected = false; return { success: false, error: String(err) }; }
  },

  async pullReports(config: PosAdapterConfig, periodStart: string, periodEnd: string): Promise<PosSalesReport> {
    const orders  = await squareAdapter.syncOrders(config);
    const inRange = orders.filter(o => o.createdAt >= periodStart && o.createdAt <= periodEnd);
    const map     = new Map<string, { name: string; unitsSold: number; revenueCents: number }>();
    for (const o of inRange) {
      for (const i of o.items) {
        const e = map.get(i.productId) ?? { name: i.name, unitsSold: 0, revenueCents: 0 };
        e.unitsSold += i.quantity; e.revenueCents += i.priceCents * i.quantity;
        map.set(i.productId, e);
      }
    }
    return {
      periodStart, periodEnd,
      totalRevenueCents: inRange.reduce((s, o) => s + o.totalCents, 0),
      orderCount: inRange.length,
      topProducts: [...map.entries()].map(([productId, v]) => ({ productId, ...v })).sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 10),
    };
  },
};
