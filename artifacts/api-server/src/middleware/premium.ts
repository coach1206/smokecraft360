/**
 * Premium-tier gating middleware.
 *
 * Network insights are a premium feature. A user can access them if:
 *   - they are super_admin, OR
 *   - their venue's plan is "premium"
 *
 * Standard analytics (single-venue) remain available to all paid plans.
 */

import { type Response, type NextFunction } from "express";
import { eq }                               from "drizzle-orm";
import { db, venuesTable }                  from "@workspace/db";
import { type AuthRequest }                 from "./auth";

export async function requirePremium(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user.role === "super_admin") {
    next();
    return;
  }
  if (!req.user.venueId) {
    res.status(403).json({ error: "Premium subscription required for network insights" });
    return;
  }
  try {
    const [venue] = await db
      .select({ plan: venuesTable.plan })
      .from(venuesTable)
      .where(eq(venuesTable.id, req.user.venueId))
      .limit(1);

    if (venue?.plan === "premium") {
      next();
    } else {
      res.status(403).json({
        error:   "Premium subscription required for network insights",
        upgrade: { currentPlan: venue?.plan ?? "basic", requiredPlan: "premium" },
      });
    }
  } catch (err) {
    req.log.error({ err }, "premium check failed");
    res.status(500).json({ error: "Subscription check failed" });
  }
}
