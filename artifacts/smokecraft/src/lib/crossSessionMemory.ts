/**
 * CrossSessionMemoryEngine — Longitudinal Guest Ritual Memory
 *
 * Persists across full browser sessions via localStorage.
 * Tracks flavor selection speed (confidence calibration), mentor affinity,
 * cross-craft history, and derives guest tier + cross-craft synergy suggestions.
 *
 * Pure TS singleton — no React deps.
 */

const STORAGE_KEY = "novee_cross_session_memory";

// ── Types ─────────────────────────────────────────────────────────────────────

export type GuestTier = "APPRENTICE" | "JOURNEYMAN" | "ARTISAN" | "MASTER";

export interface FlavorRecord {
  flavor:  string;
  speedMs: number;    // ms from screen mount → selection (lower = more confident)
  ts:      number;    // unix ms
  craft:   string;
}

export interface CrossSessionMemory {
  flavorHistory:  FlavorRecord[];
  mentorAffinity: Record<string, number>;  // mentor id → selection count
  craftVisits:    Record<string, number>;  // craft → visit count
  totalSessions:  number;
  firstSeen:      number;   // unix ms
  lastSeen:       number;
}

type Listener = (state: CrossSessionMemory) => void;

// ── Cross-craft synergy map ────────────────────────────────────────────────────
// If a guest selects a cedar/earthy cigar, surface woody/tannic whiskeys on PourCraft.
const SYNERGY: Record<string, { craft: string; suggestion: string; tags: string[] }> = {
  earthy:  { craft: "pour", suggestion: "Peated Scotch or aged Bourbon", tags: ["peaty", "earthy", "oak"] },
  cedar:   { craft: "pour", suggestion: "High-tannin Rye or Sherry-finish Scotch", tags: ["oak", "cedar", "spiced"] },
  leather: { craft: "pour", suggestion: "Aged Cognac or Cuban-leaf Rum", tags: ["leather", "dark", "tobacco"] },
  spiced:  { craft: "pour", suggestion: "Cinnamon Rye or Amaro digestivo", tags: ["spicy", "bold", "complex"] },
};

// ── Default state ─────────────────────────────────────────────────────────────

function defaultMemory(): CrossSessionMemory {
  return {
    flavorHistory:  [],
    mentorAffinity: {},
    craftVisits:    {},
    totalSessions:  0,
    firstSeen:      Date.now(),
    lastSeen:       Date.now(),
  };
}

// ── Singleton ─────────────────────────────────────────────────────────────────

class CrossSessionMemoryEngine {
  private state:     CrossSessionMemory;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.state = this.load();
    // Increment session count on each engine init (= page load)
    this.state.totalSessions += 1;
    this.state.lastSeen = Date.now();
    this.persist();
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  getMemory(): CrossSessionMemory { return this.state; }

  getGuestTier(): GuestTier {
    const s = this.state.totalSessions;
    if (s >= 15) return "MASTER";
    if (s >= 8)  return "ARTISAN";
    if (s >= 3)  return "JOURNEYMAN";
    return "APPRENTICE";
  }

  getDominantFlavor(): string | null {
    const counts: Record<string, number> = {};
    for (const r of this.state.flavorHistory) {
      counts[r.flavor] = (counts[r.flavor] ?? 0) + 1;
    }
    let best: string | null = null;
    let max = 0;
    for (const [f, c] of Object.entries(counts)) {
      if (c > max) { max = c; best = f; }
    }
    return best;
  }

  /** Returns a cross-craft pairing suggestion based on the guest's dominant flavor. */
  getCrossCraftSuggestion(): { craft: string; suggestion: string; tags: string[] } | null {
    const dom = this.getDominantFlavor();
    return dom ? (SYNERGY[dom] ?? null) : null;
  }

  /** Average selection speed in ms. Lower = more confident guest. */
  getAverageSelectionSpeed(): number {
    const recent = this.state.flavorHistory.slice(-10);
    if (recent.length === 0) return 0;
    return recent.reduce((a, r) => a + r.speedMs, 0) / recent.length;
  }

  /** True if the guest's recent avg speed suggests hesitation (> 8 seconds). */
  isHesitant(): boolean { return this.getAverageSelectionSpeed() > 8000; }

  getDominantMentor(): string | null {
    const aff = this.state.mentorAffinity;
    let best: string | null = null;
    let max = 0;
    for (const [m, c] of Object.entries(aff)) {
      if (c > max) { max = c; best = m; }
    }
    return best;
  }

  // ── Write ───────────────────────────────────────────────────────────────────

  recordFlavor(flavor: string, speedMs: number, craft = "smoke"): void {
    this.state.flavorHistory.push({ flavor, speedMs, ts: Date.now(), craft });
    // Keep rolling window of 100 selections
    if (this.state.flavorHistory.length > 100) {
      this.state.flavorHistory = this.state.flavorHistory.slice(-100);
    }
    this.persist();
    this.notify();
  }

  recordMentor(mentorId: string): void {
    this.state.mentorAffinity[mentorId] = (this.state.mentorAffinity[mentorId] ?? 0) + 1;
    this.persist();
    this.notify();
  }

  recordCraftVisit(craft: string): void {
    this.state.craftVisits[craft] = (this.state.craftVisits[craft] ?? 0) + 1;
    this.persist();
    this.notify();
  }

  purge(): void {
    this.state = defaultMemory();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    this.notify();
  }

  // ── Subscription ────────────────────────────────────────────────────────────

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  private load(): CrossSessionMemory {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultMemory();
      return { ...defaultMemory(), ...JSON.parse(raw) } as CrossSessionMemory;
    } catch {
      return defaultMemory();
    }
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch { /* ignore */ }
  }

  private notify(): void {
    for (const fn of this.listeners) fn(this.state);
  }
}

export const crossSessionMemory = new CrossSessionMemoryEngine();
