/**
 * RitualConfig — Sessions 02-07 of the 14-step Sovereign Ritual
 * NOVEE OS · E.A.T. Framework · Profound Innovations
 *
 * Steps 2–7 run between TerroirArchitecture (Session 01) and the
 * Draw Engineering scene (Session 08), building the physical blueprint
 * of the guest's sovereign blend before any flavor preference is taken.
 */

export interface RitualOption {
  id:          string;
  name:        string;
  badge:       string;
  accentHex:   string;     // used for top-rule gradient + card tint
  specs:       { label: string; value: string }[];
  signature:   string;
  keywords:    string[];
}

export interface RitualStepConfig {
  step:          number;   // 2–7
  session:       string;   // "SESSION 02"
  sessionTitle:  string;   // "THE CURATOR"
  displayTitle:  string;   // "CURING CHAMBER"
  subtitle:      string;
  lockVerb:      string;   // "LOCK CURING"
  proceedLabel:  string;   // "PROCEED TO FERMENTATION"
  field:         keyof RitualData;
  options:       RitualOption[];
}

export interface RitualData {
  curing?:       string;
  fermentation?: string;
  vitola?:       string;
  wrapper?:      string;
  binder?:       string;
  filler?:       string;
}

export const RITUAL_STEPS: RitualStepConfig[] = [

  /* ── SESSION 02 · THE CURATOR ───────────────────────────────────── */
  {
    step:         2,
    session:      "SESSION 02",
    sessionTitle: "THE CURATOR",
    displayTitle: "CURING CHAMBER",
    subtitle:     "Select the method that transforms raw leaf into refined character",
    lockVerb:     "LOCK CURING",
    proceedLabel: "PROCEED TO FERMENTATION",
    field:        "curing",
    options: [
      {
        id:        "sun",
        name:      "Sun-Cured",
        badge:     "CARIBBEAN TRADITION",
        accentHex: "#9A7218",
        specs: [
          { label: "Duration",   value: "6–8 Weeks" },
          { label: "Climate",    value: "Tropical Humidity" },
          { label: "Character",  value: "Natural Oils Preserved" },
        ],
        signature: "The sun draws sweetness upward through the leaf — every ray is a brushstroke of flavor.",
        keywords:  ["Sun", "Natural", "Sweet"],
      },
      {
        id:        "air",
        name:      "Air-Cured",
        badge:     "BARN-DRIED",
        accentHex: "#6A5230",
        specs: [
          { label: "Duration",  value: "4–8 Weeks" },
          { label: "Method",    value: "Open Barn Ventilation" },
          { label: "Character", value: "Mild & Slightly Sweet" },
        ],
        signature: "Time and air conspire to remove harshness and preserve the leaf's natural elegance.",
        keywords:  ["Smooth", "Balanced", "Honey"],
      },
      {
        id:        "fire",
        name:      "Fire-Cured",
        badge:     "SMOKED OAK",
        accentHex: "#5A2C10",
        specs: [
          { label: "Duration",  value: "3–8 Weeks" },
          { label: "Fuel",      value: "Hickory & Oak Hardwood" },
          { label: "Character", value: "Bold & Smoky" },
        ],
        signature: "The smoke does not mask — it layers. Each hour of curing etches complexity into the leaf.",
        keywords:  ["Bold", "Smoky", "Strong"],
      },
      {
        id:        "flue",
        name:      "Flue-Cured",
        badge:     "PIPE-HEATED PRECISION",
        accentHex: "#46392A",
        specs: [
          { label: "Duration",  value: "5–7 Days" },
          { label: "Method",    value: "Indirect Radiant Heat" },
          { label: "Character", value: "Clean & Bright" },
        ],
        signature: "Engineered heat without smoke yields a clarity of character unmatched by any other method.",
        keywords:  ["Clean", "Bright", "Refined"],
      },
    ],
  },

  /* ── SESSION 03 · THE ALCHEMIST ─────────────────────────────────── */
  {
    step:         3,
    session:      "SESSION 03",
    sessionTitle: "THE ALCHEMIST",
    displayTitle: "FERMENTATION VAULT",
    subtitle:     "Choose the transformation that unlocks depth within the cured leaf",
    lockVerb:     "LOCK FERMENTATION",
    proceedLabel: "PROCEED TO VITOLA",
    field:        "fermentation",
    options: [
      {
        id:        "pilon",
        name:      "Pilón Method",
        badge:     "CUBAN TRADITION",
        accentHex: "#8A6022",
        specs: [
          { label: "Origin",    value: "Havana, Cuba" },
          { label: "Phases",    value: "3-Phase Stack Rotation" },
          { label: "Duration",  value: "6–18 Months" },
        ],
        signature: "The pilón is not a process — it is a philosophy. The leaf becomes what the master intends.",
        keywords:  ["Traditional", "Complex", "Cuban"],
      },
      {
        id:        "box_press",
        name:      "Box Press",
        badge:     "DOMINICAN CRAFT",
        accentHex: "#664520",
        specs: [
          { label: "Origin",    value: "Santiago, DR" },
          { label: "Method",    value: "Cool-Temperature Pressing" },
          { label: "Duration",  value: "3–12 Months" },
        ],
        signature: "Slow fermentation at lower temperatures preserves nuance — the restraint of a true maestro.",
        keywords:  ["Smooth", "Subtle", "Dominican"],
      },
      {
        id:        "tropical",
        name:      "Tropical Heat",
        badge:     "NICARAGUAN BOLD",
        accentHex: "#7A3010",
        specs: [
          { label: "Origin",    value: "Jalapa, Nicaragua" },
          { label: "Method",    value: "High-Heat Acceleration" },
          { label: "Duration",  value: "2–6 Months" },
        ],
        signature: "Heat is the accelerant of character. Maximum ammonia purge yields a raw, uncompromising smoke.",
        keywords:  ["Intense", "Bold", "Nicaraguan"],
      },
      {
        id:        "alpine",
        name:      "Alpine Method",
        badge:     "SLOW MATURATION",
        accentHex: "#304030",
        specs: [
          { label: "Climate",   value: "High-Altitude Cool" },
          { label: "Method",    value: "Extended Low-Temp Rest" },
          { label: "Duration",  value: "12–24 Months" },
        ],
        signature: "Mountain air and patience yield a smoke so clean it reveals the terroir with crystalline clarity.",
        keywords:  ["Clean", "Pure", "Aged"],
      },
    ],
  },

  /* ── SESSION 04 · THE ARCHITECT ─────────────────────────────────── */
  {
    step:         4,
    session:      "SESSION 04",
    sessionTitle: "THE ARCHITECT",
    displayTitle: "VITOLA SELECTION",
    subtitle:     "The format is the first expression of your intent",
    lockVerb:     "LOCK FORMAT",
    proceedLabel: "PROCEED TO WRAPPER",
    field:        "vitola",
    options: [
      {
        id:        "robusto",
        name:      "Robusto",
        badge:     "5″ × 50",
        accentHex: "#7A5220",
        specs: [
          { label: "Length",    value: "5 inches" },
          { label: "Ring Gauge", value: "50" },
          { label: "Burn Time", value: "45–60 min" },
        ],
        signature: "The Robusto is the sommelier's choice — maximum flavor density in a refined timeframe.",
        keywords:  ["Classic", "Balanced", "Power"],
      },
      {
        id:        "toro",
        name:      "Toro",
        badge:     "6″ × 52",
        accentHex: "#664020",
        specs: [
          { label: "Length",     value: "6 inches" },
          { label: "Ring Gauge", value: "52" },
          { label: "Burn Time",  value: "60–80 min" },
        ],
        signature: "The Toro invites you to slow down, settle in, and allow the blend to reveal itself in chapters.",
        keywords:  ["Extended", "Full", "Generous"],
      },
      {
        id:        "churchill",
        name:      "Churchill",
        badge:     "7″ × 48",
        accentHex: "#503414",
        specs: [
          { label: "Length",     value: "7 inches" },
          { label: "Ring Gauge", value: "48" },
          { label: "Burn Time",  value: "90–120 min" },
        ],
        signature: "Named for a statesman who understood that great cigars, like great ideas, require space to breathe.",
        keywords:  ["Grand", "Prestigious", "Ceremonial"],
      },
      {
        id:        "belicoso",
        name:      "Belicoso",
        badge:     "5.25″ × 52",
        accentHex: "#6A4E22",
        specs: [
          { label: "Length",     value: "5.25 inches" },
          { label: "Ring Gauge", value: "52 (tapered)" },
          { label: "Burn Time",  value: "50–70 min" },
        ],
        signature: "The tapered head creates a draw that evolves — beginning precise, opening into fullness.",
        keywords:  ["Tapered", "Complex", "Artisan"],
      },
    ],
  },

  /* ── SESSION 05 · THE DRESSER ───────────────────────────────────── */
  {
    step:         5,
    session:      "SESSION 05",
    sessionTitle: "THE DRESSER",
    displayTitle: "WRAPPER SELECTION",
    subtitle:     "The wrapper leaf defines the first and last impression",
    lockVerb:     "LOCK WRAPPER",
    proceedLabel: "PROCEED TO BINDER",
    field:        "wrapper",
    options: [
      {
        id:        "claro",
        name:      "Colorado Claro",
        badge:     "LIGHT HONEY",
        accentHex: "#C09A18",
        specs: [
          { label: "Color",     value: "Light Golden Brown" },
          { label: "Origin",    value: "Connecticut Shade" },
          { label: "Character", value: "Mild, Creamy Sweetness" },
        ],
        signature: "The lightest wrapper carries the most delicate aromatics — a whisper before the cigar speaks.",
        keywords:  ["Light", "Creamy", "Mild"],
      },
      {
        id:        "natural",
        name:      "Natural",
        badge:     "CLASSIC MID",
        accentHex: "#8A6822",
        specs: [
          { label: "Color",     value: "Medium Caramel Brown" },
          { label: "Origin",    value: "Multiple Regions" },
          { label: "Character", value: "Balanced, Universal" },
        ],
        signature: "The Natural is the great diplomat of wrappers — it never dominates, always elevates.",
        keywords:  ["Balanced", "Versatile", "Classic"],
      },
      {
        id:        "colorado",
        name:      "Colorado Maduro",
        badge:     "SEMI-SWEET",
        accentHex: "#784418",
        specs: [
          { label: "Color",         value: "Reddish Deep Brown" },
          { label: "Fermentation",  value: "Extended" },
          { label: "Character",     value: "Rich, Semi-Sweet" },
        ],
        signature: "Between the natural and the maduro lies a territory of complexity few wrappers can claim.",
        keywords:  ["Rich", "Complex", "Semi-Sweet"],
      },
      {
        id:        "maduro",
        name:      "Maduro",
        badge:     "DARK CHOCOLATE",
        accentHex: "#4A2414",
        specs: [
          { label: "Color",         value: "Dark Chocolate Brown" },
          { label: "Fermentation",  value: "Double-Fermented" },
          { label: "Character",     value: "Sweet, Full Body" },
        ],
        signature: "The maduro is patience made visible — months of extended fermentation yield profound sweetness.",
        keywords:  ["Dark", "Sweet", "Full"],
      },
    ],
  },

  /* ── SESSION 06 · THE BINDER ────────────────────────────────────── */
  {
    step:         6,
    session:      "SESSION 06",
    sessionTitle: "THE BINDER",
    displayTitle: "BINDER MATRIX",
    subtitle:     "The invisible architect of your smoke's structure",
    lockVerb:     "LOCK BINDER",
    proceedLabel: "PROCEED TO FILLER",
    field:        "binder",
    options: [
      {
        id:        "dominican",
        name:      "Dominican",
        badge:     "CREAMY BACKBONE",
        accentHex: "#886030",
        specs: [
          { label: "Region",    value: "Cibao Valley, DR" },
          { label: "Character", value: "Smooth & Creamy" },
          { label: "Body",      value: "Light to Medium" },
        ],
        signature: "Dominican binders are chosen by masters who want the filler to speak — the binder simply listens.",
        keywords:  ["Smooth", "Neutral", "Dominican"],
      },
      {
        id:        "nicaraguan",
        name:      "Nicaraguan",
        badge:     "FULL STRUCTURE",
        accentHex: "#782C14",
        specs: [
          { label: "Region",    value: "Jalapa & Estelí" },
          { label: "Character", value: "Spicy, Full-Bodied" },
          { label: "Body",      value: "Full" },
        ],
        signature: "The Nicaraguan binder asserts itself — it does not serve the filler, it challenges it.",
        keywords:  ["Bold", "Spicy", "Full"],
      },
      {
        id:        "honduran",
        name:      "Honduran",
        badge:     "EARTHY DEPTH",
        accentHex: "#524022",
        specs: [
          { label: "Region",    value: "Jamastran Valley" },
          { label: "Character", value: "Earthy, Woody" },
          { label: "Body",      value: "Medium to Full" },
        ],
        signature: "The Honduran binder brings the earth into the smoke — cedar, leather, and the forest floor.",
        keywords:  ["Earthy", "Woody", "Complex"],
      },
      {
        id:        "connecticut",
        name:      "Connecticut",
        badge:     "CLEAN BASE",
        accentHex: "#605040",
        specs: [
          { label: "Region",    value: "Connecticut River Valley" },
          { label: "Character", value: "Mild, Clean" },
          { label: "Body",      value: "Light" },
        ],
        signature: "When the blender wants silence, they reach for Connecticut — a binder that creates space.",
        keywords:  ["Clean", "Mild", "Neutral"],
      },
    ],
  },

  /* ── SESSION 07 · THE BLENDER ───────────────────────────────────── */
  {
    step:         7,
    session:      "SESSION 07",
    sessionTitle: "THE BLENDER",
    displayTitle: "FILLER COMPOSITION",
    subtitle:     "The heart of your cigar — the blend that defines the soul",
    lockVerb:     "LOCK FILLER",
    proceedLabel: "PROCEED TO DRAW ENGINEERING",
    field:        "filler",
    options: [
      {
        id:        "long_filler",
        name:      "Long Filler Purist",
        badge:     "PREMIUM BURN",
        accentHex: "#9A7022",
        specs: [
          { label: "Filler Type",   value: "100% Long Filler" },
          { label: "Burn Quality",  value: "Even, Slow" },
          { label: "Character",     value: "Maximum Complexity" },
        ],
        signature: "Whole leaves, carefully laid — no shortcuts, no compromises. The purist's path.",
        keywords:  ["Premium", "Even", "Complex"],
      },
      {
        id:        "mixed",
        name:      "Mixed Maestro",
        badge:     "70 / 30 BLEND",
        accentHex: "#785224",
        specs: [
          { label: "Long Filler",  value: "70%" },
          { label: "Short Filler", value: "30%" },
          { label: "Character",    value: "Balanced Complexity" },
        ],
        signature: "The maestro knows that balance is not compromise — it is mastery.",
        keywords:  ["Balanced", "Consistent", "Value"],
      },
      {
        id:        "ligero_heavy",
        name:      "Ligero Heavy",
        badge:     "MAXIMUM STRENGTH",
        accentHex: "#6A2010",
        specs: [
          { label: "Ligero Ratio", value: "60%+" },
          { label: "Burn Speed",   value: "Slow (Oil-Rich)" },
          { label: "Character",    value: "Full Body & Strength" },
        ],
        signature: "Ligero from the crown of the plant — kissed longest by the sun and slowest to surrender.",
        keywords:  ["Strong", "Full", "Power"],
      },
      {
        id:        "seco_dominant",
        name:      "Seco Dominant",
        badge:     "SMOOTH DRAW",
        accentHex: "#524028",
        specs: [
          { label: "Seco Ratio",  value: "50%+" },
          { label: "Combustion",  value: "Excellent" },
          { label: "Character",   value: "Smooth, Even Draw" },
        ],
        signature: "Seco burns readily and releases its character early — a smoke that greets you warmly.",
        keywords:  ["Smooth", "Easy", "Accessible"],
      },
    ],
  },
];
