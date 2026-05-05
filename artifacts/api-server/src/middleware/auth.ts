/**
 * Authentication middleware.
 *
 * Verifies the JWT supplied in the Authorization header and attaches
 * a `user` object to the request for downstream handlers.
 *
 * For role-based access control, import `requireRole` from ./roles.ts.
 */

import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; name: string; venueId?: string | null };
}

/**
 * Verifies the Bearer JWT and attaches `req.user`.
 * Returns 401 if the header is missing or the token is invalid/expired.
 */
export async function requireAuth(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const token   = header.slice(7);
    const payload = await verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role, name: payload.name, venueId: payload.venueId ?? null };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Optional JWT middleware — attaches `req.user` when a valid Bearer token is
 * present, but never returns 401. Routes that accept both authenticated and
 * anonymous callers should use this instead of `requireAuth`.
 */
export async function optionalAuth(
  req:  AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers["authorization"];
  if (header?.startsWith("Bearer ")) {
    try {
      const token   = header.slice(7);
      const payload = await verifyToken(token);
      req.user = { id: payload.sub, email: payload.email, role: payload.role, name: payload.name, venueId: payload.venueId ?? null };
    } catch {
      // Invalid/expired token — treat as anonymous; do not reject
    }
  }
  next();
}
