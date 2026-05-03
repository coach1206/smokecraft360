import { Product } from "../engine/types";

/**
 * Beer registry — third category alongside cigar and alcohol.
 *
 * Powers BrewCraft (beer-led) journeys plus cross-pairings: a beer
 * recommendation will surface a cigar pairing via engine/pairing.ts and
 * vice-versa.
 *
 * Tagging conventions (kept aligned with cigars.ts / alcohol.ts so the
 * keyword-based scorer + pairing engine pick them up automatically):
 *   • flavorNotes  — reuse the shared vocabulary
 *                    (sweet, caramel, fruity, citrus, dark-chocolate,
 *                     cocoa, smoky, oak, nutty, cream, light, crisp,
 *                     toasted, hoppy, floral, spicy, pepper)
 *   • pairingTags  — describe the cigar archetype this beer flatters
 *                    (e.g. "mild cigar", "medium-body cigar",
 *                     "full-body cigar", "earthy cigar", "creamy cigar")
 *   • strength     — 1 (sessionable) … 5 (imperial / barrel-aged)
 *
 * Lineup covers the four BrewCraft style buckets exposed on the
 * swipe-card page (Light, Amber, IPA, Dark) with at least two products
 * per bucket so the engine has room to score and rotate.
 */
export const beer: Product[] = [
  // ── Light & Easy ──────────────────────────────────────────────────────
  {
    id: "beer-001",
    name: "Corona Extra",
    category: "beer",
    flavorNotes: ["light", "crisp", "citrus", "sweet"],
    strength: 1,
    moodTags: ["relaxed", "social", "celebratory"],
    pairingTags: ["mild cigar", "creamy cigar", "sweet cigar"],
    tier: "standard",
    boostLevel: 0,
    sponsored: false,
  },
  {
    id: "beer-002",
    name: "Modelo Especial",
    category: "beer",
    flavorNotes: ["light", "crisp", "sweet", "floral"],
    strength: 1,
    moodTags: ["relaxed", "social"],
    pairingTags: ["mild cigar", "sweet cigar"],
    tier: "standard",
    boostLevel: 0,
    sponsored: false,
  },

  // ── Toasted & Balanced (Amber / Lager) ────────────────────────────────
  {
    id: "beer-003",
    name: "Samuel Adams Boston Lager",
    category: "beer",
    flavorNotes: ["caramel", "oak", "sweet", "nutty", "toasted"],
    strength: 2,
    moodTags: ["social", "relaxed", "reflective"],
    pairingTags: ["medium-body cigar", "sweet cigar", "nutty cigar"],
    tier: "mid",
    boostLevel: 0,
    sponsored: false,
  },
  {
    id: "beer-004",
    name: "Yuengling Traditional Lager",
    category: "beer",
    flavorNotes: ["caramel", "sweet", "nutty", "oak"],
    strength: 2,
    moodTags: ["social", "reflective"],
    pairingTags: ["mild cigar", "medium-body cigar", "nutty cigar"],
    tier: "standard",
    boostLevel: 0,
    sponsored: false,
  },

  // ── Bold & Hoppy (IPA / Pale Ale) ─────────────────────────────────────
  {
    id: "beer-005",
    name: "Lagunitas IPA",
    category: "beer",
    flavorNotes: ["citrus", "fruity", "spicy", "floral", "pepper"],
    strength: 3,
    moodTags: ["bold", "adventurous", "celebratory"],
    pairingTags: ["medium-body cigar", "spicy cigar"],
    tier: "mid",
    boostLevel: 0,
    sponsored: false,
  },
  {
    id: "beer-006",
    name: "Sierra Nevada Pale Ale",
    category: "beer",
    flavorNotes: ["fruity", "floral", "spicy", "citrus"],
    strength: 3,
    moodTags: ["bold", "social", "adventurous"],
    pairingTags: ["medium-body cigar", "spicy cigar"],
    tier: "standard",
    boostLevel: 0,
    sponsored: false,
  },

  // ── Dark & Heavy (Stout / Porter) ─────────────────────────────────────
  {
    id: "beer-007",
    name: "Guinness Draught",
    category: "beer",
    flavorNotes: ["dark-chocolate", "cocoa", "smoky", "cream", "sweet"],
    strength: 3,
    moodTags: ["focused", "reflective", "intense"],
    pairingTags: ["full-body cigar", "earthy cigar", "dark cigar"],
    tier: "premium",
    boostLevel: 0,
    sponsored: false,
  },
  {
    id: "beer-008",
    name: "Founders Porter",
    category: "beer",
    flavorNotes: ["dark-chocolate", "cocoa", "smoky", "oak"],
    strength: 4,
    moodTags: ["bold", "intense", "focused"],
    pairingTags: ["full-body cigar", "earthy cigar", "dark cigar", "leather cigar"],
    tier: "mid",
    boostLevel: 0,
    sponsored: false,
  },
];
