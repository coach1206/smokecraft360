/**
 * menuSuggestion — filter the venue menu by pairing/flavor tags from the
 * current recommendation context. This is the "menu suggestion engine"
 * the brief calls out: real orderable items (menu_items table), filtered
 * by the same flavor taxonomy the engine uses.
 *
 * Pure ranking: each item gets +1 for every tag overlap with the supplied
 * context tags. Items with score 0 are dropped. Sorted by score desc, then
 * priceCents asc as a tiebreaker.
 *
 * Does NOT mutate the menu and does NOT touch the recommendation engine —
 * a thin layer that bolts onto whatever pairing context the caller hands in.
 */

import type { MenuItem } from "@workspace/db";

export interface SuggestedMenuItem extends MenuItem {
  /** Number of tag overlaps with the requested context. */
  matchScore: number;
}

export function suggestMenuItems(
  menu:        MenuItem[],
  contextTags: string[],
  limit:       number = 5,
): SuggestedMenuItem[] {
  if (!menu.length || !contextTags.length) return [];

  const wanted = new Set(contextTags.map((t) => t.toLowerCase()));

  return menu
    .filter((m) => m.available)
    .map((m): SuggestedMenuItem => {
      const tags = (m.tags ?? []).map((t) => t.toLowerCase());
      let score = 0;
      for (const t of tags) if (wanted.has(t)) score += 1;
      return { ...m, matchScore: score };
    })
    .filter((m) => m.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.priceCents - b.priceCents)
    .slice(0, limit);
}
