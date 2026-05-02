import { Product } from "../engine/types";

/**
 * Sample dataset for alcohol products (whiskey, bourbon, etc.).
 * Each entry conforms to the shared Product interface.
 * Add more entries or sub-categories (rum, cognac, mezcal) without touching engine logic.
 */
export const alcohol: Product[] = [
  {
    id: "alc-001",
    name: "Buffalo Trace Bourbon",
    category: "alcohol",
    flavorNotes: ["vanilla", "caramel", "sweet", "oak"],
    strength: 3,
    moodTags: ["relaxed", "social", "celebratory"],
    pairingTags: ["medium-body cigar", "mild cigar", "sweet cigar"],
    tier: "mid",
  },
  {
    id: "alc-002",
    name: "Maker's Mark Bourbon",
    category: "alcohol",
    flavorNotes: ["caramel", "wheat", "sweet", "fruity"],
    strength: 2,
    moodTags: ["relaxed", "social", "reflective"],
    pairingTags: ["mild cigar", "sweet cigar", "creamy cigar"],
    tier: "standard",
  },
  {
    id: "alc-003",
    name: "Knob Creek Rye",
    category: "alcohol",
    flavorNotes: ["spicy", "pepper", "oak", "smoky"],
    strength: 4,
    moodTags: ["bold", "intense", "adventurous"],
    pairingTags: ["full-body cigar", "spicy cigar", "leather cigar"],
    tier: "mid",
  },
  {
    id: "alc-004",
    name: "Lagavulin 16 Scotch",
    category: "alcohol",
    flavorNotes: ["smoky", "peaty", "maritime", "dark-chocolate"],
    strength: 5,
    moodTags: ["bold", "intense", "focused"],
    pairingTags: ["full-body cigar", "earthy cigar", "dark cigar"],
    tier: "premium",
  },
  {
    id: "alc-005",
    name: "Woodford Reserve Bourbon",
    category: "alcohol",
    flavorNotes: ["vanilla", "cocoa", "fruity", "spicy"],
    strength: 3,
    moodTags: ["celebratory", "social", "bold"],
    pairingTags: ["medium-body cigar", "sweet cigar", "nutty cigar"],
    tier: "premium",
  },
];
