/**
 * sound.ts — kiosk audio feedback layer
 *
 * Tiny, dependency-free helper for short UI sounds (click / swipe / select).
 * Designed for the SmokeCraft kiosk:
 *
 * • Lazy-instantiated <Audio> elements (no file loaded until first play call).
 * • Each sound clones a fresh node per play so rapid-fire taps don't cut each
 *   other off (replaying the same node mid-play resets it and clicks).
 * • Honours a global mute flag persisted to localStorage
 *   (`smokecraft_sound_muted=1`). Dashboards toggle this; default is unmuted.
 * • Honours a one-time "audio unlocked" flag — most browsers refuse to play
 *   audio until a user gesture has occurred. We arm the unlock on the first
 *   pointerdown anywhere in the document.
 * • All play() calls swallow errors silently — audio failure must never break
 *   a kiosk interaction.
 *
 * Public file paths (in artifacts/smokecraft/public/sounds/):
 *   click.mp3   — short tap (~50ms)
 *   swipe.mp3   — soft whoosh (~150ms) — falls back to startup.mp3 if missing
 *   select.mp3  — premium confirm chime — falls back to startup.mp3 if missing
 *
 * playSFX() — synthesized tones via Web Audio API, no file assets required.
 *   tap     — soft click (card interaction)
 *   swoosh  — phase transition sweep
 *   error   — dissonant pulse (bad combo)
 *   success — ascending chime (score milestone)
 */

const CLICK_SRC  = "/sounds/click.mp3";
// swipe + select are procedurally synthesised PCM WAVs (see scripts/genSounds)
// — small (~6KB / ~16KB), zero-licence, perceptually correct kiosk feedback.
const SWIPE_SRC  = "/sounds/swipe.wav";
const SELECT_SRC = "/sounds/select.wav";
// Fallback used if a sound file is missing entirely.
const FALLBACK_SRC = "/sounds/click.mp3";

const MUTE_KEY       = "smokecraft_sound_muted";
const COACH_MUTE_KEY = "craft_coach_muted";

let unlocked = false;

/** Browsers block audio until a user gesture. Wire one-shot unlock. */
if (typeof window !== "undefined") {
  const arm = () => {
    unlocked = true;
    window.removeEventListener("pointerdown", arm);
    window.removeEventListener("keydown",     arm);
    window.removeEventListener("touchstart",  arm);
  };
  window.addEventListener("pointerdown", arm, { once: true, passive: true });
  window.addEventListener("keydown",     arm, { once: true });
  window.addEventListener("touchstart",  arm, { once: true, passive: true });
}

export function isMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

export function setMuted(muted: boolean): void {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, "1");
    else       localStorage.removeItem(MUTE_KEY);
  } catch { /* private mode — ignore */ }
}

/** Coach-specific mute persisted under a separate key from the card-tap mute. */
export function isCoachMuted(): boolean {
  try { return localStorage.getItem(COACH_MUTE_KEY) === "1"; } catch { return false; }
}

export function setCoachMuted(muted: boolean): void {
  try {
    if (muted) localStorage.setItem(COACH_MUTE_KEY, "1");
    else       localStorage.removeItem(COACH_MUTE_KEY);
  } catch { /* private mode — ignore */ }
}

/** Cache one HEAD probe per src so we know whether to fall back. */
const existsCache = new Map<string, boolean>();
async function exists(src: string): Promise<boolean> {
  const cached = existsCache.get(src);
  if (cached !== undefined) return cached;
  try {
    const res = await fetch(src, { method: "HEAD" });
    const ok  = res.ok;
    existsCache.set(src, ok);
    return ok;
  } catch {
    existsCache.set(src, false);
    return false;
  }
}

async function play(src: string, volume = 0.55): Promise<void> {
  if (typeof window === "undefined") return;
  if (!unlocked || isMuted() || isCoachMuted()) return;
  const ok = await exists(src);
  const finalSrc = ok ? src : FALLBACK_SRC;
  try {
    const a = new Audio(finalSrc);
    a.volume = volume;
    await a.play();
  } catch { /* never let audio break the UI */ }
}

export function playClick():  void { void play(CLICK_SRC,  0.45); }
export function playSwipe():  void { void play(SWIPE_SRC,  0.55); }
export function playSelect(): void { void play(SELECT_SRC, 0.65); }

// ---------------------------------------------------------------------------
// Web Audio API — synthesized SFX (no external file assets)
// ---------------------------------------------------------------------------

/** Lazily-created shared AudioContext. Recreated if closed (e.g. after suspend). */
let _audioCtx: AudioContext | null = null;

function getSFXContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_audioCtx || _audioCtx.state === "closed") {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      _audioCtx = new Ctor();
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

export type SFXType = "tap" | "swoosh" | "error" | "success" | "tick";

/**
 * Play a short synthesized tone — no file assets required.
 * Gated on the same `unlocked` flag and the coach-specific mute.
 */
export function playSFX(type: SFXType): void {
  if (typeof window === "undefined") return;
  if (!unlocked || isCoachMuted()) return;
  const ctx = getSFXContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (type === "tap") {
      // Soft click: brief sine burst at 820 Hz, 50 ms
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(820, now);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc.start(now);
      osc.stop(now + 0.055);
      return;
    }

    if (type === "swoosh") {
      // Descending frequency sweep 620 → 180 Hz, 220 ms
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
      return;
    }

    if (type === "error") {
      // Dissonant descending sawtooth pulse, 180 ms
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(155, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);
      gain.gain.setValueAtTime(0.10, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
      return;
    }

    if (type === "success") {
      // Ascending chime: C4 → E4 → G4 (261 → 330 → 392 Hz), staggered 100 ms apart
      const freqs   = [261.63, 329.63, 392.0];
      const spacing = 0.1;
      freqs.forEach((freq, i) => {
        const t    = now + i * spacing;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.13, t + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.start(t);
        osc.stop(t + 0.22);
      });
      return;
    }

    if (type === "tick") {
      // Sharp, brief high-pitch click: 1350 Hz sine, 22 ms — subtle countdown cue
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(1350, now);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);
      osc.start(now);
      osc.stop(now + 0.022);
    }
  } catch { /* never let audio failures surface */ }
}
