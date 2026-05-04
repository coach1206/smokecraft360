import { Router, type IRouter, type Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import {
  db,
  brandPartnersTable,
  brandProductsTable,
  brandsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { logAudit } from "../lib/audit";
import { z } from "zod";

const router: IRouter = Router();

const partnerSchema = z.object({
  name: z.string().min(2).max(120),
  tier: z.enum(["LOCAL", "REGIONAL", "NATIONAL"]).default("LOCAL"),
  active: z.boolean().default(true),
  placementPriority: z.number().int().min(0).max(100).default(0),
  allowedCraftTypes: z.string().max(500).optional(),
  monthlyBudgetCents: z.number().int().min(0).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

router.get(
  "/",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (_req: AuthRequest, res: Response) => {
    const rows = await db
      .select()
      .from(brandPartnersTable)
      .orderBy(desc(brandPartnersTable.createdAt));
    res.json(rows);
  },
);

router.post(
  "/",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const parse = partnerSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid partner data", issues: parse.error.issues });
      return;
    }

    const values: any = { ...parse.data };
    if (parse.data.startDate) values.startDate = new Date(parse.data.startDate);
    if (parse.data.endDate) values.endDate = new Date(parse.data.endDate);

    const [partner] = await db
      .insert(brandPartnersTable)
      .values(values)
      .returning();

    await logAudit(req, {
      action: "brand_partner.created",
      entityType: "brand_partner",
      entityId: partner.id,
      after: { name: partner.name, tier: partner.tier } as unknown as Record<string, unknown>,
    });

    res.status(201).json(partner);
  },
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const parse = partnerSchema.partial().safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }

    const values: any = { ...parse.data, updatedAt: new Date() };
    if (parse.data.startDate) values.startDate = new Date(parse.data.startDate);
    if (parse.data.endDate) values.endDate = new Date(parse.data.endDate);

    const [updated] = await db
      .update(brandPartnersTable)
      .set(values)
      .where(eq(brandPartnersTable.id, String(req.params.id ?? "")))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Partner not found" });
      return;
    }

    await logAudit(req, {
      action: "brand_partner.updated",
      entityType: "brand_partner",
      entityId: updated.id,
      after: parse.data as unknown as Record<string, unknown>,
    });

    res.json(updated);
  },
);

router.get(
  "/:id",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin", "brand_partner"),
  async (req: AuthRequest, res: Response) => {
    const [partner] = await db
      .select()
      .from(brandPartnersTable)
      .where(eq(brandPartnersTable.id, String(req.params.id ?? "")))
      .limit(1);

    if (!partner) {
      res.status(404).json({ error: "Partner not found" });
      return;
    }

    const products = await db
      .select()
      .from(brandProductsTable)
      .where(eq(brandProductsTable.brandId, partner.id));

    res.json({ ...partner, products });
  },
);

const brandProductSchema = z.object({
  productId: z.string().min(1),
  boostWeight: z.number().int().min(0).max(30).default(0),
  isFeatured: z.boolean().default(false),
  campaignId: z.string().uuid().optional(),
});

router.post(
  "/:id/products",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const partnerId = String(req.params.id ?? "");
    const parse = brandProductSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid product link", issues: parse.error.issues });
      return;
    }

    const [existing] = await db
      .select({ id: brandPartnersTable.id })
      .from(brandPartnersTable)
      .where(eq(brandPartnersTable.id, partnerId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Partner not found" });
      return;
    }

    const [link] = await db
      .insert(brandProductsTable)
      .values({
        brandId: partnerId,
        productId: parse.data.productId,
        boostWeight: parse.data.boostWeight,
        isFeatured: parse.data.isFeatured,
        campaignId: parse.data.campaignId ?? null,
      })
      .onConflictDoUpdate({
        target: [brandProductsTable.brandId, brandProductsTable.productId],
        set: {
          boostWeight: parse.data.boostWeight,
          isFeatured: parse.data.isFeatured,
          campaignId: parse.data.campaignId ?? null,
        },
      })
      .returning();

    await logAudit(req, {
      action: "brand_product.linked",
      entityType: "brand_product",
      entityId: link.id,
      after: { brandId: partnerId, productId: parse.data.productId, boostWeight: parse.data.boostWeight } as unknown as Record<string, unknown>,
    });

    res.status(201).json(link);
  },
);

router.delete(
  "/:id/products/:productId",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const partnerId = String(req.params.id ?? "");
    const productId = String(req.params.productId ?? "");

    const [deleted] = await db
      .delete(brandProductsTable)
      .where(
        and(
          eq(brandProductsTable.brandId, partnerId),
          eq(brandProductsTable.productId, productId),
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Link not found" });
      return;
    }

    await logAudit(req, {
      action: "brand_product.unlinked",
      entityType: "brand_product",
      entityId: deleted.id,
      after: { brandId: partnerId, productId } as unknown as Record<string, unknown>,
    });

    res.json({ message: "Product unlinked" });
  },
);

export default router;
