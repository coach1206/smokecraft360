/**
 * usePremiumAudio — reactive-only sound profiles for NOVEE OS
 *
 * Rules:
 *  - ZERO continuous loops / ambient drones
 *  - All sounds fire ONLY on user interaction or live data events
 *  - Each call creates + immediately closes its own AudioContext (mobile-safe)
 */

type AudioProfile = "mechanicalClick" | "glassChime" | "chronographTick";

function getAC(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    return new AC();
  } catch {
    return null;
  }
}

/** Precision mechanical switch — for tile taps, button presses */
function mechanicalClick(): void {
  const ctx = getAC();
  if (!ctx) return;
  const now = ctx.currentTime;

  const frames = Math.floor(ctx.sampleRate * 0.016);
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 2.2);
  }

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 3400;
  bp.Q.value = 0.75;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

  src.connect(bp);
  bp.connect(gain);
  gain.connect(ctx.destination);
  src.start(now);

  setTimeout(() => ctx.close().catch(() => undefined), 250);
}

/** Crystal glass chime — for live data updates / telemetry events */
function glassChime(): void {
  const ctx = getAC();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(3100, now);
  osc.frequency.exponentialRampToValueAtTime(2400, now + 0.10);

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(4650, now);
  osc2.frequency.exponentialRampToValueAtTime(3800, now + 0.08);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.055, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.022, now + 0.003);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  osc.connect(gain);
  osc2.connect(gain2);
  gain.connect(ctx.destination);
  gain2.connect(ctx.destination);

  osc.start(now); osc.stop(now + 0.5);
  osc2.start(now); osc2.stop(now + 0.25);

  setTimeout(() => ctx.close().catch(() => undefined), 700);
}

/** Luxury chronograph double-tick — for navigation / connect events */
function chronographTick(): void {
  const ctx = getAC();
  if (!ctx) return;
  const now = ctx.currentTime;

  for (let i = 0; i < 2; i++) {
    const t = now + i * 0.022;
    const frames = Math.floor(ctx.sampleRate * 0.009);
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let j = 0; j < frames; j++) {
      data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / frames, 3);
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(i === 0 ? 0.16 : 0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.012);

    src.connect(hp);
    hp.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
  }

  setTimeout(() => ctx.close().catch(() => undefined), 300);
}

const PROFILES: Record<AudioProfile, () => void> = {
  mechanicalClick,
  glassChime,
  chronographTick,
};

export function usePremiumAudio() {
  return {
    mechanicalClick: () => PROFILES.mechanicalClick(),
    glassChime:      () => PROFILES.glassChime(),
    chronographTick: () => PROFILES.chronographTick(),
  };
}
