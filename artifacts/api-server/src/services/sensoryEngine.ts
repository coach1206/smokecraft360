/**
 * SensoryEngine — Central Sensory Intelligence Orchestration.
 *
 * Phase A: Sensory Engine Realization.
 *
 * Coordinates all sensory modalities (audio, haptic, environmental) across
 * all active venue sessions. Emits Socket.io `sensory:audio_trigger` events
 * to the frontend craft audio engine and routes haptic/acoustic signals
 * through the existing adapter registry.
 *
 * Architecture:
 *   - Occupancy-aware intensity scaling (0–100 guests → 0.2–1.0 gain)
 *   - Craft-specific sound profile orchestration (smoke/pour/brew/vape)
 *   - Multi-layer ambient mixing signals (ambient + event layers)
 *   - Event-triggered precision sound hooks (mapped from SOUND_HOOKS)
 *   - Environmental mode integration (activates acoustic profile on mode change)
 *   - NeuralEventBus pub for distributed observability
 *   - Redis-swap-ready: internal state stored in VenueStateEngine
 */

import { getIO }                   from "../lib/socketServer";
import { VenueStateEngine }        from "./venueStateEngine";
import { SpatialAcousticEngine }   from "./haptics/SpatialAcousticEngine";
import { HapticResonanceService }  from "./haptics/HapticResonanceService";
import { NeuralEventBus }          from "./neuralEventBus";
import { logger }                  from "../lib/logger";

// ── Craft → acoustic profile mapping ─────────────────────────────────────────

export type CraftSoundProfile = "smoke" | "pour" | "brew" | "vape";

export interface SensoryTrigger {
  venueId:      string;
  craftType:    CraftSoundProfile;
  hookName:     string;
  layer:        "ambient" | "event" | "transition";
  intensity:    number;       // 0.0–1.0
  durationMs:   number;
  fadeMs:       number;
  ts:           string;
}

export interface CraftSoundLayer {
  ambient: {
    profile:    string;
    intensityBase: number;
    bpmRange:   [number, number];
  };
  events: Record<string, { profile: string; durationMs: number }>;
}

const CRAFT_LAYERS: Record<CraftSoundProfile, CraftSoundLayer> = {
  smoke: {
    ambient: { profile: "ember",      intensityBase: 0.40, bpmRange: [40, 60] },
    events: {
      swipeAdd:   { profile: "smoke_ember_crackle",  durationMs: 400 },
      swipeSkip:  { profile: "smoke_soft_exhale",    durationMs: 600 },
      reveal:     { profile: "smoke_lighter_flick",  durationMs: 300 },
      addToOrder: { profile: "smoke_glass_clink",    durationMs: 500 },
    },
  },
  pour: {
    ambient: { profile: "pour",       intensityBase: 0.35, bpmRange: [50, 70] },
    events: {
      swipeAdd:   { profile: "pour_liquid_drip",     durationMs: 700 },
      swipeSkip:  { profile: "pour_soft_slosh",      durationMs: 500 },
      reveal:     { profile: "pour_ice_clink",       durationMs: 350 },
      addToOrder: { profile: "pour_liquid_pour",     durationMs: 900 },
    },
  },
  brew: {
    ambient: { profile: "pour",       intensityBase: 0.38, bpmRange: [55, 75] },
    events: {
      swipeAdd:   { profile: "brew_carbonation_hiss", durationMs: 500 },
      swipeSkip:  { profile: "brew_soft_tap",         durationMs: 300 },
      reveal:     { profile: "brew_foam_pour",         durationMs: 800 },
      addToOrder: { profile: "brew_pint_set_down",     durationMs: 400 },
    },
  },
  vape: {
    ambient: { profile: "vapor",      intensityBase: 0.30, bpmRange: [60, 85] },
    events: {
      swipeAdd:   { profile: "vape_vapor_inhale",     durationMs: 800 },
      swipeSkip:  { profile: "vape_soft_exhale",      durationMs: 700 },
      reveal:     { profile: "vape_ambient_synth",    durationMs: 600 },
      addToOrder: { profile: "vape_device_click",     durationMs: 250 },
    },
  },
};

// ── In-process state (VenueStateEngine holds the canonical copy) ──────────────

interface VenueSensoryState {
  activeCraft:      CraftSoundProfile | null;
  occupancy:        number;
  intensityScale:   number;
  lastAmbientAt:    string | null;
  lastTriggerAt:    string | null;
  triggerCount:     number;
}

const sensoryStates = new Map<string, VenueSensoryState>();

function getState(venueId: string): VenueSensoryState {
  if (!sensoryStates.has(venueId)) {
    sensoryStates.set(venueId, {
      activeCraft:    null,
      occupancy:      0,
      intensityScale: 0.5,
      lastAmbientAt:  null,
      lastTriggerAt:  null,
      triggerCount:   0,
    });
  }
  return sensoryStates.get(venueId)!;
}

/** Occupancy → intensity scale: 0 guests = 0.20, 50 = 0.65, 100+ = 1.0 */
function occupancyToIntensity(guestCount: number): number {
  return Math.min(1.0, 0.20 + (guestCount / 100) * 0.80);
}

// ── Public API ────────────────────────────────────────────────────────────────

export class SensoryEngine {

