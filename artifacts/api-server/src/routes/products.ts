/**
 * Product routes — inventory listing, creation, and boost management.
 *
 * GET   /api/products      — public product list with current boost state
 * POST  /api/products      — create a new product (auth required)
 * PATCH /api/products/:id  — update boost/sponsored/imageUrl settings (auth required)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db, productsTable }                     from "@workspace/db";
import { getAllInventory, applyBoost, seedProducts, updateImageUrl } from "../services/boostService";
import { registerProductInEngine }               from "../engine/registry";
import { requireAuth, type AuthRequest }         from "../middleware/auth";
import { requireRole }                           from "../middleware/roles";
import { allowOnly }                             from "../middleware/sanitize";
import type { Product }                          from "../engine/types";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLOUDINARY_RE = /^https:\/\/res\.cloudinary\.com\//;

const VALID_CATEGORIES = ["cigar", "alcohol", "wine", "cocktail", "food", "coffee", "tea", "scent", "candle"] as const;
type ValidCategory = (typeof VALID_CATEGORIES)[number];

// ── GET /api/products ─────────────────────────────────────────────────────────
router.get("/", (req: Request, res: Response) => {
  const raw = req.query["category"] ?? req.query["type"];
  const category = typeof raw === "string" ? raw.toLowerCase() : null;
  const venueId = typeof req.query["venueId"] === "string" ? req.query["venueId"] : null;
  let results = getAllInventory();
  if (category) {
    results = results.filter((p) => String(p.category ?? "").toLowerCase() === category);
  }
  if (venueId) {
    results = results.filter((p) => (p as any).venueId === venueId || !(p as any).venueId);
  }
  res.json(results);
});

// ── POST /api/products ────────────────────────────────────────────────────────
router.post(
  "/",
  requireAuth,
  requireRole("venue_owner", "manager", "brand_partner"),
  allowOnly("id", "name", "category", "flavorNotes", "strength", "moodTags", "pairingTags",
            "tier", "boostLevel", "sponsored", "venueId", "brandId", "campaignId", "imageUrl"),
  async (req: AuthRequest, res: Response) => {
    const {
      id, name, category, flavorNotes, strength,
      moodTags, pairingTags, tier, boostLevel,
      sponsored, venueId, brandId, campaignId, imageUrl,
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
      imageUrl?:    string;
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
    if (imageUrl !== undefined && !CLOUDINARY_RE.test(imageUrl)) {
      res.status(400).json({ error: '"imageUrl" must be a valid Cloudinary URL' }); return;
    }

    const productId = id ?? `${category}-${Date.now()}`;
    const VALID_TIERS = ["standard", "mid", "premium"];

    // Vendor (brand_partner) submissions enter as pending; venue/admin go live immediately.
    const isVendorSubmission = req.user?.role === "brand_partner";

    // ── Tenant binding ────────────────────────────────────────────────────────
    // SECURITY: never trust client-supplied venueId/brandId here.
    //   - venue_owner / manager: venueId is forced to the caller's own venue.
    //     If they have no venueId on their JWT, we reject — they can't dump
    //     anonymous inventory into the global pool, and they can't assign
    //     products to a competitor's venue.
    //   - brand_partner: venueId stays null (vendor submissions are
    //     venue-agnostic until an admin places them). brandId is allowed
    //     because the admin review step (vendorAdmin.ts approve/reject)
    //     verifies the brand attribution before the product goes live.
    let effectiveVenueId: string | null;
    let effectiveBrandId: string | null;
    if (isVendorSubmission) {
      effectiveVenueId = null;
      effectiveBrandId = brandId ?? null;
    } else {
      const callerVenueId = req.user?.venueId ?? null;
      if (!callerVenueId) {
        res.status(403).json({ error: "Your account is not linked to a venue; cannot create products" });
        return;
      }
      // venue_owner/manager: client venueId is ignored, brandId is ignored
      // (they manage their own inventory; brand attribution comes via the
      // approved brand catalog and admin tooling, not self-assignment).
      effectiveVenueId = callerVenueId;
      effectiveBrandId = null;
    }

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
        // Vendors cannot self-boost or self-sponsor — that requires a paid placement
        boostLevel:  isVendorSubmission ? 0     : (boostLevel ?? 0),
        sponsored:   isVendorSubmission ? false : (sponsored  ?? false),
        active:      !isVendorSubmission,                            // hidden until approved
        venueId:     effectiveVenueId,
        brandId:     effectiveBrandId,
        campaignId:  campaignId ?? null,
        imageUrl:    imageUrl   ?? null,
        submissionStatus: isVendorSubmission ? "pending" : "approved",
        submittedBy:      isVendorSubmission ? req.user!.id : null,
      })
      .returning();

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
      imageUrl:    inserted.imageUrl ?? undefined,
    };

    // Only seed approved products into the live recommendation engine
    if (!isVendorSubmission) {
      registerProductInEngine(engineProduct);
      seedProducts([engineProduct]);
    }

    req.log.info(
      { productId: inserted.id, name: inserted.name, category, submissionStatus: inserted.submissionStatus },
      isVendorSubmission ? "vendor product submitted (pending approval)" : "product created",
    );
    res.status(isVendorSubmission ? 202 : 201).json(inserted);
  },
);

// ── PATCH /api/products/:id ───────────────────────────────────────────────────
router.patch(
  "/:id",
  requireAuth,
  requireRole("venue_owner", "manager"),
  allowOnly("boostLevel", "sponsored", "brandId", "campaignId", "imageUrl"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    const { boostLevel, sponsored, brandId, campaignId, imageUrl } = req.body as {
      boostLevel?: number;
      sponsored?:  boolean;
      brandId?:    string;
      campaignId?: string;
      imageUrl?:   string;
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

    if (imageUrl !== undefined && !CLOUDINARY_RE.test(imageUrl)) {
      res.status(400).json({ error: '"imageUrl" must be a valid Cloudinary URL' });
      return;
    }

    try {
      // Apply boost/sponsored changes
      const updated = await applyBoost(id, { boostLevel, sponsored, brandId, campaignId });

      // Apply imageUrl change separately (different store / DB column)
      if (imageUrl !== undefined) {
        await updateImageUrl(id, imageUrl);
      }

      req.log.info({ productId: id, userId: req.user?.id, ...updated }, "product updated");
      res.json({ id, ...updated, ...(imageUrl !== undefined ? { imageUrl } : {}) });
    } catch (err) {
      req.log.error({ err, productId: id }, "failed to update product");
      res.status(500).json({ error: "Failed to update product" });
    }
  },
);

export default router;
