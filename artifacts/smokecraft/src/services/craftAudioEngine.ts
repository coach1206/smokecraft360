/**
 * craftAudioEngine — Frontend Craft Ambient Audio Engine.
 *
 * Phase A: Sensory Engine Realization (frontend layer).
 *
 * Web Audio API ambient sound layers per craft type.
 * No external packages — pure Web Audio API synthesis.
 *
 * Each craft has layered oscillators:
 *   SMOKE  — 55Hz ember rumble + 800Hz crackle noise + 2100Hz shimmer
 *   POUR   — 360Hz liquid glide + 2400Hz ice ping bursts + 880Hz glass resonance
 *   BREW   — bandpass carbonation noise (200-600Hz) + ascending foam rise + low thud
 *   VAPE   — bandpass vapor mist (180-700Hz) + 432Hz energy hum + cloud dispersal
 *
 * API:
 *   craftAudioEngine.activate(craft)     — fade in craft layer, fade out previous
 *   craftAudioEngine.deactivate()        — fade everything out
 *   craftAudioEngine.triggerHook(name)   — one-shot event sound from SOUND_HOOKS
 *   craftAudioEngine.setVolume(0–1)      — master volume
 *   craftAudioEngine.setMuted(bool)      — mute/unmute (respects localStorage flag)
 *
 * Responds to server-sent sensory:audio_trigger Socket.io events when socket is
 * available (wired separately via SocketContext).
 */

import { isMuted } from "./sound";

export type CraftType = "smoke" | "pour" | "brew" | "vape" | "wine";

// ── Shared AudioContext ───────────────────────────────────────────────────────

let _ctx: AudioContext | null = null;
let _masterGain: GainNode | null = null;
let _masterVolume = 0.65;
let _unlocked = false;

function ensureUnlock(): void {
  if (typeof window === "undefined") return;
  const arm = () => {
    _unlocked = true;
    window.removeEventListener("pointerdown", arm);
    window.removeEventListener("keydown",     arm);
    window.removeEventListener("touchstart",  arm);
  };
  window.addEventListener("pointerdown", arm, { once: true, passive: true });
  window.addEventListener("keydown",     arm, { once: true });
  window.addEventListener("touchstart",  arm, { once: true, passive: true });
}

if (typeof window !== "undefined") ensureUnlock();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_unlocked) return null;
  try {
    if (!_ctx || _ctx.state === "closed") {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      _ctx = new Ctor();
      _masterGain = _ctx.createGain();
      _masterGain.gain.setValueAtTime(_masterVolume, _ctx.currentTime);
      _masterGain.connect(_ctx.destination);
    }
    if (_ctx.state === "suspended") void _ctx.resume();
    return _ctx;
  } catch { return null; }
}

function getDestination(): AudioNode | null {
  const ctx = getCtx();
  return ctx ? (_masterGain ?? ctx.destination) : null;
}

// ── Ambient layer management ──────────────────────────────────────────────────

interface AmbientLayer {
  nodes:   AudioNode[];
  gainNode: GainNode;
  craft:   CraftType;
  stop:    () => void;
}

let _currentLayer: AmbientLayer | null = null;
const _periodicTimers: ReturnType<typeof setInterval>[] = [];

function stopAllPeriodic(): void {
  _periodicTimers.forEach(t => clearInterval(t));
  _periodicTimers.length = 0;
}

function fadeGain(gain: GainNode, from: number, to: number, durationMs: number): void {
  const ctx = getCtx(); if (!ctx) return;
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(from, now);
  gain.gain.linearRampToValueAtTime(to, now + durationMs / 1000);
}

// ── Craft layer builders ──────────────────────────────────────────────────────

