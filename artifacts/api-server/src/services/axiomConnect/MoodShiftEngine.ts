/**
 * MoodShiftEngine — Phase 2: Guest Mood Intelligence.
 *
 * Synthesises flight telemetry + eSIM + insurance signals into a
 * guest mood profile. This feeds directly into the EnvironmentalModeEngine
 * which pre-calibrates the venue atmosphere before the guest arrives.
 *
 * Mood types map to Environmental AI Modes:
 *   fatigued_traveller → Relaxed Luxury / Lounge Mode
 *   excited_arrival    → Social / VIP Mode
 *   business_focused   → Executive / VIP Mode
 *   leisure_explorer   → Sensory Exploration Mode
 *   stressed_delayed   → Relaxed Luxury (de-escalation)
 */

import type { FlightStatus } from "./AviationstackAdapter";
import type { EsimOffer }    from "./AiraloAdapter";
import type { InsuranceQuote } from "./AllianzAdapter";

export type GuestMood =
  | "fatigued_traveller"
  | "excited_arrival"
  | "business_focused"
  | "leisure_explorer"
  | "stressed_delayed"
  | "neutral";

export interface MoodShift {
  mood:              GuestMood;
  intensity:         number;
  suggestedMode:     "lounge" | "vip" | "social" | "exploration" | "relaxed_luxury";
  preCalibrationMs:  number;
  rationale:         string;
  craftPriority:     string[];
}

export class MoodShiftEngine {

  static derive(signals: {
    flightStatus?:   FlightStatus | null;
    esimOffers?:     EsimOffer[];
    insuranceQuote?: InsuranceQuote | null;
  }): MoodShift | null {
    const { flightStatus, esimOffers } = signals;

    if (!flightStatus) return null;

    const delay        = flightStatus.delayMinutes;
    const fatigue      = flightStatus.fatigueScore;
    const isInternational = (esimOffers?.length ?? 0) > 0;
    const cabin        = flightStatus.cabinHint;

    let mood:          GuestMood;
    let intensity:     number;
    let suggestedMode: MoodShift["suggestedMode"];
    let rationale:     string;
    let craftPriority: string[];

    if (delay > 60) {
      mood          = "stressed_delayed";
      intensity     = Math.min(95, 60 + delay / 10);
      suggestedMode = "relaxed_luxury";
      rationale     = `Flight delayed ${delay}min — guest arriving fatigued and frustrated. Pre-calibrating to Relaxed Luxury.`;
      craftPriority = ["brew", "pour", "smoke"];

    } else if (fatigue > 65) {
      mood          = "fatigued_traveller";
      intensity     = fatigue;
      suggestedMode = "lounge";
      rationale     = `Long-haul arrival (fatigue score ${fatigue}). Lounge Mode activated — slow ambient, warm lighting.`;
      craftPriority = ["pour", "smoke", "brew"];

    } else if (cabin === "first" || cabin === "business") {
      mood          = "business_focused";
      intensity     = 70;
      suggestedMode = "vip";
      rationale     = `${cabin} class arrival — elevated expectations. VIP Mode with premium pairing surface.`;
      craftPriority = ["smoke", "pour", "brew"];

    } else if (isInternational) {
      mood          = "leisure_explorer";
      intensity     = 55;
      suggestedMode = "exploration";
      rationale     = "International guest — novelty-seeking profile. Sensory Exploration Mode.";
      craftPriority = ["smoke", "brew", "vape", "pour"];

    } else {
      mood          = "excited_arrival";
      intensity     = 60;
      suggestedMode = "social";
      rationale     = "On-time domestic arrival — elevated energy. Social Mode engaged.";
      craftPriority = ["brew", "pour", "smoke"];
    }

    const preCalibrationMs = Math.max(
      5 * 60 * 1000,
      (flightStatus.estimatedArrival
        ? new Date(flightStatus.estimatedArrival).getTime() - Date.now() - 45 * 60 * 1000
        : 45 * 60 * 1000),
    );

    return {
      mood,
      intensity:        Math.round(intensity),
      suggestedMode,
      preCalibrationMs: Math.max(0, preCalibrationMs),
      rationale,
      craftPriority,
    };
  }

  static moodToEnvironmentMode(mood: GuestMood): string {
    const map: Record<GuestMood, string> = {
      fatigued_traveller: "lounge",
      excited_arrival:    "social",
      business_focused:   "vip",
      leisure_explorer:   "exploration",
      stressed_delayed:   "relaxed_luxury",
      neutral:            "lounge",
    };
    return map[mood] ?? "lounge";
  }
}
