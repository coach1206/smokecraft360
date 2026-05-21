/**
 * Global audio primitives for NOVEE OS / SmokeCraft 360.
 * All sounds are synthesised via Web Audio — no external files required.
 */

type WinAC = typeof window & { webkitAudioContext?: typeof AudioContext };
const getAC = () => window.AudioContext ?? (window as WinAC).webkitAudioContext;

/** 3400 Hz mechanical click — universal touch feedback. */
export function playGlobalMechanicalClick(): void {
  try {
    const AC  = getAC();
    if (!AC) return;
    const ctx  = new AC();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(3400, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.10);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.10);
    setTimeout(() => ctx.close().catch(() => {}), 400);
  } catch { /* blocked by hardware policy — silent */ }
}

/** Lower-pitched velvet slide tone for transitions. */
export function playVelvetSlide(): void {
  try {
    const AC  = getAC();
    if (!AC) return;
    const ctx  = new AC();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(210, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(130, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch { /* silent */ }
}

/** Error sweep — falling pitch penalty flash. */
export function playErrorSweep(): void {
  try {
    const AC  = getAC();
    if (!AC) return;
    const ctx  = new AC();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(640, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.30);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.40);
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch { /* silent */ }
}

// ── Luxury product image assets ──────────────────────────────────────────────
export const LUXURY_ASSETS = {
  OPUS_X:     "https://images.unsplash.com/photo-1606105963278-ca051fb663f2?auto=format&fit=crop&w=600&q=80",
  PADRON_1926:"https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80",
  YAMAZAKI_12:"https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=600&q=80",
  HENNESSY:   "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80",
  TOBACCO_LEAF:"https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80",
} as const;

// ── NOVEE OS local guest profile persistence ─────────────────────────────────
export const NOVEE_GUEST_KEY = "novee_os_active_guest";

export interface NoveeGuestRecord {
  name:             string;
  phone:            string;
  email:            string;
  ageRange:         string;
  gender:           string;
  state:            string;
  city:             string;
  phase_checkpoint: string;
  running_score:    number;
  savedAt:          number;
}

export function saveNoveeGuest(data: Omit<NoveeGuestRecord, "savedAt">): void {
  try {
    localStorage.setItem(NOVEE_GUEST_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch { /* storage unavailable */ }
}

export function loadNoveeGuest(): NoveeGuestRecord | null {
  try {
    const raw = localStorage.getItem(NOVEE_GUEST_KEY);
    if (!raw) return null;
    const rec: NoveeGuestRecord = JSON.parse(raw);
    // Expire after 24 hours
    if (Date.now() - (rec.savedAt ?? 0) > 86_400_000) {
      localStorage.removeItem(NOVEE_GUEST_KEY);
      return null;
    }
    return rec;
  } catch { return null; }
}

/** Returns the stored record if lastName + last4 match, else null. */
export function matchNoveeGuest(lastName: string, last4: string): NoveeGuestRecord | null {
  const rec = loadNoveeGuest();
  if (!rec) return null;
  const parts    = rec.name.trim().split(/\s+/);
  const storedLN = (parts[parts.length - 1] ?? "").toLowerCase();
  const storedL4 = rec.phone.replace(/\D/g, "").slice(-4);
  if (storedLN === lastName.trim().toLowerCase() && storedL4 === last4.trim()) {
    return rec;
  }
  return null;
}
