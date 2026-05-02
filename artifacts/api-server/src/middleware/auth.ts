import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; name: string };
}

/** Verifies JWT from Authorization header and attaches user to the request. */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
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
    req.user = { id: payload.sub, email: payload.email, role: payload.role, name: payload.name };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Role guard — must come AFTER requireAuth.
 *
 * super_admin always passes through regardless of specified roles.
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
      res.status(403).json({ error: "Insufficient permissions for this action" });
    }
  };
}
