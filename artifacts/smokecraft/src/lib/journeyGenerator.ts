export type CraftType = "smoke" | "pour" | "brew" | "vape";

const JOURNEYS: Record<CraftType, string[]> = {
  smoke: [
    "Ember Introduction",
    "Pairing Discovery",
    "Maduro Journey",
    "Reserve Lounge",
  ],
  pour: [
    "Discovery Pour",
    "Flavor Expansion",
    "Reserve Experience",
    "Signature Cocktail",
  ],
  brew: [
    "Regional Flight",
    "Barrel Discovery",
    "Hop Expansion",
    "Rare Brew Unlock",
  ],
  vape: [
    "Flavor Layer",
    "Atmosphere Sync",
    "Cloud Expansion",
    "Sensory Enhancement",
  ],
};

export function generateJourney(craftType: CraftType, _mood?: string): string[] {
  return JOURNEYS[craftType] ?? JOURNEYS.smoke;
}
