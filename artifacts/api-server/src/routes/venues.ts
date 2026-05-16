/**
 * Venue routes — multi-tenant venue management and white-label config.
 *
 * GET  /api/venues           — list all venues (super_admin)
 * POST /api/venues           — create a venue (super_admin)
 * GET  /api/venues/:id       — public venue config (used by frontend for white-label)
 */

import { Router, type IRouter, type Response } from "express";
import { eq }                                   from "drizzle-orm";
import { db, venuesTable, themeProfilesTable }  from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import { allowOnly }                            from "../middleware/sanitize";
import { logAudit }                             from "../lib/audit";

const router: IRouter = Router();

// ── GET /api/venues — list (super_admin) ─────────────────────────────────────
router.get("/", requireAuth, requireRole("super_admin"), async (_req, res: Response) => {
  const venues = await db
    .select()
    .from(venuesTable)
    .orderBy(venuesTable.createdAt);
  res.json(venues);
});

// ── POST /api/venues — create (super_admin) ───────────────────────────────────
router.post(
  "/",
  requireAuth,
  requireRole("super_admin"),
  allowOnly("name", "type", "plan", "themeProfile", "tagline", "logoUrl", "primaryColor"),
  async (req: AuthRequest, res: Response) => {
    const { name, type, plan, themeProfile, tagline, logoUrl, primaryColor } = req.body as {
      name?:         string;
      type?:         string;
      plan?:         string;
      themeProfile?: string;
      tagline?:      string;
      logoUrl?:      string;
      primaryColor?: string;
    };

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: '"name" is required' });
      return;
    }

    const VALID_TYPES = ["cigar_lounge", "whiskey_bar", "wine_bar", "coffee_house", "scent_shop"];
    if (!type || !VALID_TYPES.includes(type)) {
      res.status(400).json({ error: `"type" must be one of: ${VALID_TYPES.join(", ")}` });
      return;
    }

    const VALID_PLANS = ["basic", "mid", "premium"];
    const assignedPlan = plan && VALID_PLANS.includes(plan) ? plan : "basic";

    const [venue] = await db
      .insert(venuesTable)
      .values({
        name:         name.trim(),
        type:         type as typeof venuesTable.$inferInsert["type"],
        plan:         assignedPlan as typeof venuesTable.$inferInsert["plan"],
        themeProfile: themeProfile ?? null,
        tagline:      tagline ?? null,
        logoUrl:      logoUrl ?? null,
        primaryColor: primaryColor ?? null,
      })
      .returning();

    req.log.info({ venueId: venue.id, name: venue.name, plan: venue.plan }, "venue created");
    res.status(201).json(venue);
  },
);

// ── GET /api/venues/:id — public config for white-label loading ───────────────
// Must come AFTER the root GET "/" so "default" slug isn't mistaken for a UUID.
router.get("/:id", async (req, res: Response) => {
  const id = String(req.params.id ?? "");

  // SmokeCraft default (no DB lookup needed)
  if (id === "default" || id === "smokecraft") {
    res.json({
      id:           "default",
      logoText:     "SmokeCraft",
      tagline:      "Connoisseur's Companion",
      primaryColor: "#D4AF37",
      posMode:          "overlay",
      posModeChangedBy: null,
      posModeChangedAt: null,
      features: {
        demoMode:    true,
        bandCreator: true,
        foodPairing: true,
        eliteMode:   true,
        vault:       true,
      },
    });
    return;
  }

  const [venue] = await db
    .select()
    .from(venuesTable)
    .where(eq(venuesTable.id, id))
    .limit(1);

  if (!venue) {
    res.status(404).json({ error: "Venue not found" });
    return;
  }

  res.json({
    id:           venue.id,
    logoText:     venue.name,
    tagline:      venue.tagline ?? "Powered by SmokeCraft",
    primaryColor: venue.primaryColor ?? "#D4AF37",
    logoUrl:      venue.logoUrl ?? null,
    posMode:          venue.posMode ?? "overlay",
    posModeChangedBy: venue.posModeChangedBy ?? null,
    posModeChangedAt: venue.posModeChangedAt?.toISOString() ?? null,
    features: {
      demoMode:    venue.plan !== "basic",
      bandCreator: venue.plan === "premium",
      foodPairing: true,
      eliteMode:   true,
      vault:       true,
    },
  });
});

