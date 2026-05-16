/**
 * requireSovereign — middleware that blocks access to sovereign-only API routes
 * for venues operating in "essential" kernel mode.
 *
 * Must be used after `requireAuth` so that `req.user` is populated.
 *
 * Behaviour:
 *   - `super_admin` users bypass the check unconditionally (global platform admins
 *     are not bound to a single venue's kernel mode).
 *   - If the venue has no kernel_mode_config row the platform default is
 *     "sovereign", so the request is allowed through.
 *   - If the venue's mode is "essential", the middleware returns 403.
 *   - If the venue's mode is "sovereign", the request is allowed through.
 *
 * Usage:
 *   app.use("/api/governance", requireAuth, requireSovereign, governanceRouter);
 */

import { Response, NextFunction } from "express";
import { db, kernelModeConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthRequest } from "./auth";

export async function requireSovereign(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = req.user;

  if (user?.role === "super_admin") {
    next();
    return;
  }

  const venueId = user?.venueId;

  if (!venueId) {
    next();
    return;
  }

  try {
    const [row] = await db
      .select({ mode: kernelModeConfigTable.mode })
      .from(kernelModeConfigTable)
      .where(eq(kernelModeConfigTable.venueId, venueId))
      .limit(1);

    const mode = row?.mode ?? "sovereign";

    if (mode === "essential") {
      res.status(403).json({
        error: "This feature requires Sovereign mode. Your venue is currently in Essential mode.",
        code: "SOVEREIGN_MODE_REQUIRED",
      });
      return;
    }

    next();
  } catch {
    res.status(500).json({ error: "Failed to verify venue kernel mode" });
  }
}
