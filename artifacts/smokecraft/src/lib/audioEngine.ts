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

/**
 * Deep ambient hum — 58 Hz sine with a slow 0.08 Hz LFO for a
 * "breathing lounge" feel.  Call on ExperiencePage mount; the returned
 * function fades out and stops the oscillators on unmount.
 */
export function playAmbientHum(): () => void {
  const ac = getAudioContext();
  if (!ac) return () => {};

  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(58, ac.currentTime);

  const lfo = ac.createOscillator();
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(0.08, ac.currentTime);

  const lfoGain = ac.createGain();
  lfoGain.gain.setValueAtTime(0.006, ac.currentTime);

  const masterGain = ac.createGain();
  masterGain.gain.setValueAtTime(0.022, ac.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(masterGain.gain);
  osc.connect(masterGain);
  masterGain.connect(ac.destination);

  osc.start();
  lfo.start();

  return () => {
    try {
      const t = ac.currentTime;
      masterGain.gain.setValueAtTime(masterGain.gain.value, t);
      masterGain.gain.linearRampToValueAtTime(0, t + 0.4);
      osc.stop(t + 0.5);
      lfo.stop(t + 0.5);
    } catch {
      // already stopped — ignore
    }
  };
}

export function setAudioEnabled(on: boolean): void {
  enabled = on;
}

export function getAudioEnabled(): boolean {
  return enabled;
}
