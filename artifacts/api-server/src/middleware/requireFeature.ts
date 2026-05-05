/**
 * requireFeature — feature-entitlement gating middleware.
 *
 * Usage:
 *   router.get("/top-products", requireAuth, requireFeature("ADVANCED_ANALYTICS"), handler)
 *
 * Resolution:
 *   1. super_admin always passes (operator bypass).
 *   2. Looks up venue_entitlements for req.user.venueId.
 *   3. Resolves effective feature set (package + overrides).
 *   4. 403 with upgrade hint if feature not present.
 *
 * Results are cached per venueId for 60 s to avoid hot-path DB queries.
 */

import { type Response, type NextFunction } from "express";
import { eq }                               from "drizzle-orm";
import { db, venueEntitlementsTable }       from "@workspace/db";
import { resolveFeatures }                  from "../lib/featureCatalog";
import { type AuthRequest }                 from "./auth";

interface CacheEntry {
  features:    Set<string>;
  checkedAt:   number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

async function resolveVenueFeatures(venueId: string): Promise<Set<string>> {
  const cached = cache.get(venueId);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) return cached.features;

  const [row] = await db
    .select({ packageId: venueEntitlementsTable.packageId, featureOverrides: venueEntitlementsTable.featureOverrides })
    .from(venueEntitlementsTable)
    .where(eq(venueEntitlementsTable.venueId, venueId))
    .limit(1);

  const features = resolveFeatures(row?.packageId, row?.featureOverrides ?? []);
  cache.set(venueId, { features, checkedAt: Date.now() });
  return features;
}

/** Invalidate cached entitlements for a venue (call after PUT /entitlements). */
export function invalidateEntitlementCache(venueId: string): void {
  cache.delete(venueId);
}

export function requireFeature(featureId: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (req.user.role === "super_admin") {
      next();
      return;
    }
    if (!req.user.venueId) {
      res.status(403).json({ error: "Feature not available — venue not attached to your account" });
      return;
    }
    try {
      const features = await resolveVenueFeatures(req.user.venueId);
      if (features.has(featureId)) {
        next();
      } else {
        res.status(403).json({
          error:     `Feature "${featureId}" is not included in your current package`,
          featureId,
          upgrade:   true,
        });
      }
    } catch (err) {
      req.log.error({ err }, "requireFeature check failed");
      res.status(500).json({ error: "Feature check failed" });
    }
  };
}
