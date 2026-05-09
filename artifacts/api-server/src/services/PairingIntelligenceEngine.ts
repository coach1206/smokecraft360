/**
 * PairingIntelligenceEngine — orchestrates the Luxury Sommelier pairing ritual.
 *
 * Input:  leaf, wrapper, vitola, cut selections + optional venueId / guestId
 * Output: primary cigar profile, spirit/beer pairings from real inventory,
 *         confidence score, staff nudge, alchemy text, mentor narration lines.
 */

import {
  buildFlavorVector,
  profileConfidence,
  dominantDescriptors,
  type FlavorVector,
} from "./CigarFlavorGraph";
import { derivePairingProfile } from "./LiquorPairingEngine";
import { resolveInventoryPairings, type ResolvedProduct } from "./InventoryPairingResolver";

// ── Input / Output types ──────────────────────────────────────────────────────

export interface BlenderSelection {
  leaf:    string;   // "seco" | "viso" | "ligero"
  wrapper: string;   // "candela" | "connecticut" | "habano" | "maduro" | "oscuro"
  vitola:  string;   // "robusto" | "toro" | "churchill" | "belicoso" | "lancero"
  cut:     string;   // "straight" | "vcut" | "punch"
  wrapperLabel?: string;
  vitolaLabel?:  string;
  venueId?: string;
  guestId?: string;
}

export interface StaffNudge {
  flavorProfile:   string;    // e.g. "Full-bodied · Sweet · Earthy"
  confidenceScore: number;    // 0–100
  suggestedWording: string;   // conversational script for staff
  upsellLine:      string;    // premium upgrade suggestion
}

export interface PairingResult {
  flavorVector:   FlavorVector;
  descriptors:    string[];
  confidence:     number;
  alchemyText:    string;
  spiritPairings: ResolvedProduct[];
  beerPairings:   ResolvedProduct[];
  primaryCategory: string;
  staffNudge:     StaffNudge;
  mentorLines:    string[];   // ordered narration lines for TTS
}

// ── Staff nudge builder ───────────────────────────────────────────────────────

function buildStaffNudge(
  descriptors:  string[],
  confidence:   number,
  spiritName:   string,
  vitolaLabel:  string,
  wrapperLabel: string,
): StaffNudge {
  const profileStr = descriptors.slice(0, 3).join(" · ");

  const suggestedWording =
    `Guest prefers a ${profileStr} experience. ` +
    `Recommend the ${wrapperLabel} vitola paired with a ${spiritName}. ` +
    `Open with: "I noticed you gravitate toward richer, ${descriptors[0] ?? "complex"} profiles — ` +
    `let me show you something from our reserve selection that pairs beautifully with this."`;

  const upsellLine =
    `If they hesitate, suggest the premium ${vitolaLabel} Churchill — the longer format extracts ` +
    `more complexity from the same wrapper and justifies a 20–30% price premium with confidence.`;

  return { flavorProfile: profileStr, confidenceScore: confidence, suggestedWording, upsellLine };
}

// ── Mentor narration lines ───────────────────────────────────────────────────

function buildMentorLines(
  leafLabel:    string,
  wrapperLabel: string,
  vitolaLabel:  string,
  cutLabel:     string,
  descriptors:  string[],
  alchemyText:  string,
  spiritName:   string,
): string[] {
  return [
    `Welcome to the ritual. You have chosen ${leafLabel} leaf — ${descriptors[0] ?? "balanced"} in character, with soul.`,
    `Your ${wrapperLabel} wrapper defines the first impression. It tells the world who you are before you speak.`,
    `The ${vitolaLabel} format will carry this experience for ${vitolaLabel === "Churchill" ? "ninety" : vitolaLabel === "Lancero" ? "two hours" : "an hour"}. A ritual of patience.`,
    `A ${cutLabel} opens the draw — clean, deliberate, intentional. The beginning is everything.`,
    alchemyText,
    `I recommend pairing this with ${spiritName}. ${alchemyText.split(".")[0]}.`,
  ];
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function resolvePairing(sel: BlenderSelection): Promise<PairingResult> {
  const wrapperLabel = sel.wrapperLabel ?? sel.wrapper;
  const vitolaLabel  = sel.vitolaLabel  ?? sel.vitola;

  // 1. Build flavor vector
  const flavorVector = buildFlavorVector(sel.leaf, sel.wrapper, sel.vitola);

  // 2. Derive descriptors + confidence
  const descriptors = dominantDescriptors(flavorVector);
  const confidence  = profileConfidence(flavorVector);

  // 3. Derive pairing profile
  const pairing = derivePairingProfile(flavorVector, wrapperLabel);

  // 4. Resolve real inventory
  const { spirits, beers } = await resolveInventoryPairings({
    venueId:    sel.venueId,
    spiritTags: pairing.spiritTags,
    beerTags:   pairing.beerTags,
    limit:       3,
  });

  // 5. Top spirit name for narration
  const topSpiritName = spirits[0]?.name ?? pairing.primaryCategory;

  // 6. Build staff nudge
  const staffNudge = buildStaffNudge(
    descriptors, confidence, topSpiritName, vitolaLabel, wrapperLabel,
  );

  // 7. Build mentor lines
  const cutLabel = sel.cut === "vcut" ? "V-cut"
    : sel.cut === "punch" ? "Punch cut"
    : "Straight cut";

  const mentorLines = buildMentorLines(
    sel.leaf, wrapperLabel, vitolaLabel, cutLabel,
    descriptors, pairing.alchemyText, topSpiritName,
  );

  return {
    flavorVector,
    descriptors,
    confidence,
    alchemyText:      pairing.alchemyText,
    spiritPairings:   spirits,
    beerPairings:     beers,
    primaryCategory:  pairing.primaryCategory,
    staffNudge,
    mentorLines,
  };
}
