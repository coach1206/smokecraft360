import { Product } from "../engine/types";

/**
 * Sample dataset for cigars.
 * Each entry conforms to the shared Product interface.
 * Add more entries here to expand the catalog without touching engine logic.
 */
export const cigars: Product[] = [
  {
    id: "cigar-001",
    name: "Arturo Fuente Hemingway",
    category: "cigar",
    flavorNotes: ["cedar", "cream", "nutty", "sweet"],
    strength: 2,
    moodTags: ["relaxed", "reflective", "social"],
    pairingTags: ["rum", "cognac", "light-whiskey"],
  },
  {
    id: "cigar-002",
    name: "Padron 1964 Anniversary",
    category: "cigar",
    flavorNotes: ["cocoa", "earthy", "smoky", "sweet"],
    strength: 3,
    moodTags: ["social", "celebratory", "relaxed"],
    pairingTags: ["bourbon", "dark-rum", "port"],
  },
  {
    id: "cigar-003",
    name: "Liga Privada No. 9",
    category: "cigar",
    flavorNotes: ["dark-chocolate", "espresso", "leather", "smoky"],
    strength: 4,
    moodTags: ["bold", "focused", "intense"],
    pairingTags: ["bourbon", "rye-whiskey", "mezcal"],
  },
  {
    id: "cigar-004",
    name: "Oliva Serie V Melanio",
    category: "cigar",
    flavorNotes: ["spicy", "pepper", "leather", "cedar"],
    strength: 4,
    moodTags: ["bold", "adventurous", "intense"],
    pairingTags: ["scotch", "rye-whiskey", "amaro"],
  },
  {
    id: "cigar-005",
    name: "Rocky Patel Vintage 1992",
    category: "cigar",
    flavorNotes: ["honey", "sweet", "nutty", "floral"],
    strength: 2,
    moodTags: ["relaxed", "reflective", "social"],
    pairingTags: ["light-whiskey", "rum", "cognac"],
  },
];
