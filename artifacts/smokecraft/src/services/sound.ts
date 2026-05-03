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
 */

const CLICK_SRC  = "/sounds/click.mp3";
const SWIPE_SRC  = "/sounds/swipe.mp3";
const SELECT_SRC = "/sounds/select.mp3";
// Fallback used until dedicated swipe.mp3 / select.mp3 are added to /public/sounds.
const FALLBACK_SRC = "/sounds/startup.mp3";

const MUTE_KEY = "smokecraft_sound_muted";

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
  if (!unlocked || isMuted()) return;
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
