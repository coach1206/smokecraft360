import { Router, type IRouter, type Request, type Response } from "express";
import { getAllInventory, setProductBoost, getProductBoost } from "../engine/inventory";

const router: IRouter = Router();

/**
 * GET /api/inventory
 * Returns all products with their current boost state and impression stats.
 */
router.get("/inventory", (_req: Request, res: Response) => {
  res.json(getAllInventory());
});

/**
 * PATCH /api/inventory/:id
 * Updates boost level and/or sponsored status for a product.
 *
 * Body (all optional):
 *  { boostLevel: 0-3, sponsored: boolean, brandId: string, campaignId: string }
 */
router.patch("/inventory/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const { boostLevel, sponsored, brandId, campaignId } = req.body as {
    boostLevel?: number;
    sponsored?:  boolean;
    brandId?:    string;
    campaignId?: string;
  };

  if (boostLevel !== undefined && (boostLevel < 0 || boostLevel > 3 || !Number.isInteger(boostLevel))) {
    res.status(400).json({ error: '"boostLevel" must be an integer 0–3' });
    return;
  }

  const updated = setProductBoost(id, { boostLevel, sponsored, brandId, campaignId });

  req.log.info({ productId: id, ...updated }, "inventory boost updated");
  res.json({ id, ...updated });
});

/**
 * GET /api/analytics
 * Returns a summary of impression analytics across all products.
 */
router.get("/analytics", (_req: Request, res: Response) => {
  const all = getAllInventory();
  const sponsored = all.filter((p) => p.sponsored);
  const boosted   = all.filter((p) => p.boostLevel > 0);

  const totalImpressions         = all.reduce((s, p) => s + p.impressions, 0);
  const sponsoredImpressions     = sponsored.reduce((s, p) => s + p.impressions, 0);
  const totalFeatured            = all.reduce((s, p) => s + p.featuredImpressions, 0);

  const topPerformers = [...all]
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 5);

  res.json({
    summary: {
      totalProducts: all.length,
      boostedProducts: boosted.length,
      sponsoredProducts: sponsored.length,
      totalImpressions,
      sponsoredImpressions,
      featuredImpressions: totalFeatured,
    },
    topPerformers,
    sponsored: sponsored.sort((a, b) => b.impressions - a.impressions),
  });
});

export default router;
