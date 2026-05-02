/**
 * Product routes — inventory listing and boost management.
 *
 * GET  /api/products      — public product list with current boost state
 * PATCH /api/products/:id — update a product's boost/sponsored settings (auth required)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { getAllInventory, applyBoost } from "../services/boostService";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/products
 * Public — returns all products with current boost state and impression counts.
 */
router.get("/", (_req: Request, res: Response) => {
  res.json(getAllInventory());
});

/**
 * PATCH /api/products/:id
 * Protected — requires venue_owner, manager, or super_admin.
 *
 * Body (all fields optional):
 *   { boostLevel: 0–3, sponsored: boolean, brandId?: string, campaignId?: string }
 */
router.patch(
  "/:id",
  requireAuth,
  requireRole("venue_owner", "manager"),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { boostLevel, sponsored, brandId, campaignId } = req.body as {
      boostLevel?: number;
      sponsored?:  boolean;
      brandId?:    string;
      campaignId?: string;
    };

    if (
      boostLevel !== undefined &&
      (boostLevel < 0 || boostLevel > 3 || !Number.isInteger(boostLevel))
    ) {
      res.status(400).json({ error: '"boostLevel" must be an integer 0–3' });
      return;
    }

    if (brandId !== undefined && brandId !== null && !UUID_RE.test(brandId)) {
      res.status(400).json({ error: '"brandId" must be a valid UUID' });
      return;
    }

    try {
      const updated = await applyBoost(id, { boostLevel, sponsored, brandId, campaignId });
      req.log.info({ productId: id, userId: req.user?.id, ...updated }, "product boost updated");
      res.json({ id, ...updated });
    } catch (err) {
      req.log.error({ err, productId: id }, "failed to update product boost");
      res.status(500).json({ error: "Failed to update product" });
    }
  },
);

export default router;
