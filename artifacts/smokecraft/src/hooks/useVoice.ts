import { useCallback, useEffect, useRef, useState } from "react";
import { fetchVoiceAudio, type VoicePersona } from "@/services/api";

/**
 * useVoice — minimal ElevenLabs TTS hook.
 *
 *  Lifecycle:
 *   - speak(text)     → fetch audio blob, play via <Audio>
 *   - stop()          → halt playback + revoke blob URL
 *   - on unmount      → cleans up any in-flight URL/audio element
 *
 *  Failure surface: `error` is set to a stable code string
 *  ("voice_not_configured", "voice_upstream_failed", network, etc.) so
 *  the UI can decide whether to show a CTA or just stay silent.
 *
 *  Designed so the right-panel can call `speak()` opportunistically
 *  (e.g. after a recommendation lands) and silently degrade when the
 *  ElevenLabs connector isn't authorized yet.
 */
export interface UseVoiceState {
  isSpeaking:  boolean;
  isLoading:   boolean;
  error:       string | null;
  speak:       (text: string, persona?: VoicePersona) => Promise<void>;
  stop:        () => void;
}

export function useVoice(): UseVoiceState {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef   = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setIsSpeaking(false);
  }, [cleanup]);

  const speak = useCallback(
    async (text: string, persona: VoicePersona = "female") => {
      if (!text.trim()) return;
      cleanup();
      setError(null);
      setIsLoading(true);
      try {
        const blob = await fetchVoiceAudio({ text, persona });
        const url  = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { setIsSpeaking(false); cleanup(); };
        audio.onerror = () => {
          setError("voice_playback_failed");
          setIsSpeaking(false);
          cleanup();
        };
        await audio.play();
        setIsSpeaking(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "voice_failed");
        setIsSpeaking(false);
      } finally {
        setIsLoading(false);
      }
    },
    [cleanup],
  );

  useEffect(() => () => cleanup(), [cleanup]);

  return { isSpeaking, isLoading, error, speak, stop };
}
