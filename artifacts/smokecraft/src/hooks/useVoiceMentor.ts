/**
 * useVoiceMentor — ElevenLabs mentor TTS. speak() is a no-op.
 *
 * Auto-play voice has been disabled. The helper functions
 * (getVoicePersona, saveVoicePersona, etc.) are kept intact for
 * any code that reads persona preferences without triggering audio.
 */

export type VoicePersona = "male" | "female";

const MENTOR_PERSONA: Record<string, "male" | "female"> = {
  traditionalist: "male",
  scientist:      "male",
  collector:      "male",
  social_expert:  "female",
  sommelier:      "female",
  rebel:          "male",
  default:        "female",
};

export function getVoicePersona(mentorId?: string): VoicePersona {
  if (!mentorId) return "female";
  return MENTOR_PERSONA[mentorId.toLowerCase()] ?? "female";
}

export function saveVoicePersona(persona: VoicePersona) {
  try { localStorage.setItem("axiom_voice_persona", persona); } catch { /* ignore */ }
}

export function loadVoicePersona(): VoicePersona {
  try {
    const stored = localStorage.getItem("axiom_voice_persona");
    return (stored === "male" || stored === "female") ? stored : "female";
  } catch { return "female"; }
}

export function isVoiceEnabled(): boolean {
  try { return localStorage.getItem("axiom_voice_enabled") !== "false"; } catch { return false; }
}

export function setVoiceEnabled(enabled: boolean) {
  try { localStorage.setItem("axiom_voice_enabled", enabled ? "true" : "false"); } catch { /* ignore */ }
}

interface VoiceMentorOptions {
  mentorId?: string;
}

const resolved = Promise.resolve();

export function useVoiceMentor(_opts: VoiceMentorOptions = {}) {
  return {
    speak:     (_text: string, _overrideMentorId?: string) => resolved,
    stop:      () => {},
    isPlaying: false,
    isLoading: false,
  };
}
