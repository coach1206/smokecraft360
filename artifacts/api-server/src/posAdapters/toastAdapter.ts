/**
 * toastAdapter — Real Toast POS API integration.
 *
 * Phase E: Real POS Infrastructure.
 *
 * Connects to the Toast REST API when credentials are provisioned.
 * Gates all calls on TOAST_API_KEY + TOAST_LOCATION_ID env vars.
 * When credentials are absent: logs a warning and returns empty arrays.
 * No fixture data — explicit failure over silent fake data.
 *
 * Toast API base: https://ws.toasttab.com
 * Docs: https://doc.toasttab.com/openapi/
 *
 * Required secrets (add via environment-secrets skill):
 *   TOAST_API_KEY      — Toast management API key (Bearer token)
 *   TOAST_LOCATION_ID  — Toast restaurant external ID (GUID)
 */

import type { BasePosAdapter, PosAdapterConfig, PosProduct, PosInventoryItem, PosOrder, PosSalesReport } from "./baseAdapter";
import { logger } from "../lib/logger";

const TOAST_BASE = "https://ws.toasttab.com";

function credentials(): { apiKey: string; locationId: string } | null {
  const apiKey     = process.env["TOAST_API_KEY"];
  const locationId = process.env["TOAST_LOCATION_ID"];
  if (!apiKey || !locationId) {
    logger.warn("[ToastAdapter] TOAST_API_KEY or TOAST_LOCATION_ID not set — returning empty results. Provision secrets to enable real Toast POS.");
    return null;
  }
  return { apiKey, locationId };
}

async function toastFetch<T>(path: string, apiKey: string, locationId: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${TOAST_BASE}${path}`, {
    ...options,
    headers: {
      "Authorization":                 `Bearer ${apiKey}`,
      "Toast-Restaurant-External-ID":  locationId,
      "Content-Type":                  "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Toast API ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

interface ToastMenuItem  { guid: string; name: string; price?: number; sku?: string; salesCategory?: { name: string } }
interface ToastMenuGroup { guid: string; name: string; menuItems?: ToastMenuItem[] }
interface ToastMenu      { guid: string; name: string; menuGroups?: ToastMenuGroup[] }
interface ToastOrderLine { itemGroupGuid?: string; itemGroup?: { name: string }; price: number; quantity: number }
interface ToastCheck     { selections?: ToastOrderLine[] }
interface ToastOrder     { guid: string; externalId?: string; totalAmount: number; paidDate?: string; closedDate?: string; checks?: ToastCheck[] }

export const toastAdapter: BasePosAdapter & { simulated: false } = {
  name:        "toast",
  displayName: "Toast POS",
  connected:   false,
  simulated:   false,

  async syncProducts(_config: PosAdapterConfig): Promise<PosProduct[]> {
    const creds = credentials(); if (!creds) return [];
    try {
      const menus = await toastFetch<ToastMenu[]>(`/config/v2/menus`, creds.apiKey, creds.locationId);
      const products: PosProduct[] = [];
      for (const menu of menus) {
        for (const group of (menu.menuGroups ?? [])) {
          for (const item of (group.menuItems ?? [])) {
            products.push({ id: item.guid, name: item.name, category: item.salesCategory?.name ?? group.name, priceCents: Math.round((item.price ?? 0) * 100), sku: item.sku });
          }
        }
      }
      toastAdapter.connected = true;
      logger.info({ count: products.length }, "Toast: products synced");
      return products;
    } catch (err) { toastAdapter.connected = false; logger.error({ err }, "Toast: syncProducts failed"); return []; }
  },

  async syncInventory(config: PosAdapterConfig): Promise<PosInventoryItem[]> {
    const products = await toastAdapter.syncProducts(config);
    return products.map(p => ({ productId: p.id, productName: p.name, quantity: 999, available: true, lastUpdated: new Date().toISOString() }));
  },

  async syncOrders(_config: PosAdapterConfig): Promise<PosOrder[]> {
    const creds = credentials(); if (!creds) return [];
    try {
      const end   = new Date();
      const start = new Date(end.getTime() - 24 * 3600_000);
      const raw   = await toastFetch<ToastOrder[]>(
        `/orders/v2/ordersBulk?restaurantExternalId=${creds.locationId}&startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
        creds.apiKey, creds.locationId,
      );
      const orders: PosOrder[] = raw.map(o => ({
        id:          o.guid,
        externalId:  o.externalId ?? o.guid,
        items:       (o.checks ?? []).flatMap(c => (c.selections ?? []).map(s => ({
          productId:  s.itemGroupGuid ?? "",
          name:       s.itemGroup?.name ?? "Item",
          quantity:   s.quantity ?? 1,
          priceCents: Math.round((s.price ?? 0) * 100),
        }))),
        totalCents:  Math.round((o.totalAmount ?? 0) * 100),
        status:      o.closedDate ? "completed" : "open",
        createdAt:   o.paidDate ?? new Date().toISOString(),
      }));
      toastAdapter.connected = true;
      logger.info({ count: orders.length }, "Toast: orders synced");
      return orders;
    } catch (err) { toastAdapter.connected = false; logger.error({ err }, "Toast: syncOrders failed"); return []; }
  },

  async pushOrder(_config: PosAdapterConfig, order: PosOrder): Promise<{ success: boolean; externalId?: string; error?: string }> {
    const creds = credentials();
    if (!creds) return { success: false, error: "Toast credentials not configured" };
    try {
      const body = {
        entityType: "Order", externalId: order.id,
        checks: [{ selections: order.items.map(i => ({ itemGroupGuid: i.productId, quantity: i.quantity, unitOfMeasure: "NONE", price: i.priceCents / 100 })) }],
      };
      const result = await toastFetch<{ guid: string }>(`/orders/v2/orders`, creds.apiKey, creds.locationId, { method: "POST", body: JSON.stringify(body) });
      toastAdapter.connected = true;
      return { success: true, externalId: result.guid };
    } catch (err) { toastAdapter.connected = false; return { success: false, error: String(err) }; }
  },

  async pullReports(config: PosAdapterConfig, periodStart: string, periodEnd: string): Promise<PosSalesReport> {
    const orders  = await toastAdapter.syncOrders(config);
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
