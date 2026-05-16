/**
 * posEventBus — Real-time POS event bus.
 *
 * Triggers downstream systems after key POS lifecycle events:
 *   - XP rewards (via xpEngine)
 *   - Loyalty points
 *   - Lounge ambient visuals (via NeuralEventBus)
 *   - Analytics recording
 *   - AI memory updates
 *   - Upsell tracking
 *   - Inventory sync
 *
 * Uses Node.js EventEmitter — all handlers are async, errors are caught
 * and logged individually to prevent one system failure from blocking others.
 */

import { EventEmitter }  from "events";
import { logger }        from "../../lib/logger";
import { NeuralEventBus } from "../../services/neuralEventBus";
import { db, eeisOrderEventsTable, analyticsEventsTable } from "@workspace/db";
import type { UniversalOrder } from "../schemas/universalOrder";
import type { PushOrderResult } from "../adapters/base.adapter";

export interface PosOrderPushedData    { venueId: string; order: UniversalOrder; result: PushOrderResult }
export interface PosOrderFailedData    { venueId: string; order: UniversalOrder; result: PushOrderResult }
export interface PosWebhookOrderData   { provider: string; eventType: string; payload: Record<string, unknown>; venueId?: string }
export interface PosConnectionData     { venueId: string; provider: string; connectionId: string }
export interface PosConnectionFailData { venueId: string; provider: string; error: string }
export interface WebhookOrderCompleteData { venueId: string; provider: string; payload: Record<string, unknown> }

interface PosEventMap {
  "order.pushed":               PosOrderPushedData;
  "order.push_failed":          PosOrderFailedData;
  "order.completed_via_webhook": WebhookOrderCompleteData;
  "webhook.order":              PosWebhookOrderData;
  "webhook.inventory":          PosWebhookOrderData;
  "webhook.catalog":            PosWebhookOrderData;
  "pos.connection.established": PosConnectionData;
  "pos.connection.failed":      PosConnectionFailData;
}

class PosEventBus extends EventEmitter {
  fire<K extends keyof PosEventMap>(event: K, data: PosEventMap[K]): boolean {
    return super.emit(event, data);
  }

  handle<K extends keyof PosEventMap>(event: K, listener: (data: PosEventMap[K]) => void | Promise<void>): this {
    return super.on(event, (data: PosEventMap[K]) => {
      Promise.resolve(listener(data)).catch(err => {
        logger.error({ err, event }, "posEventBus: handler error");
      });
    });
  }
}

export const posEventBus = new PosEventBus();

posEventBus.handle("order.pushed", async (data) => {
  const { order, venueId } = data;

  NeuralEventBus.publish("pos.order.confirmed", {
    venueId, orderId: order.id, totalCents: order.totalCents, craftType: order.craftType,
    itemCount: order.items.length, provider: order.provider,
  }, venueId);

  try {
    await db.insert(eeisOrderEventsTable).values({
      orderId:        order.id as `${string}-${string}-${string}-${string}-${string}`,
      venueId:        order.venueId,
      userId:         order.userId ?? null,
      guestProfileId: order.guestProfileId ?? null,
      sessionId:      order.sessionId ?? null,
      eventType:      "completed",
      provider:       order.provider,
      externalOrderId: null,
      totalCents:     order.totalCents,
      itemCount:      order.items.length,
      meta:           { craftType: order.craftType },
    });
  } catch (err) {
    logger.error({ err }, "posEventBus: order event insert failed");
  }

  try {
    await db.insert(analyticsEventsTable).values({
      venueId:   order.venueId,
      eventType: "order_created" as const,
      userId:    order.userId ?? null,
      productId: order.items[0]?.posProductId ?? null,
      metadata:  {
        eventName:  "pos_order_completed",
        orderId:    order.id,
        provider:   order.provider,
        totalCents: order.totalCents,
        craftType:  order.craftType,
        itemCount:  order.items.length,
      },
    });
  } catch (err) {
    logger.error({ err }, "posEventBus: analytics insert failed");
  }

  NeuralEventBus.publish("loyalty.award_trigger", {
    venueId, orderId: order.id, userId: order.userId, totalCents: order.totalCents,
    craftType: order.craftType,
  }, venueId);

  NeuralEventBus.publish("xp.award_trigger", {
    venueId, orderId: order.id, userId: order.userId, craftType: order.craftType,
  }, venueId);

  NeuralEventBus.publish("ambient.order_complete", {
    venueId, craftType: order.craftType,
  }, venueId);

  logger.info({ venueId, orderId: order.id, totalCents: order.totalCents }, "posEventBus: order.pushed pipeline complete");
});

posEventBus.handle("order.push_failed", async (data) => {
  const { order, result, venueId } = data;
  logger.warn({ venueId, orderId: order.id, error: result.error }, "posEventBus: order push failed");
  NeuralEventBus.publish("pos.order.failed", { venueId, orderId: order.id, error: result.error }, venueId);
});

posEventBus.handle("order.completed_via_webhook", (data) => {
  const { venueId, provider, payload } = data;
  NeuralEventBus.publish("pos.webhook.order_complete", { venueId, provider, payload }, venueId);
});

posEventBus.handle("pos.connection.established", (data) => {
  const { venueId, provider } = data;
  NeuralEventBus.publish("pos.connected", { venueId, provider }, venueId);
  logger.info({ venueId, provider }, "POS connection established");
});
