import { type Request, type Response, type NextFunction } from "express";
import { db, featureFlagsTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { logger } from "../lib/logger";

const flagCache = new Map<string, { enabled: boolean; checkedAt: number }>();
const CACHE_TTL_MS = 30_000;

async function isFlagEnabled(name: string): Promise<boolean> {
  const cached = flagCache.get(name);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return cached.enabled;
  }

  try {
    const [row] = await db
      .select({ enabled: featureFlagsTable.enabled })
      .from(featureFlagsTable)
      .where(
        and(
          eq(featureFlagsTable.name, name),
          isNull(featureFlagsTable.themeSlug),
          isNull(featureFlagsTable.venueId),
        ),
      )
      .limit(1);

    const enabled = row?.enabled ?? true;
    flagCache.set(name, { enabled, checkedAt: Date.now() });
    return enabled;
  } catch (err) {
    logger.error({ err, flag: name }, "kill switch flag check failed — defaulting to enabled");
    return true;
  }
}

export function requirePaymentsEnabled(req: Request, res: Response, next: NextFunction): void {
  void isFlagEnabled("payments-enabled").then((enabled) => {
    if (!enabled) {
      res.status(503).json({ error: "Payments are temporarily disabled" });
      return;
    }
    next();
  });
}

export function requireRewardsEnabled(req: Request, res: Response, next: NextFunction): void {
  void isFlagEnabled("rewards-enabled").then((enabled) => {
    if (!enabled) {
      res.status(503).json({ error: "Rewards are temporarily disabled" });
      return;
    }
    next();
  });
}
