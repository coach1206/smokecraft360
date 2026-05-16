/**
 * toast.webhook — Toast POS webhook handler.
 *
 * Verifies via x-toast-signature + toast-notification-timestamp.
 * Toast sends notifications for order lifecycle and menu changes.
 */

import { type Request, type Response } from "express";
import { logger }        from "../../lib/logger";
import { ingestWebhook } from "../services/webhookProcessor";

export async function toastWebhookHandler(req: Request, res: Response): Promise<void> {
  const rawBody = req.body as Buffer;
  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).json({ error: "raw_body_required" });
    return;
  }

  const venueId      = req.query["venue_id"]      as string | undefined;
  const connectionId = req.query["connection_id"] as string | undefined;

  const result = await ingestWebhook({
    provider:      "toast",
    rawBody,
    headers:       req.headers as Record<string, string | string[] | undefined>,
    venueId,
    connectionId,
    idempotencyKey: req.header("toast-notification-code") ?? undefined,
  });

  if (!result.accepted && result.error?.includes("signature")) {
    res.status(401).json({ error: "invalid_signature" });
    return;
  }
  if (!result.accepted) {
    logger.warn({ error: result.error, provider: "toast" }, "Toast webhook rejected");
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ received: true, provider: "toast", eventType: result.eventType, ignored: result.ignored ?? false });
}
