/**
 * clover.webhook — Clover POS webhook handler.
 *
 * Verifies HMAC-SHA256 signature via x-clover-signature header.
 * Routes to ingestWebhook for deduplication, logging, and downstream triggers.
 */

import { type Request, type Response } from "express";
import { logger }           from "../../lib/logger";
import { ingestWebhook }    from "../services/webhookProcessor";

export async function cloverWebhookHandler(req: Request, res: Response): Promise<void> {
  const rawBody = req.body as Buffer;
  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).json({ error: "raw_body_required" });
    return;
  }

  const venueId      = req.query["venue_id"] as string | undefined;
  const connectionId = req.query["connection_id"] as string | undefined;

  const result = await ingestWebhook({
    provider:      "clover",
    rawBody,
    headers:       req.headers as Record<string, string | string[] | undefined>,
    venueId,
    connectionId,
    idempotencyKey: req.header("x-clover-event-id") ?? undefined,
  });

  if (!result.accepted && result.error?.includes("signature")) {
    res.status(401).json({ error: "invalid_signature" });
    return;
  }
  if (!result.accepted) {
    logger.warn({ error: result.error, provider: "clover" }, "Clover webhook rejected");
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ received: true, provider: "clover", eventType: result.eventType, ignored: result.ignored ?? false });
}
