/**
 * POST /api/session/forecast
 *
 * Combined endpoint for the two pure session-economics helpers
 * (predictSessionRevenue + getSmartPrice). Does no DB writes — purely
 * a deterministic compute over the in-flight session signals supplied
 * by the kiosk client. Safe to call as often as the client needs.
 *
 *   Body:
 *   {
 *     "basePriceCents": 4500,        // supplier price from venue_inventory
 *     "interactions":   3,           // swipes / card picks this session
 *     "timeOnScreen":   1800         // optional dwell ms
 *   }
 *
 *   Response:
 *   {
 *     "forecast":    { expectedRevenueCents, upsellProbability, avgUpsellCents },
 *     "smartPrice":  { finalPriceCents, adjustment, basePriceCents }
 *   }
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { allowOnly } from "../middleware/sanitize";
import {
  predictSessionRevenue,
  getSmartPrice,
} from "../services/sessionEconomics";

const router: IRouter = Router();

router.post(
  "/session/forecast",
  allowOnly("basePriceCents", "interactions", "timeOnScreen"),
  (req: Request, res: Response) => {
    const { basePriceCents, interactions, timeOnScreen } = req.body as {
      basePriceCents?: unknown;
      interactions?:   unknown;
      timeOnScreen?:   unknown;
    };

    const base   = typeof basePriceCents === "number" && Number.isFinite(basePriceCents) ? basePriceCents : 0;
    const inter  = typeof interactions   === "number" && Number.isFinite(interactions)   ? interactions   : 0;
    const dwell  = typeof timeOnScreen   === "number" && Number.isFinite(timeOnScreen)   ? timeOnScreen   : undefined;

    const forecast   = predictSessionRevenue({ basePriceCents: base, interactions: inter, timeOnScreen: dwell });
    const smartPrice = getSmartPrice(base, { interactions: inter, timeOnScreen: dwell });

    res.json({ forecast, smartPrice });
  },
);

export default router;
