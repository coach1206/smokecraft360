/**
 * POS Webhook receiver — generic, vendor-neutral.
 *
 * Why generic and not Square/Toast SDK:
 *   The user has consistently dismissed full OAuth integrations. A signed
 *   normalized webhook receiver lets ANY POS (Square, Toast, Clover, or a
 *   custom kiosk-side adapter) push events with a tiny shim, without the
 *   server needing to maintain per-vendor auth state.
 *
 * Auth:
 *   HMAC-SHA256 of the raw request body using POS_WEBHOOK_SECRET.
 *   Header: `X-Pos-Signature: sha256=<hex>`. Constant-time compared.
 *   Returns 401 on signature mismatch, 503 if no secret is configured
 *   (so a misconfigured deploy fails closed instead of silently accepting).
 *
 * Accepted events:
 *   { type: "inventory.updated", data: { venueId, productId, quantity, available?, priceCents? } }
 *   { type: "order.created",     data: { venueId, productId, quantity? } }
 *
 * Mounted with raw body parser at `/api/webhooks/pos` BEFORE express.json
 * (mirrors the Stripe webhook pattern in app.ts).
 */

import { type Request, type Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod/v4";
import { logger } from "../lib/logger";
import { upsertVenueInventory, updateStockCache } from "../services/venueInventoryStore";
import { db, venueInventoryTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

/* Zod schema for the normalized POS event envelope. Keeps the shape
 * deterministic so a malformed signed payload returns a clean 400 rather
 * than throwing somewhere downstream and triggering POS retry storms. */
const posEventSchema = z.object({
  type: z.string().min(1).max(64),
  data: z.object({
    venueId:    z.string().uuid(),
    productId:  z.string().min(1).max(128),
    quantity:   z.number().int().min(0).max(1_000_000).optional(),
    available:  z.boolean().optional(),
    priceCents: z.number().int().min(0).max(10_000_000).optional(),
  }),
});
type PosEvent = z.infer<typeof posEventSchema>;

function verifySignature(rawBody: Buffer, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader) return false;
  const provided = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  // Length-mismatch must short-circuit — timingSafeEqual throws on mismatch.
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function posWebhookHandler(req: Request, res: Response): Promise<void> {
  const secret = process.env.POS_WEBHOOK_SECRET;
  if (!secret) {
    /* Fail-closed: if the operator hasn't set the secret, we won't accept
     * webhooks. Better to surface a 503 in the POS dashboard than to
     * silently process unsigned events. */
    res.status(503).json({ error: "pos_webhook_not_configured" });
    return;
  }

  const rawBody = req.body as Buffer;
  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).json({ error: "raw_body_required" });
    return;
  }

  const sig = req.header("x-pos-signature") ?? undefined;
  if (!verifySignature(rawBody, sig, secret)) {
    logger.warn({ ip: req.ip }, "POS webhook signature verification failed");
    res.status(401).json({ error: "invalid_signature" });
    return;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawBody.toString("utf8"));
  } catch {
    res.status(400).json({ error: "invalid_json" });
    return;
  }

  const parsed = posEventSchema.safeParse(raw);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_event_shape", details: parsed.error.issues });
    return;
  }
  const event: PosEvent = parsed.data;
  const { venueId, productId } = event.data;

  try {
    if (event.type === "inventory.updated") {
      const quantity = Math.max(0, Number(event.data.quantity ?? 0));
      const available = event.data.available ?? quantity > 0;
      await upsertVenueInventory(venueId, productId, quantity, available, event.data.priceCents);
      logger.info({ venueId, productId, quantity }, "POS inventory.updated");
      res.json({ received: true, type: event.type });
      return;
    }

    if (event.type === "order.created") {
      /* Decrement by 1 (or `quantity` if provided), atomic, never below zero.
       * If no row exists for the venue+product we ignore — consistent with
       * the demo-fallback semantics of `isInStock`. */
      const decBy = Math.max(1, Math.min(99, Number(event.data.quantity ?? 1)));
      const result = await db
        .update(venueInventoryTable)
        .set({
          quantity:  sql`GREATEST(0, ${venueInventoryTable.quantity} - ${decBy})`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(venueInventoryTable.venueId,   venueId),
          eq(venueInventoryTable.productId, productId),
        ))
        .returning();

      if (result[0]) {
        updateStockCache(venueId, productId, {
          quantity:  result[0].quantity,
          available: result[0].available && result[0].quantity > 0,
        });
      }
      logger.info({ venueId, productId, decBy, found: !!result[0] }, "POS order.created");
      res.json({ received: true, type: event.type, decremented: !!result[0] });
      return;
    }

    /* Unknown event types are accepted with 200 + ignored — POS vendors
     * frequently send heartbeat / catalog / customer events that we don't
     * care about, and rejecting them with 4xx makes them retry forever. */
    logger.debug({ type: event.type }, "POS webhook: ignored unknown event type");
    res.json({ received: true, ignored: true, type: event.type });
  } catch (err) {
    logger.error({ err, type: event.type }, "POS webhook handler failed");
    res.status(500).json({ error: "handler_failed" });
  }
}
