/**
 * craftScenes.ts — Centralized scene registry for the Dynamic Visual Card Engine.
 *
 * Each scene has an id, display label, image path, and a `tags` array used by
 * the useVisualMatch hook to filter scenes based on the user's current
 * preferences (mood / intensity / setting).
 *
 * Tag vocabulary
 * ─────────────
 * mood:      "social" | "solo"
 * intensity: "premium" | "strong" | "light"
 * setting:   "night" | "day" | "urban" | "group"
 */

export interface CraftScene {
  id:     string;
  label:  string;
  sub?:   string;
  image:  string;
  tags:   string[];
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
    tags: ["premium", "solo", "night"],
  },
  {
    id: "urban", label: "Evening Session", sub: "Late night signature sessions",
    image: "/images/smoke/smoke_urban.png",
    tags: ["social", "night", "urban"],
  },
  {
    id: "solo", label: "Late Night", sub: "Your moment, your craft",
    image: "/images/smoke/smoke_solo.png",
    tags: ["urban", "solo", "night"],
  },
  {
    id: "woman", label: "Refined Taste", sub: "Elegance, curated",
    image: "/images/smoke/smoke_woman.png",
    tags: ["premium", "solo"],
  },
  {
    id: "group", label: "Social Circle", sub: "Curated group experiences",
    image: "/images/smoke/smoke_group.png",
    tags: ["social", "group"],
  },
  {
    id: "selection", label: "Craft Selection", sub: "Guided humidor experience",
    image: "/images/smoke/smoke_selection.png",
    tags: ["premium", "solo"],
  },
];

// ── PourCraft 360 ──────────────────────────────────────────────────────────────

export const POUR_SCENES: CraftScene[] = [
  {
    id: "whiskey", label: "Neat Pour", sub: "Single malt, pure expression",
    image: "/images/pour/pour_whiskey.png",
    tags: ["strong", "premium", "solo"],
  },
  {
    id: "cocktail", label: "Craft Cocktail", sub: "Artisan bar craft",
    image: "/images/pour/pour_cocktail.png",
    tags: ["premium", "social"],
  },
  {
    id: "bar", label: "Bar Energy", sub: "Premium spirits, premium space",
    image: "/images/pour/pour_bar.png",
    tags: ["social", "night"],
  },
  {
    id: "wine", label: "Wine Selection", sub: "Terroir and time",
    image: "/images/pour/pour_wine.png",
    tags: ["light", "premium"],
  },
  {
    id: "tasting", label: "Tasting Flight", sub: "Guided spirit exploration",
    image: "/images/pour/pour_tasting.png",
    tags: ["premium", "group"],
  },
  {
    id: "aged", label: "Aged Reserve", sub: "Time-honored selections",
    image: "/images/pour/pour_aged.png",
    tags: ["premium", "night", "solo"],
  },
];

// ── BrewCraft 360 ──────────────────────────────────────────────────────────────

export const BREW_SCENES: CraftScene[] = [
  {
    id: "outdoor", label: "Classic Lager", sub: "Brewed for moments",
    image: "/images/brew/brew_outdoor.png",
    tags: ["light", "social"],
  },
  {
    id: "barrel", label: "Dark Stout", sub: "Oak-aged, slow-crafted",
    image: "/images/brew/brew_barrel.png",
    tags: ["strong", "solo"],
  },
  {
    id: "flight", label: "Beer Flight", sub: "Four craft pours, one journey",
    image: "/images/brew/brew_flight.png",
    tags: ["social", "group"],
  },
  {
    id: "pouring", label: "Fresh Pour", sub: "Cold, fresh, craft",
    image: "/images/brew/brew_pouring.png",
    tags: ["light", "social"],
  },
  {
    id: "taproom", label: "IPA Selection", sub: "Where craft is made",
    image: "/images/brew/brew_taproom.png",
    tags: ["strong", "premium"],
  },
];

// ── VapeCraft 360 ──────────────────────────────────────────────────────────────

export const VAPE_SCENES: CraftScene[] = [
  {
    id: "device", label: "Modern Device", sub: "Engineered for connoisseurs",
    image: "/images/vape/vape_device.png",
    tags: ["premium", "solo"],
  },
  {
    id: "hookah", label: "Hookah Lounge", sub: "Opulent atmosphere, premium blends",
    image: "/images/vape/vape_hookah.png",
    tags: ["social", "group", "night"],
  },
  {
    id: "modern", label: "Flavor Clouds", sub: "Sleek. Elevated. Yours.",
    image: "/images/vape/vape_modern.png",
    tags: ["light", "solo"],
  },
  {
    id: "social", label: "Night Session", sub: "Shared experiences, signature moments",
    image: "/images/vape/vape_social.png",
    tags: ["night", "social", "urban"],
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
