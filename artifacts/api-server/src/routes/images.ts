/**
 * Image resolution route — POST /api/images/resolve
 *
 * Given a product (or a category+subtype hint) plus optional context,
 * returns the URL the kiosk should render. Combines:
 *
 *   - The Product's own Cloudinary URL (when populated)
 *   - A category/subtype fallback when no per-product image exists
 *   - Sold-out replacement keyed off real venue inventory
 *   - Cloudinary context transforms (time-of-day / mood / weather)
 *
 * Anonymous-friendly: no auth required (kiosk callers don't always have a
 * session). The `venueId` is taken at face value; if a malicious caller
 * passes a venueId they don't belong to, the worst case is they get a
 * sold-out fallback URL — no data leakage.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { allowOnly } from "../middleware/sanitize";
import { resolveProductImage } from "../services/imageResolver";
import type { ImageContext } from "../services/imageContext";
import { verifyToken } from "../lib/jwt";

const router: IRouter = Router();

/** Returns the venueId the caller is allowed to query for sold-out
 *  signal, or null if they're anonymous / their token is for a different
 *  venue. Anonymous callers NEVER get sold-out lookups — that's an
 *  information-disclosure vector flagged by code review. */
async function authorizedVenueForStock(req: Request, requested: string | undefined): Promise<string | null> {
  if (!requested) return null;
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = await verifyToken(header.slice(7));
    if (payload.role === "super_admin") return requested;
    return payload.venueId === requested ? requested : null;
  } catch {
    return null;
  }
}

const VALID_TIMES   = ["morning", "afternoon", "evening", "night"] as const;
const VALID_WEATHER = ["hot", "cold", "neutral"] as const;

const resolveSchema = z.object({
  productId: z.string().min(1).max(128).optional(),
  category:  z.string().min(1).max(32).optional(),
  subtype:   z.string().min(1).max(32).optional(),
  venueId:   z.string().uuid().optional(),
  context:   z.object({
    timeOfDay: z.enum(VALID_TIMES).optional(),
    mood:      z.string().min(1).max(32).optional(),
    weather:   z.enum(VALID_WEATHER).optional(),
  }).optional(),
}).refine(
  (v) => !!v.productId || (!!v.category && !!v.subtype),
  { message: "Either productId, or category+subtype, is required" },
);

router.post(
  "/resolve",
  allowOnly("productId", "category", "subtype", "venueId", "context"),
  async (req: Request, res: Response) => {
    const parsed = resolveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_payload", details: parsed.error.issues });
      return;
    }
    const ctx: ImageContext = parsed.data.context ?? {};

    /* Sold-out lookups require a Bearer token bound to the venueId.
     * Anonymous callers always get the in-stock branch — prevents
     * unauthenticated probing of competitor inventory state. */
    const stockVenueId = await authorizedVenueForStock(req, parsed.data.venueId);

    const result = resolveProductImage({
      productId: parsed.data.productId,
      category:  parsed.data.category,
      subtype:   parsed.data.subtype,
      venueId:   stockVenueId ?? undefined,
      context:   ctx,
    });
    res.json(result);
  },
);

export default router;
