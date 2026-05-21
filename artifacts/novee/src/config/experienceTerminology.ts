export type TermContext =
  | "onboarding"
  | "pairing"
  | "vip"
  | "training"
  | "general"
  | "button"
  | "status";

export interface TermMap {
  primary: string;
  contexts: Partial<Record<TermContext, string>>;
}

export const TERMINOLOGY: Record<string, TermMap> = {
  session_start: {
    primary: "Begin Experience",
    contexts: {
      onboarding: "Begin Experience",
      vip: "Start Signature Experience",
      button: "BEGIN EXPERIENCE",
      training: "Start Craft Sequence",
    },
  },
  session_active: {
    primary: "Smoke Session",
    contexts: {
      onboarding: "Guided Blend",
      pairing: "Tasting Flow",
      vip: "Signature Experience",
      training: "Craft Sequence",
    },
  },
  pairing_flow: {
    primary: "Flavor Path",
    contexts: {
      pairing: "Flavor Path",
      vip: "Reserve Pairing",
      onboarding: "Guided Pairing",
      training: "Pairing Sequence",
    },
  },
  guided_experience: {
    primary: "Guided Blend",
    contexts: {
      onboarding: "Guided Blend",
      pairing: "Tasting Flow",
      vip: "Signature Experience",
      training: "Craft Sequence",
      general: "Guided Experience",
    },
  },
  experience_complete: {
    primary: "Session Complete",
    contexts: {
      vip: "Signature Experience Complete",
      training: "Craft Sequence Complete",
      general: "Session Complete",
    },
  },
  enter_cta: {
    primary: "Begin",
    contexts: {
      onboarding: "Begin Experience",
      vip: "Enter Signature Suite",
      button: "BEGIN",
      training: "Start Sequence",
    },
  },
};

export function getTerm(
  key: keyof typeof TERMINOLOGY,
  context: TermContext = "general",
  uppercase = false
): string {
  const map = TERMINOLOGY[key];
  if (!map) return key;
  const resolved = map.contexts[context] ?? map.primary;
  return uppercase ? resolved.toUpperCase() : resolved;
}

export const BANNED_TERMS = [
  "sacred ritual",
  "ceremonial flow",
  "ceremonial pairing",
  "ritual initiated",
  "sacred blend",
  "enter the ritual",
  "the ritual begins",
  "ritual of smoke",
] as const;

export const REPLACEMENT_MAP: Record<string, string> = {
  "sacred ritual": "guided experience",
  "ceremonial flow": "tasting flow",
  "ceremonial pairing": "guided pairing",
  "ritual initiated": "session started",
  "sacred blend": "signature blend",
  "enter the ritual": "begin experience",
  "the ritual begins": "the experience begins",
  "ritual of smoke": "smoke session",
  ritual: "experience",
};

export function normalizeTerminology(text: string): string {
  let result = text;
  for (const [banned, replacement] of Object.entries(REPLACEMENT_MAP)) {
    const regex = new RegExp(banned, "gi");
    result = result.replace(regex, (match) => {
      if (match[0] === match[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  }
  return result;
}
