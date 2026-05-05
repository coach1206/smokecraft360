/**
 * Demo Safe Mode — SmokeCraft 360
 *
 * Set DEMO_MODE = false to connect to the real backend (production default).
 * Set DEMO_MODE = true to enable the full demo experience:
 *  - No real Stripe calls — payments are simulated
 *  - API failures fall back to rich mock data
 *  - Dashboard shows impressive sample analytics & orders
 *  - "Demo Mode Active" badge is shown in the UI
 */

// ── Toggle ────────────────────────────────────────────────────────────────────
export const DEMO_MODE = false;

// ── Mock recommendation data (used as fallback when API is unavailable) ────────
export const DEMO_RECOMMENDATIONS = {
  recommendations: [
    {
      id: "demo-cigar-001",
      name: "Arturo Fuente Opus X",
      category: "cigar" as const,
      flavorNotes: ["cedar", "leather", "smoky", "earthy"],
      strength: 4,
      moodTags: ["sophisticated", "relaxed"],
      pairingTags: ["whiskey", "cognac"],
      score: 98,
      tier: "premium" as const,
      boostApplied: 0,
      boostLevel: 3,
      sponsored: true,
    },
    {
      id: "demo-cigar-002",
      name: "Padron 1964 Anniversary",
      category: "cigar" as const,
      flavorNotes: ["cocoa", "cedar", "spicy", "leather"],
      strength: 4,
      moodTags: ["celebratory", "refined"],
      pairingTags: ["rum", "bourbon"],
      score: 95,
      tier: "premium" as const,
      boostApplied: 0,
      boostLevel: 2,
      sponsored: false,
    },
    {
      id: "demo-cigar-003",
      name: "Cohiba Behike 52",
      category: "cigar" as const,
      flavorNotes: ["earthy", "creamy", "cedar", "nutty"],
      strength: 3,
      moodTags: ["indulgent", "relaxed"],
      pairingTags: ["scotch", "brandy"],
      score: 93,
      tier: "premium" as const,
      boostApplied: 0,
      boostLevel: 1,
      sponsored: false,
    },
    {
      id: "demo-cigar-004",
      name: "Liga Privada No. 9",
      category: "cigar" as const,
      flavorNotes: ["smoky", "leather", "spicy", "cedar"],
      strength: 5,
      moodTags: ["bold", "focused"],
      pairingTags: ["bourbon", "rye"],
      score: 91,
      tier: "premium" as const,
      boostApplied: 0,
      boostLevel: 1,
      sponsored: false,
    },
  ],
  pairings: [
    {
      id: "demo-spirit-001",
      name: "Macallan 18 Sherry Oak",
      category: "alcohol" as const,
      flavorNotes: ["dried fruit", "spice", "wood", "vanilla"],
      strength: 4,
      moodTags: ["sophisticated", "relaxed"],
      pairingTags: ["cigar", "dessert"],
      score: 97,
      tier: "premium" as const,
      boostApplied: 0,
      boostLevel: 2,
      sponsored: true,
    },
    {
      id: "demo-spirit-002",
      name: "Balvenie DoubleWood 17",
      category: "alcohol" as const,
      flavorNotes: ["honey", "vanilla", "oak", "creamy"],
      strength: 3,
      moodTags: ["smooth", "celebratory"],
      pairingTags: ["cigar", "chocolate"],
      score: 94,
      tier: "premium" as const,
      boostApplied: 0,
      boostLevel: 1,
      sponsored: false,
    },
    {
      id: "demo-spirit-003",
      name: "Glenfiddich 21 Reserve",
      category: "alcohol" as const,
      flavorNotes: ["tropical fruit", "spice", "caramel", "oak"],
      strength: 3,
      moodTags: ["indulgent", "exotic"],
      pairingTags: ["light cigar", "cheese"],
      score: 90,
      tier: "premium" as const,
      boostApplied: 0,
      boostLevel: 0,
      sponsored: false,
    },
  ],
  foodPairings: [
    {
      id: "demo-food-001",
      name: "Wagyu Beef Sliders",
      category: "steak" as const,
      description: "Japanese A5 wagyu on brioche with truffle aioli and aged cheddar.",
      flavorTags: ["rich", "umami", "buttery"],
      strengthMin: 3,
      strengthMax: 5,
      score: 96,
    },
    {
      id: "demo-food-002",
      name: "Truffle Arancini",
      category: "appetizers" as const,
      description: "Crispy risotto balls with black truffle, mozzarella, and parmesan.",
      flavorTags: ["earthy", "creamy", "crispy"],
      strengthMin: 2,
      strengthMax: 4,
      score: 92,
    },
    {
      id: "demo-food-003",
      name: "Aged Gouda & Honeycomb",
      category: "appetizers" as const,
      description: "24-month Gouda with raw honeycomb, candied walnuts, and fig jam.",
      flavorTags: ["sweet", "nutty", "tangy"],
      strengthMin: 1,
      strengthMax: 3,
      score: 88,
    },
    {
      id: "demo-food-004",
      name: "Smoked Salmon Crostini",
      category: "appetizers" as const,
      description: "House-smoked Atlantic salmon on sourdough with crème fraîche and capers.",
      flavorTags: ["smoky", "briny", "delicate"],
      strengthMin: 1,
      strengthMax: 2,
      score: 84,
    },
  ],
  featured: [
    {
      id: "demo-cigar-001",
      name: "Arturo Fuente Opus X",
      category: "cigar" as const,
      flavorNotes: ["cedar", "leather", "smoky"],
      strength: 4,
      moodTags: ["sophisticated"],
      pairingTags: ["whiskey"],
      score: 98,
      tier: "premium" as const,
      boostApplied: 0,
      boostLevel: 3,
      sponsored: true,
    },
  ],
};

