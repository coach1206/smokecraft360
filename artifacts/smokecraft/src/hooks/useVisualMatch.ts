/**
 * useVisualMatch — returns the subset of scenes whose tags overlap with any
 * of the current preference values. Falls back to the full scene list when
 * no scene matches (ensures a card is never empty).
 *
 * Usage
 * ─────
 * const { preferences } = usePreferences();
 * const matched = useVisualMatch(SMOKE_SCENES, preferences);
 * // matched cycles through only the scenes relevant to the active mood
 */

import { useMemo } from "react";
import type { CraftScene } from "@/data/craftScenes";
import type { UserPreferences } from "@/contexts/PreferenceContext";

export function useVisualMatch(
  scenes: CraftScene[],
  preferences: UserPreferences,
): CraftScene[] {
  return useMemo(() => {
    if (!scenes.length) return scenes;

    // Collect the set of active preference values (e.g. ["social","strong","night"])
    const activeValues = new Set(Object.values(preferences));

    const matched = scenes.filter(scene =>
      scene.tags.some(tag => activeValues.has(tag)),
    );

    // If nothing matches, fall back to all scenes so the card is never blank
    return matched.length > 0 ? matched : scenes;
  }, [scenes, preferences]);
}
