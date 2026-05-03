import { useCallback, useEffect, useRef } from "react";

/**
 * useBrowserSpeech — zero-cost, zero-latency wrapper around the browser's
 * native Web Speech API (`window.speechSynthesis`).
 *
 * Distinct from `useVoice` (server-side ElevenLabs TTS via /api/voice):
 *   - useVoice       → premium narrator voice, network round-trip, rate-limited,
 *                      costs money per character. Right for *content* lines
 *                      ("Your pairing: Velvet Ember Session, paired with…").
 *   - useBrowserSpeech → built-in OS voice, instant, free, no network. Right
 *                        for *ambient kiosk cues* where latency matters more
 *                        than fidelity ("Select your experience.", per-card
 *                        hover hints, "Entering SmokeCraft.").
 *
 * Behaviors:
 *   - Auto-cancels any in-flight utterance before starting a new one, so
 *     rapid hovers don't queue up a backlog of lines that would still be
 *     playing minutes later.
 *   - No-ops on SSR and on browsers that lack speechSynthesis support.
 *   - Respects `prefers-reduced-motion: reduce` (kiosk operators set this
 *     system-wide to disable ambient motion AND voice). Pass
 *     `forceSpeak: true` to override for specific must-say cues.
 *   - Cancels any in-flight utterance on unmount so a tab navigation away
 *     mid-sentence doesn't leave the synthesizer holding the queue.
 *
 * The supported / reduced-motion checks are stored in refs read at
 * speak-time (not in deps) so callers can wrap `speak` in stable handlers
 * without re-creating them on every prefers-reduced-motion media change.
 */
export interface BrowserSpeechOptions {
  /** Playback rate, 0.1 – 10. Default 0.95 (slightly slower than natural,
   *  reads as composed/intentional rather than rushed). */
  rate?: number;
  /** Pitch, 0 – 2. Default 0.9 (a touch lower than default, reads as calm). */
  pitch?: number;
  /** Volume, 0 – 1. Default 0.45 (medium-low; ambient cue, never dominates). */
  volume?: number;
  /** When true, ignore `prefers-reduced-motion`. Default false. */
  forceSpeak?: boolean;
}

export interface UseBrowserSpeech {
  /** Speak immediately, cancelling any in-flight utterance. Silent no-op
   *  on unsupported browsers / when reduced motion is set / on empty text. */
  speak: (text: string) => void;
  /** Cancel any in-flight or queued utterance. */
  cancel: () => void;
  /** True if the browser supports speechSynthesis. Useful for branching
   *  UI that wants to hide a "tap to hear" affordance on unsupported clients. */
  supported: boolean;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function useBrowserSpeech(opts: BrowserSpeechOptions = {}): UseBrowserSpeech {
  const { rate = 0.95, pitch = 0.9, volume = 0.45, forceSpeak = false } = opts;

  const supportedRef = useRef<boolean>(
    typeof window !== "undefined" && "speechSynthesis" in window,
  );
  const reducedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    reducedRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => { reducedRef.current = e.matches; };
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      /* Cancel anything in flight on unmount so route changes mid-sentence
       * don't leave the synthesizer holding the queue. */
      try { window.speechSynthesis?.cancel(); } catch { /* never throw on a voice cue */ }
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!supportedRef.current) return;
    if (reducedRef.current && !forceSpeak) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(trimmed);
      u.rate = rate;
      u.pitch = pitch;
      u.volume = volume;
      window.speechSynthesis.speak(u);
    } catch { /* never break the page over an ambient voice cue */ }
  }, [rate, pitch, volume, forceSpeak]);

  const cancel = useCallback(() => {
    if (!supportedRef.current) return;
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }, []);

  return { speak, cancel, supported: supportedRef.current };
}
