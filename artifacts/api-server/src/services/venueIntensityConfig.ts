import { db, featureFlagsTable } from "@workspace/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export interface IntensityConfig {
  maxDiscountPercent: number;
  maxFixedDiscountCents: number;
  freeItemDailyLimit: number;
  rewardCooldownMinutes: number;
  minimumSpendCentsForHighRewards: number;
  xpDifficultyMultiplier: number;
  streakBonusCap: number;
  explorationBonusCap: number;
  perfectMatchBonusCap: number;
  crossCraftBonusCap: number;
  rewardFrequencyLimit: number;
  sameDeviceCooldownMinutes: number;
  fraudSensitivity: number;
  leaderboardIntensity: number;
  campaignBoostMultiplier: number;
}

interface FieldRange { min: number; max: number }

const PLATFORM_DEFAULTS: IntensityConfig = {
  maxDiscountPercent: 15,
  maxFixedDiscountCents: 2000,
  freeItemDailyLimit: 3,
  rewardCooldownMinutes: 30,
  minimumSpendCentsForHighRewards: 5000,
  xpDifficultyMultiplier: 1.0,
  streakBonusCap: 50,
  explorationBonusCap: 30,
  perfectMatchBonusCap: 25,
  crossCraftBonusCap: 20,
  rewardFrequencyLimit: 10,
  sameDeviceCooldownMinutes: 5,
  fraudSensitivity: 0.7,
  leaderboardIntensity: 1.0,
  campaignBoostMultiplier: 1.0,
};

const FIELD_RANGES: Record<keyof IntensityConfig, FieldRange> = {
  maxDiscountPercent:              { min: 0,    max: 25 },
  maxFixedDiscountCents:           { min: 0,    max: 5000 },
  freeItemDailyLimit:              { min: 0,    max: 10 },
  rewardCooldownMinutes:           { min: 5,    max: 1440 },
  minimumSpendCentsForHighRewards: { min: 0,    max: 50000 },
  xpDifficultyMultiplier:          { min: 0.1,  max: 3.0 },
  streakBonusCap:                  { min: 0,    max: 200 },
  explorationBonusCap:             { min: 0,    max: 100 },
  perfectMatchBonusCap:            { min: 0,    max: 100 },
  crossCraftBonusCap:              { min: 0,    max: 100 },
  rewardFrequencyLimit:            { min: 1,    max: 50 },
  sameDeviceCooldownMinutes:       { min: 1,    max: 1440 },
  fraudSensitivity:                { min: 0,    max: 1.0 },
  leaderboardIntensity:            { min: 0,    max: 2.0 },
  campaignBoostMultiplier:         { min: 0.1,  max: 3.0 },
};

const configCache = new Map<string, { config: IntensityConfig; cachedAt: number }>();
const CACHE_TTL_MS = 60_000;

function clampToLimits(raw: Partial<IntensityConfig>): IntensityConfig {
  const out = { ...PLATFORM_DEFAULTS };
  for (const key of Object.keys(PLATFORM_DEFAULTS) as (keyof IntensityConfig)[]) {
    const val = raw[key];
    if (val === undefined || val === null) continue;
    const num = Number(val);
    if (!Number.isFinite(num)) continue;
    const range = FIELD_RANGES[key];
    out[key] = Math.min(Math.max(range.min, num), range.max);
  }
  return out;
}

export function getPlatformDefaults(): IntensityConfig {
  return { ...PLATFORM_DEFAULTS };
}

export function getPlatformLimits(): Record<keyof IntensityConfig, FieldRange> {
  return { ...FIELD_RANGES };
}

export async function getVenueIntensityConfig(venueId: string): Promise<IntensityConfig> {
  const cached = configCache.get(venueId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.config;
  }

  try {
    const [row] = await db
      .select()
      .from(featureFlagsTable)
      .where(
        and(
          eq(featureFlagsTable.name, "intensity-config"),
          eq(featureFlagsTable.venueId, venueId),
          isNull(featureFlagsTable.themeSlug),
        ),
      )
      .limit(1);

    if (!row) {
      configCache.set(venueId, { config: PLATFORM_DEFAULTS, cachedAt: Date.now() });
      return PLATFORM_DEFAULTS;
    }

    const raw = typeof row.metadata === "object" && row.metadata !== null
      ? (row.metadata as Partial<IntensityConfig>)
      : {};
    const config = clampToLimits(raw);
    configCache.set(venueId, { config, cachedAt: Date.now() });
    return config;
  } catch (err) {
    logger.warn({ err, venueId }, "intensity config lookup failed, using defaults");
    return PLATFORM_DEFAULTS;
  }
}

export async function setVenueIntensityConfig(
  venueId: string,
  updates: Partial<IntensityConfig>,
): Promise<{ before: IntensityConfig; after: IntensityConfig }> {
  const before = await getVenueIntensityConfig(venueId);
  const merged = clampToLimits({ ...before, ...updates });

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: featureFlagsTable.id })
      .from(featureFlagsTable)
      .where(
        and(
          eq(featureFlagsTable.name, "intensity-config"),
          eq(featureFlagsTable.venueId, venueId),
          isNull(featureFlagsTable.themeSlug),
        ),
      )
      .for("update")
      .limit(1);

    if (existing) {
      await tx
        .update(featureFlagsTable)
        .set({
          metadata: merged as unknown as Record<string, unknown>,
          enabled: true,
          updatedAt: new Date(),
        })
        .where(eq(featureFlagsTable.id, existing.id));
    } else {
      await tx.insert(featureFlagsTable).values({
        name: "intensity-config",
        venueId,
        themeSlug: null,
        enabled: true,
        metadata: merged as unknown as Record<string, unknown>,
      });
    }
  });

  configCache.set(venueId, { config: merged, cachedAt: Date.now() });
  return { before, after: merged };
}

export function invalidateCache(venueId?: string): void {
  if (venueId) {
    configCache.delete(venueId);
  } else {
    configCache.clear();
  }
}

void sql;
