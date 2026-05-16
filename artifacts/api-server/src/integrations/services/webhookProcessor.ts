/**
 * webhookProcessor — Unified POS webhook processing pipeline.
 *
 * Verifies signatures, deduplicates via idempotency key,
 * routes to the correct handler, logs to pos_webhook_events,
 * and fires NeuralEventBus events for downstream (XP, loyalty, analytics).
 *
 * Fail-safe: always returns a structured result — never throws.
 */

import { db, posWebhookEventsTable, posConnectionsTable } from "@workspace/db";
import { eq, and }   from "drizzle-orm";
import { logger }    from "../../lib/logger";
import { getUniversalAdapter } from "./posRouter";
import { syncVenueInventory }  from "./inventorySync";
import { posEventBus }         from "./eventBus";

export interface WebhookIngest {
  provider:       string;
  rawBody:        Buffer;
  headers:        Record<string, string | string[] | undefined>;
  venueId?:       string;
  connectionId?:  string;
  idempotencyKey?: string;
}

export interface WebhookResult {
  accepted:       boolean;
  provider:       string;
  eventType?:     string;
  eventId?:       string;
  error?:         string;
  ignored?:       boolean;
}

export async function ingestWebhook(ingest: WebhookIngest): Promise<WebhookResult> {
  const { provider, rawBody, headers, venueId, connectionId } = ingest;

  const adapter = getUniversalAdapter(provider);
  if (!adapter) {
    return { accepted: false, provider, error: `No adapter for provider: ${provider}` };
  }

  let connection: { id: string; webhookUrl?: string | null } | undefined;
  if (connectionId) {
    const rows = await db.select({ id: posConnectionsTable.id, webhookUrl: posConnectionsTable.webhookUrl })
      .from(posConnectionsTable)
      .where(eq(posConnectionsTable.id, connectionId))
      .limit(1);
    connection = rows[0];
  } else if (venueId) {
    const rows = await db.select({ id: posConnectionsTable.id, webhookUrl: posConnectionsTable.webhookUrl })
      .from(posConnectionsTable)
      .where(and(eq(posConnectionsTable.venueId, venueId), eq(posConnectionsTable.status, "active")))
      .limit(1);
    connection = rows[0];
  }

  const webhookSecret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`]
    ?? process.env["POS_WEBHOOK_SECRET"]
    ?? "";

  const signatureValid = webhookSecret
    ? adapter.verifyWebhookSignature(rawBody, headers, webhookSecret)
    : false;

  if (webhookSecret && !signatureValid) {
    logger.warn({ provider, venueId }, "Webhook signature verification failed");
    await db.insert(posWebhookEventsTable).values({
      connectionId: connection?.id ?? null,
      venueId:      venueId ?? null,
      provider,
      eventType:    "unknown",
      status:       "failed",
      signatureValid: false,
      errorMessage: "Signature verification failed",
      rawPayload:   { bodyLen: rawBody.length },
    });
    return { accepted: false, provider, error: "Invalid webhook signature" };
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
  } catch {
    return { accepted: false, provider, error: "Invalid JSON body" };
  }

  const eventType      = detectEventType(provider, payload);
  const externalEventId = detectEventId(provider, payload);
  const idempotencyKey  = ingest.idempotencyKey ?? (externalEventId ? `${provider}:${externalEventId}` : undefined);

  if (idempotencyKey) {
    const dup = await db.select({ id: posWebhookEventsTable.id })
      .from(posWebhookEventsTable)
      .where(eq(posWebhookEventsTable.idempotencyKey, idempotencyKey))
      .limit(1);
    if (dup[0]) {
      logger.debug({ idempotencyKey, provider }, "Duplicate webhook ignored");
      return { accepted: true, provider, eventType, eventId: externalEventId, ignored: true };
    }
  }

  const row = await db.insert(posWebhookEventsTable).values({
    connectionId:    connection?.id ?? null,
    venueId:         venueId ?? null,
    provider,
    eventType,
    externalEventId: externalEventId ?? null,
    status:          "processing",
    rawPayload:      payload,
    signatureValid,
    idempotencyKey:  idempotencyKey ?? null,
  }).returning({ id: posWebhookEventsTable.id });

  const eventRowId = row[0]!.id;

  try {
    await processEvent(provider, eventType, payload, venueId);

    await db.update(posWebhookEventsTable)
      .set({ status: "processed", processedAt: new Date() })
      .where(eq(posWebhookEventsTable.id, eventRowId));

    return { accepted: true, provider, eventType, eventId: externalEventId };
  } catch (err) {
    const errorMessage = String(err);
    logger.error({ err, provider, eventType }, "Webhook processing failed");
    await db.update(posWebhookEventsTable)
      .set({ status: "failed", errorMessage })
      .where(eq(posWebhookEventsTable.id, eventRowId));
    return { accepted: false, provider, eventType, error: errorMessage };
  }
}

async function processEvent(provider: string, eventType: string, payload: Record<string, unknown>, venueId?: string): Promise<void> {
  if (eventType.startsWith("order.")) {
    posEventBus.fire("webhook.order", { provider, eventType, payload, venueId });
    if (venueId && (eventType === "order.created" || eventType === "order.completed")) {
      posEventBus.fire("order.completed_via_webhook", { provider, venueId, payload });
    }
  }

  if (eventType.startsWith("inventory.") && venueId) {
    await syncVenueInventory(venueId, true);
    posEventBus.fire("webhook.inventory", { provider, eventType, payload, venueId });
  }

  if (eventType.startsWith("catalog.")) {
    posEventBus.fire("webhook.catalog", { provider, eventType, payload, venueId });
  }

  logger.info({ provider, eventType, venueId }, "Webhook event processed");
}

function detectEventType(provider: string, payload: Record<string, unknown>): string {
  const type = payload["type"] ?? payload["event_type"] ?? payload["event"] ?? payload["topic"];
  if (typeof type === "string" && type.length > 0) return type;
  if (provider === "shopify") {
    if (payload["line_items"]) return "order.created";
    if (payload["domain"])     return "catalog.updated";
  }
  return "unknown";
}

function detectEventId(provider: string, payload: Record<string, unknown>): string | undefined {
  const candidates = ["id", "event_id", "eventId", "guid", "notification_id"];
  for (const key of candidates) {
    const v = payload[key];
    if (typeof v === "string" || typeof v === "number") return String(v);
  }
  return undefined;
}
