/**
 * /api/admin/entitlements — manage per-venue feature packages and overrides.
 *
 *   GET  /api/admin/entitlements                list all venue entitlements (super_admin)
 *   GET  /api/admin/entitlements/catalog        feature + package catalog (super_admin)
 *   GET  /api/admin/entitlements/:venueId       get venue entitlement
 *   PUT  /api/admin/entitlements/:venueId       set venue entitlement + pricing
 *   GET  /api/admin/entitlements/:venueId/audit entitlement audit log
 *   GET  /api/entitlements/my                   current user's effective features
 */

import { Router, type Response }                 from "express";
import { eq, desc }                              from "drizzle-orm";
import { z }                                     from "zod/v4";
import { db, venueEntitlementsTable, entitlementAuditLogsTable, venuesTable } from "@workspace/db";
import { requireAuth, type AuthRequest }         from "../middleware/auth";
import { requireRole }                           from "../middleware/roles";
import { FEATURE_CATALOG, PACKAGE_CATALOG, resolveFeatures } from "../lib/featureCatalog";
import { invalidateEntitlementCache }            from "../middleware/requireFeature";

const router = Router();

const overrideSchema = z.object({
  id:      z.string().min(1),
  enabled: z.boolean(),
});

const putSchema = z.object({
  packageId:        z.string().nullable().optional(),
  featureOverrides: z.array(overrideSchema).optional(),
  monthlyPrice:     z.number().nonnegative().nullable().optional(),
  transactionFee:   z.number().nonnegative().nullable().optional(),
  setupFee:         z.number().nonnegative().nullable().optional(),
});

// ── Catalog (public to admins) ──────────────────────────────────────────────

router.get(
  "/catalog",
  requireAuth,
  requireRole("super_admin"),
  (_req: AuthRequest, res: Response) => {
    res.json({ features: FEATURE_CATALOG, packages: PACKAGE_CATALOG });
  },
);

// ── Current user's effective features ──────────────────────────────────────

router.get(
  "/my",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
    if (req.user.role === "super_admin") {
      res.json({ features: FEATURE_CATALOG.map(f => f.id), packageId: "enterprise" });
      return;
    }
    if (!req.user.venueId) {
      res.json({ features: [], packageId: null });
      return;
    }
    try {
      const [row] = await db
        .select()
        .from(venueEntitlementsTable)
        .where(eq(venueEntitlementsTable.venueId, req.user.venueId))
        .limit(1);
      const features = resolveFeatures(row?.packageId, row?.featureOverrides ?? []);
      res.json({
        features:         Array.from(features),
        packageId:        row?.packageId ?? null,
        featureOverrides: row?.featureOverrides ?? [],
        monthlyPrice:     row?.monthlyPrice ?? null,
        transactionFee:   row?.transactionFee ?? null,
        setupFee:         row?.setupFee ?? null,
      });
    } catch (err) {
      req.log.error({ err }, "entitlements.my failed");
      res.status(500).json({ error: "Failed to load entitlements" });
    }
  },
);

// ── List all venues with entitlements ───────────────────────────────────────

router.get(
  "/",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const venues = await db
        .select({ id: venuesTable.id, name: venuesTable.name, type: venuesTable.type })
        .from(venuesTable)
        .orderBy(venuesTable.name);

      const ents = await db.select().from(venueEntitlementsTable);
      const entMap = new Map(ents.map(e => [e.venueId, e]));

      const rows = venues.map(v => {
        const e = entMap.get(v.id);
        const features = resolveFeatures(e?.packageId, e?.featureOverrides ?? []);
        return {
          venueId:      v.id,
          venueName:    v.name,
          venueType:    v.type,
          packageId:    e?.packageId ?? null,
          featureCount: features.size,
          monthlyPrice: e?.monthlyPrice ?? null,
          updatedAt:    e?.updatedAt ?? null,
        };
      });

      res.json({ entitlements: rows });
    } catch (err) {
      req.log.error({ err }, "entitlements.list failed");
      res.status(500).json({ error: "Failed to load entitlements" });
    }
  },
);

// ── Get one venue ───────────────────────────────────────────────────────────

