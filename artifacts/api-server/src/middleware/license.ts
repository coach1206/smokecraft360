/**
 * requireActiveLicense — protect revenue-generating routes from venues whose
 * subscription is not in good standing.
 *
 * Resolution:
 *   1. super_admin always passes (operator override).
 *   2. If req.user.venueId is missing → 403 (cannot bill an unattached user).
 *   3. If no subscription row exists for the venue → PASS. This preserves
 *      backwards compatibility with venues that pre-date subscription
 *      enforcement; the platform will continue to serve them until billing
 *      is explicitly enabled. (Onboarding new venues should always create a
 *      subscription row.)
 *   4. If adminOverride === true → PASS.
 *   5. If status === 'active' or 'trialing' → PASS.
 *   6. If status === 'past_due' AND gracePeriodEndsAt is in the future → PASS
 *      (with a warning header so the client can show a banner).
 *   7. Anything else → 402 Payment Required.
 *
 * Frontend code shows banners and lock screens, but those are UX. This
 * middleware is the actual security boundary.
 */

import { type Response, type NextFunction } from "express";
import { eq }                               from "drizzle-orm";
import { db, subscriptionsTable }           from "@workspace/db";
import { type AuthRequest }                 from "./auth";

/**
 * Reusable license check by venueId. Used by both `requireActiveLicense`
 * middleware and unauthenticated handlers (e.g. kiosk order POST) that need
 * to verify license without an auth context.
 *
 * Returns `{ allowed: true }` for: missing subscription row (legacy
 * unmetered), admin override, active, trialing, and past_due-within-grace.
 */
export async function checkLicenseForVenue(
  venueId: string,
): Promise<
  | { allowed: true;  warning?: "past_due" }
  | { allowed: false; status: string; plan: string }
> {
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.venueId, venueId))
    .limit(1);

  if (!sub)              return { allowed: true };
  if (sub.adminOverride) return { allowed: true };
  if (sub.status === "active" || sub.status === "trialing") return { allowed: true };
  if (sub.status === "past_due" && sub.gracePeriodEndsAt && sub.gracePeriodEndsAt > new Date()) {
    return { allowed: true, warning: "past_due" };
  }
  return { allowed: false, status: sub.status, plan: sub.plan };
}

export async function requireActiveLicense(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user.role === "super_admin") { next(); return; }
  if (!req.user.venueId) {
    res.status(403).json({ error: "No venue associated with this user" });
    return;
  }

  try {
    const [sub] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.venueId, req.user.venueId))
      .limit(1);

    // Unmetered venue (no subscription row) → allow through.
    if (!sub) { next(); return; }

    if (sub.adminOverride) { next(); return; }
    if (sub.status === "active" || sub.status === "trialing") { next(); return; }

    if (sub.status === "past_due" && sub.gracePeriodEndsAt && sub.gracePeriodEndsAt > new Date()) {
      // Still within grace window — let request through but flag it.
      res.setHeader("X-License-Warning", "past_due");
      next();
      return;
    }

    res.status(402).json({
      error:  "Subscription required",
      status: sub.status,
      plan:   sub.plan,
      hint:   "Renew the venue subscription to restore access",
    });
  } catch (err) {
    req.log.error({ err }, "license check failed");
    res.status(500).json({ error: "License check failed" });
  }
}
