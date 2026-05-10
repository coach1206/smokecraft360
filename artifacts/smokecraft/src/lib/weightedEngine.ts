/**
 * weightedEngine.ts — Intelligent scene ranking + Universal Sommelier (Trifecta).
 *
 * Two exports:
 *   getWeightedScenes()   — original scene-ranking logic (unchanged)
 *   TRIFECTA_MATRIX       — Craft ↔ Pour ↔ Plate affinity data for the Sovereign Insight Cube
 *
 * The Trifecta logic is consumed by TitanNervousSystem.calculateTrifecta().
 */

// ── Universal Sommelier — Craft × Pour × Plate affinity ──────────────────────

export interface TrifectaEntry {
  craftTag:      string;           // flavor/strength descriptor from enrollment
  atmosphere:    string | null;    // optional atmosphere modifier
  pour:          { label: string; rationale: string; isReserve: boolean };
  plate:         { label: string; rationale: string; isChefSpecial: boolean };
}

/**
 * Ordered affinity table — first matching row wins.
 * Precedence: (craftTag ∩ atmosphere) > craftTag only > wildcard.
 */
export const TRIFECTA_MATRIX: TrifectaEntry[] = [
  // ── Bold / Full-bodied ──────────────────────────────────────────────────
  {
    craftTag: "bold", atmosphere: "bold",
    pour:  { label: "Pappy Van Winkle 15yr",      rationale: "Rare bourbon intensity matches the authority of a full-bodied Maduro", isReserve: true  },
    plate: { label: "Wagyu Beef Carpaccio",         rationale: "Fat-rich proteins bind tannins, sustaining depth through the final draw",  isChefSpecial: true  },
  },
  {
    craftTag: "bold", atmosphere: "reflective",
    pour:  { label: "Glenfarclas 25yr",             rationale: "Sherry cask complexity deepens the contemplative weight of aged leaf",     isReserve: true  },
    plate: { label: "Smoked Duck Breast",           rationale: "Shared smoke language reinforces the sensory loop",                         isChefSpecial: true  },
  },
  {
    craftTag: "bold", atmosphere: null,
    pour:  { label: "Brugal 1888 Reserve",          rationale: "Rich molasses and dried fruit mirror earthy Maduro undertones",             isReserve: true  },
    plate: { label: "Charcuterie Reserve Board",    rationale: "Cured complexity complements the draw without competing",                   isChefSpecial: false },
  },
  // ── Medium ─────────────────────────────────────────────────────────────
  {
    craftTag: "medium", atmosphere: "social",
    pour:  { label: "Moët & Chandon Impérial",     rationale: "Effervescent contrast cleanses and energises the table",                    isReserve: false },
    plate: { label: "Burrata with Heirloom Tomato", rationale: "Bright acidity refreshes the palate between rounds",                       isChefSpecial: false },
  },
  {
    craftTag: "medium", atmosphere: null,
    pour:  { label: "Balvenie DoubleWood 12yr",     rationale: "Gentle oak and honey bridge medium-strength craft seamlessly",              isReserve: false },
    plate: { label: "Aged Manchego + Truffle Honey",rationale: "Salt-fat balance sustains mid-smoke complexity",                           isChefSpecial: true  },
  },
  // ── Mild / Aromatic ────────────────────────────────────────────────────
  {
    craftTag: "mild", atmosphere: "relaxed",
    pour:  { label: "Diplomático Mantuano Rum",     rationale: "Soft vanilla warmth complements delicate aromatic leaf",                   isReserve: false },
    plate: { label: "Smoked Salmon Blini",          rationale: "Delicate smoke echo amplifies without overpowering lighter craft",         isChefSpecial: false },
  },
  {
    craftTag: "mild", atmosphere: null,
    pour:  { label: "Casamigos Añejo Tequila",      rationale: "Agave earthiness opens and prepares the palate for lighter profiles",      isReserve: false },
    plate: { label: "Smoked Salmon Blini",          rationale: "Refined delicacy pairs naturally with mild aromatic craft",                isChefSpecial: false },
  },
  // ── Vape / Hookah ──────────────────────────────────────────────────────
  {
    craftTag: "vape", atmosphere: null,
    pour:  { label: "St-Germain Elderflower Spritz",rationale: "Floral aromatics mirror the layered vapor profile",                        isReserve: false },
    plate: { label: "Mezze Platter",                rationale: "Light, diverse bites complement the episodic nature of vapor draws",       isChefSpecial: false },
  },
  // ── Universal fallback ─────────────────────────────────────────────────
  {
    craftTag: "*", atmosphere: null,
    pour:  { label: "Balvenie DoubleWood 12yr",     rationale: "Versatile bridge spirit across all palate ranges",                         isReserve: false },
    plate: { label: "Chef's Charcuterie Board",     rationale: "Universal palate companion for any craft experience",                      isChefSpecial: false },
  },
];

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
