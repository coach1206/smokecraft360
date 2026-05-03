import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useMic — thin wrapper over the Web Speech API (SpeechRecognition).
 *
 * Returns interim + final transcripts. When the browser doesn't expose
 * SpeechRecognition (older Firefox / privacy-locked builds), `supported`
 * is false and `start()` becomes a no-op so callers can render a hidden
 * mic button instead of crashing.
 *
 * Permissions: SpeechRecognition triggers the same mic permission prompt
 * as getUserMedia on first start(). We don't pre-warm — let the OS UI
 * handle consent the first time the user taps the button.
 */
export interface UseMicState {
  supported:    boolean;
  isListening:  boolean;
  transcript:   string;
  error:        string | null;
  start:        (lang?: string) => void;
  stop:         () => void;
  reset:        () => void;
}

interface SRConstructor {
  new (): SpeechRecognitionLike;
}
interface SpeechRecognitionLike {
  lang:           string;
  interimResults: boolean;
  continuous:     boolean;
  onresult:       ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror:        ((e: { error: string }) => void) | null;
  onend:          (() => void) | null;
  start():        void;
  stop():         void;
}

function getSR(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?:        SRConstructor;
    webkitSpeechRecognition?:  SRConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useMic(): UseMicState {
  const SR = getSR();
  const [supported]                 = useState(SR !== null);
  const [isListening, setListening] = useState(false);
  const [transcript,  setTranscript] = useState("");
  const [error,       setError]     = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* already stopped */ }
    setListening(false);
  }, []);

  const start = useCallback((lang: string = "en-US") => {
    if (!SR) return;
    setError(null);
    setTranscript("");
    const rec = new SR();
    rec.lang           = lang;
    rec.interimResults = true;
    rec.continuous     = false;
    rec.onresult = (e) => {
      let finalText = "";
      for (let i = 0; i < e.results.length; i++) {
        finalText += e.results[i]![0].transcript;
      }
      setTranscript(finalText.trim());
    };
    rec.onerror = (e) => {
      setError(e.error || "mic_error");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); setListening(true); }
    catch (err) {
      setError(err instanceof Error ? err.message : "mic_start_failed");
      setListening(false);
    }
  }, [SR]);

  const reset = useCallback(() => { setTranscript(""); setError(null); }, []);

  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* */ } }, []);

  return { supported, isListening, transcript, error, start, stop, reset };
}
