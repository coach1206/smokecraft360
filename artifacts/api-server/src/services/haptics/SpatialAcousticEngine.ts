/**
 * SpatialAcousticEngine — Phase 2: Spatial Haptics + Sonic DNA.
 *
 * Hardware-agnostic acoustic intelligence layer.
 * Routes acoustic events to available adapters.
 * At Tier 1: signals the frontend audio engine via Socket.io.
 * At Tier 2/3: additionally routes to directional speakers and smart audio systems.
 *
 * Sonic DNA maps each venue's acoustic identity.
 */

import { randomUUID } from "crypto";
import { pool } from "@workspace/db";
import { AdapterRegistry } from "./AdapterRegistry";
import { UIPhysicsAdapter } from "./UIPhysicsAdapter";
import type { AcousticEvent, AcousticProfile, HapticIntensity, SonicDNA } from "./HapticEvent";
import { logger } from "../../lib/logger";

const CRAFT_ACOUSTIC_MAP: Record<string, AcousticProfile> = {
  smoke: "ember",
  pour:  "pour",
  brew:  "pour",
  vape:  "vapor",
};

const DNA_CACHE = new Map<string, SonicDNA>();

export class SpatialAcousticEngine {

  static async emit(
    profile:    AcousticProfile,
    options: {
      intensity?: HapticIntensity;
      durationMs?: number;
      fadeMs?:    number;
      venueId?:   string;
    } = {},
  ): Promise<{ dispatched: string[]; eventId: string }> {

    const event: AcousticEvent = {
      id:         randomUUID(),
      profile,
      intensity:  options.intensity  ?? "subtle",
      durationMs: options.durationMs ?? 4000,
      fadeMs:     options.fadeMs     ?? 800,
      venueId:    options.venueId,
      ts:         new Date().toISOString(),
    };

    if (!UIPhysicsAdapter.capability.available) {
      AdapterRegistry.register(UIPhysicsAdapter);
    }

    const result = await AdapterRegistry.routeAcoustic(event);
    logger.info({ profile, dispatched: result.dispatched.length }, "acoustic emitted");
    return { ...result, eventId: event.id };
  }

  static async emitForCraft(craftType: string, venueId?: string): Promise<void> {
    const profile = CRAFT_ACOUSTIC_MAP[craftType] ?? "heartbeat";
    await SpatialAcousticEngine.emit(profile, { venueId, intensity: "subtle", durationMs: 6000, fadeMs: 1200 });
  }

  static async emitLoungeHeartbeat(venueId: string): Promise<void> {
    await SpatialAcousticEngine.emit("heartbeat", { venueId, intensity: "whisper", durationMs: 8000, fadeMs: 2000 });
  }

  static getSonicDNA(venueId: string): SonicDNA {
    if (DNA_CACHE.has(venueId)) return DNA_CACHE.get(venueId)!;
    return SpatialAcousticEngine.buildDefaultDNA(venueId);
  }

  static async loadSonicDNA(venueId: string): Promise<SonicDNA> {
    try {
      const { rows } = await pool.query<{
        dominant_craft: string | null; energy_score: number;
      }>(`
        SELECT dominant_craft, energy_score
        FROM venue_dna_profiles WHERE venue_id = $1
      `, [venueId]);

      const r = rows[0];
      const dominant = r?.dominant_craft ? CRAFT_ACOUSTIC_MAP[r.dominant_craft] ?? "heartbeat" : "heartbeat";
      const bpm      = r?.energy_score   ? 40 + Math.round(r.energy_score * 0.6) : 60;

      const dna: SonicDNA = {
        venueId,
        dominantProfile:  dominant,
        bpm,
        baseFrequencyHz:  40 + (bpm - 40) * 0.5,
        ambientLayers:    ["heartbeat", dominant].filter((v, i, a) => a.indexOf(v) === i) as AcousticProfile[],
        craftMapping:     CRAFT_ACOUSTIC_MAP as Record<string, AcousticProfile>,
        updatedAt:        new Date().toISOString(),
      };

      DNA_CACHE.set(venueId, dna);
      return dna;
    } catch {
      return SpatialAcousticEngine.buildDefaultDNA(venueId);
    }
  }

  static updateSonicDNA(venueId: string, patch: Partial<SonicDNA>): SonicDNA {
    const current = DNA_CACHE.get(venueId) ?? SpatialAcousticEngine.buildDefaultDNA(venueId);
    const updated  = { ...current, ...patch, updatedAt: new Date().toISOString() };
    DNA_CACHE.set(venueId, updated);
    return updated;
  }

  private static buildDefaultDNA(venueId: string): SonicDNA {
    return {
      venueId,
      dominantProfile:  "heartbeat",
      bpm:              60,
      baseFrequencyHz:  40,
      ambientLayers:    ["heartbeat"],
      craftMapping:     CRAFT_ACOUSTIC_MAP as Record<string, AcousticProfile>,
      updatedAt:        new Date().toISOString(),
    };
  }
}
