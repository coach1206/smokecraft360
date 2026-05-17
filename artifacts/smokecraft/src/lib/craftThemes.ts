/**
 * craftThemes — per-craft visual configuration for the Universal Swipe Engine.
 */

export type CraftType = "smoke" | "pour" | "brew" | "vape" | "wine";

export interface CraftTheme {
  type:        CraftType;
  label:       string;
  tagline:     string;
  accent:      string;
  accentSoft:  string;
  bgImage:     string;
  cardBg:      string;
  badgeLabel:  string;
  visualWords: string[];
}

export const CRAFT_THEMES: Record<CraftType, CraftTheme> = {
  smoke: {
    type:        "smoke",
    label:       "SmokeCraft 360",
    tagline:     "Discover your perfect cigar",
    accent:      "#D48B00",
    accentSoft:  "#a98828",
    bgImage:     "/images/cigar1.png",
    cardBg:      "rgba(18,10,4,0.88)",
    badgeLabel:  "CIGAR",
    visualWords: ["cigar", "lounge", "smoke"],
  },
  pour: {
    type:        "pour",
    label:       "PourCraft 360",
    tagline:     "Find your signature spirit",
    accent:      "#c87820",
    accentSoft:  "#a06010",
    bgImage:     "/images/pour/pour_bar.png",
    cardBg:      "rgba(12,8,4,0.88)",
    badgeLabel:  "SPIRITS",
    visualWords: ["whiskey", "cocktail", "spirit"],
  },
  brew: {
    type:        "brew",
    label:       "BrewCraft 360",
    tagline:     "Pick your pour",
    accent:      "#e6c76a",
    accentSoft:  "#c09030",
    bgImage:     "/images/brew/brew_bar.png",
    cardBg:      "rgba(10,8,2,0.88)",
    badgeLabel:  "BREW",
    visualWords: ["beer", "foam", "social"],
  },
  vape: {
    type:        "vape",
    label:       "VapeCraft 360",
    tagline:     "Enter the vapor dimension",
    accent:      "#a855f7",
    accentSoft:  "#06b6d4",
    bgImage:     "/images/vape/vape_lounge.png",
    cardBg:      "rgba(3,0,10,0.95)",
    badgeLabel:  "VAPOR",
    visualWords: ["neon", "futuristic", "electric"],
  },
  wine: {
    type:        "wine",
    label:       "WineCraft 360",
    tagline:     "Discover the perfect vintage",
    accent:      "#9B1C1C",
    accentSoft:  "#722F37",
    bgImage:     "/images/wine/wine_cellar.png",
    cardBg:      "rgba(10,2,2,0.92)",
    badgeLabel:  "WINE",
    visualWords: ["vineyard", "elegant", "terroir"],
  },
};

export function getCraftTheme(type: string): CraftTheme {
  return CRAFT_THEMES[type as CraftType] ?? CRAFT_THEMES.smoke;
}
