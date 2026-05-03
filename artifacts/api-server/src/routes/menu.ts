/**
 * Menu items endpoints — orderable food/bar items plus a "suggested for
 * this pairing" filter. Mounted at /api/menu in app.ts.
 *
 *   GET  /api/menu/all                       — full available menu
 *                                              (optional ?venueId=…)
 *   GET  /api/menu/suggested?tags=smoky,sweet — filter by pairing tags
 *                                              (optional &venueId=… &limit=5)
 *   POST /api/menu                            — admin seed/insert one item
 *
 * Reads the `menu_items` Drizzle table directly. Suggestion ranking is
 * delegated to services/menuSuggestion.ts so the route stays thin.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db, menuItemsTable, insertMenuItemSchema } from "@workspace/db";
import { and, eq, isNull, or } from "drizzle-orm";
import { suggestMenuItems } from "../services/menuSuggestion";
import { allowOnly } from "../middleware/sanitize";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router: IRouter = Router();

/** Load all available menu items, optionally scoped to a venue + house menu. */
async function loadMenu(venueId: string | undefined) {
  const where = venueId
    ? and(
        eq(menuItemsTable.available, true),
        or(eq(menuItemsTable.venueId, venueId), isNull(menuItemsTable.venueId)),
      )
    : eq(menuItemsTable.available, true);
  return db.select().from(menuItemsTable).where(where);
}

router.get("/all", async (req: Request, res: Response) => {
  const venueId = typeof req.query.venueId === "string" ? req.query.venueId : undefined;
  try {
    const items = await loadMenu(venueId);
    res.json({ items });
  } catch (err) {
    req.log.error({ err }, "menu/all failed");
    res.status(500).json({ error: "menu_load_failed" });
  }
});

router.get("/suggested", async (req: Request, res: Response) => {
  const venueId   = typeof req.query.venueId === "string" ? req.query.venueId : undefined;
  const limitRaw  = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 5;
  const limit     = Number.isFinite(limitRaw) ? Math.max(1, Math.min(20, limitRaw)) : 5;
  const tagsParam = typeof req.query.tags === "string" ? req.query.tags : "";
  const tags      = tagsParam.split(",").map((t) => t.trim()).filter(Boolean);

  if (tags.length === 0) {
    res.status(400).json({ error: '"tags" query param required (comma-separated)' });
    return;
  }

  try {
    const items      = await loadMenu(venueId);
    const suggested  = suggestMenuItems(items, tags, limit);
    res.json({ items: suggested, totalConsidered: items.length, requestedTags: tags });
  } catch (err) {
    req.log.error({ err }, "menu/suggested failed");
    res.status(500).json({ error: "menu_suggest_failed" });
  }
});

/* POST is gated to staff-and-up so kiosk users can't seed the menu.
 * super_admin can insert house items (venueId null); venue staff can
 * insert items for their own venue (Zod schema enforces shape, not
 * cross-venue authz — that lives in venue middleware if/when needed). */
router.post(
  "/",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  allowOnly("name", "description", "category", "tags", "priceCents", "imageUrl", "available", "venueId"),
  async (req: Request, res: Response) => {
    const parsed = insertMenuItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_menu_item", details: parsed.error.issues });
      return;
    }
    try {
      const [row] = await db.insert(menuItemsTable).values(parsed.data).returning();
      res.status(201).json({ item: row });
    } catch (err) {
      req.log.error({ err }, "menu insert failed");
      res.status(500).json({ error: "menu_insert_failed" });
    }
  },
);

export default router;
