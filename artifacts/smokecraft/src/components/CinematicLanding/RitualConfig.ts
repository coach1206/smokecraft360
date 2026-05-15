/**
 * RitualConfig — Sessions 02–13 of the 14-step Sovereign Ritual
 * NOVEE OS · E.A.T. Framework · Profound Innovations
 *
 * PRE_DRAW_STEPS  (2–7):  Physical blueprint — curing, fermentation,
 *                          vitola, wrapper, binder, filler.
 * POST_DRAW_STEPS (9–13): Sensory profile — flavor, strength, mood,
 *                          aging, pairing. These feed the NOVEE OS
 *                          recommendation engine via extractAPIParams().
 */

/* ── Shared types ────────────────────────────────────────────────── */

export interface RitualOption {
  id:          string;
  name:        string;
  badge:       string;
  accentHex:   string;
  specs:       { label: string; value: string }[];
  signature:   string;
  keywords:    string[];
  /** Environment state to apply when this option is selected */
  eatEnv?: {
    lighting?: "low_amber" | "warm_golden" | "cool_silver" | "deep_smoke" | "neutral";
    ambiance?: "contemplative" | "celebratory" | "social" | "ceremonial" | "neutral";
    spatial?:  "intimate" | "grand" | "estate" | "vault" | "atelier";
  };
  /** API mapping — used by extractAPIParams() for post-draw steps */
  apiMapping?: {
    flavors?:  string[];
    strength?: number;
    mood?:     string;
  };
}

export interface RitualStepConfig {
  step:          number;
  session:       string;
  sessionTitle:  string;
  displayTitle:  string;
  subtitle:      string;
  lockVerb:      string;
  proceedLabel:  string;
  field:         string;    // EATAsset key receiving the selected option id
  options:       RitualOption[];
}

/* ── Data collected by the pre-draw engine (Sessions 02–07) ─────── */
export interface RitualData {
  curing?:       string;
  fermentation?: string;
  vitola?:       string;
  wrapper?:      string;
  binder?:       string;
  filler?:       string;
}

/* ── Data collected by the post-draw engine (Sessions 09–13) ────── */
export interface PostRitualData {
  flavorProfile?:  string;
  strengthLevel?:  string;
  moodAlignment?:  string;
  aging?:          string;
  pairing?:        string;
}

/* ══════════════════════════════════════════════════════════════════
   PRE-DRAW STEPS  · Sessions 02–07
   ══════════════════════════════════════════════════════════════════ */

