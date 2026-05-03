import { Router, type IRouter, type Request, type Response } from "express";
import { getRecommendations } from "../engine/recommend";
import { getRegisteredCategories } from "../engine/registry";
import { allowOnly } from "../middleware/sanitize";
import { RecommendRequest } from "../engine/types";

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
  (req: Request, res: Response) => {
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

    const result = getRecommendations({
      category: category.toLowerCase(),
      flavorPreferences,
      strength,
      mood,
      venueId: typeof venueId === "string" ? venueId : undefined,
      cigarShape: safeShape,
      cigarSession: safeSession,
    });

    req.log.info(
      { category, strength, mood, venueId, resultCount: result.recommendations.length, outOfStockCount: result.outOfStock?.length ?? 0 },
      "recommendation request processed",
    );

    res.json(result);
  },
);

export default router;
