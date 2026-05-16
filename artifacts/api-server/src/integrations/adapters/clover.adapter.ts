/**
 * clover.adapter — Clover POS universal integration adapter.
 * Wraps existing cloverAdapter + adds universal schemas, OAuth, and webhook verification.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "../../lib/logger";
import type { UniversalPosAdapter, AdapterCapabilities, AdapterCredentials, PushOrderResult, TokenResponse } from "./base.adapter";
import type { UniversalInventoryItem } from "../schemas/universalInventory";
import type { UniversalMenuItem }      from "../schemas/universalMenu";
import type { UniversalOrder }         from "../schemas/universalOrder";

const CLOVER_BASE    = "https://api.clover.com";
const CLOVER_SANDBOX = "https://sandbox.dev.clover.com";

function cloverCreds() {
  const token = process.env["CLOVER_API_TOKEN"];
  const mId   = process.env["CLOVER_MERCHANT_ID"];
  if (!token || !mId) { logger.warn("[CloverAdapter] Credentials not set"); return null; }
  return { token, mId };
}

async function cFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${CLOVER_BASE}${path}`, {
    ...options,
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  if (!res.ok) { const b = await res.text().catch(() => ""); throw new Error(`Clover ${res.status} ${path}: ${b.slice(0, 200)}`); }
  return res.json() as Promise<T>;
}

interface CItem      { id: string; name: string; price: number; sku?: string; category?: { name: string }; imageUrl?: string }
interface CItemsResp { elements?: CItem[] }
interface CStock     { item: { id: string }; quantity: number }
interface CStocksResp { elements?: CStock[] }

export const cloverUniversalAdapter: UniversalPosAdapter = {
  provider:    "clover",
  displayName: "Clover POS",
  capabilities: {
    supportsOAuth:         true,
    supportsWebhooks:      true,
    supportsMenuSync:      true,
    supportsInventorySync: true,
    supportsOrderPush:     true,
    supportsRefunds:       true,
    requiresLocationId:    false,
  } satisfies AdapterCapabilities,

  async syncInventory(_creds: AdapterCredentials, venueId: string): Promise<UniversalInventoryItem[]> {
    const c = cloverCreds(); if (!c) return [];
    try {
      const now = new Date().toISOString();
      const data    = await cFetch<CItemsResp>(`/v3/merchants/${c.mId}/items?expand=categories`, c.token);
      const stocks  = await cFetch<CStocksResp>(`/v3/merchants/${c.mId}/item_stocks`, c.token);
      const stockMap = new Map((stocks.elements ?? []).map(s => [s.item.id, s.quantity]));
      return (data.elements ?? []).map(item => ({
        posProductId: item.id, venueId, provider: "clover",
        name: item.name, sku: item.sku, category: item.category?.name,
        quantity: stockMap.get(item.id) ?? 0,
        available: (stockMap.get(item.id) ?? 0) > 0,
        priceCents: Math.round(item.price ?? 0),
        reorderPoint: 0, unit: "each", lastSyncAt: now, meta: {},
      }));
    } catch (err) { logger.error({ err }, "Clover: syncInventory failed"); return []; }
  },

  async syncMenuCatalog(_creds: AdapterCredentials, venueId: string): Promise<UniversalMenuItem[]> {
    const c = cloverCreds(); if (!c) return [];
    try {
      const now  = new Date().toISOString();
      const data = await cFetch<CItemsResp>(`/v3/merchants/${c.mId}/items?expand=categories`, c.token);
      return (data.elements ?? []).map((item, i) => ({
        posItemId: item.id, venueId, provider: "clover",
        name: item.name, sku: item.sku, category: item.category?.name,
        priceCents: Math.round(item.price ?? 0),
        isTaxable: true, isAvailable: true, modifiers: [], allergens: [], tags: [],
        sortOrder: i, syncedAt: now, meta: {},
      }));
    } catch (err) { logger.error({ err }, "Clover: syncMenuCatalog failed"); return []; }
  },

  async pushOrder(_creds: AdapterCredentials, order: UniversalOrder): Promise<PushOrderResult> {
    const c = cloverCreds();
    if (!c) return { success: false, provider: "clover", error: "Credentials not configured" };
    try {
      const body = {
        externalReferenceId: order.id,
        lineItems: { elements: order.items.map(i => ({ item: { id: i.posProductId || undefined }, name: i.name, price: i.unitCents, unitQty: i.quantity * 1000 })) },
      };
      const result = await cFetch<{ id: string }>(`/v3/merchants/${c.mId}/orders`, c.token, { method: "POST", body: JSON.stringify(body) });
      return { success: true, provider: "clover", externalOrderId: result.id, rawResponse: result };
    } catch (err) { return { success: false, provider: "clover", error: String(err) }; }
  },

  async syncOrders(_creds: AdapterCredentials, since?: Date): Promise<UniversalOrder[]> {
    const c = cloverCreds(); if (!c) return [];
    try {
      const since_ms = since ? since.getTime() : Date.now() - 86400_000;
      const data = await cFetch<{ elements?: { id: string; externalReferenceId?: string; total: number; paymentState?: string; createdTime: number; lineItems?: { elements?: { item?: { id: string; name: string }; name?: string; price: number; quantity?: number }[] } }[] }>(
        `/v3/merchants/${c.mId}/orders?filter=createdTime>=${since_ms}&orderBy=createdTime DESC&limit=100&expand=lineItems`,
        c.token,
      );
      const now = new Date().toISOString();
      return (data.elements ?? []).map(o => {
        const items = (o.lineItems?.elements ?? []).map(li => ({
          posProductId: li.item?.id ?? "", name: li.item?.name ?? li.name ?? "Item",
          quantity: li.quantity ?? 1, unitCents: Math.round(li.price ?? 0),
          totalCents: Math.round(li.price ?? 0) * (li.quantity ?? 1),
          modifiers: [] as { name: string; priceCents: number }[], meta: {} as Record<string, unknown>,
        }));
        return {
          id: crypto.randomUUID(), externalOrderId: o.externalReferenceId ?? o.id,
          venueId: "unknown", provider: "clover",
          status: o.paymentState === "PAID" ? "completed" as const : "open" as const,
          items, subtotalCents: items.reduce((s, i) => s + i.totalCents, 0),
          taxCents: 0, tipCents: 0, discountCents: 0,
          totalCents: Math.round(o.total ?? 0), currency: "USD",
          pairingContext: {},
          createdAt: new Date(o.createdTime).toISOString(), updatedAt: now,
        };
      });
    } catch (err) { logger.error({ err }, "Clover: syncOrders failed"); return []; }
  },

  getAuthorizationUrl(clientId: string, redirectUri: string, state: string): string {
    return `${CLOVER_SANDBOX}/oauth/v2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  },

  async exchangeCode(clientId: string, clientSecret: string, code: string, _redirectUri: string): Promise<TokenResponse> {
    const res = await fetch(`${CLOVER_SANDBOX}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    if (!res.ok) throw new Error(`Clover OAuth failed: ${res.status}`);
    const data = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number };
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
  },

  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>, secret: string): boolean {
    const header   = headers["x-clover-signature"];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided) return false;
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (provided.length !== expected.length) return false;
    try { return timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex")); } catch { return false; }
  },
};