export const PRE_DRAW_STEPS: RitualStepConfig[] = [

  /* SESSION 02 · THE CURATOR — Curing Chamber */
  {
    step: 2, session: "SESSION 02", sessionTitle: "THE CURATOR",
    displayTitle: "CURING CHAMBER",
    subtitle: "Select the method that transforms raw leaf into refined character",
    lockVerb: "LOCK CURING", proceedLabel: "PROCEED TO FERMENTATION",
    field: "curing",
    options: [
      {
        id: "sun", name: "Sun-Cured", badge: "CARIBBEAN TRADITION",
        accentHex: "#9A7218",
        specs: [
          { label: "Duration",  value: "6–8 Weeks" },
          { label: "Climate",   value: "Tropical Humidity" },
          { label: "Character", value: "Natural Oils Preserved" },
        ],
        signature: "The sun draws sweetness upward through the leaf — every ray is a brushstroke of flavor.",
        keywords: ["Sun", "Natural", "Sweet"],
        eatEnv: { lighting: "warm_golden", ambiance: "social" },
      },
      {
        id: "air", name: "Air-Cured", badge: "BARN-DRIED",
        accentHex: "#6A5230",
        specs: [
          { label: "Duration",  value: "4–8 Weeks" },
          { label: "Method",    value: "Open Barn Ventilation" },
          { label: "Character", value: "Mild & Slightly Sweet" },
        ],
        signature: "Time and air conspire to remove harshness and preserve the leaf's natural elegance.",
        keywords: ["Smooth", "Balanced", "Honey"],
        eatEnv: { lighting: "neutral", ambiance: "contemplative" },
      },
      {
        id: "fire", name: "Fire-Cured", badge: "SMOKED OAK",
        accentHex: "#5A2C10",
        specs: [
          { label: "Duration",  value: "3–8 Weeks" },
          { label: "Fuel",      value: "Hickory & Oak Hardwood" },
          { label: "Character", value: "Bold & Smoky" },
        ],
        signature: "The smoke does not mask — it layers. Each hour of curing etches complexity into the leaf.",
        keywords: ["Bold", "Smoky", "Strong"],
        eatEnv: { lighting: "low_amber", ambiance: "ceremonial" },
      },
      {
        id: "flue", name: "Flue-Cured", badge: "PIPE-HEATED PRECISION",
        accentHex: "#46392A",
        specs: [
          { label: "Duration",  value: "5–7 Days" },
          { label: "Method",    value: "Indirect Radiant Heat" },
          { label: "Character", value: "Clean & Bright" },
        ],
        signature: "Engineered heat without smoke yields a clarity of character unmatched by any other method.",
        keywords: ["Clean", "Bright", "Refined"],
        eatEnv: { lighting: "cool_silver", ambiance: "neutral" },
      },
    ],
  },

  /* SESSION 03 · THE ALCHEMIST — Fermentation Vault */
  {
    step: 3, session: "SESSION 03", sessionTitle: "THE ALCHEMIST",
    displayTitle: "FERMENTATION VAULT",
    subtitle: "Choose the transformation that unlocks depth within the cured leaf",
    lockVerb: "LOCK FERMENTATION", proceedLabel: "PROCEED TO VITOLA",
    field: "fermentation",
    options: [
      {
        id: "pilon", name: "Pilón Method", badge: "CUBAN TRADITION",
        accentHex: "#8A6022",
        specs: [
          { label: "Origin",   value: "Havana, Cuba" },
          { label: "Phases",   value: "3-Phase Stack Rotation" },
          { label: "Duration", value: "6–18 Months" },
        ],
        signature: "The pilón is not a process — it is a philosophy. The leaf becomes what the master intends.",
        keywords: ["Traditional", "Complex", "Cuban"],
        eatEnv: { spatial: "vault", ambiance: "ceremonial" },
      },
      {
        id: "box_press", name: "Box Press", badge: "DOMINICAN CRAFT",
        accentHex: "#664520",
        specs: [
          { label: "Origin",   value: "Santiago, DR" },
          { label: "Method",   value: "Cool-Temperature Pressing" },
          { label: "Duration", value: "3–12 Months" },
        ],
        signature: "Slow fermentation at lower temperatures preserves nuance — the restraint of a true maestro.",
        keywords: ["Smooth", "Subtle", "Dominican"],
        eatEnv: { spatial: "vault", ambiance: "contemplative" },
      },
      {
        id: "tropical", name: "Tropical Heat", badge: "NICARAGUAN BOLD",
        accentHex: "#7A3010",
        specs: [
          { label: "Origin",   value: "Jalapa, Nicaragua" },
          { label: "Method",   value: "High-Heat Acceleration" },
          { label: "Duration", value: "2–6 Months" },
        ],
        signature: "Heat is the accelerant of character. Maximum ammonia purge yields a raw, uncompromising smoke.",
        keywords: ["Intense", "Bold", "Nicaraguan"],
        eatEnv: { lighting: "low_amber", spatial: "vault", ambiance: "social" },
      },
      {
        id: "alpine", name: "Alpine Method", badge: "SLOW MATURATION",
        accentHex: "#304030",
        specs: [
          { label: "Climate",  value: "High-Altitude Cool" },
          { label: "Method",   value: "Extended Low-Temp Rest" },
          { label: "Duration", value: "12–24 Months" },
        ],
        signature: "Mountain air and patience yield a smoke so clean it reveals the terroir with crystalline clarity.",
        keywords: ["Clean", "Pure", "Aged"],
        eatEnv: { lighting: "cool_silver", spatial: "vault", ambiance: "contemplative" },
      },
    ],
  },

  /* SESSION 04 · THE ARCHITECT — Vitola Selection */
  {
    step: 4, session: "SESSION 04", sessionTitle: "THE ARCHITECT",
    displayTitle: "VITOLA SELECTION",
    subtitle: "The format is the first expression of your intent",
    lockVerb: "LOCK FORMAT", proceedLabel: "PROCEED TO WRAPPER",
    field: "vitola",
    options: [
      {
        id: "robusto", name: "Robusto", badge: "5″ × 50",
        accentHex: "#7A5220",
        specs: [
          { label: "Length",     value: "5 inches" },
          { label: "Ring Gauge", value: "50" },
          { label: "Burn Time",  value: "45–60 min" },
        ],
        signature: "The Robusto is the sommelier's choice — maximum flavor density in a refined timeframe.",
        keywords: ["Classic", "Balanced", "Power"],
        eatEnv: { spatial: "intimate", ambiance: "contemplative" },
      },
      {
        id: "toro", name: "Toro", badge: "6″ × 52",
        accentHex: "#664020",
        specs: [
          { label: "Length",     value: "6 inches" },
          { label: "Ring Gauge", value: "52" },
          { label: "Burn Time",  value: "60–80 min" },
        ],
        signature: "The Toro invites you to slow down, settle in, and allow the blend to reveal itself in chapters.",
        keywords: ["Extended", "Full", "Generous"],
        eatEnv: { spatial: "grand", ambiance: "social" },
      },
      {
        id: "churchill", name: "Churchill", badge: "7″ × 48",
        accentHex: "#503414",
        specs: [
          { label: "Length",     value: "7 inches" },
          { label: "Ring Gauge", value: "48" },
          { label: "Burn Time",  value: "90–120 min" },
        ],
        signature: "Named for a statesman who understood that great cigars, like great ideas, require space to breathe.",
        keywords: ["Grand", "Prestigious", "Ceremonial"],
        eatEnv: { spatial: "grand", ambiance: "ceremonial" },
      },
      {
        id: "belicoso", name: "Belicoso", badge: "5.25″ × 52",
        accentHex: "#6A4E22",
        specs: [
          { label: "Length",     value: "5.25 inches" },
          { label: "Ring Gauge", value: "52 (tapered)" },
          { label: "Burn Time",  value: "50–70 min" },
        ],
        signature: "The tapered head creates a draw that evolves — beginning precise, opening into fullness.",
        keywords: ["Tapered", "Complex", "Artisan"],
        eatEnv: { spatial: "atelier", ambiance: "contemplative" },
      },
    ],
  },

  /* SESSION 05 · THE DRESSER — Wrapper Selection */
  {
    step: 5, session: "SESSION 05", sessionTitle: "THE DRESSER",
    displayTitle: "WRAPPER SELECTION",
    subtitle: "The wrapper leaf defines the first and last impression",
    lockVerb: "LOCK WRAPPER", proceedLabel: "PROCEED TO BINDER",
    field: "wrapper",
    options: [
      {
        id: "claro", name: "Colorado Claro", badge: "LIGHT HONEY",
        accentHex: "#C09A18",
        specs: [
          { label: "Color",     value: "Light Golden Brown" },
          { label: "Origin",    value: "Connecticut Shade" },
          { label: "Character", value: "Mild, Creamy Sweetness" },
        ],
        signature: "The lightest wrapper carries the most delicate aromatics — a whisper before the cigar speaks.",
        keywords: ["Light", "Creamy", "Mild"],
        eatEnv: { lighting: "warm_golden" },
      },
      {
        id: "natural", name: "Natural", badge: "CLASSIC MID",
        accentHex: "#8A6822",
        specs: [
          { label: "Color",     value: "Medium Caramel Brown" },
          { label: "Origin",    value: "Multiple Regions" },
          { label: "Character", value: "Balanced, Universal" },
        ],
        signature: "The Natural is the great diplomat of wrappers — it never dominates, always elevates.",
        keywords: ["Balanced", "Versatile", "Classic"],
        eatEnv: { lighting: "neutral" },
      },
      {
        id: "colorado", name: "Colorado Maduro", badge: "SEMI-SWEET",
        accentHex: "#784418",
        specs: [
          { label: "Color",        value: "Reddish Deep Brown" },
          { label: "Fermentation", value: "Extended" },
          { label: "Character",    value: "Rich, Semi-Sweet" },
        ],
        signature: "Between the natural and the maduro lies a territory of complexity few wrappers can claim.",
        keywords: ["Rich", "Complex", "Semi-Sweet"],
        eatEnv: { lighting: "low_amber" },
      },
      {
        id: "maduro", name: "Maduro", badge: "DARK CHOCOLATE",
        accentHex: "#4A2414",
        specs: [
          { label: "Color",        value: "Dark Chocolate Brown" },
          { label: "Fermentation", value: "Double-Fermented" },
          { label: "Character",    value: "Sweet, Full Body" },
        ],
        signature: "The maduro is patience made visible — months of extended fermentation yield profound sweetness.",
        keywords: ["Dark", "Sweet", "Full"],
        eatEnv: { lighting: "deep_smoke" },
      },
    ],
  },

  /* SESSION 06 · THE BINDER — Binder Matrix */
  {
    step: 6, session: "SESSION 06", sessionTitle: "THE BINDER",
    displayTitle: "BINDER MATRIX",
    subtitle: "The invisible architect of your smoke's structure",
    lockVerb: "LOCK BINDER", proceedLabel: "PROCEED TO FILLER",
    field: "binder",
    options: [
      {
        id: "dominican", name: "Dominican", badge: "CREAMY BACKBONE",
        accentHex: "#886030",
        specs: [
          { label: "Region",    value: "Cibao Valley, DR" },
          { label: "Character", value: "Smooth & Creamy" },
          { label: "Body",      value: "Light to Medium" },
        ],
        signature: "Dominican binders are chosen by masters who want the filler to speak — the binder simply listens.",
        keywords: ["Smooth", "Neutral", "Dominican"],
        eatEnv: { ambiance: "contemplative" },
      },
      {
        id: "nicaraguan", name: "Nicaraguan", badge: "FULL STRUCTURE",
        accentHex: "#782C14",
        specs: [
          { label: "Region",    value: "Jalapa & Estelí" },
          { label: "Character", value: "Spicy, Full-Bodied" },
          { label: "Body",      value: "Full" },
        ],
        signature: "The Nicaraguan binder asserts itself — it does not serve the filler, it challenges it.",
        keywords: ["Bold", "Spicy", "Full"],
        eatEnv: { lighting: "low_amber", ambiance: "ceremonial" },
      },
      {
        id: "honduran", name: "Honduran", badge: "EARTHY DEPTH",
        accentHex: "#524022",
        specs: [
          { label: "Region",    value: "Jamastran Valley" },
          { label: "Character", value: "Earthy, Woody" },
          { label: "Body",      value: "Medium to Full" },
        ],
        signature: "The Honduran binder brings the earth into the smoke — cedar, leather, and the forest floor.",
        keywords: ["Earthy", "Woody", "Complex"],
        eatEnv: { ambiance: "social" },
      },
      {
        id: "connecticut", name: "Connecticut", badge: "CLEAN BASE",
        accentHex: "#605040",
        specs: [
          { label: "Region",    value: "Connecticut River Valley" },
          { label: "Character", value: "Mild, Clean" },
          { label: "Body",      value: "Light" },
        ],
        signature: "When the blender wants silence, they reach for Connecticut — a binder that creates space.",
        keywords: ["Clean", "Mild", "Neutral"],
        eatEnv: { lighting: "cool_silver", ambiance: "neutral" },
      },
    ],
  },

  /* SESSION 07 · THE BLENDER — Filler Composition */
  {
    step: 7, session: "SESSION 07", sessionTitle: "THE BLENDER",
    displayTitle: "FILLER COMPOSITION",
    subtitle: "The heart of your cigar — the blend that defines the soul",
    lockVerb: "LOCK FILLER", proceedLabel: "PROCEED TO DRAW ENGINEERING",
    field: "filler",
    options: [
      {
        id: "long_filler", name: "Long Filler Purist", badge: "PREMIUM BURN",
        accentHex: "#9A7022",
        specs: [
          { label: "Filler Type",  value: "100% Long Filler" },
          { label: "Burn Quality", value: "Even, Slow" },
          { label: "Character",    value: "Maximum Complexity" },
        ],
        signature: "Whole leaves, carefully laid — no shortcuts, no compromises. The purist's path.",
        keywords: ["Premium", "Even", "Complex"],
        eatEnv: { spatial: "grand", ambiance: "ceremonial" },
      },
      {
        id: "mixed", name: "Mixed Maestro", badge: "70 / 30 BLEND",
        accentHex: "#785224",
        specs: [
          { label: "Long Filler",  value: "70%" },
          { label: "Short Filler", value: "30%" },
          { label: "Character",    value: "Balanced Complexity" },
        ],
        signature: "The maestro knows that balance is not compromise — it is mastery.",
        keywords: ["Balanced", "Consistent", "Value"],
        eatEnv: { spatial: "intimate", ambiance: "social" },
      },
      {
        id: "ligero_heavy", name: "Ligero Heavy", badge: "MAXIMUM STRENGTH",
        accentHex: "#6A2010",
        specs: [
          { label: "Ligero Ratio", value: "60%+" },
          { label: "Burn Speed",   value: "Slow (Oil-Rich)" },
          { label: "Character",    value: "Full Body & Strength" },
        ],
        signature: "Ligero from the crown of the plant — kissed longest by the sun and slowest to surrender.",
        keywords: ["Strong", "Full", "Power"],
        eatEnv: { lighting: "deep_smoke", ambiance: "ceremonial" },
      },
      {
        id: "seco_dominant", name: "Seco Dominant", badge: "SMOOTH DRAW",
        accentHex: "#524028",
        specs: [
          { label: "Seco Ratio",  value: "50%+" },
          { label: "Combustion",  value: "Excellent" },
          { label: "Character",   value: "Smooth, Even Draw" },
        ],
        signature: "Seco burns readily and releases its character early — a smoke that greets you warmly.",
        keywords: ["Smooth", "Easy", "Accessible"],
        eatEnv: { lighting: "warm_golden", ambiance: "contemplative" },
      },
    ],
  },
];

