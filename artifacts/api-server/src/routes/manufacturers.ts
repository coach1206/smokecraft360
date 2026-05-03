/**
 * Manufacturers routes — admin only
 *
 * GET    /api/manufacturers       — list all (admin)
 * POST   /api/manufacturers       — create (super_admin)
 * PATCH  /api/manufacturers/:id   — update (super_admin)
 * DELETE /api/manufacturers/:id   — delete (super_admin)
 */

import { Router, type IRouter, type Response } from "express";
import { eq, asc }                              from "drizzle-orm";
import {
  db,
  manufacturersTable,
  MANUFACTURER_SPECIALTIES,
  type ManufacturerSpecialty,
}                                               from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import { z }                                    from "zod";

const router: IRouter = Router();

const manufacturerSchema = z.object({
  name:         z.string().min(2).max(100),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(30).optional(),
  country:      z.string().max(50).optional().default("US"),
  specialty:    z.enum(MANUFACTURER_SPECIALTIES as unknown as [string, ...string[]]).optional().default("premium"),
  notes:        z.string().max(500).optional(),
});

// ── GET /api/manufacturers ────────────────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  requireRole("super_admin", "manager"),
  async (_req: AuthRequest, res: Response) => {
    const rows = await db
      .select()
      .from(manufacturersTable)
      .orderBy(asc(manufacturersTable.name));
    res.json(rows);
  },
);

// ── POST /api/manufacturers ────────────────────────────────────────────────────

router.post(
  "/",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const parsed = manufacturerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
      return;
    }

    const [created] = await db
      .insert(manufacturersTable)
      .values({ ...parsed.data, specialty: parsed.data.specialty as ManufacturerSpecialty })
      .returning();

    req.log.info({ id: created!.id, name: created!.name }, "Manufacturer created");
    res.status(201).json(created);
  },
);

// ── PATCH /api/manufacturers/:id ──────────────────────────────────────────────

router.patch(
  "/:id",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");

    const parsed = manufacturerSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
      return;
    }

    const [updated] = await db
      .update(manufacturersTable)
      .set({ ...parsed.data, updatedAt: new Date() } as Partial<typeof manufacturersTable.$inferInsert>)
      .where(eq(manufacturersTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  },
);

// ── DELETE /api/manufacturers/:id ─────────────────────────────────────────────

router.delete(
  "/:id",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    await db.delete(manufacturersTable).where(eq(manufacturersTable.id, id));
    res.status(204).end();
  },
);

export default router;
