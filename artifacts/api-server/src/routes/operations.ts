/**
 * Operations endpoints — staff-facing tools that close the loop between
 * the AI engine, the menu, and the floor.
 *
 *   GET  /api/ops/reorder-alerts?venueId=…       — low-stock alerts
 *   POST /api/ops/menu/optimize                   — re-rank items by margin × popularity × conversion
 *   POST /api/ops/profit                          — calculate profit/margin for arbitrary items
 *   GET  /api/ops/staff-pitch/:productId          — coaching script for staff
 *
 * All routes are gated to staff+ — these are operator tools, not kiosk
 * surfaces. The /optimize and /profit endpoints accept arbitrary items
 * in the body so the dashboard can score what's on screen without us
 * needing to know its data shape ahead of time.
 *
 * Mounted at /api/ops in app.ts.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { db, venueInventoryTable, productsTable, menuItemsTable } from "@workspace/db";
import { eq, and, or, isNull } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { allowOnly }   from "../middleware/sanitize";
import { checkReorder, DEFAULT_REORDER_THRESHOLD } from "../services/reorderAlerts";
import { optimizeMenuLayout, type LayoutCandidate } from "../services/menuLayout";
import { calculateProfits } from "../services/profitEngine";
import { generatePitch } from "../services/staffPitch";
import { findProduct } from "../engine/registry";

const router: IRouter = Router();

/* All ops routes require an authenticated staff/manager/owner/admin. */
router.use(requireAuth, requireRole("super_admin", "venue_owner", "manager", "staff"));

/**
 * Tenant scoping: anything but super_admin must operate on their OWN venue.
 * Returns the venueId the request is authorized to read, or null if the
 * caller tried to access a venue they don't belong to. Super admins always
 * pass through with whatever they asked for.
 */
function authorizedVenueId(req: AuthRequest, requested: string | null): string | null {
  const role = req.user?.role;
  if (role === "super_admin") return requested;
  const userVenue = req.user?.venueId ?? null;
  if (!userVenue) return null;
  // Default to the user's own venue when none is specified.
  if (!requested) return userVenue;
  return requested === userVenue ? requested : null;
}

// ── Reorder alerts ────────────────────────────────────────────────────────────

router.get("/reorder-alerts", async (req: AuthRequest, res: Response) => {
  const requested = typeof req.query.venueId === "string" ? req.query.venueId : null;
  const venueId   = authorizedVenueId(req, requested);
  const threshold = typeof req.query.threshold === "string"
    ? Math.max(1, Math.min(100, parseInt(req.query.threshold, 10) || DEFAULT_REORDER_THRESHOLD))
    : DEFAULT_REORDER_THRESHOLD;

  if (!venueId) {
    res.status(requested && req.user?.role !== "super_admin" ? 403 : 400)
       .json({ error: requested ? "venue_forbidden" : '"venueId" query param required' });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(venueInventoryTable)
      .where(eq(venueInventoryTable.venueId, venueId));

    /* Hydrate product names from registry where possible — venue_inventory
     * stores productId only. Falls back to the bare ID if the product was
     * removed from the registry, which keeps the alert actionable. */
    const items = rows.map((r) => ({
      productId: r.productId,
      name:      findProduct(r.productId)?.name ?? r.productId,
      quantity:  r.quantity,
    }));

    const alerts = checkReorder(items, threshold);
    res.json({ venueId, threshold, totalConfigured: rows.length, alerts });
  } catch (err) {
    req.log.error({ err }, "ops/reorder-alerts failed");
    res.status(500).json({ error: "reorder_alerts_failed" });
  }
});

// ── Menu layout optimization ──────────────────────────────────────────────────

const optimizeBody = z.object({
  items: z.array(z.object({
    id:              z.string().min(1),
    name:            z.string().min(1),
    priceCents:      z.number().int().nonnegative(),
    costCents:       z.number().int().nonnegative().nullable().optional(),
    popularity:      z.number().nonnegative().optional(),
    conversionRate:  z.number().min(0).max(1).optional(),
    available:       z.boolean().optional(),
  })).max(500),
});

