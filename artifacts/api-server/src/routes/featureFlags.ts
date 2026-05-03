/**
 * /api/feature-flags — toggleable capabilities for the multi-theme platform.
 *
 *   GET  /api/feature-flags                   list every flag (super_admin)
 *   GET  /api/feature-flags/resolve?theme=&venue=
 *                                             public — returns the effective
 *                                             enabled-set for the kiosk to
 *                                             read at boot, applying scope
 *                                             precedence: venue+theme overrides
 *                                             theme overrides venue overrides
 *                                             global default.
 *   POST /api/feature-flags                   upsert a flag (super_admin)
 */

import { Router, type IRouter, type Response }    from "express";
import { and, eq, or, isNull }                    from "drizzle-orm";
import { z }                                      from "zod/v4";
import { db, featureFlagsTable }                  from "@workspace/db";
import { requireAuth, type AuthRequest }          from "../middleware/auth";
import { requireRole }                            from "../middleware/roles";
import { logAudit }                               from "../lib/audit";

const router: IRouter = Router();

const NAME_RE = /^[a-z][a-z0-9-]{1,40}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const flagPayloadSchema = z.object({
  themeSlug: z.string().regex(/^[a-z][a-z0-9-]{2,40}$/).nullable().optional(),
  venueId:   z.string().regex(UUID_RE).nullable().optional(),
  name:      z.string().regex(NAME_RE),
  enabled:   z.boolean(),
});

router.get(
  "/",
  requireAuth,
  requireRole("super_admin"),
  async (_req: AuthRequest, res: Response) => {
    const rows = await db.select().from(featureFlagsTable);
    res.json({ flags: rows });
  },
);

/**
 * Resolve the effective flag set for a given (theme, venue) tuple.
 * Public so the kiosk can hydrate at boot without an auth round-trip.
 *
 * Precedence (later wins): global default → venue-wide → theme-wide → venue+theme.
 */
router.get("/resolve", async (req, res: Response) => {
  const theme = typeof req.query["theme"] === "string" ? req.query["theme"] : null;
  const venue = typeof req.query["venue"] === "string" && UUID_RE.test(req.query["venue"]) ? req.query["venue"] : null;

  // Pull every row that could possibly apply, then merge in JS by precedence.
  const candidates = await db.select().from(featureFlagsTable).where(or(
    and(isNull(featureFlagsTable.themeSlug), isNull(featureFlagsTable.venueId)),
    theme ? and(eq(featureFlagsTable.themeSlug, theme), isNull(featureFlagsTable.venueId)) : undefined,
    venue ? and(isNull(featureFlagsTable.themeSlug), eq(featureFlagsTable.venueId, venue)) : undefined,
    theme && venue ? and(eq(featureFlagsTable.themeSlug, theme), eq(featureFlagsTable.venueId, venue)) : undefined,
  ));

  // Apply precedence: order rows from least to most specific, last write wins.
  const specificity = (r: { themeSlug: string | null; venueId: string | null }): number =>
    (r.themeSlug ? 1 : 0) + (r.venueId ? 2 : 0);
  candidates.sort((a, b) => specificity(a) - specificity(b));

  const effective: Record<string, boolean> = {};
  for (const row of candidates) effective[row.name] = row.enabled;

  res.json({ theme, venue, flags: effective });
});

router.post(
  "/",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const parsed = flagPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
      return;
    }
    const { themeSlug = null, venueId = null, name, enabled } = parsed.data;

    // Find any existing row matching this scope (NULL-safe).
    const [existing] = await db.select().from(featureFlagsTable).where(and(
      themeSlug ? eq(featureFlagsTable.themeSlug, themeSlug) : isNull(featureFlagsTable.themeSlug),
      venueId   ? eq(featureFlagsTable.venueId,   venueId)   : isNull(featureFlagsTable.venueId),
      eq(featureFlagsTable.name, name),
    )).limit(1);

    const now = new Date();
    if (existing) {
      await db.update(featureFlagsTable)
        .set({ enabled, updatedAt: now })
        .where(eq(featureFlagsTable.id, existing.id));
    } else {
      await db.insert(featureFlagsTable).values({
        themeSlug: themeSlug ?? null,
        venueId:   venueId   ?? null,
        name,
        enabled,
      });
    }

    await logAudit(req, {
      action:     existing ? "feature_flag.update" : "feature_flag.create",
      entityType: "feature_flag",
      entityId:   existing?.id ?? null,
      before:     existing ? { enabled: existing.enabled } : null,
      after:      { themeSlug, venueId, name, enabled },
      venueId:    venueId ?? null,
    });

    res.status(existing ? 200 : 201).json({ themeSlug, venueId, name, enabled });
  },
);

export default router;
