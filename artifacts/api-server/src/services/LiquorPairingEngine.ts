/**
 * LiquorPairingEngine — maps a cigar flavor vector to spirit / beer affinities
 * and generates the "alchemy" pairing note shown on the Reveal screen.
 */

import { type FlavorVector, dominantDescriptors } from "./CigarFlavorGraph";

export interface PairingProfile {
  primaryCategory:    string;    // "bourbon" | "scotch" | "cognac" | "rum" | "beer" | …
  secondaryCategory:  string;
  alchemyText:        string;    // mentor-grade explanation
  spiritTags:         string[];  // used to score venue inventory
  beerTags:           string[];
}

// ── Category decision matrix ──────────────────────────────────────────────────

export function derivePairingProfile(v: FlavorVector, wrapperLabel: string): PairingProfile {
  const desc = dominantDescriptors(v);
  const isMaduro  = wrapperLabel.toLowerCase().includes("maduro") || wrapperLabel.toLowerCase().includes("oscuro");
  const isCreamy  = v.creaminess >= 6;
  const isBold    = v.body >= 7;
  const isSpiced  = v.spice >= 6;
  const isSmoky   = v.smokiness >= 6;
  const isSweet   = v.sweetness >= 6;

  // ── Primary spirit selection ───────────────────────────────────────────────
  let primaryCategory: string;
  let secondaryCategory: string;
  let spiritTags: string[];
  let beerTags: string[];
  let alchemyText: string;

  if (isMaduro && isBold) {
    primaryCategory   = "bourbon";
    secondaryCategory = "cognac";
    spiritTags        = ["bourbon", "rye", "cognac", "dark rum"];
    beerTags          = ["stout", "porter", "dark ale"];
    alchemyText       = `The ${wrapperLabel}'s bittersweet cocoa and dried fig notes unlock layers of vanilla and caramel oak in aged bourbon. ` +
      `The richness of each amplifies the other — this is the pairing the cellar masters call "the dark alchemy."`;
  } else if (isCreamy && !isBold) {
    primaryCategory   = "rum";
    secondaryCategory = "prosecco";
    spiritTags        = ["rum", "brandy", "champagne", "prosecco"];
    beerTags          = ["amber ale", "wheat beer", "lager"];
    alchemyText       = `The silky ${wrapperLabel} wrapper cradles creamy, milk-chocolate notes that soften the edge of aged rum. ` +
      `A honeyed brightness bridges both — like two instruments playing in the same key.`;
  } else if (isSpiced && isSmoky) {
    primaryCategory   = "scotch";
    secondaryCategory = "mezcal";
    spiritTags        = ["scotch", "islay", "mezcal", "whisky"];
    beerTags          = ["smoked porter", "rauchbier", "imperial stout"];
    alchemyText       = `The peat-forward depth of a Peated Scotch mirrors the cedar and black pepper of your ${wrapperLabel} selection. ` +
      `Smoke calls to smoke — they reinforce each other's mystery rather than compete.`;
  } else if (isSweet && !isSpiced) {
    primaryCategory   = "rum";
    secondaryCategory = "tequila";
    spiritTags        = ["rum", "tequila", "triple sec", "honey whiskey"];
    beerTags          = ["honey ale", "blonde ale", "hefeweizen"];
    alchemyText       = `Natural sweetness in the ${wrapperLabel} wrapper plays beautifully against the molasses depth of aged rum. ` +
      `The sugarcane origin of each creates a shared narrative — a pairing that feels inevitable.`;
  } else {
    primaryCategory   = "whiskey";
    secondaryCategory = "cognac";
    spiritTags        = ["whiskey", "bourbon", "scotch", "brandy"];
    beerTags          = ["amber ale", "ipa", "pale ale"];
    alchemyText       = `A ${desc.slice(0, 2).join(", ")} profile like yours pairs classically with a balanced single-malt whiskey. ` +
      `The cereal grain warmth complements the tobacco's mid-body without overpowering the finish.`;
  }

  return { primaryCategory, secondaryCategory, alchemyText, spiritTags, beerTags };
}
