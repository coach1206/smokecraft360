/**
 * weightedEngine.ts — Intelligent scene ranking + Universal Sommelier (Trifecta).
 *
 * Exports:
 *   getWeightedScenes()         — original scene-ranking logic (unchanged)
 *   TRIFECTA_MATRIX             — Craft ↔ Pour ↔ Plate affinity data
 *   computeFlavorTrajectory()   — Titan V cross-craft palate affinity engine
 *   rankAffinityOptions()       — convenience wrapper returning top-N results
 *
 * computeFlavorTrajectory maps flavor trajectories between:
 *   CRAFT (Smoke / Vape / Pour / Brew)
 *   POUR  (Bourbon / Scotch / Rum / Champagne / Tequila / Cognac)
 *   PLATE (Beef / Charcuterie / Seafood / Cheese / Vegetable / Dessert)
 *
 * Revenue Brain v2 scoring: 40% taste · 25% margin · 15% stock · 10% reliability · 10% premium.
 * HIGH confidence (≥85) or ELITE/MASTER tier unlocks Reserve + Executive Plate upscale.
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

// ── Titan V — Cross-Craft Palate Affinity Engine ──────────────────────────────

type FlavorNote =
  | "earthy" | "woody" | "leathery" | "spicy"
  | "sweet"  | "floral" | "fruity"  | "nutty"
  | "smoky"  | "creamy" | "bright"  | "herbal";

type CraftFamily = "smoke" | "vape" | "pour" | "brew";
type PourFamily  = "bourbon" | "scotch" | "rum" | "champagne" | "tequila" | "cognac";
type PlateFamily = "beef" | "charcuterie" | "seafood" | "cheese" | "vegetable" | "dessert";

export interface RankedOption {
  label:          string;
  family:         string;
  affinityPct:    number;
  isReserve?:     boolean;
  isChefSpecial?: boolean;
  flavorBridge:   string;
}

export interface WeightedAffinityResult {
  pour:              RankedOption[];
  plate:             RankedOption[];
  /** Combined cross-craft affinity score 0–100 */
  trajectoryScore:   number;
  /** Unlocked when boldness ≥ 70 or confidenceScore ≥ 85 or tier ELITE/MASTER */
  reserveEligible:   boolean;
  executiveEligible: boolean;
}

export interface FlavorTrajectoryInput {
  craftType:        CraftFamily;
  boldness:         number;
  atmosphere:       string;
  guestTier?:       string;
  confidenceScore?: number;
}

const CRAFT_NOTES: Record<CraftFamily, Record<string, FlavorNote[]>> = {
  smoke: {
    bold:       ["earthy", "leathery", "smoky", "woody"],
    reflective: ["woody",  "nutty",    "earthy", "spicy"],
    social:     ["sweet",  "floral",   "fruity", "creamy"],
    relaxed:    ["herbal", "sweet",    "floral", "creamy"],
  },
  vape: {
    bold:       ["sweet",  "fruity",   "spicy",  "herbal"],
    reflective: ["floral", "herbal",   "fruity", "bright"],
    social:     ["sweet",  "fruity",   "bright", "creamy"],
    relaxed:    ["floral", "herbal",   "sweet",  "bright"],
  },
  pour: {
    bold:       ["spicy",  "woody",    "earthy", "nutty"],
    reflective: ["woody",  "smoky",    "nutty",  "leathery"],
    social:     ["fruity", "sweet",    "floral", "bright"],
    relaxed:    ["sweet",  "creamy",   "fruity", "herbal"],
  },
  brew: {
    bold:       ["earthy", "nutty",    "smoky",  "woody"],
    reflective: ["herbal", "earthy",   "nutty",  "spicy"],
    social:     ["fruity", "bright",   "sweet",  "floral"],
    relaxed:    ["sweet",  "creamy",   "fruity", "bright"],
  },
};

const POUR_CFG: Record<PourFamily, { notes: FlavorNote[]; weight: number; reserve: boolean; highLabel: string; midLabel: string }> = {
  bourbon:   { notes: ["woody","sweet","spicy","nutty"],      weight: 92, reserve: true,  highLabel: "Pappy Van Winkle 15yr",   midLabel: "Balvenie DoubleWood 12yr" },
  scotch:    { notes: ["smoky","earthy","leathery","woody"],  weight: 96, reserve: true,  highLabel: "The Macallan Rare Cask",   midLabel: "Glenfarclas 17yr"         },
  rum:       { notes: ["sweet","fruity","creamy","earthy"],   weight: 80, reserve: true,  highLabel: "Brugal 1888 Reserve",      midLabel: "Diplomático Mantuano"     },
  champagne: { notes: ["bright","floral","fruity","sweet"],   weight: 74, reserve: false, highLabel: "Moët & Chandon Impérial",  midLabel: "Moët & Chandon Impérial"  },
  tequila:   { notes: ["earthy","spicy","herbal","bright"],   weight: 72, reserve: false, highLabel: "Casa Dragones Joven",      midLabel: "Casamigos Añejo"          },
  cognac:    { notes: ["fruity","floral","woody","spicy"],    weight: 88, reserve: true,  highLabel: "Rémy Martin XO",           midLabel: "Hennessy VSOP"            },
};

