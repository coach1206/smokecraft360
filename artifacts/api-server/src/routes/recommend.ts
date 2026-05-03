import { Router, type IRouter, type Request, type Response } from "express";
import { getRecommendations } from "../engine/recommend";
import { getRegisteredCategories } from "../engine/registry";
import { allowOnly } from "../middleware/sanitize";
import { RecommendRequest } from "../engine/types";
import { verifyToken } from "../lib/jwt";
import { getTasteProfile } from "../services/tasteProfile";

/** Pull a userId from the optional Bearer token. Never throws. */
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

const router: IRouter = Router();

/**
 * POST /api/recommend
 *
 * Returns ranked product recommendations, cross-category pairings, food pairings,
 * and featured/sponsored products.
 *
 * Body (only these fields are accepted — all others are stripped):
 *  {
 *    "category":          "cigar" | "alcohol" | "beer" | "wine" | "cocktail",
 *    "flavorPreferences": ["smoky", "cedar"],
 *    "strength":          3,          // 1–5
 *    "mood":              "relaxed"
 *  }
 *
 * The list of accepted categories is defined by the engine registry
 * (see engine/registry.ts → datasets) and surfaced at request time via
 * getRegisteredCategories(), so adding a new vertical needs no change here.
 */
router.post(
  "/",
  allowOnly("category", "flavorPreferences", "strength", "mood", "venueId", "cigarShape", "cigarSession"),
  async (req: Request, res: Response) => {
    const { category, flavorPreferences, strength, mood, venueId, cigarShape, cigarSession } = req.body as Partial<RecommendRequest>;
    const validShapes = ["robusto","corona","toro","churchill","torpedo","belicoso"] as const;
    const validSessions = ["quick","standard","extended","long"] as const;
    const safeShape = typeof cigarShape === "string" && (validShapes as readonly string[]).includes(cigarShape) ? cigarShape as RecommendRequest["cigarShape"] : undefined;
    const safeSession = typeof cigarSession === "string" && (validSessions as readonly string[]).includes(cigarSession) ? cigarSession as RecommendRequest["cigarSession"] : undefined;

    const validCategories = getRegisteredCategories();

    if (!category || !validCategories.includes(category.toLowerCase())) {
      res.status(400).json({ error: `"category" must be one of: ${validCategories.join(", ")}` });
      return;
    }
    if (!Array.isArray(flavorPreferences) || flavorPreferences.length === 0) {
      res.status(400).json({ error: '"flavorPreferences" must be a non-empty array of strings' });
      return;
    }
    if (typeof strength !== "number" || strength < 1 || strength > 5) {
      res.status(400).json({ error: '"strength" must be a number between 1 and 5' });
      return;
    }
    if (!mood || typeof mood !== "string") {
      res.status(400).json({ error: '"mood" must be a non-empty string' });
      return;
    }

    /* Optional personalization — auto-recommend bias from past behavior.
     * Pulled only for authenticated users; anonymous kiosk requests skip
     * this entirely so behavior is unchanged. Failure is non-fatal: any
     * error inside getTasteProfile returns EMPTY_PROFILE and the engine
     * just behaves as it always has. */
    const userId = await tryGetUserId(req);
    const tasteProfile = userId
      ? await getTasteProfile(userId).catch(() => undefined)
      : undefined;

    const result = getRecommendations({
      category: category.toLowerCase(),
      flavorPreferences,
      strength,
      mood,
      venueId: typeof venueId === "string" ? venueId : undefined,
      cigarShape: safeShape,
      cigarSession: safeSession,
      tasteProfile: tasteProfile && tasteProfile.sampleCount > 0
        ? {
            strength:    tasteProfile.strength,
            flavor:      tasteProfile.flavor,
            mood:        tasteProfile.mood,
            categories:  tasteProfile.categories,
            sampleCount: tasteProfile.sampleCount,
          }
        : undefined,
    });

    req.log.info(
      { category, strength, mood, venueId, resultCount: result.recommendations.length, outOfStockCount: result.outOfStock?.length ?? 0 },
      "recommendation request processed",
    );

    res.json(result);
  },
);

export default router;
