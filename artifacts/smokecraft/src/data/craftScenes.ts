/**
 * craftScenes.ts — Centralized scene registry for the Dynamic Visual Card Engine.
 *
 * Each module (SmokeCraft, PourCraft, BrewCraft, VapeCraft) defines a curated
 * array of scenes. Each scene has an id, display label, image path (served from
 * /public/images/<craft>/), and an optional sub-label for the overlay.
 *
 * Cards rotate through these scenes every 3 500 ms with a cross-fade transition.
 */

export interface CraftScene {
  id:       string;
  label:    string;
  sub?:     string;
  image:    string;
}

export interface CraftModule {
  id:         string;
  title:      string;
  tagline:    string;
  color:      string;
  route:      string;
  badge:      string;
  scenes:     CraftScene[];
}

// ── SmokeCraft 360 ─────────────────────────────────────────────────────────────

export const SMOKE_SCENES: CraftScene[] = [
  {
    id:    "lounge",
    label: "Executive Lounge",
    sub:   "Private reserve access",
    image: "/images/smoke/smoke_lounge.png",
  },
  {
    id:    "group",
    label: "Social Session",
    sub:   "Curated group experiences",
    image: "/images/smoke/smoke_group.png",
  },
  {
    id:    "solo",
    label: "Solo Reflection",
    sub:   "Your moment, your craft",
    image: "/images/smoke/smoke_solo.png",
  },
  {
    id:    "urban",
    label: "Urban Night",
    sub:   "Late night signature sessions",
    image: "/images/smoke/smoke_urban.png",
  },
  {
    id:    "selection",
    label: "Craft Selection",
    sub:   "Guided humidor experience",
    image: "/images/smoke/smoke_selection.png",
  },
];

// ── PourCraft 360 ──────────────────────────────────────────────────────────────

export const POUR_SCENES: CraftScene[] = [
  {
    id:    "whiskey",
    label: "Whiskey Neat",
    sub:   "Single malt, pure expression",
    image: "/images/pour/pour_whiskey.png",
  },
  {
    id:    "cocktail",
    label: "Craft Cocktail",
    sub:   "Artisan bar craft",
    image: "/images/pour/pour_cocktail.png",
  },
  {
    id:    "tasting",
    label: "Tasting Flight",
    sub:   "Guided spirit exploration",
    image: "/images/pour/pour_tasting.png",
  },
  {
    id:    "bar",
    label: "The Bar",
    sub:   "Premium spirits, premium space",
    image: "/images/pour/pour_bar.png",
  },
  {
    id:    "aged",
    label: "Aged Reserve",
    sub:   "Time-honored selections",
    image: "/images/pour/pour_aged.png",
  },
];

// ── BrewCraft 360 ──────────────────────────────────────────────────────────────

export const BREW_SCENES: CraftScene[] = [
  {
    id:    "flight",
    label: "Beer Flight",
    sub:   "Four craft pours, one journey",
    image: "/images/brew/brew_flight.png",
  },
  {
    id:    "taproom",
    label: "Taproom",
    sub:   "Where craft is made",
    image: "/images/brew/brew_taproom.png",
  },
  {
    id:    "outdoor",
    label: "Open Air Session",
    sub:   "Brewed for moments",
    image: "/images/brew/brew_outdoor.png",
  },
  {
    id:    "barrel",
    label: "Barrel Room",
    sub:   "Oak-aged, slow-crafted",
    image: "/images/brew/brew_barrel.png",
  },
];

// ── VapeCraft 360 ──────────────────────────────────────────────────────────────

export const VAPE_SCENES: CraftScene[] = [
  {
    id:    "hookah",
    label: "Hookah Lounge",
    sub:   "Opulent atmosphere, premium blends",
    image: "/images/vape/vape_hookah.png",
  },
  {
    id:    "modern",
    label: "Modern Session",
    sub:   "Sleek. Elevated. Yours.",
    image: "/images/vape/vape_modern.png",
  },
  {
    id:    "social",
    label: "Social Circle",
    sub:   "Shared experiences, signature moments",
    image: "/images/vape/vape_social.png",
  },
  {
    id:    "device",
    label: "Premium Device",
    sub:   "Engineered for connoisseurs",
    image: "/images/vape/vape_device.png",
  },
];

// ── Assembled module registry ──────────────────────────────────────────────────

export const CRAFT_MODULES: CraftModule[] = [
  {
    id:      "smoke",
    title:   "SmokeCraft 360",
    tagline: "Signature cigar experiences, curated for you",
    color:   "#e85d26",
    route:   "/smokecraft",
    badge:   "🚬  CIGAR",
    scenes:  SMOKE_SCENES,
  },
  {
    id:      "pour",
    title:   "PourCraft 360",
    tagline: "Premium spirits & craft cocktails",
    color:   "#a78bfa",
    route:   "/pourcraft",
    badge:   "🥃  SPIRITS",
    scenes:  POUR_SCENES,
  },
  {
    id:      "brew",
    title:   "BrewCraft 360",
    tagline: "Craft beer, barrel-aged and beyond",
    color:   "#f59e0b",
    route:   "/brewcraft",
    badge:   "🍺  BREW",
    scenes:  BREW_SCENES,
  },
  {
    id:      "vape",
    title:   "VapeCraft 360",
    tagline: "Hookah, vape, and vapor lounge sessions",
    color:   "#06b6d4",
    route:   "/vapecraft",
    badge:   "💨  VAPOR",
    scenes:  VAPE_SCENES,
  },
];