function buildSmokeLayer(ctx: AudioContext, dest: AudioNode): AmbientLayer {
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.connect(dest);

  // Low ember rumble — 55Hz sine
  const rumble = ctx.createOscillator();
  const rumbleGain = ctx.createGain();
  rumble.type = "sine";
  rumble.frequency.setValueAtTime(55, ctx.currentTime);
  rumbleGain.gain.setValueAtTime(0.06, ctx.currentTime);
  rumble.connect(rumbleGain);
  rumbleGain.connect(gainNode);
  rumble.start();

  // High shimmer — 2100Hz triangle
  const shimmer = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  shimmer.type = "triangle";
  shimmer.frequency.setValueAtTime(2100, ctx.currentTime);
  shimmerGain.gain.setValueAtTime(0.012, ctx.currentTime);
  shimmer.connect(shimmerGain);
  shimmerGain.connect(gainNode);
  shimmer.start();

  // Periodic crackle — random noise burst every 8-16s
  const crackleInterval = setInterval(() => {
    if (!_unlocked || isMuted()) return;
    const t   = ctx.currentTime;
    const osc = ctx.createOscillator();
    const ng  = ctx.createGain();
    osc.type  = "sawtooth";
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.08);
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(0.05, t + 0.01);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(ng); ng.connect(gainNode);
    osc.start(t); osc.stop(t + 0.13);
  }, 8000 + Math.random() * 8000);
  _periodicTimers.push(crackleInterval);

  const stop = () => { rumble.stop(); shimmer.stop(); };
  return { nodes: [rumble, shimmer], gainNode, craft: "smoke", stop };
}

function buildPourLayer(ctx: AudioContext, dest: AudioNode): AmbientLayer {
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.connect(dest);

  // Liquid hum — 360Hz sine
  const hum = ctx.createOscillator();
  const humGain = ctx.createGain();
  hum.type = "sine";
  hum.frequency.setValueAtTime(360, ctx.currentTime);
  humGain.gain.setValueAtTime(0.04, ctx.currentTime);
  hum.connect(humGain); humGain.connect(gainNode);
  hum.start();

  // Glass resonance — 880Hz
  const glass = ctx.createOscillator();
  const glassGain = ctx.createGain();
  glass.type = "sine";
  glass.frequency.setValueAtTime(880, ctx.currentTime);
  glassGain.gain.setValueAtTime(0.015, ctx.currentTime);
  glass.connect(glassGain); glassGain.connect(gainNode);
  glass.start();

  // Periodic ice tinkle every 10-20s
  const iceInterval = setInterval(() => {
    if (!_unlocked || isMuted()) return;
    const t   = ctx.currentTime;
    const osc = ctx.createOscillator();
    const ng  = ctx.createGain();
    osc.type  = "sine";
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.18);
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(0.07, t + 0.015);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(ng); ng.connect(gainNode);
    osc.start(t); osc.stop(t + 0.23);
  }, 10000 + Math.random() * 10000);
  _periodicTimers.push(iceInterval);

  const stop = () => { hum.stop(); glass.stop(); };
  return { nodes: [hum, glass], gainNode, craft: "pour", stop };
}

function buildBrewLayer(ctx: AudioContext, dest: AudioNode): AmbientLayer {
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.connect(dest);

  // Carbonation noise — bandpass filtered
  const noise  = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const nGain  = ctx.createGain();
  noise.type = "sawtooth";
  noise.frequency.setValueAtTime(220, ctx.currentTime);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(400, ctx.currentTime);
  filter.Q.setValueAtTime(0.8, ctx.currentTime);
  nGain.gain.setValueAtTime(0.05, ctx.currentTime);
  noise.connect(filter); filter.connect(nGain); nGain.connect(gainNode);
  noise.start();

  // Periodic foam rise — ascending 200→500Hz every 15-25s
  const foamInterval = setInterval(() => {
    if (!_unlocked || isMuted()) return;
    const t   = ctx.currentTime;
    const osc = ctx.createOscillator();
    const ng  = ctx.createGain();
    osc.type  = "sine";
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.linearRampToValueAtTime(500, t + 0.6);
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(0.06, t + 0.1);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(ng); ng.connect(gainNode);
    osc.start(t); osc.stop(t + 0.72);
  }, 15000 + Math.random() * 10000);
  _periodicTimers.push(foamInterval);

  const stop = () => { noise.stop(); };
  return { nodes: [noise], gainNode, craft: "brew", stop };
}

