/**
 * shopify.adapter — Shopify POS universal integration adapter.
 *
 * Connects to the Shopify Admin REST API (for POS-enabled Shopify stores).
 * Handles inventory, product catalog, and order push via Shopify's
 * Order/Draft Order API. Webhook verification uses HMAC-SHA256.
 *
 * Required env vars (set via environment-secrets):
 *   SHOPIFY_ACCESS_TOKEN  — Shopify Admin API access token
 *   SHOPIFY_SHOP_DOMAIN   — e.g. my-lounge.myshopify.com
 *   SHOPIFY_LOCATION_ID   — Shopify location GID (for POS inventory)
 *   SHOPIFY_WEBHOOK_SECRET — for HMAC-SHA256 webhook verification
 *
 * Shopify API version: 2024-01
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "../../lib/logger";
import type { UniversalPosAdapter, AdapterCapabilities, AdapterCredentials, PushOrderResult, TokenResponse } from "./base.adapter";
import type { UniversalInventoryItem } from "../schemas/universalInventory";
import type { UniversalMenuItem }      from "../schemas/universalMenu";
import type { UniversalOrder }         from "../schemas/universalOrder";

const API_VERSION = "2024-01";

interface ShopifyProduct {
  id:       number;
  title:    string;
  variants: { id: number; sku?: string; price: string; inventory_quantity?: number }[];
  product_type?: string;
  images?: { src: string }[];
}
interface ShopifyInventoryLevel {
  inventory_item_id: number;
  location_id:       number;
  available:         number;
}
interface ShopifyOrder {
  id:             number;
  order_number:   number;
  total_price:    string;
  financial_status: string;
  created_at:     string;
  line_items:     { variant_id?: number; title: string; quantity: number; price: string; sku?: string }[];
}

function shopifyCreds(): { token: string; domain: string; locationId: string } | null {
  const token      = process.env["SHOPIFY_ACCESS_TOKEN"];
  const domain     = process.env["SHOPIFY_SHOP_DOMAIN"];
  const locationId = process.env["SHOPIFY_LOCATION_ID"];
  if (!token || !domain || !locationId) {
    logger.warn("[ShopifyAdapter] SHOPIFY_ACCESS_TOKEN, SHOPIFY_SHOP_DOMAIN, or SHOPIFY_LOCATION_ID not set — Shopify POS disabled.");
    return null;
  }
  return { token, domain, locationId };
}

async function shopifyFetch<T>(domain: string, token: string, path: string, options: RequestInit = {}): Promise<T> {
  const url = `https://${domain}/admin/api/${API_VERSION}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type":           "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Shopify API ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export const shopifyAdapter: UniversalPosAdapter = {
  provider:    "shopify",
  displayName: "Shopify POS",

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
    const env = shopifyCreds(); if (!env) return [];
    try {
      const now = new Date().toISOString();
      const { products } = await shopifyFetch<{ products: ShopifyProduct[] }>(
        env.domain, env.token, "/products.json?limit=250&status=active",
      );
      const { inventory_levels } = await shopifyFetch<{ inventory_levels: ShopifyInventoryLevel[] }>(
        env.domain, env.token, `/inventory_levels.json?location_ids=${env.locationId}&limit=250`,
      );
      const stockMap = new Map(inventory_levels.map(l => [l.inventory_item_id, l.available]));
      const items: UniversalInventoryItem[] = [];
      for (const p of products) {
        for (const v of p.variants) {
          const qty = stockMap.get(v.id) ?? 0;
          items.push({
            posProductId:  String(v.id),
            venueId,
            provider:      "shopify",
            name:          p.variants.length > 1 ? `${p.title} — ${v.sku ?? v.id}` : p.title,
            sku:           v.sku ?? undefined,
            category:      p.product_type ?? undefined,
            quantity:      Math.max(0, qty),
            available:     qty > 0,
            priceCents:    Math.round(parseFloat(v.price) * 100),
            reorderPoint:  0,
            unit:          "each",
            lastSyncAt:    now,
            meta:          { productId: p.id, imageUrl: p.images?.[0]?.src },
          });
        }
      }
      logger.info({ count: items.length, venueId }, "Shopify: inventory synced");
      return items;
    } catch (err) {
      logger.error({ err }, "Shopify: syncInventory failed");
      return [];
    }
  },

  async syncMenuCatalog(_creds: AdapterCredentials, venueId: string): Promise<UniversalMenuItem[]> {
    const env = shopifyCreds(); if (!env) return [];
    try {
      const now = new Date().toISOString();
      const { products } = await shopifyFetch<{ products: ShopifyProduct[] }>(
        env.domain, env.token, "/products.json?limit=250&status=active",
      );
      const items: UniversalMenuItem[] = [];
      for (const p of products) {
        for (const [i, v] of p.variants.entries()) {
          items.push({
            posItemId:   String(v.id),
            venueId,
            provider:    "shopify",
            name:        p.variants.length > 1 ? `${p.title} — ${v.sku ?? v.id}` : p.title,
            sku:         v.sku ?? undefined,
            category:    p.product_type ?? undefined,
            priceCents:  Math.round(parseFloat(v.price) * 100),
            isTaxable:   true,
            isAvailable: true,
            modifiers:   [],
            imageUrl:    p.images?.[0]?.src,
            allergens:   [],
            tags:        [],
            sortOrder:   i,
            syncedAt:    now,
            meta:        { productId: p.id },
          });
        }
      }
      return items;
    } catch (err) {
      logger.error({ err }, "Shopify: syncMenuCatalog failed");
      return [];
    }
  },

  async pushOrder(_creds: AdapterCredentials, order: UniversalOrder): Promise<PushOrderResult> {
    const env = shopifyCreds();
    if (!env) return { success: false, provider: "shopify", error: "Shopify credentials not configured" };
    try {
      const draftOrder = {
        draft_order: {
          note:              `EEIS Order ${order.id}`,
          tags:              "eeis,smokecraft",
          line_items:        order.items.map(i => ({
            variant_id: parseInt(i.posProductId, 10) || undefined,
            title:      i.name,
            price:      (i.unitCents / 100).toFixed(2),
            quantity:   i.quantity,
            sku:        i.sku,
          })),
          applied_discount: order.discountCents > 0 ? {
            description: "EEIS discount",
            value_type:  "fixed_amount",
            value:       (order.discountCents / 100).toFixed(2),
          } : undefined,
        },
      };
      const result = await shopifyFetch<{ draft_order: { id: number; order_number: number } }>(
        env.domain, env.token, "/draft_orders.json",
        { method: "POST", body: JSON.stringify(draftOrder) },
      );
      return {
        success:         true,
        provider:        "shopify",
        externalOrderId: String(result.draft_order.id),
        rawResponse:     result.draft_order,
      };
    } catch (err) {
      return { success: false, provider: "shopify", error: String(err) };
    }
  },

  async syncOrders(_creds: AdapterCredentials, since?: Date): Promise<UniversalOrder[]> {
    const env = shopifyCreds(); if (!env) return [];
    try {
      const sinceParam = since ? `&created_at_min=${since.toISOString()}` : "";
      const { orders } = await shopifyFetch<{ orders: ShopifyOrder[] }>(
        env.domain, env.token,
        `/orders.json?status=any&limit=100${sinceParam}`,
      );
      return orders.map(o => {
        const items = o.line_items.map(li => ({
          posProductId:  String(li.variant_id ?? ""),
          name:          li.title,
          quantity:      li.quantity,
          unitCents:     Math.round(parseFloat(li.price) * 100),
          totalCents:    Math.round(parseFloat(li.price) * 100) * li.quantity,
          sku:           li.sku ?? undefined,
          modifiers:     [] as { name: string; priceCents: number }[],
          meta:          {} as Record<string, unknown>,
        }));
        const totalCents = Math.round(parseFloat(o.total_price) * 100);
        return {
          id:              crypto.randomUUID(),
          externalOrderId: String(o.id),
          venueId:         "unknown",
          provider:        "shopify",
          status:          o.financial_status === "paid" ? "completed" as const : "open" as const,
          items,
          subtotalCents:   items.reduce((s, i) => s + i.totalCents, 0),
          taxCents:        0,
          tipCents:        0,
          discountCents:   0,
          totalCents,
          currency:        "USD",
          pairingContext:  {},
          createdAt:       o.created_at,
          updatedAt:       o.created_at,
        };
      });
    } catch (err) {
      logger.error({ err }, "Shopify: syncOrders failed");
      return [];
    }
  },

  getAuthorizationUrl(clientId: string, redirectUri: string, state: string): string {
    const env = shopifyCreds();
    const domain = env?.domain ?? process.env["SHOPIFY_SHOP_DOMAIN"] ?? "";
    const scopes = "read_products,write_products,read_orders,write_orders,read_inventory,write_inventory";
    return `https://${domain}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  },

  async exchangeCode(clientId: string, clientSecret: string, code: string, _redirectUri: string): Promise<TokenResponse> {
    const env = shopifyCreds();
    const domain = env?.domain ?? process.env["SHOPIFY_SHOP_DOMAIN"] ?? "";
    const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    if (!res.ok) throw new Error(`Shopify OAuth failed: ${res.status}`);
    const data = await res.json() as { access_token: string; scope: string };
    return { accessToken: data.access_token, scopes: data.scope };
  },

  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>, secret: string): boolean {
    const header = headers["x-shopify-hmac-sha256"];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided) return false;
    const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
    if (provided.length !== expected.length) return false;
    try {
      return timingSafeEqual(Buffer.from(provided, "base64"), Buffer.from(expected, "base64"));
    } catch { return false; }
  },
};
