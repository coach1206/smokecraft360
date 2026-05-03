/**
 * tasteProfile — derives a per-user taste affinity vector from existing
 * `userPreferences` snapshots, then exposes a small scoring helper the
 * recommendation engine can use to bias results toward the user's history.
 *
 * No new column / migration: the profile is computed on demand from the
 * already-existing preferences time-series. This keeps the audit-trail
 * (every snapshot in user_preferences) and the derived profile (this
 * service) cleanly separated.
 *
 * Generalized over the brief's literal `{ light/medium/full }` enum
 * because our real strength signal is a 1–5 integer and our category
 * set is open-ended (cigar / alcohol / beer today, plus reserved
 * wine / cocktail). Counter shape: `Record<string, number>`.
 *
 * All operations are non-blocking: aggregation is read-side, errors are
 * swallowed so a profile lookup can never break the recommend response.
 */

import { db, userPreferencesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import type { Product } from "../engine/types";

export interface TasteProfile {
  /** Counter keyed by 1–5 strength bucket. */
  strength:    Record<string, number>;
  /** Counter keyed by lower-cased flavor note. */
  flavor:      Record<string, number>;
  /** Counter keyed by mood tag. */
  mood:        Record<string, number>;
  /** Counter keyed by category (cigar / alcohol / beer / …). */
  categories:  Record<string, number>;
  /** Total snapshots aggregated — useful for confidence weighting. */
  sampleCount: number;
  /** Most-recent snapshot timestamp (epoch ms), or 0 if none. */
  lastUpdated: number;
}

export const EMPTY_PROFILE: TasteProfile = Object.freeze({
  strength:    {},
  flavor:      {},
  mood:        {},
  categories:  {},
  sampleCount: 0,
  lastUpdated: 0,
}) as TasteProfile;

/**
 * Fetch and aggregate the most recent N snapshots into a counter profile.
 * Returns EMPTY_PROFILE on any error or when the user has no history.
 */
export async function getTasteProfile(
  userId: string,
  limit  = 100,
): Promise<TasteProfile> {
  if (!userId) return EMPTY_PROFILE;

  let rows: Array<{
    category:          string;
    flavorPreferences: string[];
    strength:          number;
    mood:              string;
    createdAt:         Date;
  }>;
  try {
    rows = await db
      .select({
        category:          userPreferencesTable.category,
        flavorPreferences: userPreferencesTable.flavorPreferences,
        strength:          userPreferencesTable.strength,
        mood:              userPreferencesTable.mood,
        createdAt:         userPreferencesTable.createdAt,
      })
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.userId, userId))
      .orderBy(desc(userPreferencesTable.createdAt))
      .limit(limit);
  } catch (err) {
    // Logged at warn (not error) since the recommend pipeline still produces
    // a valid response — it just loses the personalization nudge.
    // eslint-disable-next-line no-console
    console.warn("[tasteProfile] aggregate failed; returning EMPTY_PROFILE", err);
    return EMPTY_PROFILE;
  }

  if (rows.length === 0) return EMPTY_PROFILE;

  const profile: TasteProfile = {
    strength:    {},
    flavor:      {},
    mood:        {},
    categories:  {},
    sampleCount: rows.length,
    lastUpdated: rows[0]!.createdAt.getTime(),
  };

  for (const row of rows) {
    const sKey = String(row.strength);
    profile.strength[sKey]       = (profile.strength[sKey]       ?? 0) + 1;
    profile.categories[row.category] = (profile.categories[row.category] ?? 0) + 1;
    if (row.mood) {
      const mKey = row.mood.toLowerCase();
      profile.mood[mKey] = (profile.mood[mKey] ?? 0) + 1;
    }
    for (const f of row.flavorPreferences ?? []) {
      const fKey = f.toLowerCase();
      profile.flavor[fKey] = (profile.flavor[fKey] ?? 0) + 1;
    }
  }

  return profile;
}

/**
 * Affinity bonus for a single product given a user's taste profile.
 *
 * Returns a small bounded number (default cap 4 points) that the engine
 * adds onto the base score. Designed to act as a tiebreaker / nudge —
 * never large enough to override a strong flavor / mood signal.
 *
 * Scoring: per-flavor +1 capped, +1 if strength bucket has any history,
 * +1 if mood matches any moodTag, +1 if category matches any history.
 */
export function tasteAffinityBonus(
  product:    Product,
  profile:    TasteProfile,
  maxPoints  = 4,
): number {
  if (profile.sampleCount === 0) return 0;
  let pts = 0;

  // Flavor overlap — at most 2 points (so a deep flavor preference can't
  // outshout a fresh in-session flavor pick worth 3 per overlap).
  let flavorPts = 0;
  for (const note of product.flavorNotes) {
    if ((profile.flavor[note.toLowerCase()] ?? 0) > 0) flavorPts += 1;
    if (flavorPts >= 2) break;
  }
  pts += flavorPts;

  // Strength bucket familiarity — 1 point.
  if ((profile.strength[String(product.strength)] ?? 0) > 0) pts += 1;

  // Mood overlap — 1 point if any of the product's moodTags shows up in history.
  if (product.moodTags.some((t) => (profile.mood[t.toLowerCase()] ?? 0) > 0)) {
    pts += 1;
  }

  // Category bias — 1 point.
  if ((profile.categories[product.category] ?? 0) > 0) pts += 1;

  return Math.min(pts, maxPoints);
}
