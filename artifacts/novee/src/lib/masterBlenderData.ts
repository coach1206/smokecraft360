export const GOLD = "#d4af37";

export const MASTERY_TIERS = [
  { rank: 1, name: "Just Curious",        min: 0,    max: 250,     color: "#8BC34A", sessionLabel: "Session I · 10 mins"   },
  { rank: 2, name: "Cultivated Beginner", min: 251,  max: 750,     color: GOLD,      sessionLabel: "Session II · 12 mins"  },
  { rank: 3, name: "Rising Aficionado",   min: 751,  max: 1500,    color: "#E8741A", sessionLabel: "Session III · 15 mins" },
  { rank: 4, name: "Master Sommelier",    min: 1501, max: Infinity, color: "#a78bfa", sessionLabel: "The Alchemy Chamber"   },
] as const;

export type MasteryTier = (typeof MASTERY_TIERS)[number];

export function getTier(xp: number): MasteryTier {
  return ([...MASTERY_TIERS] as MasteryTier[]).reverse().find(t => xp >= t.min) ?? MASTERY_TIERS[0];
}

export const COUNTRY_FLAGS: Record<string, string> = {
  "Dominican Republic": "\u{1F1E9}\u{1F1F4}",
  "Nicaragua":          "\u{1F1F3}\u{1F1EE}",
  "Cuba":               "\u{1F1E8}\u{1F1FA}",
  "Ecuador":            "\u{1F1EA}\u{1F1E8}",
  "Honduras":           "\u{1F1ED}\u{1F1F3}",
  "Brazil":             "\u{1F1E7}\u{1F1F7}",
};

export function persistCountry(country: string): void {
  try {
    const ex: string[] = JSON.parse(localStorage.getItem("blender_countries") ?? "[]");
    if (!ex.includes(country)) localStorage.setItem("blender_countries", JSON.stringify([...ex, country]));
  } catch { /* kiosk */ }
}

export function loadVisitedCountries(): string[] {
  try { return JSON.parse(localStorage.getItem("blender_countries") ?? "[]"); } catch { return []; }
}

export const SENSORY_MATRIX: Record<string, {
  cigar: string; spirit: string; spiritStyle: string;
  foods: [string, string]; descriptors: [string, string, string];
  accent: string;
}> = {
  "Dominican Republic": {
    cigar:       "Arturo Fuente Opus X",
    spirit:      "Highland Single Malt Scotch",
    spiritStyle: "12yr+ Aged",
    foods:       ["Prime Dry-Aged Ribeye", "Dark Chocolate Ganache"],
    descriptors: ["Smooth", "Cedar", "Cocoa"],
    accent:      "#C8860A",
  },
  "Nicaragua": {
    cigar:       "Padrón 1926 Series",
    spirit:      "Barrel-Proof Bourbon",
    spiritStyle: "Cask Strength",
    foods:       ["Charred Pepper NY Strip", "Espresso Smoked Brisket"],
    descriptors: ["Bold", "Espresso", "Spice"],
    accent:      "#8B3A0F",
  },
  "Ecuador": {
    cigar:       "Arturo Fuente Opus X PerfecXion",
    spirit:      "Yamazaki 12-Year Single Malt",
    spiritStyle: "Single Malt",
    foods:       ["Pan-Seared Duck Breast", "Artisanal Charcuterie"],
    descriptors: ["Creamy", "Aromatic", "Shade-grown"],
    accent:      "#2E6B4F",
  },
  "Cuba": {
    cigar:       "Cohiba Behike 52",
    spirit:      "Ron Zacapa 23 Rum",
    spiritStyle: "Sistema Solera",
    foods:       ["Mojo-Glazed Pork Tenderloin", "Coconut Flan"],
    descriptors: ["Earthy", "Floral", "Honey"],
    accent:      "#7A4F1A",
  },
};

export const HALO_R    = 88;
export const HALO_CIRC = 2 * Math.PI * HALO_R;

