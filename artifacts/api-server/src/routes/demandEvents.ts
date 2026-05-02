/**
 * POST /api/demand/events — capture a demand event.
 *
 * Valid eventTypes: view, selection, oos_request, order, blend_use, search
 *
 * Side-effects:
 *   - For "oos_request": also upserts missingDemand (increments requestCount).
 *
 * Auth optional — anonymous demand is still valuable.
 * Responds immediately; all DB writes are async so the UI is never blocked.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { sql }                                                from "drizzle-orm";
import {
  db,
  demandEventsTable,
  missingDemandTable,
  type InsertDemandEvent,
  DEMAND_EVENT_TYPES,
}                                                             from "@workspace/db";
import { verifyToken }                                        from "../lib/jwt";
import { allowOnly }                                          from "../middleware/sanitize";

const router: IRouter = Router();

async function tryGetUserId(req: Request): Promise<string | null> {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = await verifyToken(header.slice(7));
    return payload.sub ?? null;
  } catch { return null; }
}

router.post(
  "/events",
  allowOnly(
    "productId", "productName", "category", "flavorNotes",
    "eventType", "venueId", "sessionId",
  ),
  async (req: Request, res: Response) => {
    const {
      productId, productName, category, flavorNotes,
      eventType, venueId, sessionId,
    } = req.body as {
      productId?:   string;
      productName?: string;
      category?:    string;
      flavorNotes?: string[];
      eventType?:   string;
      venueId?:     string;
      sessionId?:   string;
    };

    if (!productId || typeof productId !== "string") {
      res.status(400).json({ error: '"productId" is required' });
      return;
    }
    if (!eventType || !(DEMAND_EVENT_TYPES as readonly string[]).includes(eventType)) {
      res.status(400).json({ error: `"eventType" must be one of: ${DEMAND_EVENT_TYPES.join(", ")}` });
      return;
    }

    // Respond immediately — never block the UI for tracking
    res.json({ ok: true });

    const userId = await tryGetUserId(req);

    const record: InsertDemandEvent = {
      productId,
      productName: productName ?? undefined,
      category:    category    ?? undefined,
      flavorNotes: Array.isArray(flavorNotes) && flavorNotes.length > 0
        ? flavorNotes.join("|")
        : undefined,
      eventType,
      venueId:   venueId   ?? undefined,
      userId:    userId    ?? undefined,
      sessionId: sessionId ?? undefined,
    };

    // Write demand event
    await db.insert(demandEventsTable).values(record).catch((err) => {
      req.log.error({ err }, "Failed to persist demand event");
    });

    // Side-effect: upsert missingDemand for OOS requests
    if (eventType === "oos_request" && venueId) {
      db.execute(sql`
        INSERT INTO missing_demand (venue_id, product_id, product_name, category, request_count, last_requested_at)
        VALUES (
          ${venueId}::uuid,
          ${productId},
          ${productName ?? null},
          ${category ?? null},
          1,
          now()
        )
        ON CONFLICT ON CONSTRAINT missing_demand_venue_product_unique
        DO UPDATE SET
          request_count    = missing_demand.request_count + 1,
          last_requested_at = now(),
          product_name      = COALESCE(EXCLUDED.product_name, missing_demand.product_name),
          category          = COALESCE(EXCLUDED.category,     missing_demand.category)
      `).catch((err) => {
        req.log.error({ err }, "Failed to upsert missing demand");
      });
    }
  },
);

export default router;
