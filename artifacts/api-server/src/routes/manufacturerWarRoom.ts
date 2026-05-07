/**
 * Manufacturer War Room API
 *
 * GET  /api/manufacturer-war-room/products/:productId/sentiment
 *   Query: ?regionId=<uuid|string>
 *   Returns five sentiment KPIs for a product, optionally scoped to a region.
 *   Roles: manager, venue_owner, super_admin
 *
 * GET  /api/manufacturer-war-room/shadow-tests
 *   Lists all shadow tests (optionally filter ?status=INVISIBLE_ACTIVE&productId=...)
 *   Roles: super_admin
 *
 * POST /api/manufacturer-war-room/shadow-tests
 *   Body: { productId, demographic }
 *   Initiates an INVISIBLE_ACTIVE shadow test.
 *   Roles: super_admin
 *
 * PATCH /api/manufacturer-war-room/shadow-tests/:id/status
 *   Body: { status: "CONCLUDED" | "CANCELLED", results? }
 *   Concludes or cancels an active test.
 *   Roles: super_admin
 */

import { Router, type IRouter, type Response }   from "express";
import { desc, eq, and, inArray }                from "drizzle-orm";
import { db, shadowTestsTable, SHADOW_TEST_STATUSES } from "@workspace/db";
import { z }                                     from "zod";
import { requireAuth, type AuthRequest }         from "../middleware/auth";
import { requireRole }                           from "../middleware/roles";
import {
  getProductSentiment,
  initiateShadowTest,
  concludeShadowTest,
} from "../services/manufacturerWarRoomService";

const router: IRouter = Router();

const superAdminOnly = [requireAuth, requireRole("super_admin")];
const intelligenceGuard = [
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
];

// ── GET /products/:productId/sentiment ────────────────────────────────────────

router.get(
  "/products/:productId/sentiment",
  ...intelligenceGuard,
  async (req: AuthRequest, res: Response) => {
    const productId = String(req.params.productId ?? "").trim();
    if (!productId) {
      res.status(400).json({ error: "productId is required" });
      return;
    }

    const regionId = typeof req.query["regionId"] === "string"
      ? req.query["regionId"].trim() || null
      : null;

    // Non-super_admin: scope region to their own venueId when no explicit override
    const effectiveRegion =
      req.user!.role === "super_admin"
        ? regionId
        : (regionId ?? req.user!.venueId ?? null);

    const sentiment = await getProductSentiment(productId, effectiveRegion);
    res.json(sentiment);
  },
);

// ── GET /shadow-tests ─────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  status:    z.enum(SHADOW_TEST_STATUSES as unknown as [string, ...string[]]).optional(),
  productId: z.string().optional(),
  limit:     z.coerce.number().int().min(1).max(200).default(50),
  offset:    z.coerce.number().int().min(0).default(0),
});

router.get(
  "/shadow-tests",
  ...superAdminOnly,
  async (req: AuthRequest, res: Response) => {
    const q = listQuerySchema.safeParse(req.query);
    if (!q.success) {
      res.status(400).json({ error: "Invalid query", details: q.error.flatten() });
      return;
    }

    const { status, productId, limit, offset } = q.data;

    const conditions = [];
    if (status)    conditions.push(eq(shadowTestsTable.status,    status as typeof SHADOW_TEST_STATUSES[number]));
    if (productId) conditions.push(eq(shadowTestsTable.productId, productId));

    const rows = await db
      .select()
      .from(shadowTestsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(shadowTestsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      total:  rows.length,
      limit,
      offset,
      tests:  rows,
    });
  },
);

// ── POST /shadow-tests ────────────────────────────────────────────────────────

const shadowTestSchema = z.object({
  productId:   z.string().min(1).max(200),
  demographic: z.object({
    ageRange:          z.string().optional(),
    experienceLevel:   z.string().optional(),
    region:            z.string().optional(),
    craftType:         z.enum(["smoke", "pour", "brew", "vape"]).optional(),
    pacingPreference:  z.enum(["Leisurely", "Aggressive"]).optional(),
    socialCluster:     z.string().optional(),
  }).passthrough().default({}),
});

router.post(
  "/shadow-tests",
  ...superAdminOnly,
  async (req: AuthRequest, res: Response) => {
    const parsed = shadowTestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
      return;
    }

    const { productId, demographic } = parsed.data;
    const test = await initiateShadowTest(productId, demographic, req.user!.id);

    res.status(201).json({
      message: "Shadow test initiated",
      test,
    });
  },
);

// ── PATCH /shadow-tests/:id/status ────────────────────────────────────────────

const patchStatusSchema = z.object({
  status:  z.enum(["CONCLUDED", "CANCELLED"]),
  results: z.record(z.unknown()).optional(),
});

router.patch(
  "/shadow-tests/:id/status",
  ...superAdminOnly,
  async (req: AuthRequest, res: Response) => {
    const id     = String(req.params.id ?? "").trim();
    const parsed = patchStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
      return;
    }

    // Verify the test exists and is in an active state
    const [existing] = await db
      .select({ status: shadowTestsTable.status })
      .from(shadowTestsTable)
      .where(
        and(
          eq(shadowTestsTable.id, id),
          inArray(shadowTestsTable.status, ["INVISIBLE_ACTIVE", "ACTIVE"]),
        ),
      );

    if (!existing) {
      res.status(404).json({ error: "Shadow test not found or already concluded" });
      return;
    }

    const updated = await concludeShadowTest(id, parsed.data.status, parsed.data.results);

    res.json({
      message: `Shadow test ${parsed.data.status.toLowerCase()}`,
      test:    updated,
    });
  },
);

export default router;
