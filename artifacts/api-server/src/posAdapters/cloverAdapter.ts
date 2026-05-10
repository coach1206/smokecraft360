/**
 * cloverAdapter — Real Clover POS API integration.
 *
 * Phase E: Real POS Infrastructure.
 *
 * Connects to the Clover REST API when credentials are provisioned.
 * Gates all calls on CLOVER_API_TOKEN + CLOVER_MERCHANT_ID env vars.
 * When credentials are absent: logs a warning and returns empty arrays.
 * No fixture data — explicit failure over silent fake data.
 *
 * Clover API base: https://api.clover.com
 * Docs: https://docs.clover.com/reference
 *
 * Required secrets (add via environment-secrets skill):
 *   CLOVER_API_TOKEN   — Clover API token (OAuth or merchant token)
 *   CLOVER_MERCHANT_ID — Clover merchant ID (mId)
 */

import type { BasePosAdapter, PosAdapterConfig, PosProduct, PosInventoryItem, PosOrder, PosSalesReport } from "./baseAdapter";
import { logger } from "../lib/logger";

const CLOVER_BASE = "https://api.clover.com";

function credentials(): { token: string; mId: string } | null {
  const token = process.env["CLOVER_API_TOKEN"];
  const mId   = process.env["CLOVER_MERCHANT_ID"];
  if (!token || !mId) {
    logger.warn("[CloverAdapter] CLOVER_API_TOKEN or CLOVER_MERCHANT_ID not set — returning empty results. Provision secrets to enable real Clover POS.");
    return null;
  }
  return { token, mId };
}

async function cloverFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${CLOVER_BASE}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Clover API ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

interface CloverItem      { id: string; name: string; price: number; sku?: string; category?: { name: string } }
interface CloverItemsResp { elements?: CloverItem[] }
interface CloverStock     { item: { id: string }; quantity: number }
interface CloverStocksResp { elements?: CloverStock[] }
interface CloverLineItem  { item?: { id: string; name: string }; name?: string; price: number; quantity?: number }
interface CloverOrder     { id: string; externalReferenceId?: string; total: number; paymentState?: string; createdTime: number; lineItems?: { elements?: CloverLineItem[] } }
interface CloverOrdersResp { elements?: CloverOrder[] }

export const cloverAdapter: BasePosAdapter & { simulated: false } = {
  name:        "clover",
  displayName: "Clover POS",
  connected:   false,
  simulated:   false,

  async syncProducts(_config: PosAdapterConfig): Promise<PosProduct[]> {
    const creds = credentials(); if (!creds) return [];
    try {
      const data = await cloverFetch<CloverItemsResp>(`/v3/merchants/${creds.mId}/items?expand=categories`, creds.token);
      const products: PosProduct[] = (data.elements ?? []).map(item => ({
        id:         item.id,
        name:       item.name,
        category:   item.category?.name ?? "Uncategorized",
        priceCents: Math.round(item.price ?? 0),
        sku:        item.sku,
      }));
      cloverAdapter.connected = true;
      logger.info({ count: products.length }, "Clover: products synced");
      return products;
    } catch (err) { cloverAdapter.connected = false; logger.error({ err }, "Clover: syncProducts failed"); return []; }
  },

  async syncInventory(_config: PosAdapterConfig): Promise<PosInventoryItem[]> {
    const creds    = credentials(); if (!creds) return [];
    const products = await cloverAdapter.syncProducts(_config);
    if (!products.length) return [];
    try {
      const data = await cloverFetch<CloverStocksResp>(`/v3/merchants/${creds.mId}/item_stocks`, creds.token);
      const stockMap = new Map((data.elements ?? []).map(s => [s.item.id, s.quantity]));
      const result: PosInventoryItem[] = products.map(p => ({
        productId:   p.id,
        productName: p.name,
        quantity:    stockMap.get(p.id) ?? 0,
        available:   (stockMap.get(p.id) ?? 0) > 0,
        lastUpdated: new Date().toISOString(),
      }));
      cloverAdapter.connected = true;
      logger.info({ count: result.length }, "Clover: inventory synced");
      return result;
    } catch (err) { cloverAdapter.connected = false; logger.error({ err }, "Clover: syncInventory failed"); return []; }
  },

  async syncOrders(_config: PosAdapterConfig): Promise<PosOrder[]> {
    const creds = credentials(); if (!creds) return [];
    try {
      const since = Date.now() - 86400_000;
      const data  = await cloverFetch<CloverOrdersResp>(
        `/v3/merchants/${creds.mId}/orders?filter=createdTime>=${since}&orderBy=createdTime DESC&limit=100&expand=lineItems`,
        creds.token,
      );
      const orders: PosOrder[] = (data.elements ?? []).map(o => ({
        id:          o.id,
        externalId:  o.externalReferenceId ?? o.id,
        items:       (o.lineItems?.elements ?? []).map(li => ({
          productId:  li.item?.id ?? "",
          name:       li.item?.name ?? li.name ?? "Item",
          quantity:   li.quantity ?? 1,
          priceCents: Math.round(li.price ?? 0),
        })),
        totalCents:  Math.round(o.total ?? 0),
        status:      o.paymentState === "PAID" ? "completed" : "open",
        createdAt:   new Date(o.createdTime).toISOString(),
      }));
      cloverAdapter.connected = true;
      logger.info({ count: orders.length }, "Clover: orders synced");
      return orders;
    } catch (err) { cloverAdapter.connected = false; logger.error({ err }, "Clover: syncOrders failed"); return []; }
  },

  async pushOrder(_config: PosAdapterConfig, order: PosOrder): Promise<{ success: boolean; externalId?: string; error?: string }> {
    const creds = credentials();
    if (!creds) return { success: false, error: "Clover credentials not configured" };
    try {
      const body = {
        externalReferenceId: order.id,
        lineItems: { elements: order.items.map(i => ({ item: { id: i.productId || undefined }, name: i.name, price: i.priceCents, unitQty: i.quantity * 1000 })) },
      };
      const result = await cloverFetch<{ id: string }>(`/v3/merchants/${creds.mId}/orders`, creds.token, { method: "POST", body: JSON.stringify(body) });
      cloverAdapter.connected = true;
      return { success: true, externalId: result.id };
    } catch (err) { cloverAdapter.connected = false; return { success: false, error: String(err) }; }
  },

  async pullReports(config: PosAdapterConfig, periodStart: string, periodEnd: string): Promise<PosSalesReport> {
    const orders  = await cloverAdapter.syncOrders(config);
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