// ── Demo orders for dashboard simulation ──────────────────────────────────────
const now = Date.now();
export const DEMO_ORDERS = [
  {
    id: "demo-order-aa1b-c2d3",
    venueId: "default",
    cigarName: "Padron 1964 Anniversary",
    drinkName: "Macallan 18 Sherry Oak",
    foodName:  "Wagyu Beef Sliders",
    orderType: "pickup"  as const,
    status:    "pending" as const,
    createdAt: new Date(now - 4  * 60_000).toISOString(),
    updatedAt: new Date(now - 4  * 60_000).toISOString(),
  },
  {
    id: "demo-order-bb2c-d3e4",
    venueId:   "default",
    cigarName: "Arturo Fuente Opus X",
    drinkName: "Balvenie DoubleWood 17",
    orderType: "delivery"    as const,
    status:    "in_progress" as const,
    createdAt: new Date(now - 14 * 60_000).toISOString(),
    updatedAt: new Date(now - 9  * 60_000).toISOString(),
  },
  {
    id: "demo-order-cc3d-e4f5",
    venueId:     "default",
    cigarName:   "Cohiba Behike 52",
    drinkName:   "Glenfiddich 21 Reserve",
    foodName:    "Truffle Arancini",
    orderType:   "table"     as const,
    status:      "completed" as const,
    tableNumber: "7",
    createdAt: new Date(now - 41 * 60_000).toISOString(),
    updatedAt: new Date(now - 34 * 60_000).toISOString(),
  },
  {
    id: "demo-order-dd4e-f5g6",
    venueId:     "default",
    cigarName:   "Liga Privada No. 9",
    foodName:    "Aged Gouda & Honeycomb",
    orderType:   "table"     as const,
    status:      "completed" as const,
    tableNumber: "12",
    createdAt: new Date(now - 55 * 60_000).toISOString(),
    updatedAt: new Date(now - 48 * 60_000).toISOString(),
  },
  {
    id: "demo-order-ee5f-g6h7",
    venueId:   "default",
    cigarName: "Padron 1964 Anniversary",
    drinkName: "Macallan 18 Sherry Oak",
    orderType: "pickup"     as const,
    status:    "completed"  as const,
    createdAt: new Date(now - 88 * 60_000).toISOString(),
    updatedAt: new Date(now - 80 * 60_000).toISOString(),
  },
];

// ── Demo analytics data for dashboard ─────────────────────────────────────────
export const DEMO_ANALYTICS = {
  summary: {
    totalProducts:        24,
    boostedProducts:       6,
    sponsoredProducts:     3,
    totalImpressions:   1842,
    sponsoredImpressions: 412,
    featuredImpressions:  318,
  },
  topPerformers: [
    { id: "demo-cigar-001", name: "Arturo Fuente Opus X",    category: "cigar",   tier: "premium", boostLevel: 3, sponsored: true,  brandId: undefined, campaignId: undefined, impressions: 584, featuredImpressions: 142 },
    { id: "demo-cigar-002", name: "Padron 1964 Anniversary", category: "cigar",   tier: "premium", boostLevel: 2, sponsored: false, brandId: undefined, campaignId: undefined, impressions: 421, featuredImpressions: 98  },
    { id: "demo-spirit-001",name: "Macallan 18 Sherry Oak",  category: "alcohol", tier: "premium", boostLevel: 2, sponsored: true,  brandId: undefined, campaignId: undefined, impressions: 387, featuredImpressions: 78  },
    { id: "demo-cigar-003", name: "Cohiba Behike 52",        category: "cigar",   tier: "premium", boostLevel: 1, sponsored: false, brandId: undefined, campaignId: undefined, impressions: 264, featuredImpressions: 0   },
    { id: "demo-spirit-002",name: "Balvenie DoubleWood 17",  category: "alcohol", tier: "premium", boostLevel: 1, sponsored: false, brandId: undefined, campaignId: undefined, impressions: 186, featuredImpressions: 0   },
  ],
  sponsored: [
    { id: "demo-cigar-001",  name: "Arturo Fuente Opus X",   category: "cigar",   tier: "premium", boostLevel: 3, sponsored: true, brandId: "fuente",   campaignId: "fx-spring-26", impressions: 584, featuredImpressions: 142 },
    { id: "demo-spirit-001", name: "Macallan 18 Sherry Oak", category: "alcohol", tier: "premium", boostLevel: 2, sponsored: true, brandId: "macallan", campaignId: "mac-vip-26",   impressions: 387, featuredImpressions: 78  },
    { id: "demo-cigar-002",  name: "Padron 1964",            category: "cigar",   tier: "premium", boostLevel: 2, sponsored: true, brandId: "padron",   campaignId: "padron-26",     impressions: 268, featuredImpressions: 98  },
  ],
};

// ── Client-side reset ─────────────────────────────────────────────────────────
/** Clears all SmokeCraft localStorage keys used for user profile and caches. */
export function clearDemoLocalState(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("smokecraft") || key.startsWith("sc_"))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}