export const LEAVES = [
  {
    id: "seco", label: "Seco", sub: "Air-cured · Light",
    xp: 15, img: "/images/cigar1.png", hue: "#c8a06a", synergy: 22,
    desc: "Delicate and smooth — the backbone of balance.",
    mentorNote: "Seco leaf burns cool and even. Guests who choose Seco are seekers of subtlety.",
  },
  {
    id: "viso", label: "Viso", sub: "Sun-grown · Medium Oily",
    xp: 20, img: "/images/cigar3.png", hue: "#8b5e30", synergy: 28,
    desc: "The equilibrium leaf — body meets finesse.",
    mentorNote: "Viso is the bridge. It carries complexity without aggression.",
  },
  {
    id: "ligero", label: "Ligero", sub: "Shade-grown · Full Power",
    xp: 25, img: "/images/cigar.png", hue: "#3d1f08", synergy: 25,
    desc: "The apex leaf — slow-burning, full-bodied intensity.",
    mentorNote: "Ligero is reserved for those who demand the full conversation.",
  },
];

export const WRAPPERS = [
  {
    id: "candela", label: "Candela", sub: "Bright · Grassy · Mild",
    xp: 12, img: "/images/smoke/smoke_selection.png", synergy: 20,
    desc: "Flash-cured to lock in chlorophyll. Rare and vivid.",
    mentorNote: "Candela is the unexpected choice — bright, grassy, almost botanical.",
  },
  {
    id: "connecticut", label: "Connecticut", sub: "Silky · Creamy · Light",
    xp: 15, img: "/images/cigar1.png", synergy: 25,
    desc: "Shade-grown elegance. The silk of the tobacco world.",
    mentorNote: "Connecticut wrapper speaks to those who appreciate understated luxury.",
  },
  {
    id: "habano", label: "Habano", sub: "Earthy · Spiced · Medium",
    xp: 18, img: "/images/smoke/smoke_selection.png", synergy: 28,
    desc: "Cuban tradition meets modern construction.",
    mentorNote: "Habano is complexity in every draw — spice, leather, earth.",
  },
  {
    id: "maduro", label: "Maduro", sub: "Dark · Sweet · Full",
    xp: 22, img: "/images/cigar4.png", synergy: 25,
    desc: "Slow-fermented darkness. Cocoa, coffee, dark fruit.",
    mentorNote: "Maduro is the wrapper that needs no introduction. It commands the room.",
  },
  {
    id: "oscuro", label: "Oscuro", sub: "Blackest · Oily · Intense",
    xp: 25, img: "/images/cigar2.png", synergy: 22,
    desc: "Beyond Maduro — maximum fermentation, maximum expression.",
    mentorNote: "Oscuro is for the initiated. Tar, espresso, dark chocolate.",
  },
];

export const VITOLAS = [
  { id: "robusto",   label: "Robusto",   smoke: 50,  img: "/images/cigar.png",  xp: 10, synergy: 22, ring: 50, length: 5.0   },
  { id: "toro",      label: "Toro",      smoke: 65,  img: "/images/cigar1.png", xp: 12, synergy: 25, ring: 50, length: 6.0   },
  { id: "churchill", label: "Churchill", smoke: 90,  img: "/images/cigar2.png", xp: 15, synergy: 28, ring: 47, length: 7.0   },
  { id: "belicoso",  label: "Belicoso",  smoke: 75,  img: "/images/cigar3.png", xp: 14, synergy: 25, ring: 52, length: 6.125 },
  { id: "lancero",   label: "Lancero",   smoke: 120, img: "/images/cigar4.png", xp: 18, synergy: 25, ring: 38, length: 7.5   },
];

export const CUTS = [
  { id: "straight", label: "Straight Cut", sub: "Clean · Classic · Full Draw",      xp: 8,  synergy: 33 },
  { id: "vcut",     label: "V-Cut",        sub: "Focused · Concentrated · Intense", xp: 12, synergy: 37 },
  { id: "punch",    label: "Punch Cut",    sub: "Circular · Controlled · Smooth",   xp: 10, synergy: 30 },
];

export const STEP_MENTOR: string[] = [
  "Welcome to the ritual. Choose your tobacco leaf — the soul of every great blend.",
  "Now choose your wrapper. The wrapper is the first thing the world sees, and the last thing it forgets.",
  "Select your vitola — the shape and smoke time define the rhythm of the experience.",
  "The final cut. How you begin the draw determines everything that follows.",
];