router.post(
  "/menu/optimize",
  allowOnly("items"),
  (req: Request, res: Response) => {
    const parsed = optimizeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_items", details: parsed.error.issues });
      return;
    }
    const optimized = optimizeMenuLayout(parsed.data.items as LayoutCandidate[]);
    res.json({ items: optimized });
  },
);

/** Convenience: optimize the kitchen menu using stored cost_cents.
 *  Caller can still override popularity by POSTing to /menu/optimize directly.
 *  Scoped: non-admins see their own venue's items + the NULL-venue house menu. */
router.get("/menu/optimize/kitchen", async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user?.role === "super_admin";
    const userVenue = req.user?.venueId ?? null;
    const whereExpr = isAdmin
      ? eq(menuItemsTable.available, true)
      : and(
          eq(menuItemsTable.available, true),
          // House menu (venueId IS NULL) is always visible; otherwise own venue only.
          userVenue
            ? or(isNull(menuItemsTable.venueId), eq(menuItemsTable.venueId, userVenue))
            : isNull(menuItemsTable.venueId),
        );
    const rows = await db.select().from(menuItemsTable).where(whereExpr);
    const candidates: LayoutCandidate[] = rows.map((r) => ({
      id:         r.id,
      name:       r.name,
      priceCents: r.priceCents,
      costCents:  r.costCents,
      available:  r.available,
    }));
    res.json({ items: optimizeMenuLayout(candidates) });
  } catch (err) {
    req.log.error({ err }, "ops/menu/optimize/kitchen failed");
    res.status(500).json({ error: "optimize_failed" });
  }
});

// ── Profit calc ───────────────────────────────────────────────────────────────

const profitBody = z.object({
  items: z.array(z.object({
    id:         z.string().min(1).optional(),
    priceCents: z.number().int().nonnegative(),
    costCents:  z.number().int().nonnegative().nullable().optional(),
  })).max(500),
});

router.post(
  "/profit",
  allowOnly("items"),
  (req: Request, res: Response) => {
    const parsed = profitBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_items", details: parsed.error.issues });
      return;
    }
    res.json({ items: calculateProfits(parsed.data.items) });
  },
);

// ── Staff pitch ───────────────────────────────────────────────────────────────

router.get("/staff-pitch/:productId", async (req: Request, res: Response) => {
  const productId = String(req.params.productId ?? "");
  /* Try the in-memory product registry first (covers seeded products),
   * then fall back to the DB for vendor-submitted ones. */
  const reg = findProduct(productId);
  let name: string;
  let flavorNotes: string[] | undefined;
  let moodTags:    string[] | undefined;
  let costCents:   number | null | undefined;

  if (reg) {
    name        = reg.name;
    flavorNotes = reg.flavorNotes;
    moodTags    = reg.moodTags;
  } else {
    try {
      const [row] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
      if (!row) {
        res.status(404).json({ error: "product_not_found" });
        return;
      }
      name        = row.name;
      flavorNotes = (row.flavorNotes as string[] | null) ?? undefined;
      moodTags    = (row.moodTags    as string[] | null) ?? undefined;
      costCents   = row.costCents;
    } catch (err) {
      req.log.error({ err }, "ops/staff-pitch DB lookup failed");
      res.status(500).json({ error: "pitch_lookup_failed" });
      return;
    }
  }

  /* Margin needs both price and cost. The products table has no price
   * (price lives on venue_inventory), and the registry doesn't carry cost.
   * Either pathway leaves marginRatio undefined, which the pitch handles
   * gracefully — the upsell line just won't fire. A future enhancement
   * could join venue_inventory by venueId, but the brief didn't ask for it. */
  void costCents;

  const pitch = generatePitch({
    name,
    flavorNotes: flavorNotes ?? undefined,
    moodTags:    moodTags    ?? undefined,
  });
  res.json({ productId, pitch });
});

export default router;
