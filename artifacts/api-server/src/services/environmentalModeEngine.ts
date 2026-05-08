/**
 * EnvironmentalModeEngine — Phase 4: Environmental AI Modes.
 *
 * Controls real-time venue atmosphere. Each mode adjusts:
 *   - particle density + speed
 *   - lighting warmth + intensity
 *   - UI motion damping
 *   - haptic ambient pattern
 *   - acoustic profile
 *   - recommendation strategy
 *
 * Modes can be triggered manually (staff), automatically (DNA engine),
 * or predictively (mood shift from Phase 2 guest arrival telemetry).
 *
 * Mercury-flow transitions: all mode changes use weighted damping.
 */

import { getIO }  from "../lib/socketServer";
import { logger } from "../lib/logger";
import { HapticResonanceService } from "./haptics/HapticResonanceService";
import { SpatialAcousticEngine }  from "./haptics/SpatialAcousticEngine";

export type EnvironmentMode =
  | "lounge"           // slow, warm amber, languid drift
  | "vip"              // measured precision, gold accents, deep resonance
  | "peak_hour"        // fast telemetry, bright, energetic
  | "relaxed_luxury"   // ultra-slow, cream + obsidian, minimal
  | "social"           // warm mid-energy, community feel
  | "exploration"      // curious, layered, multi-sensory
  | "investor_shadow"  // silent cinematic, executive depth
  | "default";         // venue-DNA-driven neutral

export interface ModeConfig {
  mode:           EnvironmentMode;
  particleDensity: number;    // 0–100
  particleSpeed:   number;    // 0–100
  lightingWarmth:  number;    // 0–100 (0=cool white, 100=deep amber)
  lightingIntensity: number;  // 0–100
  motionDamping:   number;    // 0–100 (0=instant, 100=liquid slow)
  hapticPattern:   "ambient" | "confirmation" | "vip_entrance" | "transition";
  acousticProfile: "heartbeat" | "crystalline" | "ember" | "pour" | "vapor" | "social" | "silence";
  cssVars:         Record<string, string>;
  label:           string;
  description:     string;
}

const MODE_CONFIGS: Record<EnvironmentMode, ModeConfig> = {
  lounge: {
    mode: "lounge",
    particleDensity: 30, particleSpeed: 20,
    lightingWarmth: 78, lightingIntensity: 45,
    motionDamping: 85,
    hapticPattern: "ambient", acousticProfile: "heartbeat",
    cssVars: {
      "--ax-mode-bg":     "rgba(10,8,6,0.96)",
      "--ax-mode-accent": "#D48B00",
      "--ax-mode-glow":   "rgba(212,139,0,0.12)",
      "--ax-mode-speed":  "1.8s",
    },
    label: "Lounge Mode", description: "Low-intensity. Slow drift. Warm amber. Unhurried luxury.",
  },
  vip: {
    mode: "vip",
    particleDensity: 20, particleSpeed: 35,
    lightingWarmth: 90, lightingIntensity: 60,
    motionDamping: 70,
    hapticPattern: "vip_entrance", acousticProfile: "crystalline",
    cssVars: {
      "--ax-mode-bg":     "rgba(6,5,3,0.98)",
      "--ax-mode-accent": "#C4A96D",
      "--ax-mode-glow":   "rgba(196,169,109,0.18)",
      "--ax-mode-speed":  "1.4s",
    },
    label: "VIP Mode", description: "Sharp precision. Deep resonance. Champagne bronze.",
  },
  peak_hour: {
    mode: "peak_hour",
    particleDensity: 70, particleSpeed: 75,
    lightingWarmth: 55, lightingIntensity: 85,
    motionDamping: 40,
    hapticPattern: "confirmation", acousticProfile: "social",
    cssVars: {
      "--ax-mode-bg":     "rgba(15,12,8,0.94)",
      "--ax-mode-accent": "#E8A020",
      "--ax-mode-glow":   "rgba(232,160,32,0.20)",
      "--ax-mode-speed":  "0.8s",
    },
    label: "Peak Hour", description: "High energy. Fast telemetry. Elevated crowd warmth.",
  },
  relaxed_luxury: {
    mode: "relaxed_luxury",
    particleDensity: 15, particleSpeed: 10,
    lightingWarmth: 85, lightingIntensity: 35,
    motionDamping: 95,
    hapticPattern: "ambient", acousticProfile: "heartbeat",
    cssVars: {
      "--ax-mode-bg":     "rgba(8,6,4,0.97)",
      "--ax-mode-accent": "#8A7560",
      "--ax-mode-glow":   "rgba(138,117,96,0.10)",
      "--ax-mode-speed":  "2.4s",
    },
    label: "Relaxed Luxury", description: "Ultra-slow. De-escalation. Maximum calm.",
  },
  social: {
    mode: "social",
    particleDensity: 45, particleSpeed: 50,
    lightingWarmth: 65, lightingIntensity: 65,
    motionDamping: 60,
    hapticPattern: "confirmation", acousticProfile: "social",
    cssVars: {
      "--ax-mode-bg":     "rgba(12,10,7,0.95)",
      "--ax-mode-accent": "#7EC8A0",
      "--ax-mode-glow":   "rgba(126,200,160,0.12)",
      "--ax-mode-speed":  "1.2s",
    },
    label: "Social Mode", description: "Community warmth. Mid-energy. Connection-forward.",
  },
  exploration: {
    mode: "exploration",
    particleDensity: 55, particleSpeed: 40,
    lightingWarmth: 60, lightingIntensity: 55,
    motionDamping: 65,
    hapticPattern: "ambient", acousticProfile: "pour",
    cssVars: {
      "--ax-mode-bg":     "rgba(10,12,15,0.95)",
      "--ax-mode-accent": "#4A8FA8",
      "--ax-mode-glow":   "rgba(74,143,168,0.14)",
      "--ax-mode-speed":  "1.5s",
    },
    label: "Exploration Mode", description: "Curious layering. Multi-sensory curiosity rewarded.",
  },
  investor_shadow: {
    mode: "investor_shadow",
    particleDensity: 8, particleSpeed: 15,
    lightingWarmth: 95, lightingIntensity: 25,
    motionDamping: 92,
    hapticPattern: "transition", acousticProfile: "silence",
    cssVars: {
      "--ax-mode-bg":     "rgba(4,3,2,0.99)",
      "--ax-mode-accent": "#D4AF37",
      "--ax-mode-glow":   "rgba(212,175,55,0.08)",
      "--ax-mode-speed":  "2.8s",
    },
    label: "Investor Shadow", description: "Silent simulation. Cinematic depth. Executive presence.",
  },
  default: {
    mode: "default",
    particleDensity: 35, particleSpeed: 30,
    lightingWarmth: 70, lightingIntensity: 50,
    motionDamping: 75,
    hapticPattern: "ambient", acousticProfile: "heartbeat",
    cssVars: {
      "--ax-mode-bg":     "rgba(10,10,11,0.95)",
      "--ax-mode-accent": "#D48B00",
      "--ax-mode-glow":   "rgba(212,139,0,0.10)",
      "--ax-mode-speed":  "1.6s",
    },
    label: "Default", description: "Venue-DNA driven. Adaptive neutral.",
  },
};