export const MENTORS = [
  {
    id: "tradition",
    name: "Don Manuel",
    flag: "\u{1F1E9}\u{1F1F4}",
    origin: "Dominican Republic",
    style: "Traditional Entubado Rolling",
    bio: "Mastery over smooth, complex profile layering with multi-generational Cibao Valley seed descendants. His blends carry cedar warmth, cream body, and a long, clean white ash finish.",
    tag: "THE TRADITION",
    soilAffinity: "alluvial" as const,
    guidance: "In the Cibao Valley we speak of balance as a living force — not a calculation. Observe every priming tier before you. The tobacco leaf will confirm when your hand has made the right choice. Proceed with precision; your blend reveals your character.",
    portrait: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "sovereign",
    name: "Alejandro",
    flag: "\u{1F1F3}\u{1F1EE}",
    origin: "Nicaragua",
    style: "Estílí Accordion Technique",
    bio: "Specializes in high-intensity, bold, spice-forward profiles utilizing volcanic soil properties. Dark chocolate, pepper, and earth are his signature hallmarks.",
    tag: "THE MODERN SOVEREIGN",
    soilAffinity: "volcanic" as const,
    guidance: "The volcano demands conviction. In Esteli we do not deliberate — we commit. Every decision here must carry the weight of intention. Half-measures produce forgettable blends. Choose boldly, or return to the beginning.",
    portrait: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "botanist",
    name: "Doña Rosa",
    flag: "\u{1F1EA}\u{1F1E8}",
    origin: "Ecuador",
    style: "Highland Shade Cultivation",
    bio: "Cultivates under equatorial clouds producing ultra-silky, cream-forward wrappers with rare botanical nuance. Her profiles are floral, refined, and deceptively powerful.",
    tag: "THE HIGHLAND BOTANIST",
    soilAffinity: "alluvial" as const,
    guidance: "Beneath Andean clouds, I learned that complexity is earned through restraint. Study what is before you carefully — the elegant answer is rarely the obvious one. In the highlands, we trust the process, and the process rewards only those who listen.",
    portrait: "https://images.unsplash.com/photo-1511113202302-ef60000a6e87?auto=format&fit=crop&w=600&q=80",
  },
];

export const SEEDS = [
  { id: "corojo",  name: "Corojo Premium", detail: "Robust, spicy intensity with classic rich pepper notes and long-leaf burn character." },
  { id: "criollo", name: "Criollo '98",    detail: "Earthy, smooth complexity balancing wood, sweet cream, and refined body." },
];

export const SOILS = [
  { id: "volcanic", name: "Volcanic Ash",    region: "Estelí, Nicaragua", detail: "High mineral composition giving intense spice and deep structural strength." },
  { id: "alluvial", name: "Alluvial Valley", region: "Cibao, D.R.",        detail: "Nutrient-dense loam creating silky wrapper leaves and refined, mellow body." },
];

export type GatewayPhase =
  | "cockpit" | "intro" | "orientation" | "mentor" | "mentor_philosophy"
  | "terroir" | "seed_biology" | "cultivation" | "gate_movement_1"
  | "harvest" | "curing" | "rolling_bench" | "priming_matrix"
  | "gate_movement_2" | "vitola_science" | "gate_movement_3" | "blending";

export type XPFloat = { id: number; amount: number; x: number; y: number };

export type Sel = {
  leaf?:    typeof LEAVES[0];
  wrapper?: typeof WRAPPERS[0];
  vitola?:  typeof VITOLAS[0];
  cut?:     typeof CUTS[0];
};

export interface PairingResult {
  alchemyText:     string;
  descriptors:     string[];
  confidence:      number;
  primaryCategory: string;
  spiritPairings:  { id: string; name: string; priceCents: number | null; imageUrl: string | null; category: string }[];
  beerPairings:    { id: string; name: string; priceCents: number | null; imageUrl: string | null; category: string }[];
  staffNudge: {
    flavorProfile:    string;
    confidenceScore:  number;
    suggestedWording: string;
    upsellLine:       string;
  };
  mentorLines: string[];
}
