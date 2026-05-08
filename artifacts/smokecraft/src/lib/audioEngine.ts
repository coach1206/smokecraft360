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
 * Mechanical switch — double-pop noise burst + pitched square tone (800→400 Hz).
 * More pronounced than playClick. Use on mode transitions and POS activation.
 */
export function playSwitch(): void {
  const ac = getAudioContext();
  if (!ac) return;
  const t = ac.currentTime;

  // Two sharp noise pops, 25 ms apart — tactile double-click feel
  for (let burst = 0; burst < 2; burst++) {
    const delay = burst * 0.025;
    const samples = Math.floor(ac.sampleRate * 0.018);
    const buf = ac.createBuffer(1, samples, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (samples * 0.10));
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.30, t + delay);
    src.connect(gain);
    gain.connect(ac.destination);
    src.start(t + delay);
  }

  // Short pitched component — square 800 Hz → 400 Hz over 65 ms
  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.065);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.055, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.07);
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

// ── Craft-specific ambient layers ─────────────────────────────────────────────

/**
 * Craft ambient loops — layered lounge-appropriate procedural audio.
 * Returns a cleanup function that fades out all nodes.
 *
 * smoke — deep ember crackle (filtered noise bursts + low hum)
 * pour  — liquid drip + barrel resonance
 * brew  — carbonation hiss + low pub ambience
 * vape  — coil hum + neon flicker
 */
export function playCraftAmbient(craftType: "smoke" | "pour" | "brew" | "vape"): () => void {
  const ac = getAudioContext();
  if (!ac) return () => {};
  // Non-null alias so closures below can use it without TS narrowing loss
  const audio = ac;

  const nodes: AudioNode[] = [];
  const masterGain = audio.createGain();
  masterGain.gain.setValueAtTime(0, audio.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.03, audio.currentTime + 1.2);
  masterGain.connect(audio.destination);

  function makeNoiseBurst(durationS: number, freq: number, q: number, gainVal: number) {
    const samples = Math.floor(audio.sampleRate * durationS);
    const buf     = audio.createBuffer(1, samples, audio.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (samples * 0.22));
    }
    const src  = audio.createBufferSource();
    src.buffer = buf;
    src.loop   = false;
    const filt = audio.createBiquadFilter();
    filt.type  = "bandpass";
    filt.frequency.value = freq;
    filt.Q.value         = q;
    const g = audio.createGain();
    g.gain.setValueAtTime(gainVal, audio.currentTime);
    src.connect(filt);
    filt.connect(g);
    g.connect(masterGain);
    nodes.push(src, filt, g);
    return src;
  }

  function scheduleEmberCrackles() {
    // Sporadic crackle bursts every 1.4–3.5 s
    let t = audio.currentTime + 0.8;
    const schedule = () => {
      if (audio.state === "closed") return;
      const burst = makeNoiseBurst(0.06, 900 + Math.random() * 400, 2.2, 0.18 + Math.random() * 0.12);
      burst.start(t);
      t += 1.4 + Math.random() * 2.1;
      if (t - audio.currentTime < 60) setTimeout(schedule, (t - audio.currentTime - 0.5) * 1000);
    };
    schedule();
  }

  switch (craftType) {
    case "smoke": {
      // 48 Hz ember hum
      const hum = audio.createOscillator();
      hum.type = "sine";
      hum.frequency.value = 48;
      const humG = audio.createGain();
      humG.gain.value = 0.7;
      hum.connect(humG); humG.connect(masterGain);
      hum.start();
      nodes.push(hum, humG);
      scheduleEmberCrackles();
      break;
    }
    case "pour": {
      // Liquid drip pattern: filtered noise clicks + 220 Hz resonant tone
      const drip = audio.createOscillator();
      drip.type = "sine";
      drip.frequency.value = 220;
      const dripG = audio.createGain();
      dripG.gain.value = 0.6;
      drip.connect(dripG); dripG.connect(masterGain);
      drip.start();
      nodes.push(drip, dripG);
      // Sporadic drip bursts
      let dt = audio.currentTime + 0.5;
      const scheduleDrip = () => {
        if (audio.state === "closed") return;
        const b = makeNoiseBurst(0.04, 600 + Math.random() * 200, 4, 0.14);
        b.start(dt);
        dt += 0.6 + Math.random() * 1.4;
        if (dt - audio.currentTime < 60) setTimeout(scheduleDrip, (dt - audio.currentTime - 0.2) * 1000);
      };
      scheduleDrip();
      break;
    }
    case "brew": {
      // Carbonation: rapid fine noise + low pub hum at 62 Hz
      const hiss = audio.createOscillator();
      hiss.type = "sawtooth";
      hiss.frequency.value = 62;
      const hissG = audio.createGain();
      hissG.gain.value = 0.5;
      const filt = audio.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = 200;
      hiss.connect(filt); filt.connect(hissG); hissG.connect(masterGain);
      hiss.start();
      nodes.push(hiss, filt, hissG);
      break;
    }
    case "vape": {
      // Coil: 80 Hz triangle hum + subtle neon buzz at 120 Hz
      for (const [hz, type] of [[80, "triangle"], [120, "sawtooth"]] as const) {
        const osc = audio.createOscillator();
        osc.type = type as OscillatorType;
        osc.frequency.value = hz;
        const g = audio.createGain();
        g.gain.value = hz === 80 ? 0.55 : 0.25;
        const f = audio.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 400;
        osc.connect(f); f.connect(g); g.connect(masterGain);
        osc.start();
        nodes.push(osc, f, g);
      }
      break;
    }
  }

  return () => {
    try {
      const t = audio.currentTime;
      masterGain.gain.setValueAtTime(masterGain.gain.value, t);
      masterGain.gain.linearRampToValueAtTime(0, t + 0.6);
      setTimeout(() => {
        nodes.forEach(n => { try { if ("stop" in n) (n as OscillatorNode | AudioBufferSourceNode).stop(); } catch { /* ok */ } });
      }, 700);
    } catch { /* ok */ }
  };
}

