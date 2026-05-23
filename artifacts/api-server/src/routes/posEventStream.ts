/**
 * posEventStream — kiosk-friendly recent POS webhook event feed.
 *
 * GET /api/pos/events/recent?since=<ISO>
 *   Returns last 20 pos_webhook_events (no auth — trusted local kiosk).
 *   Optional `since` param filters to events after that timestamp.
 */

import { Router } from "express";
import { db }     from "@workspace/db";
import { posWebhookEventsTable } from "@workspace/db/schema";
import { desc, gte } from "drizzle-orm";

const router = Router();

router.get("/pos/events/recent", async (req, res) => {
  try {
    const sinceRaw = typeof req.query["since"] === "string" ? req.query["since"] : null;
    const since    = sinceRaw ? new Date(sinceRaw) : new Date(Date.now() - 10 * 60 * 1000);
    if (Number.isNaN(since.getTime())) {
      res.status(400).json({ error: "invalid_since" }); return;
    }

    const events = await db
      .select({
        id:          posWebhookEventsTable.id,
        provider:    posWebhookEventsTable.provider,
        eventType:   posWebhookEventsTable.eventType,
        status:      posWebhookEventsTable.status,
        rawPayload:  posWebhookEventsTable.rawPayload,
        createdAt:   posWebhookEventsTable.createdAt,
      })
      .from(posWebhookEventsTable)
      .where(gte(posWebhookEventsTable.createdAt, since))
      .orderBy(desc(posWebhookEventsTable.createdAt))
      .limit(20);

    res.json({ events, count: events.length, since: since.toISOString() });
  } catch {
    res.json({ events: [], count: 0 });
  }
});

export default router;