const PLATE_CFG: Record<PlateFamily, { notes: FlavorNote[]; weight: number; chef: boolean; highLabel: string; midLabel: string }> = {
  beef:        { notes: ["earthy","leathery","smoky","woody"],  weight: 95, chef: true,  highLabel: "Wagyu Beef Carpaccio",         midLabel: "Prime Ribeye"                  },
  charcuterie: { notes: ["spicy","nutty","earthy","smoky"],     weight: 85, chef: false, highLabel: "Charcuterie Reserve Board",    midLabel: "Artisan Charcuterie"           },
  seafood:     { notes: ["bright","herbal","floral","creamy"],  weight: 75, chef: true,  highLabel: "Butter-Poached Lobster Tail",  midLabel: "Smoked Salmon Blini"           },
  cheese:      { notes: ["nutty","creamy","earthy","fruity"],   weight: 82, chef: true,  highLabel: "Aged Manchego + Truffle Honey",midLabel: "Burrata with Heirloom Tomato"  },
  vegetable:   { notes: ["herbal","bright","floral","sweet"],   weight: 68, chef: false, highLabel: "Burrata with Heirloom Tomato", midLabel: "Seasonal Vegetable Board"      },
  dessert:     { notes: ["sweet","creamy","fruity","floral"],   weight: 65, chef: false, highLabel: "Valrhona Chocolate Soufflé",   midLabel: "Artisan Cheese Plate"          },
};

function noteOverlap(a: FlavorNote[], b: FlavorNote[]): number {
  const s = new Set(a);
  return b.filter(n => s.has(n)).length;
}

function affinityScore(overlap: number, baseWeight: number, boldness: number): number {
  const boldBonus = boldness >= 75 ? 8 : boldness >= 50 ? 4 : 0;
  return Math.min(Math.round(baseWeight * (0.7 + overlap * 0.1) + boldBonus), 100);
}

/**
 * computeFlavorTrajectory
 *
 * Core Titan V palate affinity engine.  Maps a guest profile onto ranked
 * Pour and Plate trajectories using shared flavor-note overlap scoring.
 *
 * HIGH confidence (≥85) or ELITE / MASTER tier unlocks Reserve and
 * Executive Plate labels for Revenue Brain v2 upscale routing.
 */
export function computeFlavorTrajectory(input: FlavorTrajectoryInput): WeightedAffinityResult {
  const { craftType, boldness, atmosphere, guestTier, confidenceScore = 70 } = input;

  const atm        = atmosphere in (CRAFT_NOTES[craftType] ?? {}) ? atmosphere : "relaxed";
  const craftNotes = CRAFT_NOTES[craftType]?.[atm] ?? ["earthy", "woody"] as FlavorNote[];

  const reserve   = boldness >= 70 || confidenceScore >= 85 || guestTier === "ELITE" || guestTier === "MASTER";
  const executive = confidenceScore >= 85 || guestTier === "ELITE" || guestTier === "MASTER";

  const pourRanked: RankedOption[] = (Object.entries(POUR_CFG) as [PourFamily, typeof POUR_CFG[PourFamily]][])
    .map(([family, cfg]) => {
      const overlap = noteOverlap(craftNotes, cfg.notes);
      const useRes  = cfg.reserve && reserve;
      return {
        label:       useRes ? cfg.highLabel : cfg.midLabel,
        family,
        affinityPct: affinityScore(overlap, cfg.weight, boldness),
        isReserve:   useRes,
        flavorBridge: `${overlap} shared flavor note${overlap !== 1 ? "s" : ""} — ${craftType} × ${family}`,
      };
    })
    .sort((a, b) => b.affinityPct - a.affinityPct);

  const plateRanked: RankedOption[] = (Object.entries(PLATE_CFG) as [PlateFamily, typeof PLATE_CFG[PlateFamily]][])
    .map(([family, cfg]) => {
      const overlap = noteOverlap(craftNotes, cfg.notes);
      const useExec = cfg.chef && executive;
      return {
        label:          useExec ? cfg.highLabel : cfg.midLabel,
        family,
        affinityPct:    affinityScore(overlap, cfg.weight, boldness),
        isChefSpecial:  useExec,
        flavorBridge:   `Palate harmony: ${craftType} × ${family}`,
      };
    })
    .sort((a, b) => b.affinityPct - a.affinityPct);

  const top2Pour  = pourRanked.slice(0, 2).reduce((s, r) => s + r.affinityPct, 0) / 2;
  const top2Plate = plateRanked.slice(0, 2).reduce((s, r) => s + r.affinityPct, 0) / 2;

  return {
    pour:              pourRanked,
    plate:             plateRanked,
    trajectoryScore:   Math.round(top2Pour * 0.55 + top2Plate * 0.45),
    reserveEligible:   reserve,
    executiveEligible: executive,
  };
}

/**
 * rankAffinityOptions
 *
 * Convenience wrapper — returns top N ranked pour + plate options.
 */
export function rankAffinityOptions(
  input: FlavorTrajectoryInput,
  topN = 3,
): { pour: RankedOption[]; plate: RankedOption[] } {
  const result = computeFlavorTrajectory(input);
  return { pour: result.pour.slice(0, topN), plate: result.plate.slice(0, topN) };
}

// ── Original scene-ranking engine (unchanged) ─────────────────────────────────

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
