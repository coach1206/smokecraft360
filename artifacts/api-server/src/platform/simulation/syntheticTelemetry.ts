/**
 * syntheticTelemetry — generates realistic fake telemetry for sandboxes.
 *
 * Produces statistically plausible event streams that match real venue
 * behavioral patterns — used for:
 *   - AI model validation (does the AI respond correctly to simulated stimuli?)
 *   - Orchestration stress tests
 *   - Feature flag dry-runs
 *   - Dashboard load testing
 *
 * Event types match the real telemetry schema so the same consumers process
 * both real and synthetic events. Synthetic events carry `_synthetic: true`
 * in metadata so they can be filtered from production analytics.
 */

import { createEnvelope, type EventEnvelope } from "../versioning/eventEnvelope";

export type VenueMood = "quiet" | "warming_up" | "peak" | "winding_down" | "dead";

export interface SyntheticSessionConfig {
  venueId:       string;
  guestCount:    number;
  mood:          VenueMood;
  craftMix:      { smoke: number; pour: number; brew: number; vape: number }; // fractions, sum=1
  premiumRatio:  number;    // 0–1: fraction of premium orders
  seed:          number;
}

interface SyntheticGuest {
  guestId:      string;
  craftType:    "smoke" | "pour" | "brew" | "vape";
  sessionDepth: number;    // how many swipes so far
  isPremium:    boolean;
  swipeHistory: Array<"add" | "skip">;
}

// Engagement multipliers by mood
const MOOD_MULTIPLIERS: Record<VenueMood, number> = {
  quiet:        0.15,
  warming_up:   0.50,
  peak:         1.00,
  winding_down: 0.60,
  dead:         0.05,
};

export class SyntheticTelemetryGenerator {
  private guests: SyntheticGuest[] = [];
  private rng:    () => number;
  private config: SyntheticSessionConfig;
  private tick    = 0;

  constructor(config: SyntheticSessionConfig) {
    this.config = config;
    this.rng    = seededRandom(config.seed);
    this.initGuests();
  }

  private initGuests(): void {
    const { guestCount, craftMix, premiumRatio } = this.config;
    for (let i = 0; i < guestCount; i++) {
      const r = this.rng();
      let craftType: "smoke" | "pour" | "brew" | "vape";
      if      (r < craftMix.smoke)                   craftType = "smoke";
      else if (r < craftMix.smoke + craftMix.pour)   craftType = "pour";
      else if (r < craftMix.smoke + craftMix.pour + craftMix.brew) craftType = "brew";
      else                                            craftType = "vape";

      this.guests.push({
        guestId:      `synth_${this.config.venueId}_g${i}`,
        craftType,
        sessionDepth: 0,
        isPremium:    this.rng() < premiumRatio,
        swipeHistory: [],
      });
    }
  }

  /** Generate one tick of events (call each sim second) */
  generateTick(): EventEnvelope[] {
    this.tick++;
    const multiplier = MOOD_MULTIPLIERS[this.config.mood];
    const events: EventEnvelope[] = [];

    for (const guest of this.guests) {
      // Activity probability governed by mood
      if (this.rng() > multiplier) continue;

      const action = this.pickAction(guest);
      const envelope = this.buildEvent(guest, action);
      if (envelope) {
        events.push(envelope);
        if (action === "swipe_add" || action === "swipe_skip") {
          guest.swipeHistory.push(action === "swipe_add" ? "add" : "skip");
          guest.sessionDepth++;
        }
      }
    }

    return events;
  }

  private pickAction(guest: SyntheticGuest): string {
    const depth = guest.sessionDepth;
    if (depth === 0) return "swipe_start";

    const addBias = guest.isPremium ? 0.55 : 0.40;
    if (depth < 5) return this.rng() < addBias ? "swipe_add" : "swipe_skip";
    if (depth < 8) return this.rng() < 0.3 ? "add_to_order" : (this.rng() < addBias ? "swipe_add" : "swipe_skip");
    return this.rng() < 0.5 ? "reveal_view" : "add_to_order";
  }

  private buildEvent(guest: SyntheticGuest, action: string): EventEnvelope | null {
    const basePayload = {
      moduleId:    `${guest.craftType}-craft`,
      moduleSlug:  `craft-${guest.craftType}`,
      venueId:     this.config.venueId,
      guestId:     guest.guestId,
      _synthetic:  true,
      sessionDepth:guest.sessionDepth,
      mood:        this.config.mood,
    };

    switch (action) {
      case "swipe_start":
        return createEnvelope("swipe_start", { ...basePayload, craftType: guest.craftType },
          { venueId: this.config.venueId, source:"synthetic-telemetry" });

      case "swipe_add":
        return createEnvelope("swipe_add", {
          ...basePayload,
          productId:   `synth_product_${Math.floor(this.rng() * 50)}`,
          score:       0.5 + this.rng() * 0.5,
          isPremium:   guest.isPremium,
        }, { venueId: this.config.venueId, source:"synthetic-telemetry" });

      case "swipe_skip":
        return createEnvelope("swipe_skip", {
          ...basePayload,
          productId:   `synth_product_${Math.floor(this.rng() * 50)}`,
          score:       this.rng() * 0.4,
        }, { venueId: this.config.venueId, source:"synthetic-telemetry" });

      case "add_to_order":
        return createEnvelope("add_to_order", {
          ...basePayload,
          amountCents: guest.isPremium ? 8000 + Math.round(this.rng() * 12000) : 2000 + Math.round(this.rng() * 5000),
          quantity:    1,
        }, { venueId: this.config.venueId, source:"synthetic-telemetry" });

      case "reveal_view":
        return createEnvelope("reveal_view", {
          ...basePayload,
          recommendationCount: 3 + Math.floor(this.rng() * 5),
        }, { venueId: this.config.venueId, source:"synthetic-telemetry" });

      default:
        return null;
    }
  }

  getGuestCount(): number { return this.guests.length; }
  getTick():       number { return this.tick; }
}

// ─── Burst generation (bulk test data) ────────────────────────────────────────

export function generateBurstEvents(
  config:     SyntheticSessionConfig,
  tickCount:  number,
): EventEnvelope[] {
  const gen    = new SyntheticTelemetryGenerator(config);
  const events: EventEnvelope[] = [];
  for (let i = 0; i < tickCount; i++) {
    events.push(...gen.generateTick());
  }
  return events;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
}
