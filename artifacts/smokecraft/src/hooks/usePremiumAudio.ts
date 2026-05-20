/**
 * usePremiumAudio — High-end synthetic mechanical audio engine for reactive UI
 *
 * Rules (enforced):
 *  - ZERO continuous loops / ambient drones — all sounds are purely reactive
 *  - AudioContext is a persistent singleton (created once on first interaction)
 *  - Three precision profiles: mechanicalClick, glassChime, chronographTick
 */

type AC = AudioContext & { destination: AudioDestinationNode };

class AudioEngine {
  private ctx: AC | null = null;

  private init(): AC | null {
    if (!this.ctx) {
      try {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctor() as AC;
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  /** Crisp glass chime — fires on data arrival / system events */
  glassChime(): void {
    const ctx = this.init();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1200, now);
    osc1.frequency.exponentialRampToValueAtTime(2400, now + 0.1);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now); osc1.stop(now + 0.6);
    osc2.start(now); osc2.stop(now + 0.6);
  }

  /** Dampened heavy mechanical click — luxury switch feel for tile/button taps */
  mechanicalClick(): void {
    const ctx = this.init();
    if (!ctx) return;
    const now = ctx.currentTime;

    const frames = Math.floor(ctx.sampleRate * 0.02); // 20 ms
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1000, now);
    filter.Q.setValueAtTime(4, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(now);
    src.stop(now + 0.02);
  }

  /** Micro-chronograph tick — navigation changes, tab switches, connect */
  chronographTick(): void {
    const ctx = this.init();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(3000, now);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.005);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.005);
  }
}

/** Singleton — AudioContext created once, reused across all interactions */
const sfx = new AudioEngine();

export function usePremiumAudio() {
  return {
    mechanicalClick:  () => sfx.mechanicalClick(),
    glassChime:       () => sfx.glassChime(),
    chronographTick:  () => sfx.chronographTick(),
  };
}
