/**
 * useBrowserSpeech — interface-compatible no-op stub.
 *
 * The HTML5 Web Speech API (window.speechSynthesis) has been fully removed
 * from this application. All calls to speak() / cancel() are silent no-ops.
 * The `supported` flag is permanently false so any opt-in UI affordances
 * (e.g. "tap to hear") correctly hide themselves.
 */

export interface BrowserSpeechOptions {
  rate?:       number;
  pitch?:      number;
  volume?:     number;
  forceSpeak?: boolean;
}

export interface UseBrowserSpeech {
  speak:     (text: string) => void;
  cancel:    () => void;
  supported: boolean;
}

const noop = () => {};

export function useBrowserSpeech(_opts: BrowserSpeechOptions = {}): UseBrowserSpeech {
  return { speak: noop, cancel: noop, supported: false };
}
