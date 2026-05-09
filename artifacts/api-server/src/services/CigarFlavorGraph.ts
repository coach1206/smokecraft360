/**
 * CigarFlavorGraph — maps cigar selections to a flavor vector.
 *
 * Each axis is scored 0–10. The vector is used by PairingIntelligenceEngine
 * to compute spirit/beer affinities and find similar cigar profiles.
 */

export interface FlavorVector {
  body:       number;   // 0=very light  … 10=very full
  sweetness:  number;   // 0=bone dry    … 10=very sweet
  spice:      number;   // 0=none        … 10=intense
  creaminess: number;   // 0=none        … 10=buttery
  earthiness: number;   // 0=none        … 10=deep earth
  smokiness:  number;   // 0=clean       … 10=very smoky
  complexity: number;   // 0=simple      … 10=multilayered
}

// ── Per-leaf baseline vectors ─────────────────────────────────────────────────

const LEAF_VECTORS: Record<string, FlavorVector> = {
  seco:   { body: 2, sweetness: 3, spice: 2, creaminess: 5, earthiness: 2, smokiness: 1, complexity: 3 },
  viso:   { body: 5, sweetness: 4, spice: 4, creaminess: 4, earthiness: 5, smokiness: 4, complexity: 6 },
  ligero: { body: 9, sweetness: 2, spice: 7, creaminess: 2, earthiness: 7, smokiness: 8, complexity: 8 },
};

// ── Per-wrapper modifier deltas (added to leaf baseline) ─────────────────────

const WRAPPER_DELTAS: Record<string, Partial<FlavorVector>> = {
  candela:     { body: -2, sweetness: +3, spice: -2, creaminess: +2, earthiness: -2, smokiness: -1, complexity: -1 },
  connecticut: { body: -1, sweetness: +4, spice: -1, creaminess: +4, earthiness: -1, smokiness: -2, complexity: 0  },
  habano:      { body: +1, sweetness: 0,  spice: +3, creaminess: 0,  earthiness: +2, smokiness: +2, complexity: +2 },
  maduro:      { body: +2, sweetness: +5, spice: +1, creaminess: +2, earthiness: +3, smokiness: +3, complexity: +3 },
  oscuro:      { body: +3, sweetness: +2, spice: +3, creaminess: 0,  earthiness: +5, smokiness: +5, complexity: +4 },
};

// ── Per-vitola complexity modifier (longer = more complex) ───────────────────

const VITOLA_COMPLEXITY: Record<string, number> = {
  robusto:   0,
  toro:      1,
  churchill: 2,
  belicoso:  1,
  lancero:   3,
};

function clamp(v: number): number {
  return Math.max(0, Math.min(10, v));
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildFlavorVector(
  leafId:    string,
  wrapperId: string,
  vitolaId?: string,
): FlavorVector {
  const base   = LEAF_VECTORS[leafId]   ?? LEAF_VECTORS["viso"]!;
  const delta  = WRAPPER_DELTAS[wrapperId] ?? {};
  const compMod = VITOLA_COMPLEXITY[vitolaId ?? "robusto"] ?? 0;

  return {
    body:       clamp((base.body       + (delta.body       ?? 0))),
    sweetness:  clamp((base.sweetness  + (delta.sweetness  ?? 0))),
    spice:      clamp((base.spice      + (delta.spice      ?? 0))),
    creaminess: clamp((base.creaminess + (delta.creaminess ?? 0))),
    earthiness: clamp((base.earthiness + (delta.earthiness ?? 0))),
    smokiness:  clamp((base.smokiness  + (delta.smokiness  ?? 0))),
    complexity: clamp((base.complexity + (delta.complexity ?? 0) + compMod)),
  };
}

/** Euclidean distance between two vectors (lower = more similar). */
export function vectorDistance(a: FlavorVector, b: FlavorVector): number {
  const keys = Object.keys(a) as (keyof FlavorVector)[];
  return Math.sqrt(keys.reduce((sum, k) => sum + (a[k] - b[k]) ** 2, 0));
}

/** Derive dominant flavor descriptors for a vector (for mentor narration). */
export function dominantDescriptors(v: FlavorVector): string[] {
  const descriptors: string[] = [];
  if (v.body       >= 7) descriptors.push("full-bodied");
  else if (v.body  <= 3) descriptors.push("light-bodied");
  else                   descriptors.push("medium-bodied");

  if (v.sweetness  >= 6) descriptors.push("sweet");
  if (v.spice      >= 6) descriptors.push("spiced");
  if (v.creaminess >= 6) descriptors.push("creamy");
  if (v.earthiness >= 6) descriptors.push("earthy");
  if (v.smokiness  >= 6) descriptors.push("smoky");
  if (v.complexity >= 8) descriptors.push("complex");
  return descriptors;
}

/** Confidence score 0–100 based on how well the profile coheres. */
export function profileConfidence(v: FlavorVector): number {
  const keys   = Object.keys(v) as (keyof FlavorVector)[];
  const avg    = keys.reduce((s, k) => s + v[k], 0) / keys.length;
  const spread = keys.reduce((s, k) => s + Math.abs(v[k] - avg), 0) / keys.length;
  // Lower spread = more coherent = higher confidence
  return Math.round(Math.max(60, Math.min(99, 99 - spread * 6)));
}
