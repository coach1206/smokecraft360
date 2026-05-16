/**
 * square.adapter — Square POS universal integration adapter.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "../../lib/logger";
import type { UniversalPosAdapter, AdapterCapabilities, AdapterCredentials, PushOrderResult, TokenResponse } from "./base.adapter";
import type { UniversalInventoryItem } from "../schemas/universalInventory";
import type { UniversalMenuItem }      from "../schemas/universalMenu";
import type { UniversalOrder }         from "../schemas/universalOrder";

const SQUARE_BASE = "https://connect.squareup.com";

function squareCreds() {
  const token      = process.env["SQUARE_ACCESS_TOKEN"];
  const locationId = process.env["SQUARE_LOCATION_ID"];
  if (!token || !locationId) { logger.warn("[SquareAdapter] Credentials not set"); return null; }
  return { token, locationId };
}

async function sFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SQUARE_BASE}${path}`, {
    ...options,
    headers: {
      "Authorization":  `Bearer ${token}`,
      "Square-Version": "2024-01-17",
      "Content-Type":   "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) { const b = await res.text().catch(() => ""); throw new Error(`Square ${res.status} ${path}: ${b.slice(0, 200)}`); }
  return res.json() as Promise<T>;
}

interface SItem { id: string; item_data?: { name?: string; description?: string; variations?: { id: string; item_variation_data?: { name?: string; price_money?: { amount?: number }; sku?: string } }[]; category?: { name?: string } } }
interface SCount { catalog_object_id: string; quantity: string; location_id: string }
interface SOrder { id: string; reference_id?: string; total_money?: { amount?: number }; state?: string; created_at?: string; line_items?: { catalog_object_id?: string; name?: string; quantity?: string; base_price_money?: { amount?: number }; gross_sale_money?: { amount?: number } }[] }

export const squareUniversalAdapter: UniversalPosAdapter = {
  provider:    "square",
  displayName: "Square POS",
  capabilities: {
    supportsOAuth:         true,
    supportsWebhooks:      true,
    supportsMenuSync:      true,
    supportsInventorySync: true,
    supportsOrderPush:     true,
    supportsRefunds:       true,
    requiresLocationId:    true,
  } satisfies AdapterCapabilities,

  async syncInventory(_creds: AdapterCredentials, venueId: string): Promise<UniversalInventoryItem[]> {
    const c = squareCreds(); if (!c) return [];
    try {
      const now = new Date().toISOString();
      const catalog = await sFetch<{ objects?: SItem[] }>(
        `/v2/catalog/list?types=ITEM`, c.token,
      );
      const ids = (catalog.objects ?? []).flatMap(obj =>
        (obj.item_data?.variations ?? []).map(v => v.id),
      );
      if (!ids.length) return [];
      const counts = await sFetch<{ counts?: SCount[] }>(
        `/v2/inventory/counts/batch-retrieve`,
        c.token,
        { method: "POST", body: JSON.stringify({ catalog_object_ids: ids.slice(0, 100), location_ids: [c.locationId] }) },
      );
      const qtyMap = new Map((counts.counts ?? []).map(ct => [ct.catalog_object_id, parseInt(ct.quantity, 10)]));
      const items: UniversalInventoryItem[] = [];
      for (const obj of catalog.objects ?? []) {
        for (const v of obj.item_data?.variations ?? []) {
          const qty = qtyMap.get(v.id) ?? 0;
          items.push({
            posProductId: v.id, venueId, provider: "square",
            name: `${obj.item_data?.name ?? "Item"} — ${v.item_variation_data?.name ?? ""}`.trim().replace(/ — $/, ""),
            sku: v.item_variation_data?.sku,
            category: obj.item_data?.category?.name,
            quantity: Math.max(0, qty), available: qty > 0,
            priceCents: v.item_variation_data?.price_money?.amount ?? 0,
            reorderPoint: 0, unit: "each", lastSyncAt: now, meta: { catalogObjectId: obj.id },
          });
        }
      }
      return items;
    } catch (err) { logger.error({ err }, "Square: syncInventory failed"); return []; }
  },

  async syncMenuCatalog(_creds: AdapterCredentials, venueId: string): Promise<UniversalMenuItem[]> {
    const c = squareCreds(); if (!c) return [];
    try {
      const now     = new Date().toISOString();
      const catalog = await sFetch<{ objects?: SItem[] }>(`/v2/catalog/list?types=ITEM`, c.token);
      const items: UniversalMenuItem[] = [];
      let i = 0;
      for (const obj of catalog.objects ?? []) {
        for (const v of obj.item_data?.variations ?? []) {
          items.push({
            posItemId: v.id, venueId, provider: "square",
            name: `${obj.item_data?.name ?? "Item"} — ${v.item_variation_data?.name ?? ""}`.trim().replace(/ — $/, ""),
            sku: v.item_variation_data?.sku, category: obj.item_data?.category?.name,
            priceCents: v.item_variation_data?.price_money?.amount ?? 0,
            description: obj.item_data?.description,
            isTaxable: true, isAvailable: true, modifiers: [], allergens: [], tags: [],
            sortOrder: i++, syncedAt: now, meta: { catalogObjectId: obj.id },
          });
        }
      }
      return items;
    } catch (err) { logger.error({ err }, "Square: syncMenuCatalog failed"); return []; }
  },

  async pushOrder(_creds: AdapterCredentials, order: UniversalOrder): Promise<PushOrderResult> {
    const c = squareCreds();
    if (!c) return { success: false, provider: "square", error: "Credentials not configured" };
    try {
      const body = {
        idempotency_key: order.idempotencyKey ?? order.id,
        order: {
          location_id:    c.locationId,
          reference_id:   order.id,
          line_items:     order.items.map(i => ({
            catalog_object_id: i.posProductId || undefined,
            name:              i.name,
            quantity:          String(i.quantity),
            base_price_money:  { amount: i.unitCents, currency: "USD" },
          })),
        },
      };
      const result = await sFetch<{ order: { id: string } }>(
        "/v2/orders", c.token, { method: "POST", body: JSON.stringify(body) },
      );
      return { success: true, provider: "square", externalOrderId: result.order.id, rawResponse: result.order };
    } catch (err) { return { success: false, provider: "square", error: String(err) }; }
  },

  async syncOrders(_creds: AdapterCredentials, since?: Date): Promise<UniversalOrder[]> {
    const c = squareCreds(); if (!c) return [];
    try {
      const now       = new Date().toISOString();
      const startAt   = (since ?? new Date(Date.now() - 86400_000)).toISOString();
      const body      = { location_ids: [c.locationId], query: { filter: { date_time_filter: { created_at: { start_at: startAt } } }, sort: { sort_field: "CREATED_AT", sort_order: "DESC" } }, limit: 100 };
      const resp      = await sFetch<{ orders?: SOrder[] }>("/v2/orders/search", c.token, { method: "POST", body: JSON.stringify(body) });
      return (resp.orders ?? []).map(o => {
        const items = (o.line_items ?? []).map(li => ({
          posProductId: li.catalog_object_id ?? "", name: li.name ?? "Item",
          quantity: parseInt(li.quantity ?? "1", 10),
          unitCents: li.base_price_money?.amount ?? 0,
          totalCents: li.gross_sale_money?.amount ?? 0,
          modifiers: [] as { name: string; priceCents: number }[], meta: {} as Record<string, unknown>,
        }));
        return {
          id: crypto.randomUUID(), externalOrderId: o.reference_id ?? o.id,
          venueId: "unknown", provider: "square",
          status: o.state === "COMPLETED" ? "completed" as const : "open" as const,
          items, subtotalCents: items.reduce((s, i) => s + i.totalCents, 0),
          taxCents: 0, tipCents: 0, discountCents: 0,
          totalCents: o.total_money?.amount ?? 0, currency: "USD",
          pairingContext: {}, createdAt: o.created_at ?? now, updatedAt: now,
        };
      });
    } catch (err) { logger.error({ err }, "Square: syncOrders failed"); return []; }
  },

  getAuthorizationUrl(clientId: string, redirectUri: string, state: string): string {
    const scopes = "MERCHANT_PROFILE_READ,ITEMS_READ,ITEMS_WRITE,ORDERS_READ,ORDERS_WRITE,INVENTORY_READ,INVENTORY_WRITE";
    return `https://connect.squareup.com/oauth2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&session=false`;
  },

  async exchangeCode(clientId: string, clientSecret: string, code: string, redirectUri: string): Promise<TokenResponse> {
    const res = await fetch(`${SQUARE_BASE}/oauth2/token`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: redirectUri }),
    });
    if (!res.ok) throw new Error(`Square OAuth failed: ${res.status}`);
    const data = await res.json() as { access_token: string; refresh_token: string; expires_at: string };
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
  },

  async refreshToken(creds: AdapterCredentials): Promise<TokenResponse> {
    const clientId     = creds.clientId     ?? process.env["SQUARE_CLIENT_ID"]     ?? "";
    const clientSecret = creds.clientSecret ?? process.env["SQUARE_CLIENT_SECRET"] ?? "";
    if (!creds.refreshToken) throw new Error("No refresh token");
    const res = await fetch(`${SQUARE_BASE}/oauth2/token`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: "refresh_token", refresh_token: creds.refreshToken }),
    });
    if (!res.ok) throw new Error(`Square token refresh failed: ${res.status}`);
    const data = await res.json() as { access_token: string; refresh_token: string };
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
  },

  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>, secret: string): boolean {
    const header   = headers["x-square-hmacsha256-signature"];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided) return false;
    const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
    if (provided.length !== expected.length) return false;
    try { return timingSafeEqual(Buffer.from(provided, "base64"), Buffer.from(expected, "base64")); } catch { return false; }
  },
};