// ── PATCH /api/venues/:id/pos-mode — update POS operating mode ───────────────
// Accessible to venue_owner and manager who own this venue, or super_admin.
// Actor is always derived server-side from the authenticated user — never
// accepted from the request body — to prevent audit attribution spoofing.
router.patch(
  "/:id/pos-mode",
  requireAuth,
  requireRole("venue_owner", "manager"),
  allowOnly("posMode"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params["id"] ?? "");
    if (!id) { res.status(400).json({ error: "venue id is required" }); return; }

    // Tenant authorization: super_admin can update any venue;
    // everyone else must own the venue they are trying to update.
    const user = req.user!;
    if (user.role !== "super_admin" && user.venueId !== id) {
      res.status(403).json({ error: "You can only update your own venue's settings" });
      return;
    }

    const { posMode } = req.body as { posMode?: string };

    const VALID_MODES = ["overlay", "hybrid", "full_pos"];
    if (!posMode || !VALID_MODES.includes(posMode)) {
      res.status(400).json({ error: `posMode must be one of: ${VALID_MODES.join(", ")}` });
      return;
    }

    const [existing] = await db.select().from(venuesTable).where(eq(venuesTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Venue not found" }); return; }

    const now = new Date();
    // Actor is always derived from the authenticated JWT — never from the client body.
    const actor = user.name ?? user.email ?? user.id;
    const [updated] = await db
      .update(venuesTable)
      .set({ posMode, posModeChangedBy: actor, posModeChangedAt: now })
      .where(eq(venuesTable.id, id))
      .returning();

    await logAudit(req, {
      action:     "venue.pos_mode.change",
      entityType: "venue",
      entityId:   id,
      before:     { posMode: existing.posMode },
      after:      { posMode, posModeChangedBy: actor, posModeChangedAt: now },
      venueId:    id,
    });

    req.log.info({ venueId: id, posMode, by: user.id }, "POS mode updated");
    res.json({
      posMode:          updated.posMode,
      posModeChangedBy: updated.posModeChangedBy,
      posModeChangedAt: updated.posModeChangedAt?.toISOString() ?? null,
    });
  },
);

// ── PATCH /api/venues/:id — admin template + plan + active control ──────────
//
// Lets a super_admin switch a venue between registered theme profiles
// (e.g. SmokeCraft → PourCraft) without touching code, plus toggle the
// venue's active flag and rename it. themeProfile is validated against
// the theme_profiles registry so a venue can never point to an unknown
// theme. Every change is audit-logged with before/after snapshots.
router.patch(
  "/:id",
  requireAuth,
  requireRole("super_admin"),
  allowOnly("name", "themeProfile", "active", "plan", "tagline", "logoUrl", "primaryColor"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params["id"] ?? "");
    if (!id) { res.status(400).json({ error: "venue id is required" }); return; }

    const { name, themeProfile, active, plan, tagline, logoUrl, primaryColor } = req.body as {
      name?:         string;
      themeProfile?: string | null;
      active?:       boolean;
      plan?:         "basic" | "mid" | "premium";
      tagline?:      string;
      logoUrl?:      string;
      primaryColor?: string;
    };

    const [existing] = await db.select().from(venuesTable).where(eq(venuesTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Venue not found" }); return; }

    // Theme registry lookup — refuse references to themes that don't exist.
    if (themeProfile !== undefined && themeProfile !== null) {
      const [theme] = await db.select({ slug: themeProfilesTable.slug })
        .from(themeProfilesTable)
        .where(eq(themeProfilesTable.slug, themeProfile))
        .limit(1);
      if (!theme) { res.status(400).json({ error: `Unknown themeProfile '${themeProfile}'` }); return; }
    }

    if (plan !== undefined && !["basic", "mid", "premium"].includes(plan)) {
      res.status(400).json({ error: "plan must be basic|mid|premium" });
      return;
    }

    if (primaryColor !== undefined && !/^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
      res.status(400).json({ error: "primaryColor must be a valid hex color (e.g. #D4AF37)" });
      return;
    }

    if (logoUrl !== undefined && logoUrl !== null && logoUrl.length > 0) {
      try { new URL(logoUrl); } catch {
        res.status(400).json({ error: "logoUrl must be a valid URL" });
        return;
      }
    }

    if (tagline !== undefined && tagline.length > 200) {
      res.status(400).json({ error: "tagline must be 200 characters or fewer" });
      return;
    }

    const patch: Partial<typeof venuesTable.$inferInsert> = {};
    if (name         !== undefined) patch.name         = name;
    if (themeProfile !== undefined) patch.themeProfile = themeProfile;
    if (active       !== undefined) patch.active       = active;
    if (plan         !== undefined) patch.plan         = plan;
    if (tagline      !== undefined) patch.tagline      = tagline;
    if (logoUrl      !== undefined) patch.logoUrl      = logoUrl;
    if (primaryColor !== undefined) patch.primaryColor = primaryColor;

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: "No updatable fields supplied" });
      return;
    }

    const [updated] = await db.update(venuesTable).set(patch).where(eq(venuesTable.id, id)).returning();

    await logAudit(req, {
      action:     "venue.update",
      entityType: "venue",
      entityId:   id,
      before:     { name: existing.name, themeProfile: existing.themeProfile, active: existing.active, plan: existing.plan },
      after:      patch,
      venueId:    id,
    });

    req.log.info({ venueId: id, patch, by: req.user!.id }, "Venue updated");
    res.json(updated);
  },
);

export default router;
