/**
 * soundEngine — Howler.js-powered ambient + interaction sound system.
 *
 * Architecture:
 *   - One ambient loop per craft type (crossfades on craft switch)
 *   - Interaction sounds: swipeAdd, swipeSkip, revealStart, orderConfirm
 *   - Lazy init: nothing plays until first user interaction
 *   - All sounds fade in/out — no hard cuts
 *   - Volume adaptive: respects system mute + user preference
 *
 * Sound files:
 *   Place audio files in /public/sounds/ to activate.
 *   Engine gracefully degrades if files are missing (no errors thrown).
 *
 * File naming convention:
 *   /public/sounds/ambient_smoke.mp3
 *   /public/sounds/ambient_pour.mp3
 *   /public/sounds/ambient_brew.mp3
 *   /public/sounds/ambient_vape.mp3
 *   /public/sounds/swipe_add.mp3
 *   /public/sounds/swipe_skip.mp3
 *   /public/sounds/reveal_start.mp3
 *   /public/sounds/order_confirm.mp3
 */

import { Howl, Howler } from "howler";
import type { CraftType } from "./environmentEngine";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_PATH = "/sounds";

const AMBIENT_CONFIG: Record<CraftType, {
  src:        string[];
  volume:     number;
  loop:       boolean;
  description: string;
}> = {
  smoke: {
    src:         [`${BASE_PATH}/ambient_smoke.mp3`, `${BASE_PATH}/ambient_smoke.ogg`],
    volume:      0.18,
    loop:        true,
    description: "Ember crackle, low jazz ambience, subtle lounge",
  },
  pour: {
    src:         [`${BASE_PATH}/ambient_pour.mp3`, `${BASE_PATH}/ambient_pour.ogg`],
    volume:      0.16,
    loop:        true,
    description: "Ice clink, whiskey pour, ambient piano",
  },
  brew: {
    src:         [`${BASE_PATH}/ambient_brew.mp3`, `${BASE_PATH}/ambient_brew.ogg`],
    volume:      0.20,
    loop:        true,
    description: "Soft crowd energy, carbonation hiss, glass taps",
  },
  vape: {
    src:         [`${BASE_PATH}/ambient_vape.mp3`, `${BASE_PATH}/ambient_vape.ogg`],
    volume:      0.14,
    loop:        true,
    description: "Ambient synth, vapor inhale, low atmospheric hum",
  },
};

const INTERACTION_CONFIG: Record<string, {
  src:    string[];
  volume: number;
  description: string;
}> = {
  swipeAdd: {
    src:         [`${BASE_PATH}/swipe_add.mp3`, `${BASE_PATH}/swipe_add.ogg`],
    volume:      0.30,
    description: "Satisfying add confirmation",
  },
  swipeSkip: {
    src:         [`${BASE_PATH}/swipe_skip.mp3`, `${BASE_PATH}/swipe_skip.ogg`],
    volume:      0.18,
    description: "Soft skip whoosh",
  },
  revealStart: {
    src:         [`${BASE_PATH}/reveal_start.mp3`, `${BASE_PATH}/reveal_start.ogg`],
    volume:      0.35,
    description: "Cinematic reveal swell",
  },
  orderConfirm: {
    src:         [`${BASE_PATH}/order_confirm.mp3`, `${BASE_PATH}/order_confirm.ogg`],
    volume:      0.40,
    description: "Satisfying order confirmation chime",
  },
};

const FADE_DURATION_MS = 1800;
const USER_VOLUME_KEY  = "axiom_sfx_volume";

// ── Sound Engine ──────────────────────────────────────────────────────────────

class SoundEngine {
  private initialized  = false;
  private muted        = false;
  private userVolume   = 0.7;           // 0–1 master multiplier
  private currentCraft: CraftType | null = null;
  private ambientHowl:  Howl | null     = null;
  private interactionHowls: Map<string, Howl> = new Map();

  // ── Init ────────────────────────────────────────────────────────────────────

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.userVolume  = this.loadVolume();
    Howler.volume(this.muted ? 0 : this.userVolume);
  }

  private loadVolume(): number {
    try {
      const v = localStorage.getItem(USER_VOLUME_KEY);
      return v ? Math.max(0, Math.min(1, parseFloat(v))) : 0.7;
    } catch { return 0.7; }
  }

  private saveVolume(): void {
    try { localStorage.setItem(USER_VOLUME_KEY, String(this.userVolume)); } catch {}
  }

  // ── Ambient loops ────────────────────────────────────────────────────────────

  switchCraft(craft: CraftType): void {
    if (!this.initialized || this.currentCraft === craft) return;
    const prev = this.ambientHowl;
    if (prev) {
      prev.fade(prev.volume() as number, 0, FADE_DURATION_MS);
      setTimeout(() => { prev.stop(); prev.unload(); }, FADE_DURATION_MS + 100);
    }
    this.currentCraft = craft;
    this.ambientHowl  = this.createAmbient(craft);
  }

  private createAmbient(craft: CraftType): Howl {
    const config = AMBIENT_CONFIG[craft];
    const howl   = new Howl({
      src:    config.src,
      loop:   config.loop,
      volume: 0,
      html5:  true,             // streaming for ambient loops
      onloaderror: () => {
        // Silently skip if file missing — architecture is ready, files not yet added
      },
    });
    const targetVol = config.volume * this.userVolume * (this.muted ? 0 : 1);
    howl.play();
    howl.fade(0, targetVol, FADE_DURATION_MS);
    return howl;
  }

  // ── Interaction sounds ───────────────────────────────────────────────────────

  play(soundKey: keyof typeof INTERACTION_CONFIG): void {
    if (!this.initialized || this.muted) return;
    const config = INTERACTION_CONFIG[soundKey];
    if (!config) return;

    let howl = this.interactionHowls.get(soundKey);
    if (!howl) {
      howl = new Howl({
        src:         config.src,
        volume:      config.volume * this.userVolume,
        preload:     true,
        onloaderror: () => { /* graceful degradation */ },
      });
      this.interactionHowls.set(soundKey, howl);
    }
    howl.play();
  }

  // Convenience aliases
  swipeAdd()     { this.play("swipeAdd");     }
  swipeSkip()    { this.play("swipeSkip");    }
  revealStart()  { this.play("revealStart");  }
  orderConfirm() { this.play("orderConfirm"); }

  // ── Volume + mute ────────────────────────────────────────────────────────────

  setVolume(v: number): void {
    this.userVolume = Math.max(0, Math.min(1, v));
    this.saveVolume();
    if (!this.muted) Howler.volume(this.userVolume);
    if (this.ambientHowl && this.currentCraft) {
      const target = AMBIENT_CONFIG[this.currentCraft].volume * this.userVolume;
      this.ambientHowl.fade(this.ambientHowl.volume() as number, target, 400);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    Howler.mute(muted);
  }

  isMuted(): boolean { return this.muted; }
  getVolume(): number { return this.userVolume; }

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  destroy(): void {
    this.ambientHowl?.stop();
    this.ambientHowl?.unload();
    this.interactionHowls.forEach(h => { h.stop(); h.unload(); });
    this.interactionHowls.clear();
    this.initialized = false;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const soundEngine = new SoundEngine();