function buildVapeLayer(ctx: AudioContext, dest: AudioNode): AmbientLayer {
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.connect(dest);

  // Energy hum — 432Hz sine (tuned A)
  const hum = ctx.createOscillator();
  const humGain = ctx.createGain();
  hum.type = "sine";
  hum.frequency.setValueAtTime(432, ctx.currentTime);
  humGain.gain.setValueAtTime(0.03, ctx.currentTime);
  hum.connect(humGain); humGain.connect(gainNode);
  hum.start();

  // Vapor mist — bandpass noise layer
  const mist   = ctx.createOscillator();
  const mFilter = ctx.createBiquadFilter();
  const mGain  = ctx.createGain();
  mist.type = "sawtooth";
  mist.frequency.setValueAtTime(300, ctx.currentTime);
  mFilter.type = "bandpass";
  mFilter.frequency.setValueAtTime(440, ctx.currentTime);
  mFilter.Q.setValueAtTime(1.2, ctx.currentTime);
  mGain.gain.setValueAtTime(0.03, ctx.currentTime);
  mist.connect(mFilter); mFilter.connect(mGain); mGain.connect(gainNode);
  mist.start();

  // Periodic cloud dispersal — descending swoosh every 12-22s
  const cloudInterval = setInterval(() => {
    if (!_unlocked || isMuted()) return;
    const t   = ctx.currentTime;
    const osc = ctx.createOscillator();
    const ng  = ctx.createGain();
    osc.type  = "sine";
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.5);
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(0.05, t + 0.05);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.connect(ng); ng.connect(gainNode);
    osc.start(t); osc.stop(t + 0.56);
  }, 12000 + Math.random() * 10000);
  _periodicTimers.push(cloudInterval);

  const stop = () => { hum.stop(); mist.stop(); };
  return { nodes: [hum, mist], gainNode, craft: "vape", stop };
}

const LAYER_BUILDERS: Record<CraftType, (ctx: AudioContext, dest: AudioNode) => AmbientLayer> = {
  smoke: buildSmokeLayer,
  pour:  buildPourLayer,
  brew:  buildBrewLayer,
  vape:  buildVapeLayer,
  wine:  buildVapeLayer,
};

// ── One-shot event sounds ─────────────────────────────────────────────────────

const HOOK_SOUNDS: Record<string, (ctx: AudioContext, dest: AudioNode, vol: number) => void> = {
  smoke_ember_crackle:  (ctx, dest, vol) => { const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(800, t); o.frequency.exponentialRampToValueAtTime(200, t + 0.12); g.gain.setValueAtTime(vol * 0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.16); },
  smoke_soft_exhale:    (ctx, dest, vol) => { const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.5); g.gain.setValueAtTime(vol * 0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.56); },
  smoke_lighter_flick:  (ctx, dest, vol) => { const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(1200, t); o.frequency.exponentialRampToValueAtTime(3000, t + 0.06); g.gain.setValueAtTime(vol * 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.10); },
  smoke_glass_clink:    (ctx, dest, vol) => { [880, 2400].forEach(freq => { const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(vol * 0.10, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.31); }); },
  pour_liquid_drip:     (ctx, dest, vol) => { const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(480, t); o.frequency.exponentialRampToValueAtTime(240, t + 0.2); g.gain.setValueAtTime(vol * 0.10, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.26); },
  pour_soft_slosh:      (ctx, dest, vol) => { const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(200, t); o.frequency.linearRampToValueAtTime(280, t + 0.25); o.frequency.linearRampToValueAtTime(160, t + 0.5); g.gain.setValueAtTime(vol * 0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.56); },
  pour_ice_clink:       (ctx, dest, vol) => { const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(2400, t); o.frequency.exponentialRampToValueAtTime(1600, t + 0.22); g.gain.setValueAtTime(vol * 0.11, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.29); },
  pour_liquid_pour:     (ctx, dest, vol) => { const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(360, t); o.frequency.linearRampToValueAtTime(320, t + 0.5); g.gain.setValueAtTime(vol * 0.08, t); g.gain.setValueAtTime(vol * 0.08, t + 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + 0.85); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.86); },
  brew_carbonation_hiss:(ctx, dest, vol) => { const t = ctx.currentTime; const o = ctx.createOscillator(); const f = ctx.createBiquadFilter(); const g = ctx.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(300, t); f.type = "bandpass"; f.frequency.setValueAtTime(600, t); g.gain.setValueAtTime(vol * 0.10, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45); o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.46); },
  brew_soft_tap:        (ctx, dest, vol) => { const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(180, t); g.gain.setValueAtTime(vol * 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.13); },
  brew_foam_pour:       (ctx, dest, vol) => { const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(220, t); o.frequency.linearRampToValueAtTime(520, t + 0.55); g.gain.setValueAtTime(vol * 0.09, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.65); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.66); },
  brew_pint_set_down:   (ctx, dest, vol) => { const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(140, t); g.gain.setValueAtTime(vol * 0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.19); },
  vape_vapor_inhale:    (ctx, dest, vol) => { const t = ctx.currentTime; const o = ctx.createOscillator(); const f = ctx.createBiquadFilter(); const g = ctx.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(400, t); f.type = "bandpass"; f.frequency.setValueAtTime(500, t); g.gain.setValueAtTime(vol * 0.07, t); g.gain.linearRampToValueAtTime(vol * 0.07, t + 0.5); g.gain.exponentialRampToValueAtTime(0.001, t + 0.75); o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.76); },
  vape_soft_exhale:     (ctx, dest, vol) => { const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(680, t); o.frequency.exponentialRampToValueAtTime(200, t + 0.6); g.gain.setValueAtTime(vol * 0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.65); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.66); },
  vape_ambient_synth:   (ctx, dest, vol) => { [432, 864].forEach((freq, i) => { const t = ctx.currentTime + i * 0.08; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(vol * 0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.51); }); },
  vape_device_click:    (ctx, dest, vol) => { const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(1800, t); g.gain.setValueAtTime(vol * 0.09, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.07); },
};

