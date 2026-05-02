/**
 * POST /api/demand/events — capture a demand event.
 *
 * Accepts any user interaction that represents demand:
 *   selection, oos_request, order, blend_use, search
 *
 * Auth optional — anonymous demand is still valuable.
 * Responds immediately; write is async.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db, demandEventsTable, type InsertDemandEvent }      from "@workspace/db";
import { verifyToken }                                        from "../lib/jwt";
import { allowOnly }                                          from "../middleware/sanitize";
import { DEMAND_EVENT_TYPES }                                 from "@workspace/db";

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

    db.insert(demandEventsTable)
      .values(record)
      .catch((err) => {
        req.log.error({ err }, "Failed to persist demand event");
      });
  },
);

export default router;