  /**
   * Set (or change) the active craft for a venue session.
   * Emits ambient layer signal + haptic on craft switch.
   */
  static async setActiveCraft(venueId: string, craftType: CraftSoundProfile): Promise<void> {
    const state   = getState(venueId);
    const changed = state.activeCraft !== craftType;
    state.activeCraft = craftType;

    VenueStateEngine.set(venueId, "sonic_dna", { craft: craftType, updatedAt: new Date().toISOString() });

    const layer     = CRAFT_LAYERS[craftType];
    const intensity = state.intensityScale * layer.ambient.intensityBase;

    const trigger: SensoryTrigger = {
      venueId,
      craftType,
      hookName:   "ambient_layer",
      layer:      changed ? "transition" : "ambient",
      intensity,
      durationMs: 0,       // 0 = continuous until next setActiveCraft
      fadeMs:     changed ? 1800 : 400,
      ts:         new Date().toISOString(),
    };

    getIO().to(`venue:${venueId}`).emit("sensory:audio_trigger", trigger);
    state.lastAmbientAt = trigger.ts;

    await SpatialAcousticEngine.emit(layer.ambient.profile as Parameters<typeof SpatialAcousticEngine.emit>[0], {
      intensity: intensity > 0.6 ? "moderate" : "subtle",
      durationMs: 8000,
      fadeMs:     changed ? 1800 : 600,
      venueId,
    });

    if (changed) {
      await HapticResonanceService.trigger("transition", {
        intensity: "subtle",
        targets:   ["ui_feedback"],
        venueId,
        metadata:  { craftType },
      });
    }

    NeuralEventBus.publish("sensory.audio_trigger", { craftType, layer: trigger.layer, intensity }, venueId);
    logger.info({ venueId, craftType, changed, intensity }, "sensory: craft ambient set");
  }

  /**
   * Trigger a precision event sound (mapped from SOUND_HOOKS).
   * hookName is one of: swipeAdd, swipeSkip, reveal, addToOrder
   */
  static async triggerEventSound(
    venueId:  string,
    craftType: CraftSoundProfile,
    hookName:  string,
    volume = 0.7,
  ): Promise<void> {
    const state   = getState(venueId);
    const craft   = CRAFT_LAYERS[craftType];
    const event   = craft.events[hookName];
    if (!event) return;

    const intensity = Math.min(1.0, state.intensityScale * volume);

    const trigger: SensoryTrigger = {
      venueId,
      craftType,
      hookName,
      layer:      "event",
      intensity,
      durationMs: event.durationMs,
      fadeMs:     120,
      ts:         new Date().toISOString(),
    };

    getIO().to(`venue:${venueId}`).emit("sensory:audio_trigger", trigger);
    state.lastTriggerAt = trigger.ts;
    state.triggerCount++;

    const hapticMap: Record<string, Parameters<typeof HapticResonanceService.trigger>[0]> = {
      swipeAdd:   "confirmation",
      swipeSkip:  "confirmation",
      reveal:     "craft_reveal",
      addToOrder: "confirmation",
    };
    const hapticPattern = hapticMap[hookName];
    if (hapticPattern) {
      void HapticResonanceService.trigger(hapticPattern, {
        intensity: intensity > 0.7 ? "moderate" : "subtle",
        targets:   ["ui_feedback"],
        venueId,
      });
    }

    NeuralEventBus.publish("sensory.audio_trigger", { hookName, craftType, layer: "event" }, venueId);
  }

  /**
   * Update occupancy for a venue — scales all future sound intensities.
   */
  static updateOccupancy(venueId: string, guestCount: number): void {
    const state          = getState(venueId);
    state.occupancy      = guestCount;
    state.intensityScale = occupancyToIntensity(guestCount);
    VenueStateEngine.set(venueId, "guest_count", guestCount);
    logger.info({ venueId, guestCount, intensityScale: state.intensityScale }, "sensory: occupancy updated");
  }

  /**
   * Emit a full ambient refresh for all currently tracked venues.
   * Called by VenueEnergyEngine when energy state changes.
   */
  static async refreshAmbient(venueId: string): Promise<void> {
    const state = getState(venueId);
    if (!state.activeCraft) return;
    await SensoryEngine.setActiveCraft(venueId, state.activeCraft);
  }

  /** Snapshot for EEIE Command Center observability. */
  static getStatus(): Record<string, unknown>[] {
    return Array.from(sensoryStates.entries()).map(([venueId, s]) => ({
      venueId,
      activeCraft:    s.activeCraft,
      occupancy:      s.occupancy,
      intensityScale: s.intensityScale,
      triggerCount:   s.triggerCount,
      lastAmbientAt:  s.lastAmbientAt,
      lastTriggerAt:  s.lastTriggerAt,
    }));
  }
}

// ── Startup ───────────────────────────────────────────────────────────────────

export function startSensoryEngine(): void {
  HapticResonanceService.init();

  NeuralEventBus.subscribe("venue.mode_changed", (event) => {
    const { venueId, mode } = event.payload as { venueId: string; mode: string };
    if (!venueId) return;
    const state = getState(venueId);
    if (!state.activeCraft) return;

    const modeIntensityMap: Record<string, number> = {
      IGNITION:       0.90,
      PEAK:           1.00,
      FLOW:           0.75,
      WIND_DOWN:      0.45,
      LATE_NIGHT:     0.35,
      VIP_ARRIVAL:    0.85,
      RECOVERY:       0.40,
    };
    const targetIntensity = modeIntensityMap[mode as string] ?? 0.6;
    state.intensityScale  = targetIntensity * occupancyToIntensity(state.occupancy);

    void SensoryEngine.refreshAmbient(venueId);
    logger.info({ venueId, mode, intensityScale: state.intensityScale }, "sensory: mode-driven intensity updated");
  });

  logger.info("SensoryEngine started — occupancy-aware craft audio orchestration active");
}
