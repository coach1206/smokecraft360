/**
 * CraftVoiceRouter.ts — Per-craft mentor personality & TTS voice config.
 *
 * Each craft has a distinct personality archetype:
 *   smoke  → The Warm Tobacconist   (deliberate, earthy, authoritative)
 *   pour   → The Sommelier          (refined, precise, slightly formal)
 *   brew   → The Master Brewer      (enthusiastic, approachable, technical)
 *   vape   → The Vape Artisan       (cool, modern, exploratory)
 *
 * SpeechSynthesisUtterance params are applied before every speak() call.
 * Opening lines fire on craft entry; step lines fire on MasterBlender transitions.
 */

export type CraftType = "smoke" | "pour" | "brew" | "vape";

export interface CraftVoiceConfig {
  persona:       string;
  title:         string;
  rate:          number;
  pitch:         number;
  volume:        number;
  openingLines:  string[];
  stepLines: {
    leaf:       string;
    wrapper:    string;
    vitola:     string;
    cut:        string;
    reveal:     string;
  };
  educationLines:   string[];
  evolutionLines:   string[];
}

const SMOKE_VOICE: CraftVoiceConfig = {
  persona:  "The Warm Tobacconist",
  title:    "Master Tobacconist",
  rate:     0.78,
  pitch:    0.72,
  volume:   0.92,
  openingLines: [
    "Welcome. The leaf you choose tonight will tell us everything.",
    "Take your time. A great cigar is never chosen in haste.",
    "I've been waiting for a palate like yours. Let's begin.",
    "The humidor is open. Every choice you make is a conversation with the earth.",
  ],
  stepLines: {
    leaf:    "The leaf is where it all begins. Ligero brings strength; Seco delivers combustion; Volado rounds the burn.",
    wrapper: "The wrapper is forty percent of what you taste. Choose with your nose, not just your eyes.",
    vitola:  "The ring gauge changes everything. A wider vitola cools the smoke and opens complexity.",
    cut:     "The cut is the last decision before the flame. A straight cut gives the purest draw.",
    reveal:  "The alchemy is complete. Here is what the leaf has been trying to tell you.",
  },
  educationLines: [
    "A first-time explorer. Good. Let the leaf teach you — it has more patience than most.",
    "Every new palate begins somewhere. Tonight is your somewhere.",
    "There is no wrong choice here — only the beginning of taste memory.",
  ],
  evolutionLines: [
    "Your palate has traveled far since your first session. I've been tracking it.",
    "The complexity you're drawn to now — you wouldn't have chosen this six months ago.",
    "Your flavor memory is deep now. Let's see how far we can push it tonight.",
  ],
};

const POUR_VOICE: CraftVoiceConfig = {
  persona:  "The Sommelier",
  title:    "Master Sommelier",
  rate:     0.82,
  pitch:    0.85,
  volume:   0.90,
  openingLines: [
    "Good evening. Every great spirit begins with a single, intentional pour.",
    "The barrel has been waiting. Now we find out what it kept.",
    "Strength, origin, finish — three questions. Let's answer them together.",
    "A sommelier is only as good as the guest they serve. I'm ready when you are.",
  ],
  stepLines: {
    leaf:    "We begin with the base spirit. Each origin carries the terroir of its distillery.",
    wrapper: "The aging vessel shapes everything that follows — oak imparts structure, sherry imparts sweetness.",
    vitola:  "Age statement is provenance. Longer aging rarely means better — it means different.",
    cut:     "The serve itself matters. Temperature, glass shape, and water ratio change the entire experience.",
    reveal:  "The nose has led us here. Now we interpret what the spirit is saying.",
  },
  educationLines: [
    "A new explorer. I'll guide carefully — spirits reveal themselves slowly to new palates.",
    "There is a language to spirits. Tonight I'll begin teaching it to you.",
    "Start with what appeals to your instinct. The intellect comes later.",
  ],
  evolutionLines: [
    "Your progression through spirit categories has been deliberate. That's rare.",
    "You've moved from sweeter profiles toward more structured ones. That's palate maturity.",
    "Your tasting notes have become more precise over time. I've noticed.",
  ],
};

