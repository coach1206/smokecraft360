/**
 * POST /api/events
 *
 * Public endpoint — logs a user interaction event to the analytics_events table.
 * Fire-and-forget safe: responds immediately, DB write is non-blocking.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db, analyticsEventsTable } from "@workspace/db";
import { allowOnly } from "../middleware/sanitize";
import type { EventType } from "@workspace/db";

const router: IRouter = Router();

const VALID_CLIENT_EVENTS = new Set<EventType>([
  "view",
  "swipe_right",
  "swipe_left",
  "save",
  "boost_click",
  "sponsored_view",
]);

router.post(
  "/",
  allowOnly("eventType", "productId"),
  (req: Request, res: Response) => {
    const { eventType, productId } = req.body as { eventType?: string; productId?: string };

    if (!eventType || !VALID_CLIENT_EVENTS.has(eventType as EventType)) {
      res.status(400).json({
        error: `"eventType" must be one of: ${[...VALID_CLIENT_EVENTS].join(", ")}`,
      });
      return;
    }

    // Respond immediately — never let analytics block the client
    res.json({ success: true });

    // Async DB write — errors logged but never affect the response
    db.insert(analyticsEventsTable)
      .values({ eventType: eventType as EventType, productId: productId ?? null })
      .catch((err) => {
        req.log.error({ err, eventType, productId }, "Failed to persist event");
      });
  },
);

export default router;
