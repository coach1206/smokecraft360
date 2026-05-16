/**
 * posWebhooks — Per-provider POS webhook endpoints with raw body parsing.
 *
 * All endpoints require raw Buffer body for HMAC verification.
 * Mounted BEFORE express.json() in app.ts.
 *
 * POST /api/webhooks/pos/clover     — Clover event stream
 * POST /api/webhooks/pos/toast      — Toast notifications
 * POST /api/webhooks/pos/square     — Square webhook events
 * POST /api/webhooks/pos/shopify    — Shopify webhook topics
 */

import { Router } from "express";
import { cloverWebhookHandler }  from "../integrations/webhooks/clover.webhook";
import { toastWebhookHandler }   from "../integrations/webhooks/toast.webhook";
import { squareWebhookHandler }  from "../integrations/webhooks/square.webhook";
import { shopifyWebhookHandler } from "../integrations/webhooks/shopify.webhook";

export const posWebhooksRouter = Router();

posWebhooksRouter.post("/webhooks/pos/clover",  cloverWebhookHandler);
posWebhooksRouter.post("/webhooks/pos/toast",   toastWebhookHandler);
posWebhooksRouter.post("/webhooks/pos/square",  squareWebhookHandler);
posWebhooksRouter.post("/webhooks/pos/shopify", shopifyWebhookHandler);
