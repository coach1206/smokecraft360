/**
 * Vendor admin moderation routes.
 *
 *   GET  /api/admin/vendor/products/pending   — list awaiting-approval submissions
 *   POST /api/admin/vendor/products/:id/approve   — set submissionStatus=approved + active=true,
 *                                                    seed into recommendation engine
 *   POST /api/admin/vendor/products/:id/reject    — set submissionStatus=rejected + active=false,
 *                                                    capture rejection reason
 *
 * super_admin only.
 */

import { Router, type IRouter, type Response } from "express";
import { eq }                                  from "drizzle-orm";
import { db, productsTable }                   from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import { allowOnly }                           from "../middleware/sanitize";
import { seedProducts }                        from "../services/boostService";
import { registerProductInEngine }             from "../engine/registry";
import type { Product }                        from "../engine/types";

const router: IRouter = Router();

// ── GET /api/admin/vendor/products/pending ────────────────────────────────────

router.get(
  "/products/pending",
  requireAuth,
  requireRole(),
  async (_req: AuthRequest, res: Response) => {
    const rows = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.submissionStatus, "pending"))
      .orderBy(productsTable.createdAt);

    res.json({ pending: rows });
  },
);

// ── POST /api/admin/vendor/products/:id/approve ───────────────────────────────

router.post(
  "/products/:id/approve",
  requireAuth,
  requireRole(),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params["id"] ?? "");
    if (!id) { res.status(400).json({ error: "Product id is required" }); return; }

    const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!existing)                                  { res.status(404).json({ error: "Product not found" });           return; }
    if (existing.submissionStatus !== "pending")    { res.status(409).json({ error: "Product is not pending approval" }); return; }

    const [updated] = await db
      .update(productsTable)
      .set({
        submissionStatus: "approved",
        active:           true,
        reviewedBy:       req.user!.id,
        reviewedAt:       new Date(),
        rejectionReason:  null,
      })
      .where(eq(productsTable.id, id))
      .returning();

    // Now seed into the live recommendation engine
    const engineProduct: Product = {
      id:          updated.id,
      name:        updated.name,
      category:    updated.category,
      flavorNotes: updated.flavorNotes,
      strength:    updated.strength,
      moodTags:    updated.moodTags,
      pairingTags: updated.pairingTags,
      tier:        updated.tier,
      boostLevel:  updated.boostLevel,
      sponsored:   updated.sponsored,
      imageUrl:    updated.imageUrl ?? undefined,
    };
    registerProductInEngine(engineProduct);
    seedProducts([engineProduct]);

    req.log.info({ productId: id, by: req.user?.id }, "Vendor product approved");
    res.json(updated);
  },
);

// ── POST /api/admin/vendor/products/:id/reject ────────────────────────────────

router.post(
  "/products/:id/reject",
  requireAuth,
  requireRole(),
  allowOnly("reason"),
  async (req: AuthRequest, res: Response) => {
    const id     = String(req.params["id"] ?? "");
    const reason = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : null;
    if (!id) { res.status(400).json({ error: "Product id is required" }); return; }

    const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!existing)                               { res.status(404).json({ error: "Product not found" });           return; }
    if (existing.submissionStatus !== "pending") { res.status(409).json({ error: "Product is not pending approval" }); return; }

    const [updated] = await db
      .update(productsTable)
      .set({
        submissionStatus: "rejected",
        active:           false,
        reviewedBy:       req.user!.id,
        reviewedAt:       new Date(),
        rejectionReason:  reason,
      })
      .where(eq(productsTable.id, id))
      .returning();

    req.log.info({ productId: id, by: req.user?.id, reason }, "Vendor product rejected");
    res.json(updated);
  },
);

export default router;
