/**
 * Staff Pitch — generates a short coaching script for staff to use
 * when recommending a specific product to a guest.
 *
 * Distinct from `aiCommentary.ts` (which writes guest-facing copy):
 *   - Customer copy: aspirational, sensory ("rich cocoa with smoky finish")
 *   - Staff copy:    operational, persuasive, includes the *why* and *what to upsell next*
 *
 * Pure templated text — no LLM, no external calls — so the same pitch
 * is always available even when the ElevenLabs route is unconfigured.
 */

export interface StaffPitchInput {
  name:         string;
  flavorNotes?: string[];
  moodTags?:    string[];
  pairingHint?: string;
  /** Optional margin ratio (0..1). Drives the upsell-emphasis line. */
  marginRatio?: number;
  /** Optional popularity count from the layout engine. */
  popularity?:  number;
}

export interface StaffPitch {
  hook:    string;
  why:     string;
  pairing: string;
  upsell:  string | null;
}

function joinFlavor(notes: string[] | undefined): string {
  if (!notes || notes.length === 0) return "balanced";
  if (notes.length === 1) return notes[0]!;
  if (notes.length === 2) return `${notes[0]} and ${notes[1]}`;
  return `${notes.slice(0, -1).join(", ")}, and ${notes[notes.length - 1]}`;
}

function moodPhrase(mood: string | undefined): string {
  switch (mood) {
    case "bold":     return "want something with presence";
    case "relaxed":  return "are settling in for the evening";
    case "social":   return "are with a group and want a talking-point";
    case "focused":  return "want something they can concentrate on";
    case "elegant":  return "want a refined, classic experience";
    default:         return "want something memorable";
  }
}

export function generatePitch(input: StaffPitchInput): StaffPitch {
  const flavor = joinFlavor(input.flavorNotes);
  const mood   = moodPhrase(input.moodTags?.[0]);

  const hook =
    (input.popularity ?? 0) > 10
      ? `${input.name} is one of our top movers right now.`
      : (input.marginRatio ?? 0) > 0.5
      ? `${input.name} is one of our best-margin picks tonight.`
      : `${input.name} is a strong pick I'd lean into.`;

  const why = `It's known for ${flavor} notes — recommend it when guests ${mood}.`;

  const pairing = input.pairingHint
    ? `Suggest pairing it with ${input.pairingHint}.`
    : "Ask if they'd like a pairing — that's where the ticket grows.";

  /* Upsell only fires for high-margin items so we don't push staff to
   * upsell a loss-leader. Threshold mirrors menuLayout's "high-margin" band. */
  const upsell =
    (input.marginRatio ?? 0) > 0.5
      ? "If they're enjoying it, mention the premium tier — it's a small step up for a noticeably better experience."
      : null;

  return { hook, why, pairing, upsell };
}
