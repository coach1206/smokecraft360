/**
 * WebVibrationAdapter — Phase 2: Deployment Tier 1 mobile enhancement.
 *
 * Signals the frontend to trigger the Web Vibration API on mobile devices.
 * Android Chrome supports this; iOS is permission-gated.
 * Sent via Socket.io; the client decides if it can vibrate.
 *
 * Future: Replace with direct wearable SDK calls for Tier 2/3 venues.
 */

import { getIO } from "../../lib/socketServer";
import type { HapticAdapter } from "./AdapterRegistry";
import type { HapticEvent, HapticPattern, AdapterCapability } from "./HapticEvent";

const VIBRATION_PATTERNS: Record<HapticPattern, number[]> = {
  confirmation: [40],
  success:      [30, 50, 80],
  alert:        [80, 40, 80, 40, 80],
  ambient:      [200, 800, 200],
  xp_burst:     [15, 20, 50],
  level_up:     [50, 30, 100, 30, 200],
  vip_entrance: [300],
  craft_reveal: [20, 30, 20, 30, 80],
  transition:   [80, 40],
  error:        [100, 60, 100],
};

const INTENSITY_SCALE: Record<string, number> = {
  whisper:  0.2,
  subtle:   0.4,
  moderate: 0.7,
  strong:   0.9,
  full:     1.0,
};

export const WebVibrationAdapter: HapticAdapter = {
  capability: {
    name:           "WebVibrationAdapter",
    adapterType:    "web_vibration",
    supports:       ["all_devices", "ui_feedback"],
    available:      true,
    deploymentTier: 1,
  } satisfies AdapterCapability,

  async emitHaptic(event: HapticEvent) {
    const pattern   = VIBRATION_PATTERNS[event.pattern] ?? [50];
    const scale     = INTENSITY_SCALE[event.intensity]  ?? 0.7;
    const scaled    = pattern.map(v => Math.round(v * scale));

    const io = getIO();
    const payload = {
      eventId:          event.id,
      pattern:          event.pattern,
      vibrationPattern: scaled,
      venueId:          event.venueId,
      guestId:          event.guestId,
      ts:               event.ts,
    };

    if (event.guestId) {
      io.to(`guest:${event.guestId}`).emit("haptic:vibrate", payload);
    } else if (event.venueId) {
      io.to(`venue:${event.venueId}`).emit("haptic:vibrate", payload);
    } else {
      io.emit("haptic:vibrate", payload);
    }
  },
};
