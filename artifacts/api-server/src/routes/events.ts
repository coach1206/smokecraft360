/**
 * POST /api/events
 *
 * Public endpoint — logs a user interaction event to analytics_events.
 * Fire-and-forget: responds immediately; DB write is non-blocking.
 *
 * userId is extracted from a Bearer token when present (never trusted from body).
 * venueId and metadata may be supplied by the client.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db, analyticsEventsTable }                          from "@workspace/db";
import { verifyToken }                                       from "../lib/jwt";
import { allowOnly }                                         from "../middleware/sanitize";
import type { EventType }                                    from "@workspace/db";

const router: IRouter = Router();

const VALID_CLIENT_EVENTS = new Set<EventType>([
  "view",
  "swipe_right",
  "swipe_left",
  "save",
  "boost_click",
  "sponsored_view",
  "recommendation_view",
  "product_selected",
  "pairing_selected",
  "food_selected",
  "order_created",
  "brand_view",
  "brand_selected",
  "campaign_triggered",
  "campaign_conversion",
]);

async function tryGetUserId(req: Request): Promise<string | null> {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = await verifyToken(header.slice(7));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

router.post(
  "/",
  allowOnly("eventType", "productId", "venueId", "metadata"),
  async (req: Request, res: Response) => {
    const { eventType, productId, venueId, metadata } = req.body as {
      eventType?: string;
      productId?: string;
      venueId?:   string;
      metadata?:  Record<string, unknown>;
    };

    if (!eventType || !VALID_CLIENT_EVENTS.has(eventType as EventType)) {
      res.status(400).json({
        error: `"eventType" must be one of: ${[...VALID_CLIENT_EVENTS].join(", ")}`,
      });
      return;
    }

    // Respond immediately — analytics must never block the UI
    res.json({ success: true });

    const userId = await tryGetUserId(req);

    db.insert(analyticsEventsTable)
      .values({
        eventType: eventType as EventType,
        productId: productId ?? null,
        venueId:   venueId   ?? null,
        userId:    userId    ?? null,
        metadata:  metadata  ?? null,
      })
      .catch((err) => {
        req.log.error({ err, eventType, productId }, "Failed to persist event");
      });
  },
);

export default router;
