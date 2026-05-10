/**
 * VenueStateEngine — Persistent Atmospheric State.
 *
 * Redis-compatible KV store for per-venue atmospheric state.
 * Keys mirror Redis conventions: venue:{id}:{dimension}
 *
 * Swap-in: replace the Map with an ioredis client.
 * The get/set/del/expire methods are a subset of the Redis API —
 * the consumer code is unchanged.
 *
 * Dimensions tracked per venue:
 *   lighting    — warm/intensity/color values
 *   haptics     — active pattern + intensity
 *   sonic_dna   — acoustic profile + BPM
 *   mode        — current EnvironmentalMode name
 *   guest_count — live floor occupancy
 *   intent      — latest IntentPrediction signal
 *   mood        — latest guest MoodShift
 *
 * BlackBoxRecovery writes a snapshot of this state to disk
 * every 60 seconds so the venue remains "alive" if the cloud dies.
 */

import { NeuralEventBus } from "./neuralEventBus";

type VenueDimension =
  | "lighting" | "haptics" | "sonic_dna" | "mode"
  | "guest_count" | "intent" | "mood" | "commerce"
  | "energy" | "cluster_health";

interface StateEntry {
  value:     unknown;
  updatedAt: string;
  expiresAt: string | null;
}

class VenueStateEngineImpl {
  private readonly store  = new Map<string, StateEntry>();
  private readonly ttlMap = new Map<string, ReturnType<typeof setTimeout>>();

  private key(venueId: string, dimension: VenueDimension): string {
    return `venue:${venueId}:${dimension}`;
  }

  set(venueId: string, dimension: VenueDimension, value: unknown, ttlMs?: number): void {
    const k     = this.key(venueId, dimension);
    const entry: StateEntry = {
      value,
      updatedAt: new Date().toISOString(),
      expiresAt: ttlMs ? new Date(Date.now() + ttlMs).toISOString() : null,
    };
    this.store.set(k, entry);

    if (ttlMs) {
      clearTimeout(this.ttlMap.get(k));
      this.ttlMap.set(k, setTimeout(() => this.del(venueId, dimension), ttlMs));
    }
  }

  get<T = unknown>(venueId: string, dimension: VenueDimension): T | null {
    const k     = this.key(venueId, dimension);
    const entry = this.store.get(k);
    if (!entry) return null;
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      this.store.delete(k);
      return null;
    }
    return entry.value as T;
  }

  del(venueId: string, dimension: VenueDimension): void {
    const k = this.key(venueId, dimension);
    this.store.delete(k);
    clearTimeout(this.ttlMap.get(k));
    this.ttlMap.delete(k);
  }

  /** Full atmospheric snapshot for a venue — used by BlackBoxRecovery. */
  snapshot(venueId: string): Record<string, unknown> {
    const dims: VenueDimension[] = ["lighting","haptics","sonic_dna","mode","guest_count","intent","mood","commerce","energy","cluster_health"];
    const snap: Record<string, unknown> = { venueId, capturedAt: new Date().toISOString() };
    for (const d of dims) {
      const v = this.get(venueId, d);
      if (v !== null) snap[d] = v;
    }
    return snap;
  }

  /** Restore a snapshot (e.g., from BlackBoxRecovery on edge boot). */
  restore(snap: Record<string, unknown>): void {
    const venueId = snap["venueId"] as string;
    if (!venueId) return;
    const dims: VenueDimension[] = ["lighting","haptics","sonic_dna","mode","guest_count","intent","mood","commerce","energy","cluster_health"];
    for (const d of dims) {
      if (snap[d] !== undefined) this.set(venueId, d, snap[d]);
    }
  }

  /** Update mode + emit to bus. */
  setMode(venueId: string, mode: string, triggeredBy: string): void {
    this.set(venueId, "mode", { mode, triggeredBy, activatedAt: new Date().toISOString() });
    NeuralEventBus.publish("venue.mode_changed", { mode, triggeredBy }, venueId);
  }

  /** Update latest mood shift + emit to bus. */
  setMood(venueId: string, mood: unknown): void {
    this.set(venueId, "mood", mood, 30 * 60 * 1000); // 30-min TTL
    NeuralEventBus.publish("travel.mood_shift", mood, venueId);
  }

  /** Record latest intent signal + emit to bus. */
  setIntent(venueId: string, prediction: unknown): void {
    this.set(venueId, "intent", prediction, 5 * 60 * 1000); // 5-min TTL
    NeuralEventBus.publish("intent.prediction", prediction, venueId);
  }

  allVenueIds(): string[] {
    const ids = new Set<string>();
    for (const k of this.store.keys()) {
      const parts = k.split(":");
      if (parts[1]) ids.add(parts[1]);
    }
    return [...ids];
  }
}

export const VenueStateEngine = new VenueStateEngineImpl();
