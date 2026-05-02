/**
 * Product routes — inventory listing, creation, and boost management.
 *
 * GET   /api/products      — public product list with current boost state
 * POST  /api/products      — create a new product (auth required)
 * PATCH /api/products/:id  — update boost/sponsored settings (auth required)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db, productsTable }             from "@workspace/db";
import { getAllInventory, applyBoost, seedProducts } from "../services/boostService";
import { registerProductInEngine }       from "../engine/registry";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole }                   from "../middleware/roles";
import { allowOnly }                     from "../middleware/sanitize";
import type { Product }                  from "../engine/types";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_CATEGORIES = ["cigar", "alcohol", "food", "coffee", "tea", "scent", "candle"] as const;
type ValidCategory = typeof VALID_CATEGORIES[number];

/**
 * GET /api/products
 * Public — returns all products with current boost state and impression counts.
 */
router.get("/", (_req: Request, res: Response) => {
  res.json(getAllInventory());
});

/**
 * POST /api/products
 * Protected — creates a new product, persists to DB, and registers it in the
 * in-memory scoring engine so recommendations reflect it immediately.
 */
router.post(
  "/",
  requireAuth,
  requireRole("venue_owner", "manager"),
  allowOnly("id", "name", "category", "flavorNotes", "strength", "moodTags", "pairingTags", "tier", "boostLevel", "sponsored", "venueId", "brandId", "campaignId"),
  async (req: AuthRequest, res: Response) => {
    const {
      id, name, category, flavorNotes, strength,
      moodTags, pairingTags, tier, boostLevel,
      sponsored, venueId, brandId, campaignId,
    } = req.body as {
      id?:          string;
      name?:        string;
      category?:    string;
      flavorNotes?: string[];
      strength?:    number;
      moodTags?:    string[];
      pairingTags?: string[];
      tier?:        string;
      boostLevel?:  number;
      sponsored?:   boolean;
      venueId?:     string;
      brandId?:     string;
      campaignId?:  string;
    };

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: '"name" is required' }); return;
    }
    if (!category || !VALID_CATEGORIES.includes(category as ValidCategory)) {
      res.status(400).json({ error: `"category" must be one of: ${VALID_CATEGORIES.join(", ")}` }); return;
    }
    if (!Array.isArray(flavorNotes)) {
      res.status(400).json({ error: '"flavorNotes" must be an array of strings' }); return;
    }
    if (strength !== undefined && (typeof strength !== "number" || strength < 1 || strength > 5)) {
      res.status(400).json({ error: '"strength" must be a number between 1 and 5' }); return;
    }
    if (boostLevel !== undefined && (!Number.isInteger(boostLevel) || boostLevel < 0 || boostLevel > 3)) {
      res.status(400).json({ error: '"boostLevel" must be an integer 0–3' }); return;
    }

    const productId = id ?? `${category}-${Date.now()}`;
    const VALID_TIERS = ["standard", "mid", "premium"];

    const [inserted] = await db
      .insert(productsTable)
      .values({
        id:          productId,
        name:        name.trim(),
        category:    category as ValidCategory,
        flavorNotes: flavorNotes ?? [],
        strength:    strength    ?? 3,
        moodTags:    Array.isArray(moodTags)    ? moodTags    : [],
        pairingTags: Array.isArray(pairingTags) ? pairingTags : [],
        tier:        (tier && VALID_TIERS.includes(tier) ? tier : "standard") as "standard" | "mid" | "premium",
        boostLevel:  boostLevel  ?? 0,
        sponsored:   sponsored   ?? false,
        active:      true,
        venueId:     venueId   ?? null,
        brandId:     brandId   ?? null,
        campaignId:  campaignId ?? null,
      })
      .returning();

    // Register in the engine's scoring pool so future recommendations include it
    const engineProduct: Product = {
      id:          inserted.id,
      name:        inserted.name,
      category:    inserted.category,
      flavorNotes: inserted.flavorNotes,
      strength:    inserted.strength,
      moodTags:    inserted.moodTags,
      pairingTags: inserted.pairingTags,
      tier:        inserted.tier,
      boostLevel:  inserted.boostLevel,
      sponsored:   inserted.sponsored,
    };

    registerProductInEngine(engineProduct);
    seedProducts([engineProduct]);

    req.log.info({ productId: inserted.id, name: inserted.name, category }, "product created");
    res.status(201).json(inserted);
  },
);

/**
 * PATCH /api/products/:id
 * Protected — requires venue_owner, manager, or super_admin.
 */
router.patch(
  "/:id",
  requireAuth,
  requireRole("venue_owner", "manager"),
  allowOnly("boostLevel", "sponsored", "brandId", "campaignId"),
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