/**
 * XP burst — short ascending chime (three stacked sines).
 * Use after awarding XP for a swipe or achievement.
 */
export function playXpBurst(): void {
  const ac = getAudioContext();
  if (!ac) return;
  const t = ac.currentTime;

  const freqs = [440, 660, 880];
  freqs.forEach((hz, i) => {
    const osc  = ac.createOscillator();
    osc.type   = "sine";
    osc.frequency.setValueAtTime(hz, t + i * 0.07);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.12, t + i * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.35);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t + i * 0.07);
    osc.stop(t + i * 0.07 + 0.4);
  });
}

/**
 * Level-up celebration — four-note ascending arpeggio + glass shimmer.
 * Use on tier advancement (Explorer → Enthusiast → etc.).
 */
export function playLevelUp(): void {
  const ac = getAudioContext();
  if (!ac) return;
  const t = ac.currentTime;

  // Ascending arpeggio: C4 E4 G4 C5
  const notes = [261.63, 329.63, 392.0, 523.25];
  notes.forEach((hz, i) => {
    const osc  = ac.createOscillator();
    osc.type   = "sine";
    osc.frequency.value = hz;
    const gain = ac.createGain();
    const onset = t + i * 0.11;
    gain.gain.setValueAtTime(0.0, onset);
    gain.gain.linearRampToValueAtTime(0.16, onset + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, onset + 0.55);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(onset);
    osc.stop(onset + 0.6);
  });

  // Glass shimmer on top (1800 Hz decay)
  const shimmer = ac.createOscillator();
  shimmer.type = "sine";
  shimmer.frequency.setValueAtTime(1800, t + 0.44);
  shimmer.frequency.exponentialRampToValueAtTime(900, t + 0.9);
  const shimG = ac.createGain();
  shimG.gain.setValueAtTime(0.09, t + 0.44);
  shimG.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
  shimmer.connect(shimG);
  shimG.connect(ac.destination);
  shimmer.start(t + 0.44);
  shimmer.stop(t + 0.95);
}

/**
 * Staff ripple activation — low cinematic thud + rising shimmer.
 * Plays when operational mode starts.
 */
export function playRippleActivation(): void {
  const ac = getAudioContext();
  if (!ac) return;
  const t = ac.currentTime;

  // Deep thud
  const osc = ac.createOscillator();
  osc.type  = "sine";
  osc.frequency.setValueAtTime(60, t);
  osc.frequency.exponentialRampToValueAtTime(25, t + 0.18);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.4, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  osc.connect(g); g.connect(ac.destination);
  osc.start(t); osc.stop(t + 0.25);

  // Rising shimmer
  const rise = ac.createOscillator();
  rise.type  = "sine";
  rise.frequency.setValueAtTime(300, t + 0.1);
  rise.frequency.linearRampToValueAtTime(900, t + 0.5);
  const rg = ac.createGain();
  rg.gain.setValueAtTime(0.0, t + 0.1);
  rg.gain.linearRampToValueAtTime(0.08, t + 0.28);
  rg.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  rise.connect(rg); rg.connect(ac.destination);
  rise.start(t + 0.1); rise.stop(t + 0.6);
}
