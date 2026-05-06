/**
 * /api/payment-timeline — financial lifecycle timeline per tab.
 *
 *   GET  /api/payment-timeline/:tabId      — full event list for a tab
 *   POST /api/payment-timeline/:tabId      — append a manual event (staff/system)
 *   GET  /api/payment-timeline/venue/:venueId/recent — recent events across venue
 */

import { Router, type IRouter, type Response } from "express";
import { eq, desc, and, gte }                  from "drizzle-orm";
import { db, paymentEventsTable }              from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth.js";
import { requireRole }                         from "../middleware/roles.js";
import { logger }                              from "../lib/logger.js";

const router: IRouter = Router();

// ── GET /api/payment-timeline/venue/:venueId/recent ──────────────────────────
// Must be registered BEFORE /:tabId to avoid shadowing

router.get(
  "/venue/:venueId/recent",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  async (req: AuthRequest, res: Response) => {
    const venueId = String(req.params["venueId"]);
    const h24     = new Date(Date.now() - 24 * 3600_000);
    const limit   = Math.min(parseInt(String(req.query["limit"] ?? "100"), 10), 200);

    const events = await db.select()
      .from(paymentEventsTable)
      .where(and(
        eq(paymentEventsTable.venueId, venueId),
        gte(paymentEventsTable.occurredAt, h24),
      ))
      .orderBy(desc(paymentEventsTable.occurredAt))
      .limit(limit);

    res.json({ events, venueId, count: events.length });
  },
);

// ── GET /api/payment-timeline/:tabId ─────────────────────────────────────────

router.get(
  "/:tabId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const tabId  = String(req.params["tabId"]);
    const events = await db.select()
      .from(paymentEventsTable)
      .where(eq(paymentEventsTable.tabId, tabId))
      .orderBy(desc(paymentEventsTable.occurredAt));

    res.json({ events, tabId, count: events.length });
  },
);

// ── POST /api/payment-timeline/:tabId — append manual event ──────────────────

router.post(
  "/:tabId",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  async (req: AuthRequest, res: Response) => {
    const tabId   = String(req.params["tabId"]);
    const { eventType, note, amountCents, metadata } = req.body as {
      eventType:    string;
      note?:        string;
      amountCents?: number;
      metadata?:    unknown;
    };

    if (!eventType) { res.status(400).json({ error: "eventType_required" }); return; }

    const userId  = req.user?.id;
    const venueId = req.user?.venueId;
    if (!venueId) { res.status(400).json({ error: "no_venue" }); return; }

    try {
      const [event] = await db.insert(paymentEventsTable).values({
        tabId,
        venueId,
        eventType:   eventType as any,
        actor:       "staff",
        actorId:     userId,
        note:        note ?? null,
        amountCents: amountCents ?? null,
        metadata:    metadata ?? null,
      }).returning();

      res.status(201).json({ event });
    } catch (err) {
      logger.error({ err, tabId }, "Payment event insert failed");
      res.status(500).json({ error: "insert_failed" });
    }
  },
);

export default router;
