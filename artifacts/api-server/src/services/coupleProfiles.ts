/**
 * Couples Mode — blends two RecommendRequest payloads into a single
 * "compromise" request that the existing engine can score normally.
 *
 * Why a separate service:
 *   The recommend engine is single-profile by design. Rather than fork
 *   the engine, we collapse two profiles into one and let the engine do
 *   what it already does well. Result is auditable and reuses every bit
 *   of existing scoring (flavor, strength, mood, taste-profile bias).
 *
 * Compromise rules (deliberately boring & explainable):
 *   - flavorPreferences: UNION of both lists (we want to satisfy either guest)
 *   - strength:          rounded average (with a tiebreaker rule for big gaps)
 *   - mood:              guest A wins on tie; otherwise the non-empty one
 *   - cigarShape/Session: use A's only when both agree; else drop (no compromise)
 *   - tasteProfile:      averaged per dimension when both present
 *
 * Pure function, no I/O. Lives in services/ alongside other engine helpers.
 */

import type { RecommendRequest, TasteProfileBias } from "../engine/types";

function avgMap(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const av = a[k] ?? 0;
    const bv = b[k] ?? 0;
    out[k] = (av + bv) / 2;
  }
  return out;
}

function blendTaste(a?: TasteProfileBias, b?: TasteProfileBias): TasteProfileBias | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return {
    strength:    avgMap(a.strength,   b.strength),
    flavor:      avgMap(a.flavor,     b.flavor),
    mood:        avgMap(a.mood,       b.mood),
    categories:  avgMap(a.categories, b.categories),
    sampleCount: a.sampleCount + b.sampleCount,
  };
}

export function blendProfiles(a: RecommendRequest, b: RecommendRequest): RecommendRequest {
  /* Flavor: UNION (case-insensitive dedupe). The engine's overlap
   * scoring rewards every match, so a wider preference set means the
   * top result will satisfy either guest's palette. */
  const flavorSet = new Set<string>();
  for (const f of [...a.flavorPreferences, ...b.flavorPreferences]) {
    if (typeof f === "string" && f.trim()) flavorSet.add(f.trim().toLowerCase());
  }

  /* Strength: rounded mean, but if the gap is >= 3 we round toward the
   * lower value — better to undershoot than to overpower the milder palate. */
  const gap = Math.abs(a.strength - b.strength);
  const meanStrength = (a.strength + b.strength) / 2;
  const strength = gap >= 3 ? Math.floor(meanStrength) : Math.round(meanStrength);

  /* Mood: pick the non-empty one, preferring A on a tie. Avoid blending
   * mood strings (no semantic meaning to "bold+relaxed"). */
  const mood = a.mood?.trim() || b.mood?.trim() || "";

  /* Cigar shape & session only carry over when both agree — disagreement
   * means there's no shared physical preference to honor. */
  const cigarShape   = a.cigarShape   && a.cigarShape   === b.cigarShape   ? a.cigarShape   : undefined;
  const cigarSession = a.cigarSession && a.cigarSession === b.cigarSession ? a.cigarSession : undefined;

  return {
    category:          a.category, // category must match by contract; caller validates
    flavorPreferences: Array.from(flavorSet),
    strength:          Math.max(1, Math.min(5, strength)),
    mood,
    venueId:           a.venueId ?? b.venueId,
    ...(cigarShape   ? { cigarShape }   : {}),
    ...(cigarSession ? { cigarSession } : {}),
    ...(blendTaste(a.tasteProfile, b.tasteProfile) ? { tasteProfile: blendTaste(a.tasteProfile, b.tasteProfile) } : {}),
  };
}
