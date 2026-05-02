/**
 * Distributors API
 *
 * GET   /api/distributors      — list all distributors with brand counts
 * POST  /api/distributors      — create distributor (super_admin)
 * PATCH /api/distributors/:id  — update distributor
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql }                                from "drizzle-orm";
import { db, distributorsTable, brandsTable }     from "@workspace/db";
import { requireAuth, type AuthRequest }          from "../middleware/auth";
import { requireRole }                            from "../middleware/roles";
import { allowOnly }                              from "../middleware/sanitize";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── GET /api/distributors ─────────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  const [distributors, brandCounts] = await Promise.all([
    db.select().from(distributorsTable).orderBy(distributorsTable.name),
    db
      .select({
        distributorId: brandsTable.distributorId,
        cnt:           sql<number>`cast(count(*) as integer)`,
      })
      .from(brandsTable)
      .where(sql`${brandsTable.distributorId} IS NOT NULL`)
      .groupBy(brandsTable.distributorId),
  ]);

  const countMap = new Map(
    brandCounts.filter((r) => r.distributorId).map((r) => [r.distributorId!, r.cnt]),
  );

  res.json(
    distributors.map((d) => ({ ...d, brandCount: countMap.get(d.id) ?? 0 })),
  );
});

// ── POST /api/distributors ────────────────────────────────────────────────────
router.post(
  "/",
  requireAuth,
  requireRole("super_admin"),
  allowOnly("name", "state", "contactEmail", "website", "region", "active"),
  async (req: AuthRequest, res: Response) => {
    const { name, state, contactEmail, website, region } = req.body as {
      name?:         string;
      state?:        string;
      contactEmail?: string;
      website?:      string;
      region?:       string;
    };

    if (!name?.trim()) {
      res.status(400).json({ error: '"name" is required' }); return;
    }

    const [dist] = await db.insert(distributorsTable).values({
      name:         name.trim(),
      state:        state        ?? null,
      contactEmail: contactEmail ?? null,
      website:      website      ?? null,
      region:       region       ?? null,
    }).returning();

    req.log.info({ distributorId: dist.id, name: dist.name }, "distributor created");
    res.status(201).json({ ...dist, brandCount: 0 });
  },
);

// ── PATCH /api/distributors/:id ───────────────────────────────────────────────
router.patch(
  "/:id",
  requireAuth,
  requireRole("super_admin"),
  allowOnly("name", "state", "contactEmail", "website", "region", "active"),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid distributor id" }); return; }

    const { name, state, contactEmail, website, region, active } = req.body as {
      name?:         string;
      state?:        string | null;
      contactEmail?: string | null;
      website?:      string | null;
      region?:       string | null;
      active?:       boolean;
    };

    const updates: Partial<typeof distributorsTable.$inferInsert> = {};
    if (name         !== undefined) updates.name         = name.trim();
    if (state        !== undefined) updates.state        = state;
    if (contactEmail !== undefined) updates.contactEmail = contactEmail;
    if (website      !== undefined) updates.website      = website;
    if (region       !== undefined) updates.region       = region;
    if (active       !== undefined) updates.active       = active;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" }); return;
    }

    const [updated] = await db
      .update(distributorsTable)
      .set(updates)
      .where(eq(distributorsTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Distributor not found" }); return; }

    req.log.info({ distributorId: id }, "distributor updated");
    res.json(updated);
  },
);

export default router;
