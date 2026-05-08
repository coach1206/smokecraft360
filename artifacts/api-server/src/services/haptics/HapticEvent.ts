/**
 * HapticEvent — Phase 2: Spatial Haptics + Sonic DNA.
 *
 * Type definitions for the hardware-agnostic haptic event system.
 * All physical integration adapters consume these types.
 */

export type HapticPattern =
  | "confirmation"    // brief single pulse — action confirmed
  | "success"         // double rising pulse — reward/achievement
  | "alert"           // rhythmic triple — staff attention
  | "ambient"         // slow low-frequency throb — lounge heartbeat
  | "xp_burst"        // sharp energetic burst — XP awarded
  | "level_up"        // sustained rising swell — level achieved
  | "vip_entrance"    // deep resonant single — VIP recognition
  | "craft_reveal"    // rolling wave — product reveal
  | "transition"      // smooth fade — mode switch
  | "error";          // sharp double — failure/block

export type HapticIntensity = "whisper" | "subtle" | "moderate" | "strong" | "full";

export type HapticTarget =
  | "all_devices"
  | "staff_wearables"
  | "kiosk_surfaces"
  | "floor_system"
  | "ambient_speakers"
  | "scent_diffusers"
  | "wall_displays"
  | "ui_feedback";     // software-only fallback

export interface HapticEvent {
  id:           string;
  pattern:      HapticPattern;
  intensity:    HapticIntensity;
  targets:      HapticTarget[];
  durationMs:   number;
  venueId?:     string;
  zoneId?:      string;
  guestId?:     string;
  metadata?:    Record<string, unknown>;
  ts:           string;
}

export type AcousticProfile =
  | "heartbeat"       // deep 40Hz lounge pulse
  | "crystalline"     // high-freq sparkle — VIP/achievement
  | "ember"           // warm crackling — cigar/smoke
  | "pour"            // liquid resonance — spirits/beer
  | "vapor"           // airy drift — vape
  | "social"          // ambient crowd warmth
  | "silence"         // intentional quiet luxury

export interface AcousticEvent {
  id:         string;
  profile:    AcousticProfile;
  intensity:  HapticIntensity;
  durationMs: number;
  fadeMs:     number;
  venueId?:   string;
  ts:         string;
}

export interface SonicDNA {
  venueId:        string;
  dominantProfile: AcousticProfile;
  bpm:            number;
  baseFrequencyHz: number;
  ambientLayers:  AcousticProfile[];
  craftMapping:   Record<string, AcousticProfile>;
  updatedAt:      string;
}

export interface AdapterCapability {
  name:        string;
  adapterType: string;
  supports:    HapticTarget[];
  available:   boolean;
  deploymentTier: 1 | 2 | 3;
}
