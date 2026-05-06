/**
 * Axiom OS — Audio Engine
 *
 * Tiny Web Audio API sound layer — zero external dependencies.
 * All sounds are synthesised procedurally so the bundle stays lean.
 *
 * Usage:
 *   import { playClick, playClink, setAudioEnabled, getAudioEnabled } from "@/lib/audioEngine";
 *
 * The global enabled flag survives across components but is NOT persisted
 * to storage — it resets each session.  Wire setAudioEnabled() to a toggle
 * control in the UI to expose the preference.
 */

let ctx: AudioContext | null = null;
let enabled = true;

function getAudioContext(): AudioContext | null {
  if (!enabled) return null;
  if (typeof AudioContext === "undefined" && typeof (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext === "undefined") return null;

  if (!ctx) {
    try {
      const ACtx =
        AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!ACtx) return null;
      ctx = new ACtx();
    } catch {
      return null;
    }
  }

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  return ctx;
}

/**
 * Mechanical click — 40 ms white-noise burst with exponential decay.
 * Use on craft card taps and button presses.
 */
export function playClick(): void {
  const ac = getAudioContext();
  if (!ac) return;

  const samples = Math.floor(ac.sampleRate * 0.04);
  const buf = ac.createBuffer(1, samples, ac.sampleRate);
  const data = buf.getChannelData(0);

  for (let i = 0; i < samples; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (samples * 0.15));
  }

  const src = ac.createBufferSource();
  src.buffer = buf;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.14, ac.currentTime);

  src.connect(gain);
  gain.connect(ac.destination);
  src.start();
}

/**
 * Glass clink — short sine oscillator (1 200 Hz → 600 Hz) with steep
 * exponential decay over ~450 ms.  Use on rank-up celebrations and
 * high-prestige actions.
 */
export function playClink(): void {
  const ac = getAudioContext();
  if (!ac) return;

  const t = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.3);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.5);
}

export function setAudioEnabled(on: boolean): void {
  enabled = on;
}

export function getAudioEnabled(): boolean {
  return enabled;
}
