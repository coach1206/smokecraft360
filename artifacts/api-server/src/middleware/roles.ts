/**
 * Role-based access control middleware.
 *
 * Must be used after `requireAuth` so that `req.user` is populated.
 * `super_admin` bypasses all role checks automatically.
 */

import { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth";

/**
 * Factory that returns an Express middleware requiring one of the given roles.
 *
 * Usage:
 *   router.patch("/resource", requireAuth, requireRole("venue_owner", "manager"), handler)
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (req.user.role === "super_admin" || roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({
        error: `This action requires one of the following roles: ${roles.join(", ")}`,
      });
    }
  };
}
