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
  "campaign_reward_applied",
  "nda_viewed",
  "nda_signed",
  "nda_synced",
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

// ── GET /api/events/venue/:venueId — scheduled venue events ───────────────────
// In-memory per-venue event schedule. Falls back to a curated default set so
// the E.A.T. terminal always has events to display even before staff add their own.

interface VenueEvent {
  id:       string;
  name:     string;
  schedule: string;
  desc:     string;
}

const DEFAULT_VENUE_EVENTS: VenueEvent[] = [
  { id: "e1", name: "Smooth Jazz Night",  schedule: "Every Friday 8PM – 12AM",  desc: "Live jazz, crafted cocktails and premium pairings." },
  { id: "e2", name: "Cigar & Bourbon",    schedule: "Saturdays 7PM",            desc: "Reserve single malts paired with hand-rolled selections." },
  { id: "e3", name: "Wine Down",          schedule: "Wednesdays 6PM",           desc: "Curated sommelier flights and small plates." },
  { id: "e4", name: "Latin Night",        schedule: "Thursdays 9PM",            desc: "Live salsa, signature cocktails, vibrant atmosphere." },
  { id: "e5", name: "Poker Night",        schedule: "Tuesdays 8PM",             desc: "High-stakes tables, premium cigars on the house." },
];

const venueEventStore: Map<string, VenueEvent[]> = new Map();

router.get(
  "/venue/:venueId",
  async (req: Request, res: Response) => {
    const { venueId } = req.params as { venueId: string };
    const events = venueEventStore.get(venueId) ?? DEFAULT_VENUE_EVENTS;
    res.json({ events, venueId, count: events.length });
  },
);

export default router;
