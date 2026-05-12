/**
 * Vendor Portal — brand_partner self-service endpoints.
 *
 * All routes require `brand_partner` role (super_admin bypasses via requireRole).
 * Tenant isolation: every query is scoped to req.user.id.
 *
 * GET   /api/vendor/profile             — fetch vendor's onboarding profile
 * POST  /api/vendor/onboarding          — create / update vendor profile
 * GET   /api/vendor/products            — list vendor's submitted products
 * POST  /api/vendor/products            — submit a new product for approval
 * PATCH /api/vendor/products/:id        — edit a pending/rejected product
 * GET   /api/vendor/media               — list vendor's media assets
 * GET   /api/vendor/inventory           — stock levels for vendor's products
 * GET   /api/vendor/venues              — venues stocking vendor's products
 * GET   /api/vendor/performance         — pairing + conversion summary
 * GET   /api/vendor/approvals           — pending / rejected queue
 * GET   /api/vendor/messages            — admin messages to this vendor
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, desc, inArray }              from "drizzle-orm";
import {
  db,
  productsTable,
  mediaAssetsTable,
  venueInventoryTable,
  vendorProfilesTable,
  brandPartnersTable,
  vendorPlacementsTable,
}                                              from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import { allowOnly }                           from "../middleware/sanitize";

const router: IRouter = Router();

const guard = [requireAuth, requireRole("brand_partner")] as const;

const VALID_CATS = [
  "cigar", "alcohol", "beer", "wine", "cocktail",
  "food", "coffee", "tea", "scent", "candle",
] as const;

// ── GET /api/vendor/profile ───────────────────────────────────────────────────
router.get("/profile", ...guard, async (req: AuthRequest, res: Response) => {
  const [profile] = await db
    .select()
    .from(vendorProfilesTable)
    .where(eq(vendorProfilesTable.userId, req.user!.id))
    .limit(1);

  let brandPartner = null;
  if (profile?.brandId) {
    const [bp] = await db
      .select()
      .from(brandPartnersTable)
      .where(eq(brandPartnersTable.id, profile.brandId))
      .limit(1);
    brandPartner = bp ?? null;
  }

  res.json({ profile: profile ?? null, brandPartner });
});

// ── POST /api/vendor/onboarding ───────────────────────────────────────────────
router.post(
  "/onboarding",
  ...guard,
  allowOnly(
    "companyName", "contactEmail", "contactPhone",
    "website", "productCategories", "catalogUrl", "agreementSigned",
  ),
  async (req: AuthRequest, res: Response) => {
    const body = req.body as {
      companyName?:       string;
      contactEmail?:      string;
      contactPhone?:      string;
      website?:           string;
      productCategories?: string;
      catalogUrl?:        string;
      agreementSigned?:   boolean;
    };

    if (!body.companyName?.trim()) {
      res.status(400).json({ error: "companyName is required" }); return;
    }
    if (!body.contactEmail?.trim()) {
      res.status(400).json({ error: "contactEmail is required" }); return;
    }

    const [existing] = await db
      .select({ id: vendorProfilesTable.id })
      .from(vendorProfilesTable)
      .where(eq(vendorProfilesTable.userId, req.user!.id))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(vendorProfilesTable)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(vendorProfilesTable.userId, req.user!.id))
        .returning();
      res.json({ profile: updated });
    } else {
      const [created] = await db
        .insert(vendorProfilesTable)
        .values({
          userId:       req.user!.id,
          companyName:  body.companyName!,
          contactEmail: body.contactEmail!,
          ...body,
        })
        .returning();
      res.json({ profile: created });
    }
  },
);

// ── GET /api/vendor/products ──────────────────────────────────────────────────
router.get("/products", ...guard, async (req: AuthRequest, res: Response) => {
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.submittedBy, req.user!.id))
    .orderBy(desc(productsTable.createdAt));
  res.json({ products });
});

// ── POST /api/vendor/products ─────────────────────────────────────────────────
router.post(
  "/products",
  ...guard,
  allowOnly(
    "name", "category", "flavorNotes", "strength",
    "moodTags", "pairingTags", "tier", "imageUrl",
  ),
  async (req: AuthRequest, res: Response) => {
    const body = req.body as {
      name?:        string;
      category?:    string;
      flavorNotes?: string[];
      strength?:    number;
      moodTags?:    string[];
      pairingTags?: string[];
      tier?:        string;
      imageUrl?:    string;
    };

    if (!body.name?.trim()) {
      res.status(400).json({ error: "name is required" }); return;
    }
    if (!body.category || !VALID_CATS.includes(body.category as typeof VALID_CATS[number])) {
      res.status(400).json({ error: `category must be one of: ${VALID_CATS.join(", ")}` }); return;
    }

    const [product] = await db
      .insert(productsTable)
      .values({
        id:               crypto.randomUUID(),
        name:             body.name,
        category:         body.category as typeof VALID_CATS[number],
        flavorNotes:      Array.isArray(body.flavorNotes)  ? body.flavorNotes  : [],
        strength:         typeof body.strength === "number" ? body.strength     : 3,
        moodTags:         Array.isArray(body.moodTags)     ? body.moodTags     : [],
        pairingTags:      Array.isArray(body.pairingTags)  ? body.pairingTags  : [],
        tier:             (body.tier as any) ?? "standard",
        submittedBy:      req.user!.id,
        submissionStatus: "pending",
        active:           false,
        imageUrl:         body.imageUrl,
      })
      .returning();

    res.status(201).json({ product });
  },
);

// ── PATCH /api/vendor/products/:id ────────────────────────────────────────────
router.patch(
  "/products/:id",
  ...guard,
  allowOnly("name", "flavorNotes", "strength", "moodTags", "pairingTags", "imageUrl"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params["id"] ?? "");

    const [existing] = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.id, id),
          eq(productsTable.submittedBy, req.user!.id),
        ),
      )
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Product not found" }); return;
    }
    if (existing.submissionStatus === "approved") {
      res.status(409).json({ error: "Approved products cannot be edited. Contact support to request a change." });
      return;
    }

    const [updated] = await db
      .update(productsTable)
      .set({ ...(req.body as object), submissionStatus: "pending" })
      .where(eq(productsTable.id, id))
      .returning();

    res.json({ product: updated });
  },
);

// ── GET /api/vendor/media ─────────────────────────────────────────────────────
router.get("/media", ...guard, async (req: AuthRequest, res: Response) => {
  const assets = await db
    .select()
    .from(mediaAssetsTable)
    .where(eq(mediaAssetsTable.uploadedBy, req.user!.id))
    .orderBy(desc(mediaAssetsTable.createdAt));
  res.json({ assets });
});

// ── GET /api/vendor/inventory ─────────────────────────────────────────────────
router.get("/inventory", ...guard, async (req: AuthRequest, res: Response) => {
  const products = await db
    .select({ id: productsTable.id, name: productsTable.name, category: productsTable.category })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.submittedBy, req.user!.id),
        eq(productsTable.submissionStatus, "approved"),
      ),
    );

  if (products.length === 0) {
    res.json({ inventory: [], products: [] }); return;
  }

  const ids = products.map((p) => p.id);
  const inventory = await db
    .select()
    .from(venueInventoryTable)
    .where(inArray(venueInventoryTable.productId, ids));

  res.json({ inventory, products });
});

// ── GET /api/vendor/venues ────────────────────────────────────────────────────
router.get("/venues", ...guard, async (req: AuthRequest, res: Response) => {
  const products = await db
    .select({ id: productsTable.id, name: productsTable.name, submissionStatus: productsTable.submissionStatus })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.submittedBy, req.user!.id),
        eq(productsTable.active, true),
      ),
    );

  if (products.length === 0) {
    res.json({ venues: [], products: [] }); return;
  }

  const ids = products.map((p) => p.id);
  const inventoryRows = await db
    .select({ venueId: venueInventoryTable.venueId, productId: venueInventoryTable.productId, quantity: venueInventoryTable.quantity })
    .from(venueInventoryTable)
    .where(inArray(venueInventoryTable.productId, ids));

  const venueMap = new Map<string, { venueId: string; productCount: number; totalStock: number }>();
  for (const row of inventoryRows) {
    const entry = venueMap.get(row.venueId) ?? { venueId: row.venueId, productCount: 0, totalStock: 0 };
    entry.productCount += 1;
    entry.totalStock   += row.quantity;
    venueMap.set(row.venueId, entry);
  }

  res.json({ venues: Array.from(venueMap.values()), products });
});

// ── GET /api/vendor/performance ───────────────────────────────────────────────
router.get("/performance", ...guard, async (req: AuthRequest, res: Response) => {
  const products = await db
    .select({ id: productsTable.id, name: productsTable.name, category: productsTable.category, boostLevel: productsTable.boostLevel })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.submittedBy, req.user!.id),
        eq(productsTable.submissionStatus, "approved"),
      ),
    );

  const placements = await db
    .select()
    .from(vendorPlacementsTable)
    .where(eq(vendorPlacementsTable.purchasedBy, req.user!.id))
    .orderBy(desc(vendorPlacementsTable.createdAt));

  res.json({
    products: products.map((p) => ({
      ...p,
      shown:             0,
      added:             0,
      conversion:        0,
      revenueInfluenced: 0,
    })),
    placements,
  });
});

// ── GET /api/vendor/approvals ─────────────────────────────────────────────────
router.get("/approvals", ...guard, async (req: AuthRequest, res: Response) => {
  const [pending, rejected, approved] = await Promise.all([
    db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.submittedBy, req.user!.id),
          eq(productsTable.submissionStatus, "pending"),
        ),
      )
      .orderBy(desc(productsTable.createdAt)),
    db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.submittedBy, req.user!.id),
          eq(productsTable.submissionStatus, "rejected"),
        ),
      )
      .orderBy(desc(productsTable.reviewedAt)),
    db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.submittedBy, req.user!.id),
          eq(productsTable.submissionStatus, "approved"),
        ),
      )
      .orderBy(desc(productsTable.reviewedAt)),
  ]);

  res.json({ pending, rejected, approved });
});

// ── GET /api/vendor/messages ──────────────────────────────────────────────────
router.get("/messages", ...guard, (_req: AuthRequest, res: Response) => {
  res.json({ messages: [] });
});

export default router;
