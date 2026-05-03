/**
 * /api/themes — tenant theme registry.
 *
 *   GET  /api/themes           list every registered theme (public read; the
 *                              kiosk needs it to bootstrap).
 *   GET  /api/themes/:slug     fetch a single theme. 404 if unknown.
 *   POST /api/themes           upsert a theme (super_admin only). Idempotent
 *                              on slug — re-posting the same slug updates
 *                              the existing row in place.
 *
 * A venue opts into a theme by setting `venues.theme_profile = '<slug>'`;
 * the kiosk fetches that slug at boot time and renders accordingly.
 */

import { Router, type IRouter, type Response }   from "express";
import { eq }                                    from "drizzle-orm";
import { z }                                     from "zod/v4";
import { db, themeProfilesTable }                from "@workspace/db";
import { requireAuth, type AuthRequest }         from "../middleware/auth";
import { requireRole }                           from "../middleware/roles";
import { logAudit }                              from "../lib/audit";
import { getAllInventory as n }                  from "../services/boostService";

const router: IRouter = Router();

const SLUG_RE = /^[a-z][a-z0-9-]{2,40}$/;

const themePayloadSchema = z.object({
  slug:         z.string().regex(SLUG_RE, "slug must be lowercase kebab-case (3-41 chars)"),
  displayName:  z.string().min(1).max(120),
  productType:  z.enum(["cigar", "wine", "whiskey", "spirits", "coffee", "scent"]),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "primaryColor must be a #RRGGBB hex"),
  visualStyle:  z.string().min(1).max(40),
  soundProfile: z.string().min(1).max(40),
  steps:        z.array(z.string().min(1).max(40)).min(1).max(12),
  metadata:     z.record(z.string(), z.unknown()).optional(),
});

router.get("/", async (_req, res: Response) => {
  const rows = await db.select().from(themeProfilesTable);
  res.json({ themes: rows });
});

router.get("/:slug", async (req, res: Response) => {
  const slug = String(req.params["slug"] ?? "");
  if (!SLUG_RE.test(slug)) { res.status(400).json({ error: "Invalid slug" }); return; }

  const [row] = await db.select().from(themeProfilesTable).where(eq(themeProfilesTable.slug, slug)).limit(1);
  if (!row) { res.status(404).json({ error: "Theme not found" }); return; }
  res.json(row);
});

/**
 * GET /api/themes/:slug/products
 *
 * Convenience endpoint for kiosks: returns the theme's inventory grouped by
 * primary (theme.productType, e.g. "cigar" / "wine") and secondary
 * (theme.metadata.secondaryProduct, e.g. "alcohol" / "cocktail"). Saves the
 * client two round-trips and a join. Both buckets default to [] when the
 * theme has no inventory in that category yet.
 */
router.get("/:slug/products", async (req, res: Response) => {
  const slug = String(req.params["slug"] ?? "");
  if (!SLUG_RE.test(slug)) { res.status(400).json({ error: "Invalid slug" }); return; }

  const [theme] = await db.select().from(themeProfilesTable).where(eq(themeProfilesTable.slug, slug)).limit(1);
  if (!theme) { res.status(404).json({ error: "Theme not found" }); return; }

  const primaryCat   = theme.productType.toLowerCase();
  const secondaryCat = (() => {
    const meta = theme.metadata as Record<string, unknown> | null;
    const v = meta?.["secondaryProduct"];
    return typeof v === "string" ? v.toLowerCase() : null;
  })();

  const inventory = n();
  const inCat = (cat: string) => inventory.filter((p) => String(p.category ?? "").toLowerCase() === cat);

  res.json({
    theme:     theme.displayName,
    slug:      theme.slug,
    primary:   inCat(primaryCat),
    secondary: secondaryCat ? inCat(secondaryCat) : [],
  });
});

router.post(
  "/",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const parsed = themePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
      return;
    }
    const t = parsed.data;

    // Snapshot the previous row (if any) so the audit log shows the diff.
    const [before] = await db.select().from(themeProfilesTable).where(eq(themeProfilesTable.slug, t.slug)).limit(1);

    const now = new Date();
    await db.insert(themeProfilesTable)
      .values({ ...t, updatedAt: now })
      .onConflictDoUpdate({
        target: themeProfilesTable.slug,
        set: {
          displayName:  t.displayName,
          productType:  t.productType,
          primaryColor: t.primaryColor,
          visualStyle:  t.visualStyle,
          soundProfile: t.soundProfile,
          steps:        t.steps,
          metadata:     t.metadata ?? null,
          updatedAt:    now,
        },
      });

    const [after] = await db.select().from(themeProfilesTable).where(eq(themeProfilesTable.slug, t.slug)).limit(1);

    await logAudit(req, {
      action:     before ? "theme.update" : "theme.create",
      entityType: "theme_profile",
      entityId:   t.slug,
      before:     before ?? null,
      after:      after  ?? null,
    });

    req.log.info({ slug: t.slug, by: req.user!.id }, before ? "Theme updated" : "Theme registered");
    res.status(before ? 200 : 201).json(after);
  },
);

export default router;
