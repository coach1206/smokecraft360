/**
 * EATController — Environment · Asset · Transaction Framework
 * NOVEE OS · Profound Innovations
 *
 * The E.A.T. controller manages sovereign ritual state across all
 * 13 sessions. Every step completion triggers three operations:
 *   1. Environment Update — lighting, ambiance, spatial context
 *   2. Asset Validation  — the physical blueprint of the blend
 *   3. Transaction Log   — append-only ledger of ritual progress
 */

/* ── Environment ─────────────────────────────────────────────────── */

export type EATLighting =
  | "low_amber"    // fire-cure, maduro, full strength
  | "warm_golden"  // sun-cure, claro, medium
  | "cool_silver"  // flue-cure, alpine, mild
  | "deep_smoke"   // ligero, dark, ceremonial
  | "neutral";

export type EATAmbiance =
  | "contemplative"   // slow, solitary, reflective
  | "celebratory"     // festive, bold, social
  | "social"          // conversational, shared
  | "ceremonial"      // ritual, formal, reverent
  | "neutral";

export type EATSpatial =
  | "intimate"    // robusto, quick session
  | "grand"       // toro, extended
  | "estate"      // opening state
  | "vault"       // fermentation, aging
  | "atelier";    // artisan craft, belicoso

export interface EATEnvironment {
  lighting: EATLighting;
  ambiance: EATAmbiance;
  spatial:  EATSpatial;
}

/* ── Asset ───────────────────────────────────────────────────────── */

export interface EATAsset {
  terroir?:      string;
  curing?:       string;
  fermentation?: string;
  vitola?:       string;
  wrapper?:      string;
  binder?:       string;
  filler?:       string;
  draw?:         string;
  flavorProfile?: string;
  strengthLevel?: string;
  moodAlignment?: string;
  aging?:        string;
  pairing?:      string;
}

/* ── Transaction Ledger ──────────────────────────────────────────── */

export interface EATLedgerEntry {
  step:      number;
  session:   string;
  field:     string;
  value:     string;
  timestamp: string;
}

/* ── Composite State ─────────────────────────────────────────────── */

export interface EATState {
  sessionId:   string;
  environment: EATEnvironment;
  asset:       EATAsset;
  ledger:      EATLedgerEntry[];
}

/* ── Factory ─────────────────────────────────────────────────────── */

export function initEAT(): EATState {
  return {
    sessionId:   `eat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    environment: { lighting: "neutral", ambiance: "neutral", spatial: "estate" },
    asset:       {},
    ledger:      [],
  };
}

/* ── Mutation helpers (pure — return new state) ──────────────────── */

export function eatApplyStep(
  state:  EATState,
  params: {
    step:        number;
    session:     string;
    field:       string;
    value:       string;
    environment?: Partial<EATEnvironment>;
    assetExtra?:  Partial<EATAsset>;
  },
): EATState {
  const entry: EATLedgerEntry = {
    step:      params.step,
    session:   params.session,
    field:     params.field,
    value:     params.value,
    timestamp: new Date().toISOString(),
  };

  return {
    ...state,
    environment: params.environment
      ? { ...state.environment, ...params.environment }
      : state.environment,
    asset: {
      ...state.asset,
      [params.field]: params.value,
      ...(params.assetExtra ?? {}),
    },
    ledger: [...state.ledger, entry],
  };
}

/* ── API param extraction ────────────────────────────────────────── */

const VITOLA_SHAPE_MAP: Record<string, "robusto" | "toro" | "churchill" | "belicoso" | "torpedo" | "corona"> = {
  robusto:   "robusto",
  toro:      "toro",
  churchill: "churchill",
  belicoso:  "belicoso",
};

const VITOLA_SESSION_MAP: Record<string, "quick" | "standard" | "extended" | "long"> = {
  robusto:   "standard",
  toro:      "extended",
  churchill: "long",
  belicoso:  "standard",
};

const FLAVOR_MAP: Record<string, string[]> = {
  earthy_woody:     ["Earthy", "Woody", "Leather", "Cedar"],
  spicy_peppery:    ["Spicy", "Pepper", "Cinnamon"],
  sweet_creamy:     ["Sweet", "Cream", "Vanilla", "Honey"],
  complex_layered:  ["Complex", "Chocolate", "Coffee", "Cedar"],
};

const STRENGTH_MAP: Record<string, number> = {
  mild:     1,
  medium:   2,
  full:     3,
  variable: 2,
};

const MOOD_MAP: Record<string, string> = {
  contemplative: "relaxed",
  celebratory:   "celebratory",
  social:        "social",
  creative:      "adventurous",
};

export interface RitualAPIParams {
  category:      "cigar" | "alcohol";
  flavors:       string[];
  strength:      number;
  mood:          string;
  cigarShape?:   "robusto" | "toro" | "churchill" | "belicoso" | "torpedo" | "corona";
  cigarSession?: "quick" | "standard" | "extended" | "long";
}

export function extractAPIParams(asset: EATAsset): RitualAPIParams {
  return {
    category:     "cigar",
    flavors:      FLAVOR_MAP[asset.flavorProfile ?? ""] ?? ["Complex", "Cedar"],
    strength:     STRENGTH_MAP[asset.strengthLevel ?? ""] ?? 2,
    mood:         MOOD_MAP[asset.moodAlignment ?? ""] ?? "relaxed",
    cigarShape:   asset.vitola ? VITOLA_SHAPE_MAP[asset.vitola] : undefined,
    cigarSession: asset.vitola ? VITOLA_SESSION_MAP[asset.vitola] : undefined,
  };
}
