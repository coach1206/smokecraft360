/**
 * craftScenes.ts — Centralized scene registry for the Dynamic Visual Card Engine.
 *
 * Each scene has:
 *  id     — unique key (used for scene boosts in UserProfile.sceneBoosts)
 *  label  — short display name shown on the card
 *  sub    — supporting sub-text for the overlay
 *  image  — path relative to /public
 *  tags   — tag vocabulary used by the weighted engine
 *  weight — base score multiplier (default 1; admin can raise via boostScene)
 *
 * Tag vocabulary
 * ─────────────
 * mood:      "social" | "solo"
 * intensity: "premium" | "strong" | "light" | "tech" | "flavor"
 * setting:   "night" | "day" | "urban" | "group"
 */

export interface CraftScene {
  id:      string;
  label:   string;
  sub?:    string;
  image:   string;
  tags:    string[];
  weight:  number;
}

export interface CraftModule {
  id:      string;
  title:   string;
  tagline: string;
  color:   string;
  route:   string;
  badge:   string;
  scenes:  CraftScene[];
}

// ── SmokeCraft 360 ─────────────────────────────────────────────────────────────

export const SMOKE_SCENES: CraftScene[] = [
  {
    id: "lounge", label: "Executive Lounge", sub: "Private reserve access",
    image: "/images/smoke/smoke_lounge.png",
    tags: ["premium", "solo", "night"], weight: 1,
  },
  {
    id: "urban", label: "Evening Session", sub: "Late night signature sessions",
    image: "/images/smoke/smoke_urban.png",
    tags: ["social", "night", "urban"], weight: 1,
  },
  {
    id: "solo", label: "Late Night", sub: "Your moment, your craft",
    image: "/images/smoke/smoke_solo.png",
    tags: ["urban", "solo", "night"], weight: 1,
  },
  {
    id: "woman", label: "Refined Taste", sub: "Elegance, curated",
    image: "/images/smoke/smoke_woman.png",
    tags: ["premium", "solo"], weight: 1,
  },
  {
    id: "group", label: "Social Circle", sub: "Curated group experiences",
    image: "/images/smoke/smoke_group.png",
    tags: ["social", "group"], weight: 1,
  },
  {
    id: "selection", label: "Craft Selection", sub: "Guided humidor experience",
    image: "/images/smoke/smoke_selection.png",
    tags: ["premium", "solo"], weight: 1,
  },
];

// ── PourCraft 360 ──────────────────────────────────────────────────────────────

export const POUR_SCENES: CraftScene[] = [
  {
    id: "whiskey", label: "Neat Pour", sub: "Single malt, pure expression",
    image: "/images/pour/pour_whiskey.png",
    tags: ["strong", "premium", "solo"], weight: 1,
  },
  {
    id: "cocktail", label: "Craft Cocktail", sub: "Artisan bar craft",
    image: "/images/pour/pour_cocktail.png",
    tags: ["premium", "social"], weight: 1,
  },
  {
    id: "bar", label: "Bar Energy", sub: "Premium spirits, premium space",
    image: "/images/pour/pour_bar.png",
    tags: ["social", "night"], weight: 1,
  },
  {
    id: "wine", label: "Wine Selection", sub: "Terroir and time",
    image: "/images/pour/pour_wine.png",
    tags: ["light", "premium"], weight: 1,
  },
  {
    id: "tasting", label: "Tasting Flight", sub: "Guided spirit exploration",
    image: "/images/pour/pour_tasting.png",
    tags: ["premium", "group"], weight: 1,
  },
  {
    id: "aged", label: "Aged Reserve", sub: "Time-honored selections",
    image: "/images/pour/pour_aged.png",
    tags: ["premium", "night", "solo"], weight: 1,
  },
];

// ── BrewCraft 360 ──────────────────────────────────────────────────────────────

export const BREW_SCENES: CraftScene[] = [
  {
    id: "outdoor", label: "Classic Lager", sub: "Brewed for moments",
    image: "/images/brew/brew_outdoor.png",
    tags: ["light", "social"], weight: 1,
  },
  {
    id: "barrel", label: "Dark Stout", sub: "Oak-aged, slow-crafted",
    image: "/images/brew/brew_barrel.png",
    tags: ["strong", "solo"], weight: 1,
  },
  {
    id: "flight", label: "Beer Flight", sub: "Four craft pours, one journey",
    image: "/images/brew/brew_flight.png",
    tags: ["social", "group"], weight: 1,
  },
  {
    id: "pouring", label: "Fresh Pour", sub: "Cold, fresh, craft",
    image: "/images/brew/brew_pouring.png",
    tags: ["light", "social"], weight: 1,
  },
  {
    id: "taproom", label: "IPA Selection", sub: "Where craft is made",
    image: "/images/brew/brew_taproom.png",
    tags: ["strong", "premium"], weight: 1,
  },
];

// ── VapeCraft 360 ──────────────────────────────────────────────────────────────

export const VAPE_SCENES: CraftScene[] = [
  {
    id: "device", label: "Modern Device", sub: "Engineered for connoisseurs",
    image: "/images/vape/vape_device.png",
    tags: ["tech", "premium", "solo"], weight: 1,
  },
  {
    id: "hookah", label: "Hookah Lounge", sub: "Opulent atmosphere, premium blends",
    image: "/images/vape/vape_hookah.png",
    tags: ["social", "group", "night"], weight: 1,
  },
  {
    id: "modern", label: "Flavor Clouds", sub: "Sleek. Elevated. Yours.",
    image: "/images/vape/vape_modern.png",
    tags: ["flavor", "light", "solo"], weight: 1,
  },
  {
    id: "social", label: "Night Session", sub: "Shared experiences, signature moments",
    image: "/images/vape/vape_social.png",
    tags: ["night", "social", "urban"], weight: 1,
  },
];

// ── Assembled module registry ──────────────────────────────────────────────────

export const CRAFT_MODULES: CraftModule[] = [
  {
    id: "smoke", title: "SmokeCraft 360", tagline: "Signature cigar experiences, curated for you",
    color: "#e85d26", route: "/smokecraft", badge: "🚬  CIGAR",
    scenes: SMOKE_SCENES,
  },
  {
    id: "pour", title: "PourCraft 360", tagline: "Premium spirits & craft cocktails",
    color: "#a78bfa", route: "/pourcraft", badge: "🥃  SPIRITS",
    scenes: POUR_SCENES,
  },
  {
    id: "brew", title: "BrewCraft 360", tagline: "Craft beer, barrel-aged and beyond",
    color: "#f59e0b", route: "/brewcraft", badge: "🍺  BREW",
    scenes: BREW_SCENES,
  },
  {
    id: "vape", title: "VapeCraft 360", tagline: "Hookah, vape, and vapor lounge sessions",
    color: "#06b6d4", route: "/vapecraft", badge: "💨  VAPOR",
    scenes: VAPE_SCENES,
  },
];
