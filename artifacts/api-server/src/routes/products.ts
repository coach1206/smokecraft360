/**
 * Product routes — inventory listing and boost management.
 *
 * GET  /api/inventory       — public product list with current boost state
 * PATCH /api/inventory/:id  — update a product's boost/sponsored settings (auth required)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { getAllInventory, applyBoost } from "../services/boostService";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import type { AuthRequest } from "../middleware/auth";

const router: IRouter = Router();

/**
 * GET /api/inventory
 * Public — returns all products with their current boost state and
 * session impression counts.
 */
router.get("/inventory", (_req: Request, res: Response) => {
  res.json(getAllInventory());
});

/**
 * PATCH /api/inventory/:id
 * Protected — requires venue_owner, manager, or super_admin.
 *
 * Body (all fields optional):
 *   { boostLevel: 0–3, sponsored: boolean, brandId?: string, campaignId?: string }
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.patch(
  "/inventory/:id",
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
