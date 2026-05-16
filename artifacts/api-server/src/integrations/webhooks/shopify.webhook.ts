/**
 * shopify.webhook — Shopify POS webhook handler.
 *
 * Verifies via x-shopify-hmac-sha256 (base64 HMAC-SHA256 of raw body).
 * Shopify sends webhooks for orders/create, inventory_levels/update,
 * products/update, and fulfillments/create.
 */

import { type Request, type Response } from "express";
import { logger }        from "../../lib/logger";
import { ingestWebhook } from "../services/webhookProcessor";

export async function shopifyWebhookHandler(req: Request, res: Response): Promise<void> {
  const rawBody = req.body as Buffer;
  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).json({ error: "raw_body_required" });
    return;
  }

  const venueId      = req.query["venue_id"]      as string | undefined;
  const connectionId = req.query["connection_id"] as string | undefined;

  let payload: Record<string, unknown>;
  try { payload = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>; }
  catch { res.status(400).json({ error: "invalid_json" }); return; }

  const orderId = typeof payload["id"] === "number" ? String(payload["id"]) : undefined;
  const topic   = req.header("x-shopify-topic") ?? "unknown";

  const result = await ingestWebhook({
    provider:      "shopify",
    rawBody,
    headers:       {
      ...req.headers as Record<string, string | string[] | undefined>,
      "type": topic,
    },
    venueId,
    connectionId,
    idempotencyKey: orderId ? `shopify:${topic}:${orderId}` : undefined,
  });

  if (!result.accepted && result.error?.includes("signature")) {
    res.status(401).json({ error: "invalid_signature" });
    return;
  }
  if (!result.accepted) {
    logger.warn({ error: result.error, provider: "shopify" }, "Shopify webhook rejected");
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ received: true, provider: "shopify", topic, ignored: result.ignored ?? false });
}
