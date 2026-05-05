/**
 * weightedEngine.ts — Intelligent scene ranking for the Dynamic Visual Card Engine.
 *
 * Scores every scene against the user profile across four signals:
 *
 *  +2  per tag matching any active preference value (mood/intensity/setting)
 *  +3  per tag matching the POS pairing map for the last order type  ← strongest signal
 *  +2  per tag matching the current venue type filter
 *  +1  contextual time-of-day boost (night scenes after 18:00, light scenes before 12:00)
 *  +N  admin / history scene boost from profile.sceneBoosts
 *
 * Scenes are sorted descending by score. All scenes are always shown — the ranking
 * determines which scene appears first (and therefore most often in rotation).
 */

import type { CraftScene } from "@/data/craftScenes";
import type { UserProfile } from "@/contexts/UserProfileContext";

// ── AI Pairing map — what you last ordered predicts what imagery resonates ────

export const PAIRING_MAP: Record<string, string[]> = {
  cigar:   ["premium", "strong", "night"],
  whiskey: ["strong",  "premium", "solo"],
  beer:    ["light",   "social"],
  vape:    ["tech",    "flavor", "night"],
};

// ── Venue theme filters ───────────────────────────────────────────────────────

export const VENUE_THEMES: Record<string, { filter: string[] }> = {
  lounge: { filter: ["premium", "night"] },
  bar:    { filter: ["social"] },
  club:   { filter: ["night", "urban"] },
};

// ── Scored scene type ─────────────────────────────────────────────────────────

export type ScoredScene = CraftScene & { score: number };

// ── Core ranking function ─────────────────────────────────────────────────────

export function getWeightedScenes(
  scenes:  CraftScene[],
  profile: UserProfile,
): ScoredScene[] {
  const hour          = new Date().getHours();
  const activeValues  = new Set<string>([profile.mood, profile.intensity, profile.setting]);
  const pairingTags   = profile.lastOrderType
    ? (PAIRING_MAP[profile.lastOrderType] ?? [])
    : [];
  const venueFilter   = VENUE_THEMES[profile.venueType]?.filter ?? [];

  return scenes
    .map(scene => {
      // Base score = scene weight + any admin/history boost for this scene
      let score = (scene.weight ?? 1) + (profile.sceneBoosts?.[scene.id] ?? 0);

      // Signal 1 — preference match (+2 per tag)
      scene.tags.forEach(tag => {
        if (activeValues.has(tag)) score += 2;
      });

      // Signal 2 — POS pairing (+3 per tag, strongest signal)
      pairingTags.forEach(tag => {
        if (scene.tags.includes(tag)) score += 3;
      });

      // Signal 3 — venue theme (+2 per tag)
      venueFilter.forEach(tag => {
        if (scene.tags.includes(tag)) score += 2;
      });

      // Signal 4 — time-of-day contextual boost (+1)
      if (hour >= 18 && scene.tags.includes("night")) score += 1;
      if (hour < 12  && scene.tags.includes("light")) score += 1;

      return { ...scene, score };
    })
    .sort((a, b) => b.score - a.score);
}
