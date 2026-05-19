/**
 * useVoice — interface-compatible no-op stub.
 *
 * ElevenLabs TTS auto-play has been disabled. speak() returns immediately
 * without network calls or audio playback. The hook interface is preserved
 * so all existing call sites compile without changes.
 */
import type { VoicePersona } from "@/services/api";

export interface UseVoiceState {
  isSpeaking:  boolean;
  isLoading:   boolean;
  error:       string | null;
  speak:       (text: string, persona?: VoicePersona) => Promise<void>;
  stop:        () => void;
}

const resolved = Promise.resolve();

export function useVoice(): UseVoiceState {
  return {
    isSpeaking: false,
    isLoading:  false,
    error:      null,
    speak:      (_text, _persona) => resolved,
    stop:       () => {},
  };
}