// In-memory per-venue mode state
const venueStates = new Map<string, { mode: EnvironmentMode; activatedAt: string; triggeredBy: string }>();

export class EnvironmentalModeEngine {

  static getConfig(mode: EnvironmentMode): ModeConfig {
    return MODE_CONFIGS[mode];
  }

  static getAllConfigs(): ModeConfig[] {
    return Object.values(MODE_CONFIGS);
  }

  static getVenueMode(venueId: string) {
    return venueStates.get(venueId) ?? { mode: "default" as EnvironmentMode, activatedAt: new Date().toISOString(), triggeredBy: "system" };
  }

  static async activateMode(
    venueId:     string,
    mode:        EnvironmentMode,
    triggeredBy: string,
    transitionMs = 1200,
  ): Promise<ModeConfig> {
    const config = MODE_CONFIGS[mode];
    const state  = { mode, activatedAt: new Date().toISOString(), triggeredBy };
    venueStates.set(venueId, state);

    const io = getIO();
    io.to(`venue:${venueId}`).emit("environment:mode_changed", {
      venueId,
      mode,
      config,
      transitionMs,
      triggeredBy,
      ts: state.activatedAt,
    });

    HapticResonanceService.trigger(config.hapticPattern, {
      intensity: "subtle",
      targets:   ["ui_feedback"],
      venueId,
      metadata:  { mode },
    }).catch(() => {});

    SpatialAcousticEngine.emit(config.acousticProfile, {
      venueId,
      intensity:  "whisper",
      durationMs: 8000,
      fadeMs:     2000,
    }).catch(() => {});

    logger.info({ venueId, mode, triggeredBy }, "environmental mode activated");

    return config;
  }

  static async activateFromMoodShift(
    venueId:       string,
    suggestedMode: string,
  ): Promise<ModeConfig> {
    const mode = (Object.keys(MODE_CONFIGS).includes(suggestedMode)
      ? suggestedMode
      : "lounge") as EnvironmentMode;
    return EnvironmentalModeEngine.activateMode(venueId, mode, "mood_shift_engine", 2400);
  }
}
