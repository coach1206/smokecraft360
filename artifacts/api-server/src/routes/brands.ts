/**
 * Brands API
 *
 * GET    /api/brands           — list all brands with product counts + impressions
 * POST   /api/brands           — create brand (super_admin / venue_owner)
 * PATCH  /api/brands/:id       — update brand fields
 * GET    /api/brands/:id/performance — brand performance detail
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql }                         from "drizzle-orm";
import { db, brandsTable, productsTable }  from "@workspace/db";
import { getAllInventory }                  from "../services/boostService";
import { requireAuth, type AuthRequest }   from "../middleware/auth";
import { requireRole }                     from "../middleware/roles";
import { allowOnly }                       from "../middleware/sanitize";

const router: IRouter = Router();

// ── helpers ───────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Attach live impression totals from the in-memory inventory store. */
function withImpressions(brands: (typeof brandsTable.$inferSelect)[], productCounts: Map<string, number>) {
  const inventory = getAllInventory();
  const impByBrand = new Map<string, { impressions: number; sponsoredImpressions: number }>();

  for (const item of inventory) {
    if (!item.brandId) continue;
    const current = impByBrand.get(item.brandId) ?? { impressions: 0, sponsoredImpressions: 0 };
    current.impressions += item.impressions;
    if (item.sponsored) current.sponsoredImpressions += item.impressions;
    impByBrand.set(item.brandId, current);
  }

  return brands.map((b) => ({
    ...b,
    productCount:         productCounts.get(b.id) ?? 0,
    impressions:          impByBrand.get(b.id)?.impressions          ?? 0,
    sponsoredImpressions: impByBrand.get(b.id)?.sponsoredImpressions ?? 0,
  }));
}

/** Build a brandId → productCount map from DB. */
async function buildProductCountMap(): Promise<Map<string, number>> {
  const rows = await db
    .select({
      brandId: productsTable.brandId,
      cnt:     sql<number>`cast(count(*) as integer)`,
    })
    .from(productsTable)
    .where(sql`${productsTable.brandId} IS NOT NULL`)
    .groupBy(productsTable.brandId);

  return new Map(rows.filter((r) => r.brandId).map((r) => [r.brandId!, r.cnt]));
}

// ── GET /api/brands ───────────────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  const [brands, countMap] = await Promise.all([
    db.select().from(brandsTable).orderBy(brandsTable.name),
    buildProductCountMap(),
  ]);
  res.json(withImpressions(brands, countMap));
});

// ── POST /api/brands ──────────────────────────────────────────────────────────
router.post(
  "/",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  allowOnly("name", "category", "distributorId", "logoUrl", "website", "contactEmail", "active"),
  async (req: AuthRequest, res: Response) => {
    const { name, category, distributorId, logoUrl, website, contactEmail } = req.body as {
      name?:          string;
      category?:      string;
      distributorId?: string;
      logoUrl?:       string;
      website?:       string;
      contactEmail?:  string;
    };

    if (!name?.trim()) {
      res.status(400).json({ error: '"name" is required' }); return;
    }
    if (!category || !["cigar", "alcohol", "food"].includes(category)) {
      res.status(400).json({ error: '"category" must be cigar, alcohol, or food' }); return;
    }
    if (distributorId && !UUID_RE.test(distributorId)) {
      res.status(400).json({ error: '"distributorId" must be a valid UUID' }); return;
    }

    const [brand] = await db.insert(brandsTable).values({
      name:          name.trim(),
      category,
      distributorId: distributorId ?? null,
      logoUrl:       logoUrl       ?? null,
      website:       website       ?? null,
      contactEmail:  contactEmail  ?? null,
    }).returning();

    req.log.info({ brandId: brand.id, name: brand.name }, "brand created");
    res.status(201).json({ ...brand, productCount: 0, impressions: 0, sponsoredImpressions: 0 });
  },
);

// ── PATCH /api/brands/:id ─────────────────────────────────────────────────────
router.patch(
  "/:id",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  allowOnly("name", "category", "distributorId", "logoUrl", "website", "contactEmail", "active"),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid brand id" }); return; }

    const { name, category, distributorId, logoUrl, website, contactEmail, active } = req.body as {
      name?:          string;
      category?:      string;
      distributorId?: string | null;
      logoUrl?:       string | null;
      website?:       string | null;
      contactEmail?:  string | null;
      active?:        boolean;
    };

    const updates: Partial<typeof brandsTable.$inferInsert> = {};
    if (name          !== undefined) updates.name          = name.trim();
    if (category      !== undefined) updates.category      = category;
    if (distributorId !== undefined) updates.distributorId = distributorId;
    if (logoUrl       !== undefined) updates.logoUrl       = logoUrl;
    if (website       !== undefined) updates.website       = website;
    if (contactEmail  !== undefined) updates.contactEmail  = contactEmail;
    if (active        !== undefined) updates.active        = active;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" }); return;
    }

    const [updated] = await db.update(brandsTable).set(updates).where(eq(brandsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Brand not found" }); return; }

    req.log.info({ brandId: id }, "brand updated");
    res.json(updated);
  },
);

// ── GET /api/brands/:id/performance ──────────────────────────────────────────
router.get(
  "/:id/performance",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager", "brand_partner"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid brand id" }); return; }

    const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, id)).limit(1);
    if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }

    const inventory = getAllInventory();
    const products  = inventory.filter((p) => p.brandId === id);

    const totalImpressions     = products.reduce((s, p) => s + p.impressions,         0);
    const sponsoredImpressions = products.reduce((s, p) => s + (p.sponsored ? p.impressions : 0), 0);
    const boostedCount         = products.filter((p) => p.boostLevel > 0).length;
    const sponsoredCount       = products.filter((p) => p.sponsored).length;

    res.json({
      brand,
      products: products.map((p) => ({
        id:          p.id,
        name:        p.name,
        category:    p.category,
        tier:        p.tier,
        boostLevel:  p.boostLevel,
        sponsored:   p.sponsored,
        impressions: p.impressions,
        imageUrl:    p.imageUrl,
      })),
      summary: {
        productCount:         products.length,
        totalImpressions,
        sponsoredImpressions,
        boostedCount,
        sponsoredCount,
      },
    });
  },
);

export default router;