router.get(
  "/:venueId",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = String(req.params["venueId"]);
    try {
      const [row] = await db
        .select()
        .from(venueEntitlementsTable)
        .where(eq(venueEntitlementsTable.venueId, venueId))
        .limit(1);

      const features = resolveFeatures(row?.packageId, row?.featureOverrides ?? []);
      res.json({
        venueId,
        packageId:        row?.packageId ?? null,
        featureOverrides: row?.featureOverrides ?? [],
        effectiveFeatures: Array.from(features),
        monthlyPrice:     row?.monthlyPrice ?? null,
        transactionFee:   row?.transactionFee ?? null,
        setupFee:         row?.setupFee ?? null,
        updatedAt:        row?.updatedAt ?? null,
        updatedBy:        row?.updatedBy ?? null,
      });
    } catch (err) {
      req.log.error({ err }, "entitlements.get failed");
      res.status(500).json({ error: "Failed to load entitlement" });
    }
  },
);

// ── Set / update venue entitlement ──────────────────────────────────────────

router.put(
  "/:venueId",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
    const venueId = String(req.params["venueId"]);
    const parse = putSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid payload", details: parse.error.flatten().fieldErrors });
      return;
    }
    const { packageId, featureOverrides, monthlyPrice, transactionFee, setupFee } = parse.data;

    try {
      // Capture before state for audit
      const [before] = await db
        .select()
        .from(venueEntitlementsTable)
        .where(eq(venueEntitlementsTable.venueId, venueId))
        .limit(1);

      const patch: typeof venueEntitlementsTable.$inferInsert = {
        venueId,
        updatedAt:  new Date(),
        updatedBy:  req.user.id,
      };
      if (packageId        !== undefined) patch.packageId        = packageId;
      if (featureOverrides !== undefined) patch.featureOverrides = featureOverrides;
      if (monthlyPrice     !== undefined) patch.monthlyPrice     = monthlyPrice !== null ? String(monthlyPrice) : null;
      if (transactionFee   !== undefined) patch.transactionFee   = transactionFee !== null ? String(transactionFee) : null;
      if (setupFee         !== undefined) patch.setupFee         = setupFee !== null ? String(setupFee) : null;

      const [updated] = await db
        .insert(venueEntitlementsTable)
        .values(patch)
        .onConflictDoUpdate({ target: venueEntitlementsTable.venueId, set: patch })
        .returning();

      // Write audit log
      await db.insert(entitlementAuditLogsTable).values({
        venueId,
        adminId:   req.user.id,
        adminName: req.user.name ?? req.user.id,
        action:    before ? "updated" : "created",
        before:    before ? { packageId: before.packageId, featureOverrides: before.featureOverrides, monthlyPrice: before.monthlyPrice } : null,
        after:     { packageId: updated?.packageId, featureOverrides: updated?.featureOverrides, monthlyPrice: updated?.monthlyPrice },
      });

      invalidateEntitlementCache(venueId);

      const features = resolveFeatures(updated?.packageId, updated?.featureOverrides ?? []);
      res.json({
        venueId,
        packageId:         updated?.packageId ?? null,
        featureOverrides:  updated?.featureOverrides ?? [],
        effectiveFeatures: Array.from(features),
        monthlyPrice:      updated?.monthlyPrice ?? null,
        transactionFee:    updated?.transactionFee ?? null,
        setupFee:          updated?.setupFee ?? null,
        updatedAt:         updated?.updatedAt,
      });
    } catch (err) {
      req.log.error({ err }, "entitlements.put failed");
      res.status(500).json({ error: "Failed to save entitlement" });
    }
  },
);

// ── Audit log for a venue ───────────────────────────────────────────────────

router.get(
  "/:venueId/audit",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = String(req.params["venueId"]);
    try {
      const logs = await db
        .select()
        .from(entitlementAuditLogsTable)
        .where(eq(entitlementAuditLogsTable.venueId, venueId))
        .orderBy(desc(entitlementAuditLogsTable.createdAt))
        .limit(100);
      res.json({ logs });
    } catch (err) {
      req.log.error({ err }, "entitlements.audit failed");
      res.status(500).json({ error: "Failed to load audit log" });
    }
  },
);

export default router;