// ── Public API ────────────────────────────────────────────────────────────────

export const craftAudioEngine = {

  activate(craft: CraftType): void {
    if (typeof window === "undefined" || isMuted()) return;
    const ctx  = getCtx(); if (!ctx) return;
    const dest = getDestination(); if (!dest) return;

    if (_currentLayer) {
      const prev = _currentLayer;
      fadeGain(prev.gainNode, prev.gainNode.gain.value, 0, 1400);
      setTimeout(() => { try { prev.stop(); } catch { /* ignore */ } }, 1500);
    }

    stopAllPeriodic();
    const builder = LAYER_BUILDERS[craft];
    if (!builder) return;

    _currentLayer = builder(ctx, dest);
    fadeGain(_currentLayer.gainNode, 0, 1.0, 1800);
  },

  deactivate(): void {
    stopAllPeriodic();
    if (!_currentLayer) return;
    fadeGain(_currentLayer.gainNode, _currentLayer.gainNode.gain.value, 0, 1200);
    const layer = _currentLayer;
    _currentLayer = null;
    setTimeout(() => { try { layer.stop(); } catch { /* ignore */ } }, 1300);
  },

  triggerHook(hookName: string, volume = 0.7): void {
    if (typeof window === "undefined" || isMuted() || !_unlocked) return;
    const ctx  = getCtx(); if (!ctx) return;
    const dest = getDestination(); if (!dest) return;
    const fn = HOOK_SOUNDS[hookName];
    if (!fn) return;
    try { fn(ctx, dest, volume); } catch { /* never surface audio errors */ }
  },

  setVolume(v: number): void {
    _masterVolume = Math.max(0, Math.min(1, v));
    const ctx = getCtx();
    if (ctx && _masterGain) {
      _masterGain.gain.linearRampToValueAtTime(_masterVolume, ctx.currentTime + 0.1);
    }
  },

  /** Called by socket listener when server emits sensory:audio_trigger. */
  handleServerTrigger(trigger: { craftType: string; hookName: string; layer: string; intensity: number }): void {
    if (trigger.layer === "transition" || trigger.layer === "ambient") {
      craftAudioEngine.activate(trigger.craftType as CraftType);
    } else if (trigger.layer === "event") {
      craftAudioEngine.triggerHook(trigger.hookName, trigger.intensity);
    }
  },
};
