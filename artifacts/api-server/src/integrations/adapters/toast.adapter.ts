/**
 * toast.adapter — Toast POS universal integration adapter.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "../../lib/logger";
import type { UniversalPosAdapter, AdapterCapabilities, AdapterCredentials, PushOrderResult, TokenResponse } from "./base.adapter";
import type { UniversalInventoryItem } from "../schemas/universalInventory";
import type { UniversalMenuItem }      from "../schemas/universalMenu";
import type { UniversalOrder }         from "../schemas/universalOrder";

const TOAST_BASE = "https://ws.toasttab.com";

function toastCreds() {
  const apiKey     = process.env["TOAST_API_KEY"];
  const locationId = process.env["TOAST_LOCATION_ID"];
  if (!apiKey || !locationId) { logger.warn("[ToastAdapter] Credentials not set"); return null; }
  return { apiKey, locationId };
}

async function tFetch<T>(path: string, apiKey: string, locationId: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${TOAST_BASE}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Toast-Restaurant-External-ID": locationId,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) { const b = await res.text().catch(() => ""); throw new Error(`Toast ${res.status} ${path}: ${b.slice(0, 200)}`); }
  return res.json() as Promise<T>;
}

interface TMenuItem { guid: string; name: string; price?: number; sku?: string; salesCategory?: { name: string } }
interface TMenuGroup { guid: string; name: string; menuItems?: TMenuItem[] }
interface TMenu     { guid: string; name: string; menuGroups?: TMenuGroup[] }
interface TOrder    { guid: string; externalId?: string; totalAmount: number; paidDate?: string; checks?: { selections?: { itemGroup?: { name: string }; price: number; quantity: number; itemGroupGuid?: string }[] }[] }

export const toastUniversalAdapter: UniversalPosAdapter = {
  provider:    "toast",
  displayName: "Toast POS",
  capabilities: {
    supportsOAuth:         true,
    supportsWebhooks:      true,
    supportsMenuSync:      true,
    supportsInventorySync: false,
    supportsOrderPush:     true,
    supportsRefunds:       true,
    requiresLocationId:    true,
  } satisfies AdapterCapabilities,

  async syncInventory(_creds: AdapterCredentials, venueId: string): Promise<UniversalInventoryItem[]> {
    const items = await toastUniversalAdapter.syncMenuCatalog(_creds, venueId);
    const now = new Date().toISOString();
    return items.map(i => ({
      posProductId: i.posItemId, venueId, provider: "toast",
      name: i.name, sku: i.sku, category: i.category,
      quantity: 999, available: true, priceCents: i.priceCents,
      reorderPoint: 0, unit: "each", lastSyncAt: now, meta: {},
    }));
  },

  async syncMenuCatalog(_creds: AdapterCredentials, venueId: string): Promise<UniversalMenuItem[]> {
    const c = toastCreds(); if (!c) return [];
    try {
      const now    = new Date().toISOString();
      const menus  = await tFetch<TMenu[]>("/menus/v2/menus", c.apiKey, c.locationId);
      const items: UniversalMenuItem[] = [];
      let sortOrder = 0;
      for (const menu of menus) {
        for (const group of menu.menuGroups ?? []) {
          for (const item of group.menuItems ?? []) {
            items.push({
              posItemId: item.guid, venueId, provider: "toast",
              name: item.name, sku: item.sku, category: group.name,
              priceCents: Math.round((item.price ?? 0) * 100),
              isTaxable: true, isAvailable: true, modifiers: [], allergens: [], tags: [],
              sortOrder: sortOrder++, syncedAt: now, meta: { menuGuid: menu.guid },
            });
          }
        }
      }
      return items;
    } catch (err) { logger.error({ err }, "Toast: syncMenuCatalog failed"); return []; }
  },

  async pushOrder(_creds: AdapterCredentials, order: UniversalOrder): Promise<PushOrderResult> {
    const c = toastCreds();
    if (!c) return { success: false, provider: "toast", error: "Credentials not configured" };
    try {
      const body = {
        externalId: order.id,
        selections: order.items.map(i => ({
          itemGroupGuid: i.posProductId,
          quantity:      i.quantity,
          itemGuid:      i.posProductId,
        })),
      };
      const result = await tFetch<{ guid: string }>(
        "/orders/v2/orders", c.apiKey, c.locationId,
        { method: "POST", body: JSON.stringify(body) },
      );
      return { success: true, provider: "toast", externalOrderId: result.guid, rawResponse: result };
    } catch (err) { return { success: false, provider: "toast", error: String(err) }; }
  },

  async syncOrders(_creds: AdapterCredentials, since?: Date): Promise<UniversalOrder[]> {
    const c = toastCreds(); if (!c) return [];
    try {
      const startDate = (since ?? new Date(Date.now() - 86400_000)).toISOString();
      const orders = await tFetch<TOrder[]>(
        `/orders/v2/orders?startDate=${startDate}&limit=100`, c.apiKey, c.locationId,
      );
      const now = new Date().toISOString();
      return orders.map(o => {
        const rawItems = o.checks?.flatMap(ch => ch.selections ?? []) ?? [];
        const items = rawItems.map(sel => ({
          posProductId: sel.itemGroupGuid ?? "", name: sel.itemGroup?.name ?? "Item",
          quantity: sel.quantity, unitCents: Math.round(sel.price * 100),
          totalCents: Math.round(sel.price * 100) * sel.quantity,
          modifiers: [] as { name: string; priceCents: number }[], meta: {} as Record<string, unknown>,
        }));
        return {
          id: crypto.randomUUID(), externalOrderId: o.externalId ?? o.guid,
          venueId: "unknown", provider: "toast",
          status: o.paidDate ? "completed" as const : "open" as const,
          items, subtotalCents: items.reduce((s, i) => s + i.totalCents, 0),
          taxCents: 0, tipCents: 0, discountCents: 0,
          totalCents: Math.round(o.totalAmount * 100), currency: "USD",
          pairingContext: {}, createdAt: now, updatedAt: now,
        };
      });
    } catch (err) { logger.error({ err }, "Toast: syncOrders failed"); return []; }
  },

  async exchangeCode(clientId: string, clientSecret: string, code: string, redirectUri: string): Promise<TokenResponse> {
    const res = await fetch(`${TOAST_BASE}/authentication/v1/authentication/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret, userAccessType: "TOAST_MACHINE_CLIENT" }),
    });
    if (!res.ok) throw new Error(`Toast auth failed: ${res.status}`);
    const data = await res.json() as { token: { accessToken: string } };
    return { accessToken: data.token.accessToken };
  },

  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>, secret: string): boolean {
    const header   = headers["toast-notification-timestamp"];
    const sigHead  = headers["x-toast-signature"];
    const provided = Array.isArray(sigHead) ? sigHead[0] : sigHead;
    if (!provided || !header) return false;
    const ts       = Array.isArray(header) ? header[0] : header;
    const expected = createHmac("sha256", secret).update(`${ts}.${rawBody.toString("utf8")}`).digest("hex");
    if (provided.length !== expected.length) return false;
    try { return timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex")); } catch { return false; }
  },
};
