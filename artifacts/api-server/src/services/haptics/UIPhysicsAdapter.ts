/**
 * UIPhysicsAdapter — Phase 2: Deployment Tier 1 fallback.
 *
 * The always-available software adapter. Translates haptic events into
 * Socket.io signals that trigger visual liquid-glass physics on the frontend.
 * Works on ALL deployments — no hardware required.
 */

import { getIO } from "../../lib/socketServer";
import type { HapticAdapter } from "./AdapterRegistry";
import type { HapticEvent, AcousticEvent, AdapterCapability } from "./HapticEvent";

const VISUAL_MAP: Record<string, { ripple: boolean; glow: string; shake: boolean; blur: boolean }> = {
  confirmation: { ripple: true,  glow: "#D48B00", shake: false, blur: false },
  success:      { ripple: true,  glow: "#7EC8A0", shake: false, blur: false },
  alert:        { ripple: true,  glow: "#E85D26", shake: true,  blur: false },
  ambient:      { ripple: false, glow: "#6B5E4E", shake: false, blur: true  },
  xp_burst:     { ripple: true,  glow: "#FFD700", shake: false, blur: false },
  level_up:     { ripple: true,  glow: "#D4AF37", shake: false, blur: true  },
  vip_entrance: { ripple: true,  glow: "#C4A96D", shake: false, blur: true  },
  craft_reveal: { ripple: true,  glow: "#4A8FA8", shake: false, blur: false },
  transition:   { ripple: false, glow: "#2A2A2A", shake: false, blur: true  },
  error:        { ripple: false, glow: "#E85D26", shake: true,  blur: false },
};

export const UIPhysicsAdapter: HapticAdapter = {
  capability: {
    name:           "UIPhysicsAdapter",
    adapterType:    "software",
    supports:       ["ui_feedback", "all_devices"],
    available:      true,
    deploymentTier: 1,
  } satisfies AdapterCapability,

  async emitHaptic(event: HapticEvent) {
    const visual = VISUAL_MAP[event.pattern] ?? { ripple: true, glow: "#D48B00", shake: false, blur: false };
    const io     = getIO();

    const payload = {
      eventId:   event.id,
      pattern:   event.pattern,
      intensity: event.intensity,
      durationMs: event.durationMs,
      visual,
      venueId:   event.venueId,
      zoneId:    event.zoneId,
      ts:        event.ts,
    };

    if (event.venueId) {
      io.to(`venue:${event.venueId}`).emit("haptic:ui_physics", payload);
    } else {
      io.emit("haptic:ui_physics", payload);
    }
  },

  async emitAcoustic(event: AcousticEvent) {
    const io = getIO();
    const payload = {
      eventId:   event.id,
      profile:   event.profile,
      intensity: event.intensity,
      durationMs: event.durationMs,
      fadeMs:    event.fadeMs,
      venueId:   event.venueId,
      ts:        event.ts,
    };

    if (event.venueId) {
      io.to(`venue:${event.venueId}`).emit("haptic:acoustic", payload);
    } else {
      io.emit("haptic:acoustic", payload);
    }
  },
};
