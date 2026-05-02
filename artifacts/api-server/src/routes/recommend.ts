import { Router, type IRouter, type Request, type Response } from "express";
import { getRecommendations } from "../engine/recommend";
import { getRegisteredCategories } from "../engine/registry";
import { RecommendRequest } from "../engine/types";

const router: IRouter = Router();

/**
 * POST /api/recommend
 *
 * Returns ranked product recommendations, cross-category pairings, food pairings,
 * and featured/sponsored products.
 *
 * Body:
 *  {
 *    "category":          "cigar" | "alcohol",
 *    "flavorPreferences": ["smoky", "cedar"],
 *    "strength":          3,
 *    "mood":              "relaxed"
 *  }
 */
router.post("/", (req: Request, res: Response) => {
  const { category, flavorPreferences, strength, mood } = req.body as Partial<RecommendRequest>;

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

  const result = getRecommendations({ category: category.toLowerCase(), flavorPreferences, strength, mood });

  req.log.info(
    { category, strength, mood, resultCount: result.recommendations.length },
    "recommendation request processed",
  );

  res.json(result);
});

export default router;
