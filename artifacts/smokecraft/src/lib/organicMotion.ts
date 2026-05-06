/**
 * organicMotion — controlled imperfection utilities for all motion systems.
 *
 * Provides deterministic-but-varied timing and path generation so animations
 * feel organic without being chaotic. All outputs stay within luxury bounds —
 * subtle entropy, never visual noise.
 *
 * Design: Seeded LCG RNG ensures useMemo stability (same seed → same output
 * across re-renders) while producing visually distinct per-particle behaviour.
 */

// ── Seeded LCG random number generator ───────────────────────────────────────

function seededRng(seed: number) {
  let s = Math.abs((seed * 9301 + 49297) % 233280);
  return (): number => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ── Core generators ───────────────────────────────────────────────────────────

/**
 * humanDuration — adds weighted randomness to animation durations.
 * Biased slightly toward longer durations (organic breathing feels slower).
 */
export function humanDuration(base: number, variance: number, seed: number): number {
  const r = seededRng(seed)();
  // Weight toward longer: square root maps 0→1 but biased to upper half
  const biased = Math.sqrt(r);
  return Math.max(base * 0.5, base + (biased - 0.5) * 2 * variance);
}

/**
 * jitter — small deterministic offset within a range.
 */
export function jitter(base: number, variance: number, seed: number): number {
  return base + (seededRng(seed)() - 0.5) * 2 * variance;
}

/**
 * organicOpacityPath — generates a non-symmetric multi-keyframe opacity sequence.
 * Peak is never centered; fade-in and fade-out have different curves.
 * Returns array of length `steps` starting at 0 and ending at 0.
 */
export function organicOpacityPath(peak: number, steps: number, seed: number): number[] {
  const rng = seededRng(seed + 1000);
  const frames: number[] = [0];
  const peakAt = Math.floor(steps * (0.3 + rng() * 0.25)); // peak at 30–55% through

  for (let i = 1; i < steps - 1; i++) {
    let base: number;
    if (i <= peakAt) {
      base = (i / peakAt) * peak;
    } else {
      base = ((steps - 1 - i) / (steps - 1 - peakAt)) * peak;
    }
    // Micro-flicker noise — tiny, luxury-safe
    const noise = (rng() - 0.5) * peak * 0.14;
    frames.push(Math.max(0, Math.min(1, base + noise)));
  }
  frames.push(0);
  return frames;
}

/**
 * organicTimes — non-uniform distribution of keyframe times.
 * Avoids perfectly even steps so animation doesn't feel mechanical.
 */
export function organicTimes(count: number, seed: number): number[] {
  if (count <= 2) return [0, 1];
  const rng = seededRng(seed + 2000);
  const even = 1 / (count - 1);
  const times: number[] = [0];
  for (let i = 1; i < count - 1; i++) {
    const base  = even * i;
    const shift = (rng() - 0.5) * even * 0.45;
    const prev  = times[times.length - 1]!;
    times.push(Math.max(prev + 0.04, Math.min(0.96, base + shift)));
  }
  times.push(1);
  return times;
}

/**
 * organicDriftX — multi-keyframe horizontal path that curls without
 * returning to the exact same position each cycle.
 */
export function organicDriftX(amplitude: number, steps: number, seed: number): number[] {
  const rng = seededRng(seed + 3000);
  const frames: number[] = [0];
  let pos = 0;
  for (let i = 1; i < steps - 1; i++) {
    const dir = rng() > 0.45 ? 1 : -1; // slight bias right for smoke curl
    pos += dir * amplitude * (rng() * 0.5 + 0.15);
    pos = Math.max(-amplitude * 1.1, Math.min(amplitude * 1.1, pos));
    frames.push(pos);
  }
  frames.push((rng() - 0.5) * amplitude * 0.7); // return to near-origin
  return frames;
}

/**
 * breatheKeyframes — slow luminance drift for atmospheric breathing overlays.
 * Returns non-symmetric opacity keyframes for a slow pulse.
 */
export function breatheKeyframes(base: number, variance: number, steps: number, seed: number): number[] {
  const rng = seededRng(seed + 4000);
  return Array.from({ length: steps }, (_, i) => {
    if (i === 0 || i === steps - 1) return base;
    const noise = (rng() - 0.5) * 2 * variance;
    return Math.max(0, Math.min(1, base + noise));
  });
}

/**
 * flickerRate — micro pitch/timing variance for sound (0.94–1.06 range).
 */
export function flickerRate(seed: number): number {
  return 0.94 + seededRng(seed + 5000)() * 0.12;
}

/**
 * humanDelay — base delay with gentle variance, never negative.
 */
export function humanDelay(base: number, variance: number, seed: number): number {
  return Math.max(0, base + (seededRng(seed + 6000)() - 0.5) * 2 * variance);
}

/**
 * breatheDuration — slow breathing durations biased to longer ranges.
 * Use for atmospheric overlays. Range: base × 0.75 → base × 1.4.
 */
export function breatheDuration(base: number, seed: number): number {
  const r = seededRng(seed + 7000)();
  return base * (0.75 + r * 0.65);
}

/**
 * glowPulseKeyframes — generates a non-even glow pulse for accent overlays.
 * 5 keyframes with varied peak positions for organic feel.
 */
export function glowPulseKeyframes(base: number, peak: number, seed: number): number[] {
  const rng = seededRng(seed + 8000);
  return [
    base,
    base + (peak - base) * (0.55 + rng() * 0.25),
    base + (peak - base) * (0.30 + rng() * 0.20),
    base + (peak - base) * (0.70 + rng() * 0.20),
    base,
  ];
}
