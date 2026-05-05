/**
 * Programmatic sound effects using the Web Audio API.
 * No external .mp3 files required — all tones synthesized in-browser.
 * Fails silently if AudioContext is unavailable (e.g. blocked by browser policy).
 */

type SoundType = "swoosh" | "success" | "fail";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
  } catch {
    return null;
  }
  return ctx;
}

export function playSound(type: SoundType): void {
  const ac = getCtx();
  if (!ac) return;

  if (ac.state === "suspended") {
    void ac.resume();
  }

  try {
    switch (type) {
      case "success": playSuccess(ac); break;
      case "fail":    playFail(ac);    break;
      case "swoosh":  playSwoosh(ac);  break;
    }
  } catch {
    // Browser may block autoplay — fail silently
  }
}

/** Pleasant ascending 3-note chime (C5 → E5 → G5) */
function playSuccess(ac: AudioContext): void {
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    const t0 = ac.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.18, t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
    osc.start(t0);
    osc.stop(t0 + 0.6);
  });
}

/** Low descending 2-note thud */
function playFail(ac: AudioContext): void {
  const notes = [220, 165];
  notes.forEach((freq, i) => {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const t0 = ac.currentTime + i * 0.18;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.12, t0 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
    osc.start(t0);
    osc.stop(t0 + 0.45);
  });
}

/** Short filtered noise burst (UI swoosh) */
function playSwoosh(ac: AudioContext): void {
  const buffer = ac.createBuffer(1, ac.sampleRate * 0.15, ac.sampleRate);
  const data   = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const source = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const gain   = ac.createGain();
  source.buffer = buffer;
  filter.type   = "bandpass";
  filter.frequency.value = 1200;
  filter.Q.value = 0.8;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  gain.gain.setValueAtTime(0.14, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.14);
  source.start(ac.currentTime);
  source.stop(ac.currentTime + 0.15);
}
