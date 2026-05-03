/**
 * aiCommentary — deterministic, template-driven natural-language commentary
 * for a recommendation result. NOT an LLM call: free, fast, predictable,
 * fully testable. Designed to feed straight into the ElevenLabs voice route.
 *
 * Two outputs per recommendation:
 *   - description: short headline ("A bold, smoky pairing.")
 *   - reasoning:   one-sentence pairing rationale ("The Ardbeg's peat brings
 *                  out the cedar in the Padron.")
 *
 * Keeps the engine pure structured data — commentary is layered on top
 * inside routes/recommend.ts so the engine itself stays testable in isolation.
 */

import type { ScoredProduct } from "../engine/types";

export type Mood = "excited" | "calm" | "neutral";

export interface ProductCommentary {
  description: string;
  reasoning?:  string;
}

const STRENGTH_LABELS: Record<number, string> = {
  1: "smooth",
  2: "easy",
  3: "balanced",
  4: "bold",
  5: "powerful",
};

function strengthLabel(s: number | undefined): string {
  if (typeof s !== "number") return "balanced";
  return STRENGTH_LABELS[Math.max(1, Math.min(5, Math.round(s)))] ?? "balanced";
}

function joinNotes(notes: string[], max = 3): string {
  const slice = notes.slice(0, max);
  if (slice.length === 0) return "rich";
  if (slice.length === 1) return slice[0]!;
  if (slice.length === 2) return `${slice[0]} and ${slice[1]}`;
  return `${slice.slice(0, -1).join(", ")}, and ${slice[slice.length - 1]}`;
}

/**
 * Build commentary for a single product.
 * Mood prefix mirrors the brief's emotion-based delivery.
 */
export function buildProductCommentary(
  product: ScoredProduct,
  mood:    Mood = "neutral",
): ProductCommentary {
  const strength = strengthLabel(product.strength);
  const notes    = joinNotes(product.flavorNotes);

  let description: string;
  switch (mood) {
    case "excited":
      description = `A bold, ${strength} pick — ${product.name} brings ${notes} to the table.`;
      break;
    case "calm":
      description = `Smooth and ${strength}. ${product.name} leans into ${notes}.`;
      break;
    default:
      description = `A ${strength} pairing with ${notes} notes — ${product.name}.`;
  }

  return { description };
}

/**
 * Build commentary tying a primary product to its cross-category pairing.
 * Used when the recommend response surfaces both a beer and a cigar (etc.).
 */
export function buildPairingCommentary(
  primary: ScoredProduct,
  pairing: ScoredProduct | undefined,
  mood:    Mood = "neutral",
): ProductCommentary {
  const head = buildProductCommentary(primary, mood);
  if (!pairing) return head;

  const primaryNote = primary.flavorNotes[0] ?? "character";
  const pairingNote = pairing.flavorNotes[0] ?? "depth";

  return {
    description: head.description,
    reasoning:   `The ${pairing.name} echoes ${pairingNote} against the ${primary.name}'s ${primaryNote}.`,
  };
}

/** Convenience: render commentary as a single speakable string. */
export function speakable(c: ProductCommentary): string {
  return c.reasoning ? `${c.description} ${c.reasoning}` : c.description;
}
