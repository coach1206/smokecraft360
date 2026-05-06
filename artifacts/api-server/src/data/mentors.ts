/**
 * Static mentor roster for the Human Foundation enrollment system.
 *
 * Mentors are fictional personas assigned to guests during kiosk enrollment
 * based on craftType + declared palate preferences (boldness, atmosphere,
 * experience level).  Assignment is deterministic given the same inputs.
 *
 * Each mentor has:
 *   id          — kebab-case, stable across deploys
 *   craftType   — "smoke" | "pour" | "brew" | "vape"
 *   style       — "balanced" | "bold" | "smooth" | "aromatic"
 *                 (drives assignment matching against boldnessPreference)
 *   greeting    — first-person line shown on the MentorReveal screen
 *   philosophy  — short descriptor shown under their name
 */

export type MentorStyle = "balanced" | "bold" | "smooth" | "aromatic";

export interface Mentor {
  id:         string;
  name:       string;
  craftType:  "smoke" | "pour" | "brew" | "vape";
  origin:     string;
  philosophy: string;
  style:      MentorStyle;
  greeting:   string;
  traits:     string[];
}

export const MENTORS: Mentor[] = [
  // ── SmokeCraft ────────────────────────────────────────────────────────────
  {
    id:         "juan-valez",
    name:       "Juan Valez",
    craftType:  "smoke",
    origin:     "Dominican-inspired",
    philosophy: "Earthy · Patient · Old-world balance",
    style:      "balanced",
    greeting:   "Every great cigar tells you when to slow down. I'm here to help you hear it.",
    traits:     ["patient", "earthy", "methodical"],
  },
  {
    id:         "mateo-cruz",
    name:       "Mateo Cruz",
    craftType:  "smoke",
    origin:     "Nicaraguan-inspired",
    philosophy: "Bold · Spice-forward · Unapologetic",
    style:      "bold",
    greeting:   "You didn't come here to play it safe. Let's find something with teeth.",
    traits:     ["bold", "experimental", "direct"],
  },
  {
    id:         "elena-rosario",
    name:       "Elena Rosario",
    craftType:  "smoke",
    origin:     "Cuban-inspired",
    philosophy: "Elegant · Slow · Classic restraint",
    style:      "smooth",
    greeting:   "The best experiences are never rushed. I'll guide you toward something timeless.",
    traits:     ["elegant", "measured", "classic"],
  },
  {
    id:         "lucia-navarro",
    name:       "Lucia Navarro",
    craftType:  "smoke",
    origin:     "Ecuadorian-inspired",
    philosophy: "Refined aroma · Layered complexity · Precision",
    style:      "aromatic",
    greeting:   "Aroma is the first chapter. I'm going to walk you through the entire story.",
    traits:     ["refined", "aromatic", "precise"],
  },

  // ── PourCraft ─────────────────────────────────────────────────────────────
  {
    id:         "lucien-ward",
    name:       "Lucien Ward",
    craftType:  "pour",
    origin:     "Scotch & barrel-aged tradition",
    philosophy: "Depth through patience · Oak speaks last",
    style:      "balanced",
    greeting:   "The barrel aged it for years. We owe it at least a few moments of attention.",
    traits:     ["patient", "sophisticated", "considered"],
  },
  {
    id:         "dante-vale",
    name:       "Dante Vale",
    craftType:  "pour",
    origin:     "American bourbon heritage",
    philosophy: "Bold architecture · Heat with intention",
    style:      "bold",
    greeting:   "Bourbon isn't shy. Neither am I. Let's find something that makes a statement.",
    traits:     ["bold", "warm", "direct"],
  },
  {
    id:         "sofia-maren",
    name:       "Sofia Maren",
    craftType:  "pour",
    origin:     "European pairing tradition",
    philosophy: "Pairing intelligence · Atmosphere over proof",
    style:      "smooth",
    greeting:   "The right pour isn't the strongest one — it's the one that fits the moment.",
    traits:     ["elegant", "perceptive", "pairing-focused"],
  },

  // ── BrewCraft ─────────────────────────────────────────────────────────────
  {
    id:         "elias-mercer",
    name:       "Elias Mercer",
    craftType:  "brew",
    origin:     "Traditional craft brewing",
    philosophy: "Heritage fermentation · Malt as foundation",
    style:      "balanced",
    greeting:   "Good beer is honest. I'll show you where tradition and craft meet.",
    traits:     ["traditional", "precise", "patient"],
  },
  {
    id:         "nina-volkov",
    name:       "Nina Volkov",
    craftType:  "brew",
    origin:     "Experimental fermentation",
    philosophy: "Boundary-pushing · Wild yeast · No rules",
    style:      "bold",
    greeting:   "The most interesting beers aren't on any menu. Let's build your palette.",
    traits:     ["experimental", "creative", "unconventional"],
  },

  // ── VapeCraft ─────────────────────────────────────────────────────────────
  {
    id:         "kai-renner",
    name:       "Kai Renner",
    craftType:  "vape",
    origin:     "Modern flavor architecture",
    philosophy: "Contemporary vapor engineering · Layered intensity",
    style:      "bold",
    greeting:   "Vapor is the newest craft. I'm here to show you what intentional design tastes like.",
    traits:     ["modern", "technical", "bold"],
  },
  {
    id:         "selene-voss",
    name:       "Selene Voss",
    craftType:  "vape",
    origin:     "Cooling-profile chemistry",
    philosophy: "Balance through controlled cooling · Refinement first",
    style:      "smooth",
    greeting:   "Subtlety is the hardest thing to engineer. I've spent years getting it right.",
    traits:     ["precise", "cool", "refined"],
  },
];

/**
 * Assign a mentor based on craftType + declared preferences.
 * Priority: boldnessPreference style match → any craft mentor fallback.
 */
export function assignMentor(params: {
  craftType:           string;
  boldnessPreference?: string;
  atmospherePreference?: string;
  experienceLevel?:    string;
}): string {
  const { craftType, boldnessPreference } = params;

  const craftMentors = MENTORS.filter(m => m.craftType === craftType);
  if (craftMentors.length === 0) return MENTORS[0].id;

  // Map declared boldness → mentor style
  const styleMap: Record<string, MentorStyle> = {
    smooth:      "smooth",
    balanced:    "balanced",
    bold:        "bold",
    adventurous: "bold",
    aromatic:    "aromatic",
  };

  const targetStyle = boldnessPreference ? styleMap[boldnessPreference] : "balanced";

  const match = craftMentors.find(m => m.style === targetStyle);
  if (match) return match.id;

  // Fallback: balanced mentor for the craft, then first mentor
  const balanced = craftMentors.find(m => m.style === "balanced");
  return balanced?.id ?? craftMentors[0].id;
}

export function getMentorById(id: string): Mentor | undefined {
  return MENTORS.find(m => m.id === id);
}