const BREW_VOICE: CraftVoiceConfig = {
  persona:  "The Master Brewer",
  title:    "Head Brewer",
  rate:     0.88,
  pitch:    0.90,
  volume:   0.93,
  openingLines: [
    "Hey — glad you're here. Let's find your perfect pour.",
    "Craft beer is honest. What you taste is exactly what the brewer intended.",
    "The grain bill, the hops, the yeast — three variables, infinite results.",
    "Every great session starts with curiosity. You've got plenty. Let's go.",
  ],
  stepLines: {
    leaf:    "The grain bill is the foundation. Malt sweetness, roast depth, or wheat softness — pick your base.",
    wrapper: "Hop character defines the middle. Floral and citrus for bright sessions, resinous for depth.",
    vitola:  "ABV is honest. Session strength keeps you present; higher ABV opens complexity.",
    cut:     "The glassware shapes perception. A tulip glass concentrates aroma; a pint keeps it social.",
    reveal:  "The recipe has spoken. Here's what your palate has been building toward.",
  },
  educationLines: [
    "New to craft? Perfect. The best way to learn is to drink with intention.",
    "Start simple, build complexity. That's how every brewer learned too.",
    "There are no wrong preferences here — only undiscovered ones.",
  ],
  evolutionLines: [
    "You've crossed into Belgian territory since your last session. Bold move.",
    "Your hop tolerance has climbed significantly. That's real palate development.",
    "You started with lagers. Now you're asking about barrel-aged stouts. Remarkable.",
  ],
};

const VAPE_VOICE: CraftVoiceConfig = {
  persona:  "The Vape Artisan",
  title:    "Vapor Architect",
  rate:     0.92,
  pitch:    1.05,
  volume:   0.88,
  openingLines: [
    "The vapor dimension is wide open. Let's map your zone.",
    "Flavor, density, temperature — three dials. All yours.",
    "No two sessions are the same here. That's the point.",
    "Modern craft, ancient instinct. Let's find your signal.",
  ],
  stepLines: {
    leaf:    "Base flavor profile first. Fruit forward stays bright; dessert profiles go deep.",
    wrapper: "Nicotine calibration is your throttle. Start lower and climb — you can always go up.",
    vitola:  "Device wattage shapes cloud density and heat. Higher wattage opens intensity.",
    cut:     "Airflow control changes everything. Tight draw for intensity; open draw for cloud.",
    reveal:  "The vapor architecture is set. Here is your sensory blueprint.",
  },
  educationLines: [
    "New explorer — good. The vapor world is more nuanced than most expect.",
    "Start with fruit profiles; they're the most forgiving entry points.",
    "I'll map your preferences as we go. Nothing is locked in yet.",
  ],
  evolutionLines: [
    "Your flavor complexity has climbed across your sessions. You're past the beginner tier.",
    "You've started requesting lower nicotine with higher density. That's a deliberate shift.",
    "Your session notes show a consistent move toward dessert profiles. Your palate is settling.",
  ],
};

export const CRAFT_VOICE_CONFIGS: Record<CraftType, CraftVoiceConfig> = {
  smoke: SMOKE_VOICE,
  pour:  POUR_VOICE,
  brew:  BREW_VOICE,
  vape:  VAPE_VOICE,
};

export function getCraftVoice(type: CraftType | string): CraftVoiceConfig {
  return CRAFT_VOICE_CONFIGS[type as CraftType] ?? SMOKE_VOICE;
}

export function applyVoiceToUtterance(
  utterance: SpeechSynthesisUtterance,
  config: CraftVoiceConfig,
): void {
  utterance.rate   = config.rate;
  utterance.pitch  = config.pitch;
  utterance.volume = config.volume;
}

export function getOpeningLine(type: CraftType | string, seed?: number): string {
  const cfg   = getCraftVoice(type);
  const lines = cfg.openingLines;
  const idx   = seed !== undefined ? seed % lines.length : Math.floor(Math.random() * lines.length);
  return lines[idx]!;
}

export function getStaffLine(
  type: CraftType | string,
  isReturning: boolean,
  sessionCount: number,
): string {
  const cfg = getCraftVoice(type);
  if (isReturning && sessionCount > 1) {
    const lines = cfg.evolutionLines;
    return lines[Math.min(sessionCount - 2, lines.length - 1)]!;
  }
  const lines = cfg.educationLines;
  return lines[Math.floor(Math.random() * lines.length)]!;
}