/** Backward-compat alias — code that still imports RITUAL_STEPS continues to work. */
export const RITUAL_STEPS = PRE_DRAW_STEPS;

/* ══════════════════════════════════════════════════════════════════
   POST-DRAW STEPS  · Sessions 09–13
   These feed directly into the NOVEE OS recommendation engine.
   Each option carries an `apiMapping` so extractAPIParams() can
   convert the selection into the discover() parameter shape.
   ══════════════════════════════════════════════════════════════════ */

export const POST_DRAW_STEPS: RitualStepConfig[] = [

  /* SESSION 09 · THE TASTER — Flavor Architecture */
  {
    step: 9, session: "SESSION 09", sessionTitle: "THE TASTER",
    displayTitle: "FLAVOR ARCHITECTURE",
    subtitle: "Name the dimension of taste that defines your sovereign palate",
    lockVerb: "LOCK FLAVOR", proceedLabel: "PROCEED TO STRENGTH",
    field: "flavorProfile",
    options: [
      {
        id: "earthy_woody", name: "Earthy & Woody", badge: "TERROIR-LED",
        accentHex: "#6A5024",
        specs: [
          { label: "Primary Notes",   value: "Cedar, Leather, Earth" },
          { label: "Secondary",       value: "Oak, Forest Floor" },
          { label: "Finish",          value: "Dry, Long" },
        ],
        signature: "The earth speaks through every draw — this is tobacco in its most honest form.",
        keywords: ["Earthy", "Woody", "Leather"],
        eatEnv: { lighting: "low_amber", ambiance: "contemplative", spatial: "estate" },
        apiMapping: { flavors: ["Earthy", "Woody", "Leather", "Cedar"] },
      },
      {
        id: "spicy_peppery", name: "Spicy & Peppery", badge: "HIGH ENERGY",
        accentHex: "#7A2C10",
        specs: [
          { label: "Primary Notes",   value: "Black Pepper, Cinnamon" },
          { label: "Secondary",       value: "Clove, White Pepper" },
          { label: "Finish",          value: "Warm, Lingering" },
        ],
        signature: "The pepper arrives at ignition and never truly leaves — it is the cigar's spine.",
        keywords: ["Spicy", "Pepper", "Bold"],
        eatEnv: { lighting: "low_amber", ambiance: "ceremonial", spatial: "grand" },
        apiMapping: { flavors: ["Spicy", "Pepper", "Cinnamon"] },
      },
      {
        id: "sweet_creamy", name: "Sweet & Creamy", badge: "REFINED PLEASURE",
        accentHex: "#9A7830",
        specs: [
          { label: "Primary Notes",   value: "Vanilla, Honey, Cream" },
          { label: "Secondary",       value: "Cocoa, Caramel" },
          { label: "Finish",          value: "Smooth, Sweet" },
        ],
        signature: "Some cigars seduce. These belong to that rare category — they envelop, they comfort.",
        keywords: ["Sweet", "Creamy", "Smooth"],
        eatEnv: { lighting: "warm_golden", ambiance: "social", spatial: "intimate" },
        apiMapping: { flavors: ["Sweet", "Cream", "Vanilla", "Honey"] },
      },
      {
        id: "complex_layered", name: "Complex & Layered", badge: "MASTER CLASS",
        accentHex: "#504828",
        specs: [
          { label: "Primary Notes",   value: "Chocolate, Coffee" },
          { label: "Secondary",       value: "Cedar, Dried Fruit" },
          { label: "Finish",          value: "Multi-Phase, Evolving" },
        ],
        signature: "The blend evolves across three acts — each third a revelation the last could not predict.",
        keywords: ["Complex", "Layered", "Evolving"],
        eatEnv: { lighting: "neutral", ambiance: "ceremonial", spatial: "atelier" },
        apiMapping: { flavors: ["Complex", "Chocolate", "Coffee", "Cedar"] },
      },
    ],
  },

  /* SESSION 10 · THE CALIBRATOR — Strength Protocol */
  {
    step: 10, session: "SESSION 10", sessionTitle: "THE CALIBRATOR",
    displayTitle: "STRENGTH PROTOCOL",
    subtitle: "Calibrate the nicotine presence to your sovereign tolerance",
    lockVerb: "LOCK STRENGTH", proceedLabel: "PROCEED TO MOOD",
    field: "strengthLevel",
    options: [
      {
        id: "mild", name: "Mild & Refined", badge: "LIGHT PRESENCE",
        accentHex: "#7A6830",
        specs: [
          { label: "Nicotine",     value: "Low" },
          { label: "Character",    value: "Elegant, Approachable" },
          { label: "Ideal For",    value: "Morning, New Guests" },
        ],
        signature: "Restraint is a form of sophistication. The mild cigar asks nothing of you — it simply gives.",
        keywords: ["Mild", "Elegant", "Accessible"],
        eatEnv: { lighting: "warm_golden", ambiance: "social" },
        apiMapping: { strength: 1 },
      },
      {
        id: "medium", name: "Medium Balance", badge: "HARMONIC CORE",
        accentHex: "#8A5E20",
        specs: [
          { label: "Nicotine",     value: "Medium" },
          { label: "Character",    value: "Balanced, Broad Palate" },
          { label: "Ideal For",    value: "Afternoon, Any Occasion" },
        ],
        signature: "The medium cigar is not a compromise — it is the summit of balance, where all flavors coexist.",
        keywords: ["Medium", "Balanced", "Versatile"],
        eatEnv: { lighting: "neutral", ambiance: "social" },
        apiMapping: { strength: 2 },
      },
      {
        id: "full", name: "Full & Bold", badge: "MAXIMUM PRESENCE",
        accentHex: "#6A2010",
        specs: [
          { label: "Nicotine",     value: "High" },
          { label: "Character",    value: "Assertive, Full-Body" },
          { label: "Ideal For",    value: "Evening, Experienced" },
        ],
        signature: "The full cigar does not whisper — it commands. Only for those who have earned its respect.",
        keywords: ["Full", "Bold", "Commanding"],
        eatEnv: { lighting: "deep_smoke", ambiance: "ceremonial" },
        apiMapping: { strength: 3 },
      },
      {
        id: "variable", name: "Variable Ascent", badge: "PROGRESSIVE",
        accentHex: "#5A4020",
        specs: [
          { label: "Nicotine",     value: "Builds Through Thirds" },
          { label: "Character",    value: "Evolving Presence" },
          { label: "Ideal For",    value: "Extended Session" },
        ],
        signature: "Begin with restraint, arrive at power. The journey is the destination.",
        keywords: ["Progressive", "Evolving", "Journey"],
        eatEnv: { lighting: "low_amber", ambiance: "contemplative" },
        apiMapping: { strength: 2 },
      },
    ],
  },

  /* SESSION 11 · THE SEER — Mood Calibration */
  {
    step: 11, session: "SESSION 11", sessionTitle: "THE SEER",
    displayTitle: "MOOD CALIBRATION",
    subtitle: "Align the ritual to the atmosphere of this moment",
    lockVerb: "LOCK MOOD", proceedLabel: "PROCEED TO AGING",
    field: "moodAlignment",
    options: [
      {
        id: "contemplative", name: "Contemplative", badge: "SOLITARY REFLECTION",
        accentHex: "#4A4038",
        specs: [
          { label: "Setting",      value: "Solo, Private" },
          { label: "Tempo",        value: "Slow, Unhurried" },
          { label: "Ideal Pairing", value: "Single Malt, Silence" },
        ],
        signature: "The greatest thoughts arrive in smoke and stillness. This is that kind of cigar.",
        keywords: ["Reflective", "Solo", "Slow"],
        eatEnv: { ambiance: "contemplative", spatial: "intimate" },
        apiMapping: { mood: "relaxed" },
      },
      {
        id: "celebratory", name: "Celebratory", badge: "OCCASION MARKER",
        accentHex: "#9A7010",
        specs: [
          { label: "Setting",       value: "Special Event" },
          { label: "Tempo",         value: "Festive, Present" },
          { label: "Ideal Pairing", value: "Champagne, Fine Spirits" },
        ],
        signature: "Some moments demand to be marked. The right cigar turns a night into a memory.",
        keywords: ["Festive", "Bold", "Memorable"],
        eatEnv: { lighting: "warm_golden", ambiance: "celebratory", spatial: "grand" },
        apiMapping: { mood: "celebratory" },
      },
      {
        id: "social", name: "Social", badge: "CONVERSATIONAL",
        accentHex: "#6A5830",
        specs: [
          { label: "Setting",       value: "Company & Conversation" },
          { label: "Tempo",         value: "Engaged, Sharing" },
          { label: "Ideal Pairing", value: "Bourbon, Good Company" },
        ],
        signature: "The best cigars are shared — not just in smoke, but in the conversation they ignite.",
        keywords: ["Social", "Conversational", "Shared"],
        eatEnv: { lighting: "warm_golden", ambiance: "social" },
        apiMapping: { mood: "social" },
      },
      {
        id: "creative", name: "Creative Flow", badge: "CEREBRAL STATE",
        accentHex: "#505048",
        specs: [
          { label: "Setting",       value: "Work, Creation, Focus" },
          { label: "Tempo",         value: "Focused, Alert" },
          { label: "Ideal Pairing", value: "Black Coffee, Quiet" },
        ],
        signature: "Nicotine sharpens the mind when the mind is already in motion. This is the creative cigar.",
        keywords: ["Creative", "Focused", "Alert"],
        eatEnv: { lighting: "cool_silver", ambiance: "contemplative", spatial: "atelier" },
        apiMapping: { mood: "adventurous" },
      },
    ],
  },

  /* SESSION 12 · THE CELLAR MASTER — Aging Protocol */
  {
    step: 12, session: "SESSION 12", sessionTitle: "THE CELLAR MASTER",
    displayTitle: "AGING PROTOCOL",
    subtitle: "Select the maturation timeline that shaped your sovereign leaf",
    lockVerb: "LOCK AGING", proceedLabel: "PROCEED TO PAIRING",
    field: "aging",
    options: [
      {
        id: "fresh", name: "Fresh Rolling", badge: "30–90 DAYS",
        accentHex: "#7A6820",
        specs: [
          { label: "Rest Period",  value: "30–90 Days" },
          { label: "Character",    value: "Bright, Vibrant, Green" },
          { label: "Philosophy",   value: "Immediacy of Harvest" },
        ],
        signature: "The fresh cigar carries the energy of its making — unfiltered and alive.",
        keywords: ["Fresh", "Bright", "Immediate"],
        eatEnv: { lighting: "warm_golden", spatial: "atelier" },
      },
      {
        id: "aged_12", name: "1–2 Year Reserve", badge: "SETTLED",
        accentHex: "#8A6024",
        specs: [
          { label: "Rest Period",  value: "12–24 Months" },
          { label: "Character",    value: "Developed, Smoother" },
          { label: "Philosophy",   value: "Patience Rewarded" },
        ],
        signature: "The first year is the cigar finding its voice. The second year is it speaking clearly.",
        keywords: ["Reserve", "Settled", "Smooth"],
        eatEnv: { lighting: "neutral", spatial: "vault" },
      },
      {
        id: "aged_36", name: "3–5 Year Cask", badge: "DEEP MATURITY",
        accentHex: "#6A4818",
        specs: [
          { label: "Rest Period",  value: "3–5 Years" },
          { label: "Character",    value: "Velvety, Integrated" },
          { label: "Philosophy",   value: "Depth Over Time" },
        ],
        signature: "Three years in darkness transforms ambition into mastery. Five years becomes legend.",
        keywords: ["Mature", "Velvet", "Integrated"],
        eatEnv: { lighting: "low_amber", spatial: "vault", ambiance: "ceremonial" },
      },
      {
        id: "vintage", name: "Vintage 6+", badge: "MUSEUM GRADE",
        accentHex: "#4A2C10",
        specs: [
          { label: "Rest Period",  value: "6+ Years" },
          { label: "Character",    value: "Transcendent, Rare" },
          { label: "Philosophy",   value: "The Long Game" },
        ],
        signature: "Vintage is not an age — it is a philosophy. To wait six years for a cigar is to understand it.",
        keywords: ["Vintage", "Rare", "Transcendent"],
        eatEnv: { lighting: "deep_smoke", spatial: "vault", ambiance: "ceremonial" },
      },
    ],
  },

  /* SESSION 13 · THE SOMMELIER — Pairing Intelligence */
  {
    step: 13, session: "SESSION 13", sessionTitle: "THE SOMMELIER",
    displayTitle: "PAIRING INTELLIGENCE",
    subtitle: "Select the spirit that will complete your sovereign experience",
    lockVerb: "LOCK PAIRING", proceedLabel: "SEAL THE RITUAL",
    field: "pairing",
    options: [
      {
        id: "single_malt", name: "Single Malt Scotch", badge: "PEATED OR UNPEATED",
        accentHex: "#8A6A18",
        specs: [
          { label: "Region",       value: "Scotland" },
          { label: "Character",    value: "Smoky, Medicinal, or Fruity" },
          { label: "Harmony",      value: "Mirrors Tobacco's Complexity" },
        ],
        signature: "Scotch and cigar share a genetic memory of smoke, peat, and time.",
        keywords: ["Scotch", "Peated", "Classic"],
        eatEnv: { lighting: "low_amber", ambiance: "contemplative" },
      },
      {
        id: "bourbon", name: "Kentucky Bourbon", badge: "GRAIN SWEETNESS",
        accentHex: "#9A5A18",
        specs: [
          { label: "Region",       value: "Kentucky, USA" },
          { label: "Character",    value: "Vanilla, Oak, Caramel" },
          { label: "Harmony",      value: "Softens Tobacco's Edge" },
        ],
        signature: "The bourbon's sweetness is a counterpoint — it does not compete, it complements.",
        keywords: ["Bourbon", "Sweet", "American"],
        eatEnv: { lighting: "warm_golden", ambiance: "social" },
      },
      {
        id: "cognac", name: "XO Cognac", badge: "FRENCH REFINEMENT",
        accentHex: "#7A5820",
        specs: [
          { label: "Region",       value: "Cognac, France" },
          { label: "Character",    value: "Dried Fruit, Floral, Oak" },
          { label: "Harmony",      value: "Elevates Both Profiles" },
        ],
        signature: "Cognac and Cuban tobacco share the same philosophical obsession — the pursuit of complexity.",
        keywords: ["Cognac", "French", "Elegant"],
        eatEnv: { lighting: "warm_golden", ambiance: "celebratory" },
      },
      {
        id: "rum", name: "Añejo Rum", badge: "TROPICAL DEPTH",
        accentHex: "#7A4010",
        specs: [
          { label: "Region",       value: "Caribbean" },
          { label: "Character",    value: "Molasses, Tropical Fruit" },
          { label: "Harmony",      value: "Shared Terroir with Tobacco" },
        ],
        signature: "Rum and tobacco grew in the same soil, under the same sun. Their pairing is a homecoming.",
        keywords: ["Rum", "Caribbean", "Tropical"],
        eatEnv: { lighting: "low_amber", ambiance: "social" },
      },
      {
        id: "solo", name: "Neat / No Pairing", badge: "CIGAR SPEAKS ALONE",
        accentHex: "#3A3830",
        specs: [
          { label: "Accompaniment", value: "None" },
          { label: "Philosophy",    value: "The Blend Uninterrupted" },
          { label: "Ideal For",     value: "Pure Tobacco Study" },
        ],
        signature: "There are moments when the cigar does not need company — it is the entire conversation.",
        keywords: ["Solo", "Pure", "Focused"],
        eatEnv: { ambiance: "contemplative", spatial: "intimate" },
      },
    ],
  },
];
