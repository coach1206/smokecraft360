/**
 * square.webhook — Square POS webhook handler.
 *
 * Verifies via x-square-hmacsha256-signature (base64 HMAC-SHA256).
 * Square sends events for orders, payments, inventory counts, and catalog changes.
 */

import { type Request, type Response } from "express";
import { logger }        from "../../lib/logger";
import { ingestWebhook } from "../services/webhookProcessor";

export async function squareWebhookHandler(req: Request, res: Response): Promise<void> {
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

  const eventId = typeof payload["event_id"] === "string" ? payload["event_id"] : undefined;

  const result = await ingestWebhook({
    provider:      "square",
    rawBody,
    headers:       req.headers as Record<string, string | string[] | undefined>,
    venueId,
    connectionId,
    idempotencyKey: eventId,
  });

  if (!result.accepted && result.error?.includes("signature")) {
    res.status(401).json({ error: "invalid_signature" });
    return;
  }
  if (!result.accepted) {
    logger.warn({ error: result.error, provider: "square" }, "Square webhook rejected");
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ received: true, provider: "square", eventType: result.eventType, ignored: result.ignored ?? false });
}
