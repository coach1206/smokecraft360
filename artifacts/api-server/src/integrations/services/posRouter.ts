/**
 * posRouter — Universal POS adapter registry and order dispatch.
 */

import { db, posConnectionsTable, eeisOrderEventsTable } from "@workspace/db";
import { eq, and }  from "drizzle-orm";
import { logger }   from "../../lib/logger";
import { tokenManager }  from "./tokenManager";
import { posEventBus }   from "./eventBus";
import type { UniversalPosAdapter, PushOrderResult } from "../adapters/base.adapter";
import type { UniversalOrder } from "../schemas/universalOrder";
import { cloverUniversalAdapter }     from "../adapters/clover.adapter";
import { toastUniversalAdapter }      from "../adapters/toast.adapter";
import { squareUniversalAdapter }     from "../adapters/square.adapter";
import { lightspeedUniversalAdapter } from "../adapters/lightspeed.adapter";
import { shopifyAdapter }             from "../adapters/shopify.adapter";

const ADAPTER_REGISTRY = new Map<string, UniversalPosAdapter>([
  ["clover",        cloverUniversalAdapter],
  ["toast",         toastUniversalAdapter],
  ["square",        squareUniversalAdapter],
  ["lightspeed",    lightspeedUniversalAdapter],
  ["shopify",       shopifyAdapter],
]);

export function getUniversalAdapter(provider: string): UniversalPosAdapter | undefined {
  return ADAPTER_REGISTRY.get(provider);
}

export function listProviders(): { provider: string; displayName: string; capabilities: UniversalPosAdapter["capabilities"] }[] {
  return [...ADAPTER_REGISTRY.values()].map(a => ({
    provider:     a.provider,
    displayName:  a.displayName,
    capabilities: a.capabilities,
  }));
}

export async function routeOrder(venueId: string, order: UniversalOrder): Promise<PushOrderResult> {
  const connections = await db.select()
    .from(posConnectionsTable)
    .where(and(
      eq(posConnectionsTable.venueId,   venueId),
      eq(posConnectionsTable.status,    "active"),
      eq(posConnectionsTable.isDefault, true),
    ))
    .limit(1);

  const connection = connections[0];
  if (!connection) {
    logger.warn({ venueId }, "POS router: no active default connection for venue");
    return { success: false, provider: "none", error: "No active POS connection configured for this venue" };
  }

  const adapter = getUniversalAdapter(connection.provider);
  if (!adapter) {
    return { success: false, provider: connection.provider, error: `No adapter registered for provider: ${connection.provider}` };
  }

  const creds = await tokenManager.get(connection.id, venueId);
  if (!creds) {
    return { success: false, provider: connection.provider, error: "No credentials found — please reconnect your POS" };
  }
  if (creds.isExpired) {
    return { success: false, provider: connection.provider, error: "Access token expired — token refresh pending" };
  }

  try {
    const result = await adapter.pushOrder({
      accessToken:  creds.accessToken,
      refreshToken: creds.refreshToken,
      apiSecret:    creds.apiSecret,
      merchantId:   connection.merchantId ?? undefined,
      locationId:   connection.locationId ?? undefined,
    }, order);

    await db.insert(eeisOrderEventsTable).values({
      orderId:         order.id as `${string}-${string}-${string}-${string}-${string}`,
      venueId:         order.venueId,
      userId:          order.userId ?? null,
      guestProfileId:  order.guestProfileId ?? null,
      sessionId:       order.sessionId ?? null,
      eventType:       result.success ? "pushed_to_pos" : "pos_failed",
      provider:        connection.provider,
      externalOrderId: result.externalOrderId ?? null,
      totalCents:      order.totalCents,
      itemCount:       order.items.length,
      idempotencyKey:  order.idempotencyKey ?? null,
      errorMessage:    result.error ?? null,
      meta:            { rawResponse: result.rawResponse ?? null },
    });

    if (result.success) {
      posEventBus.fire("order.pushed", { venueId, order, result });
    } else {
      posEventBus.fire("order.push_failed", { venueId, order, result });
    }

    return result;
  } catch (err) {
    const error = String(err);
    logger.error({ err, venueId, provider: connection.provider }, "POS order push threw unexpectedly");
    await db.insert(eeisOrderEventsTable).values({
      orderId:   order.id as `${string}-${string}-${string}-${string}-${string}`,
      venueId:   order.venueId,
      provider:  connection.provider,
      eventType: "pos_failed",
      errorMessage: error,
      totalCents: order.totalCents,
      itemCount:  order.items.length,
      meta:       {},
    });
    return { success: false, provider: connection.provider, error };
  }
}
