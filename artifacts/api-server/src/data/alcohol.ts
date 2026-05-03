import { Product } from "../engine/types";

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
    boostLevel: 0,
    sponsored: false,
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
    boostLevel: 0,
    sponsored: false,
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
    boostLevel: 2,
    sponsored: true,
    brandId: "beam-suntory",
    campaignId: "knob-creek-q2-2026",
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
    boostLevel: 0,
    sponsored: false,
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
    boostLevel: 1,
    sponsored: false,
  },
  // ── House Signature Pairings (per brief) ──────────────────────────────
  // Adding the drinks side of SmokeCraft's named pairings so the
  // recommendation engine has more premium spirits to pull from. Each
  // entry's flavor/strength/pairing tags are chosen to hook into existing
  // rules in engine/pairing.ts so no engine changes are required:
  //   • "vanilla|caramel|sweet|fruity" + strength≤3 → mild/medium cigars
  //   • "smoky|peaty|maritime"                       → earthy/full-body cigars
  //   • strength≥4                                   → full-body, bold cigars
  // Keep alc-006…alc-010 ID range stable so future seeders/tests can
  // reference them.
  {
    // "The Boss Session" — caramel/oak/pepper bourbon, top-seller energy
    id: "alc-006",
    name: "Blanton's Single Barrel Bourbon",
    category: "alcohol",
    flavorNotes: ["caramel", "oak", "spicy", "pepper", "vanilla"],
    strength: 3,
    moodTags: ["bold", "celebratory", "focused"],
    pairingTags: ["medium-body cigar", "habano", "spicy cigar", "sweet cigar"],
    tier: "premium",
    boostLevel: 0,
    sponsored: false,
  },
  {
    // "Midnight Legacy" — sherry-cask single malt for the storytelling tier
    id: "alc-007",
    name: "Macallan 12 Year Single Malt",
    category: "alcohol",
    flavorNotes: ["dark-chocolate", "fruity", "smoky", "oak", "sweet"],
    strength: 3,
    moodTags: ["reflective", "relaxed", "focused"],
    pairingTags: ["medium-body cigar", "maduro", "earthy cigar", "dark cigar"],
    tier: "premium",
    boostLevel: 0,
    sponsored: false,
  },
  {
    // "Luxury Flex" — high-ticket cognac for VIP / celebration moments
    id: "alc-008",
    name: "Hennessy XO Cognac",
    category: "alcohol",
    flavorNotes: ["fruity", "spicy", "vanilla", "oak", "sweet"],
    strength: 3,
    moodTags: ["celebratory", "bold", "social"],
    pairingTags: ["medium-body cigar", "sweet cigar", "nutty cigar"],
    tier: "premium",
    boostLevel: 0,
    sponsored: false,
  },
  {
    // "The Sweet Escape" — wheated bourbon with honey/cinnamon profile
    id: "alc-009",
    name: "Maker's Mark 46 Bourbon",
    category: "alcohol",
    flavorNotes: ["caramel", "sweet", "vanilla", "oak", "fruity"],
    strength: 2,
    moodTags: ["relaxed", "social", "reflective"],
    pairingTags: ["mild cigar", "medium-body cigar", "sweet cigar", "creamy cigar"],
    tier: "premium",
    boostLevel: 0,
    sponsored: false,
  },
  {
    // "The Dark Room" — Islay peat monster, edgy strong-cigar pairing only
    id: "alc-010",
    name: "Ardbeg 10 Year Scotch",
    category: "alcohol",
    flavorNotes: ["smoky", "peaty", "maritime", "dark-chocolate"],
    strength: 5,
    moodTags: ["bold", "intense", "focused"],
    pairingTags: ["full-body cigar", "earthy cigar", "dark cigar", "leather cigar"],
    tier: "premium",
    boostLevel: 0,
    sponsored: false,
  },
];
