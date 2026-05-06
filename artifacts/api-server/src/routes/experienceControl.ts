/**
 * experienceControl — admin routes for tuning the immersive Experience Engine.
 *
 * GET  /api/admin/experience-control         — fetch global + per-craft settings for this venue
 * POST /api/admin/experience-control         — upsert a settings row (body includes craftType: null|craft)
 * PATCH /api/admin/experience-control/:id   — partial update of an existing row
 *
 * Protected: venue_owner, manager, super_admin.
 * super_admin may pass an explicit venueId to manage other venues.
 */

import { Router, type IRouter, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { db } from "@workspace/db";
import { experienceControlSettingsTable } from "@workspace/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// ── Zod schemas ───────────────────────────────────────────────────────────────

const CRAFT_TYPES  = ["smoke", "pour", "brew", "vape"] as const;
const PERF_MODES   = ["cinematic", "balanced", "low-power"] as const;
const VENUE_MODES  = ["lounge", "nightlife", "premium", "social", "calm", "event"] as const;

const settingsBodySchema = z.object({
  craftType:           z.enum(CRAFT_TYPES).nullable().optional(),
  atmosphereIntensity: z.number().int().min(0).max(100).optional(),
  particleDensity:     z.number().int().min(0).max(100).optional(),
  motionCalmness:      z.number().int().min(0).max(100).optional(),
  revealPacing:        z.number().int().min(0).max(100).optional(),
  soundVolume:         z.number().int().min(0).max(100).optional(),
  performanceMode:     z.enum(PERF_MODES).optional(),
  venueMode:           z.enum(VENUE_MODES).nullable().optional(),
  venueId:             z.string().uuid().optional(),   // super_admin only
});

const patchBodySchema = z.object({
  atmosphereIntensity: z.number().int().min(0).max(100).optional(),
  particleDensity:     z.number().int().min(0).max(100).optional(),
  motionCalmness:      z.number().int().min(0).max(100).optional(),
  revealPacing:        z.number().int().min(0).max(100).optional(),
  soundVolume:         z.number().int().min(0).max(100).optional(),
  performanceMode:     z.enum(PERF_MODES).optional(),
  venueMode:           z.enum(VENUE_MODES).nullable().optional(),
});

// ── Helper: resolve venueId for the request ───────────────────────────────────

function resolveVenueId(req: AuthRequest, bodyVenueId?: string): string | null {
  if (req.user!.role === "super_admin" && bodyVenueId) return bodyVenueId;
  return req.user!.venueId ?? null;
}

// ── GET / — fetch all settings rows for this venue ────────────────────────────

router.get(
  "/",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const venueId = resolveVenueId(req, req.query["venueId"] as string | undefined);

    const rows = await db
      .select()
      .from(experienceControlSettingsTable)
      .where(
        venueId
          ? eq(experienceControlSettingsTable.venueId, venueId)
          : isNull(experienceControlSettingsTable.venueId),
      );

    const global   = rows.find(r => r.craftType === null) ?? null;
    const perCraft = Object.fromEntries(
      rows.filter(r => r.craftType !== null).map(r => [r.craftType!, r]),
    );

    res.json({ global, perCraft });
  },
);

// ── POST / — upsert (create or replace) a settings row ───────────────────────

router.post(
  "/",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = settingsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
      return;
    }

    const { craftType = null, venueId: bodyVenueId, ...fields } = parsed.data;
    const venueId = resolveVenueId(req, bodyVenueId);

    // Look for existing row for this venue + craftType combination
    const condition = and(
      venueId ? eq(experienceControlSettingsTable.venueId, venueId) : isNull(experienceControlSettingsTable.venueId),
      craftType ? eq(experienceControlSettingsTable.craftType, craftType) : isNull(experienceControlSettingsTable.craftType),
    );

    const [existing] = await db
      .select({ id: experienceControlSettingsTable.id })
      .from(experienceControlSettingsTable)
      .where(condition)
      .limit(1);

    let row: typeof experienceControlSettingsTable.$inferSelect;

    if (existing) {
      const [updated] = await db
        .update(experienceControlSettingsTable)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(experienceControlSettingsTable.id, existing.id))
        .returning();
      row = updated!;
    } else {
      const [created] = await db
        .insert(experienceControlSettingsTable)
        .values({
          venueId:             venueId ?? undefined,
          craftType:           craftType ?? undefined,
          atmosphereIntensity: fields.atmosphereIntensity ?? 70,
          particleDensity:     fields.particleDensity     ?? 65,
          motionCalmness:      fields.motionCalmness      ?? 55,
          revealPacing:        fields.revealPacing        ?? 70,
          soundVolume:         fields.soundVolume         ?? 40,
          performanceMode:     fields.performanceMode     ?? "balanced",
          venueMode:           fields.venueMode           ?? null,
        })
        .returning();
      row = created!;
    }

    req.log.info({ venueId, craftType, rowId: row.id }, "experience control settings upserted");
    res.json({ row });
  },
);

// ── PATCH /:id — partial field update ─────────────────────────────────────────

router.patch(
  "/:id",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };

    // Verify ownership
    const [existing] = await db
      .select()
      .from(experienceControlSettingsTable)
      .where(eq(experienceControlSettingsTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Settings row not found" });
      return;
    }

    const userVenueId = req.user!.venueId;
    if (req.user!.role !== "super_admin" && existing.venueId !== userVenueId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const parsed = patchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
      return;
    }

    const fields = parsed.data;
    if (Object.keys(fields).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [updated] = await db
      .update(experienceControlSettingsTable)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(experienceControlSettingsTable.id, id))
      .returning();

    req.log.info({ rowId: id, changes: Object.keys(fields) }, "experience control settings patched");
    res.json({ row: updated });
  },
);

export default router;
