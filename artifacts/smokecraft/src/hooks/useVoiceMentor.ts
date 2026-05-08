/**
 * useVoiceMentor — Mentor text-to-speech via /api/voice/speak (ElevenLabs).
 *
 * Maps mentor IDs to voice personas and streams audio back to the browser.
 * Plays via a transient <audio> element — no Web Audio API needed.
 *
 * Usage:
 *   const { speak, stop, isPlaying } = useVoiceMentor();
 *   speak("Welcome to SmokeCraft. I sense bold preferences in your future.");
 */

import { useCallback, useRef, useState } from "react";

// ── Mentor → voice persona mapping ────────────────────────────────────────────

const MENTOR_PERSONA: Record<string, "male" | "female"> = {
  traditionalist: "male",
  scientist:      "male",
  collector:      "male",
  social_expert:  "female",
  sommelier:      "female",
  rebel:          "male",
  default:        "female",
};

// Optional voiceId overrides — when the venue has configured specific ElevenLabs IDs
const MENTOR_VOICE_ID: Record<string, string | undefined> = {
  // Populated from venue settings; empty = use default persona
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const MAX_CHARS = 280;

// ── Voice preference helpers ──────────────────────────────────────────────────

export type VoicePersona = "male" | "female";

export function getVoicePersona(mentorId?: string): VoicePersona {
  if (!mentorId) return "female";
  return MENTOR_PERSONA[mentorId.toLowerCase()] ?? "female";
}

export function saveVoicePersona(persona: VoicePersona) {
  localStorage.setItem("axiom_voice_persona", persona);
}

export function loadVoicePersona(): VoicePersona {
  const stored = localStorage.getItem("axiom_voice_persona");
  return (stored === "male" || stored === "female") ? stored : "female";
}

export function isVoiceEnabled(): boolean {
  return localStorage.getItem("axiom_voice_enabled") !== "false";
}

export function setVoiceEnabled(enabled: boolean) {
  localStorage.setItem("axiom_voice_enabled", enabled ? "true" : "false");
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface VoiceMentorOptions {
  mentorId?: string;
}

export function useVoiceMentor(opts: VoiceMentorOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef                  = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef                = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  const speak = useCallback(async (text: string, overrideMentorId?: string) => {
    if (!isVoiceEnabled()) return;

    // Stop any current playback
    stop();

    const clipped = text.trim().slice(0, MAX_CHARS);
    if (!clipped) return;

    const mentorId  = overrideMentorId ?? opts.mentorId;
    const persona   = loadVoicePersona() || getVoicePersona(mentorId);
    const voiceId   = mentorId ? MENTOR_VOICE_ID[mentorId] : undefined;

    setIsLoading(true);

    try {
      const body: Record<string, string> = { text: clipped, persona };
      if (voiceId) body.voiceId = voiceId;

      const res = await fetch(`${BASE}/api/voice/speak`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        // Voice not configured — silently fail (non-critical feature)
        setIsLoading(false);
        return;
      }

      const blob   = await res.blob();
      const url    = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio  = new Audio(url);
      audioRef.current = audio;

      audio.oncanplay  = () => { setIsLoading(false); setIsPlaying(true); };
      audio.onended    = () => {
        setIsPlaying(false);
        if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
      };
      audio.onerror    = () => { setIsLoading(false); setIsPlaying(false); };

      await audio.play();
    } catch {
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [opts.mentorId, stop]);

  return { speak, stop, isPlaying, isLoading };
}
