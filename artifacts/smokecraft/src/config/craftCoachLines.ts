/**
 * craftCoachLines.ts — static AI coach script library.
 *
 * Each craft has per-phase and per-event line arrays.
 * Phase events:  phase_intro | phase_style | phase_profile | phase_match
 * Reveal events: reveal_praise | reveal_challenge
 * Combo events:  bad_combo | good_combo
 *
 * The coach picks a random line from the matching array at runtime so
 * repeated plays feel fresh. Edit lines here without touching component logic.
 */

export type CoachEvent =
  | "phase_intro"
  | "phase_style"
  | "phase_profile"
  | "phase_match"
  | "reveal_praise"
  | "reveal_challenge"
  | "bad_combo"
  | "good_combo"
  | "idle"
  | "resume";

export type CraftCoachLines = Record<CoachEvent, string[]>;

/** Pick a random line from an array. */
export function pickCoachLine(lines: string[]): string {
  if (!lines.length) return "";
  return lines[Math.floor(Math.random() * lines.length)] ?? lines[0] ?? "";
}

const BASE: CraftCoachLines = {
  phase_intro: [
    "Welcome. Let's find your perfect pairing.",
    "I'll guide you through every step. Ready?",
    "Every great build starts with a single decision. Let's make it count.",
  ],
  phase_style: [
    "Here's what to look for — choose what moves you.",
    "Think about your evening. What character speaks to you?",
    "First impression matters. Which profile fits your night?",
  ],
  phase_profile: [
    "Interesting choice — that affects the balance.",
    "Now let's set the mood. This matters more than you think.",
    "Good. Now tell me how you want to feel.",
  ],
  phase_match: [
    "Let's see if this holds up.",
    "Running the match now. Hold tight.",
    "Searching for your ideal combination…",
  ],
  reveal_praise: [
    "Outstanding build. Your profile is dialed in.",
    "That's a strong combination. Well chosen.",
    "Excellent work. This pairing is built to impress.",
  ],
  reveal_challenge: [
    "You're close… but not there yet.",
    "Good effort. There's still room to refine.",
    "Interesting selection. Push further next time.",
  ],
  bad_combo: [
    "This pairing is pulling the profile off-balance.",
    "That combination creates tension. Let me offer some fixes.",
    "I'm seeing a conflict here. Consider adjusting.",
  ],
  good_combo: [
    "Now that's a winning combination.",
    "Strong choice — the profile is locking in beautifully.",
    "That pairing is working together. Keep going.",
  ],
  idle: [
    "Still thinking? The clock is ticking.",
    "Take your time — but not too much of it.",
    "I'm here when you're ready. The timer isn't as patient.",
  ],
  resume: [
    "Welcome back. Your session is right where you left it.",
    "Good to see you again. Let's pick up where we left off.",
    "Session restored. The clock is still running.",
  ],
};

export const CRAFT_COACH_LINES: Record<string, CraftCoachLines> = {
  smoke: {
    ...BASE,
    phase_style: [
      "Think body, draw, and occasion. What's your signature?",
      "Here's what to look for — consider the wrapper and blend character.",
      "Choose the profile that defines your ritual.",
    ],
    phase_profile: [
      "Interesting choice — that shapes the wrapper and body balance.",
      "Your mood pick shifts the entire character profile.",
      "The occasion defines everything. Choose wisely.",
    ],
    reveal_praise: [
      "Excellent build. Your blend is dialed in perfectly.",
      "That's a sophisticated combination. Your palate is refined.",
      "A true signature. This pairing speaks volumes.",
    ],
    bad_combo: [
      "This blend and occasion are pulling against each other.",
      "The character conflict is showing. Let me suggest a correction.",
      "That pairing creates unnecessary tension in the profile.",
    ],
    good_combo: [
      "That wrapper and strength are singing together.",
      "Exceptional profile — the blend is dialed in.",
      "Now that's a cigar worth building on.",
    ],
  },
  brew: {
    ...BASE,
    phase_style: [
      "Think hops, malt, and ABV. What speaks to tonight?",
      "Here's what to look for — choose the profile that fits your mood.",
      "Every pour has a personality. Which one are you?",
    ],
    phase_profile: [
      "Interesting choice — that affects the hop bitterness and finish.",
      "The mood shapes the pairing significantly. Choose deliberately.",
      "Good. Your beer style sets the stage.",
    ],
    reveal_praise: [
      "Perfect pour. The hop and malt balance is dialed in.",
      "That combination reads as refined. Well selected.",
      "Outstanding. Your palate led you to the right place.",
    ],
    good_combo: [
      "That hop profile and mood are in sync.",
      "Strong combination — this pours with purpose.",
      "The malt and character are aligning perfectly.",
    ],
  },
  pour: {
    ...BASE,
    phase_style: [
      "Think body, finish, and occasion. Each spirit tells a story.",
      "Here's what to look for — complexity rewards attention.",
      "Every great pour starts with intention.",
    ],
    phase_profile: [
      "Interesting — that spirit profile shifts the pairing significantly.",
      "The mood you pick defines the entire pour experience.",
      "Good. Now let the spirit match the moment.",
    ],
    reveal_praise: [
      "Perfect selection. The spirit and occasion align beautifully.",
      "That's a well-constructed pairing. Refined taste.",
      "Excellent pour. The complexity is fully realized.",
    ],
    good_combo: [
      "That finish and mood are a natural match.",
      "Strong build — the spirit is speaking clearly.",
      "The character and occasion are harmonizing.",
    ],
  },
  vape: {
    ...BASE,
    phase_style: [
      "Consider flavor intensity and throat hit when choosing.",
      "Here's what to look for — match the device to the vibe.",
      "Every session starts with the right profile.",
    ],
    phase_profile: [
      "Interesting — that flavor profile opens up different options.",
      "Your mood shapes the entire session experience.",
      "Good pick. Now let's lock in the experience.",
    ],
    reveal_praise: [
      "Perfect session profile. Flavor and mood are aligned.",
      "That pairing is dialed in. Smooth selection.",
      "Excellent. The intensity and occasion match perfectly.",
    ],
    good_combo: [
      "The flavor and mood are complementing each other.",
      "That profile is balanced well. Solid build.",
      "Everything is aligning — good instinct.",
    ],
  },
};

/** Get coach lines for a craft + event, falling back to the BASE set. */
export function getCoachLines(craft: string, event: CoachEvent): string[] {
  return CRAFT_COACH_LINES[craft]?.[event] ?? BASE[event];
}
