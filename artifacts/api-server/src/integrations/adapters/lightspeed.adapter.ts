/**
 * lightspeed.adapter — Lightspeed Restaurant POS universal integration adapter.
 *
 * Lightspeed Restaurant (L-Series) uses OAuth 2.0 + REST API.
 * Required env: LIGHTSPEED_ACCESS_TOKEN, LIGHTSPEED_ACCOUNT_ID, LIGHTSPEED_LOCATION_ID
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "../../lib/logger";
import type { UniversalPosAdapter, AdapterCapabilities, AdapterCredentials, PushOrderResult, TokenResponse } from "./base.adapter";
import type { UniversalInventoryItem } from "../schemas/universalInventory";
import type { UniversalMenuItem }      from "../schemas/universalMenu";
import type { UniversalOrder }         from "../schemas/universalOrder";

const LS_BASE = "https://api.lightspeedapp.com";

function lsCreds() {
  const token      = process.env["LIGHTSPEED_ACCESS_TOKEN"];
  const accountId  = process.env["LIGHTSPEED_ACCOUNT_ID"];
  const locationId = process.env["LIGHTSPEED_LOCATION_ID"];
  if (!token || !accountId) { logger.warn("[LightspeedAdapter] Credentials not set"); return null; }
  return { token, accountId, locationId: locationId ?? "" };
}

async function lsFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${LS_BASE}${path}`, {
    ...options,
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  if (!res.ok) { const b = await res.text().catch(() => ""); throw new Error(`Lightspeed ${res.status} ${path}: ${b.slice(0, 200)}`); }
  return res.json() as Promise<T>;
}

interface LSItem { itemID: string; description: string; defaultCost?: number; itemType?: string; categoryID?: string; customSku?: string }
interface LSItemMatrix { itemMatrixID: string; description: string; Category?: { name: string } }

export const lightspeedUniversalAdapter: UniversalPosAdapter = {
  provider:    "lightspeed",
  displayName: "Lightspeed POS",
  capabilities: {
    supportsOAuth:         true,
    supportsWebhooks:      true,
    supportsMenuSync:      true,
    supportsInventorySync: true,
    supportsOrderPush:     true,
    supportsRefunds:       false,
    requiresLocationId:    true,
  } satisfies AdapterCapabilities,

  async syncInventory(_creds: AdapterCredentials, venueId: string): Promise<UniversalInventoryItem[]> {
    const c = lsCreds(); if (!c) return [];
    try {
      const now  = new Date().toISOString();
      const resp = await lsFetch<{ Item?: LSItem[] }>(`/API/Account/${c.accountId}/Item.json?limit=250`, c.token);
      return (resp.Item ?? []).map(item => ({
        posProductId: item.itemID, venueId, provider: "lightspeed",
        name: item.description, sku: item.customSku,
        quantity: 0, available: true,
        priceCents: Math.round((item.defaultCost ?? 0) * 100),
        reorderPoint: 0, unit: "each", lastSyncAt: now, meta: {},
      }));
    } catch (err) { logger.error({ err }, "Lightspeed: syncInventory failed"); return []; }
  },

  async syncMenuCatalog(_creds: AdapterCredentials, venueId: string): Promise<UniversalMenuItem[]> {
    const c = lsCreds(); if (!c) return [];
    try {
      const now  = new Date().toISOString();
      const resp = await lsFetch<{ Item?: LSItem[] }>(`/API/Account/${c.accountId}/Item.json?limit=250&load_relations=["ItemMatrix"]`, c.token);
      return (resp.Item ?? []).map((item, i) => ({
        posItemId: item.itemID, venueId, provider: "lightspeed",
        name: item.description, sku: item.customSku,
        priceCents: Math.round((item.defaultCost ?? 0) * 100),
        isTaxable: true, isAvailable: true, modifiers: [], allergens: [], tags: [],
        sortOrder: i, syncedAt: now, meta: {},
      }));
    } catch (err) { logger.error({ err }, "Lightspeed: syncMenuCatalog failed"); return []; }
  },

  async pushOrder(_creds: AdapterCredentials, order: UniversalOrder): Promise<PushOrderResult> {
    const c = lsCreds();
    if (!c) return { success: false, provider: "lightspeed", error: "Credentials not configured" };
    try {
      const body = {
        Sale: {
          referenceNumber: order.id,
          SaleLines: {
            SaleLine: order.items.map(i => ({
              itemID: i.posProductId, unitQuantity: i.quantity, unitPrice: (i.unitCents / 100).toFixed(2),
            })),
          },
        },
      };
      const result = await lsFetch<{ Sale: { saleID: string } }>(
        `/API/Account/${c.accountId}/Sale.json`, c.token,
        { method: "POST", body: JSON.stringify(body) },
      );
      return { success: true, provider: "lightspeed", externalOrderId: result.Sale.saleID, rawResponse: result.Sale };
    } catch (err) { return { success: false, provider: "lightspeed", error: String(err) }; }
  },

  async syncOrders(_creds: AdapterCredentials, since?: Date): Promise<UniversalOrder[]> {
    const c = lsCreds(); if (!c) return [];
    try {
      const now      = new Date().toISOString();
      const resp     = await lsFetch<{ Sale?: { saleID: string; referenceNumber?: string; calcTotal?: number; completed?: string; timeStamp?: string; SaleLines?: { SaleLine?: { itemID?: string; itemDescription?: string; unitQuantity?: number; unitPrice?: string }[] } }[] }>(
        `/API/Account/${c.accountId}/Sale.json?limit=100`, c.token,
      );
      return (resp.Sale ?? []).map(sale => {
        const items = (sale.SaleLines?.SaleLine ?? []).map(sl => ({
          posProductId: sl.itemID ?? "", name: sl.itemDescription ?? "Item",
          quantity: sl.unitQuantity ?? 1,
          unitCents: Math.round(parseFloat(sl.unitPrice ?? "0") * 100),
          totalCents: Math.round(parseFloat(sl.unitPrice ?? "0") * 100) * (sl.unitQuantity ?? 1),
          modifiers: [] as { name: string; priceCents: number }[], meta: {} as Record<string, unknown>,
        }));
        return {
          id: crypto.randomUUID(), externalOrderId: sale.referenceNumber ?? sale.saleID,
          venueId: "unknown", provider: "lightspeed",
          status: sale.completed === "true" ? "completed" as const : "open" as const,
          items, subtotalCents: items.reduce((s, i) => s + i.totalCents, 0),
          taxCents: 0, tipCents: 0, discountCents: 0,
          totalCents: Math.round((sale.calcTotal ?? 0) * 100), currency: "USD",
          pairingContext: {}, createdAt: sale.timeStamp ?? now, updatedAt: now,
        };
      });
    } catch (err) { logger.error({ err }, "Lightspeed: syncOrders failed"); return []; }
  },

  getAuthorizationUrl(clientId: string, redirectUri: string, state: string): string {
    return `https://cloud.lightspeedapp.com/oauth/authorize.php?response_type=code&client_id=${clientId}&scope=employee%3Aall&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  },

  async exchangeCode(clientId: string, clientSecret: string, code: string, redirectUri: string): Promise<TokenResponse> {
    const res = await fetch("https://cloud.lightspeedapp.com/oauth/access_token.php", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: redirectUri }),
    });
    if (!res.ok) throw new Error(`Lightspeed OAuth failed: ${res.status}`);
    const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
  },

  async refreshToken(creds: AdapterCredentials): Promise<TokenResponse> {
    const clientId     = creds.clientId     ?? process.env["LIGHTSPEED_CLIENT_ID"]     ?? "";
    const clientSecret = creds.clientSecret ?? process.env["LIGHTSPEED_CLIENT_SECRET"] ?? "";
    if (!creds.refreshToken) throw new Error("No refresh token");
    const res = await fetch("https://cloud.lightspeedapp.com/oauth/access_token.php", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: creds.refreshToken, grant_type: "refresh_token" }),
    });
    if (!res.ok) throw new Error(`Lightspeed refresh failed: ${res.status}`);
    const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
  },

  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>, secret: string): boolean {
    const header   = headers["x-lightspeed-signature"];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided) return false;
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (provided.length !== expected.length) return false;
    try { return timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex")); } catch { return false; }
  },
};
