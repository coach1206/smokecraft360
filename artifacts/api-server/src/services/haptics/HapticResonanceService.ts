/**
 * HapticResonanceService — Phase 2: Spatial Haptics + Sonic DNA.
 *
 * The primary haptic orchestration layer. Generates haptic events,
 * routes through the AdapterRegistry, and manages ambient lounge pulse.
 *
 * All haptic triggers go through this service — never call adapters directly.
 */

import { randomUUID } from "crypto";
import { AdapterRegistry } from "./AdapterRegistry";
import { UIPhysicsAdapter } from "./UIPhysicsAdapter";
import { WebVibrationAdapter } from "./WebVibrationAdapter";
import type { HapticEvent, HapticPattern, HapticIntensity, HapticTarget } from "./HapticEvent";
import { logger } from "../../lib/logger";

let initialized = false;

export class HapticResonanceService {

  static init() {
    if (initialized) return;
    AdapterRegistry.register(UIPhysicsAdapter);
    AdapterRegistry.register(WebVibrationAdapter);
    initialized = true;
    logger.info({ tier: AdapterRegistry.getDeploymentTier() }, "HapticResonanceService initialized");
  }

  static async trigger(
    pattern:    HapticPattern,
    options: {
      intensity?: HapticIntensity;
      targets?:   HapticTarget[];
      durationMs?: number;
      venueId?:   string;
      zoneId?:    string;
      guestId?:   string;
      metadata?:  Record<string, unknown>;
    } = {},
  ): Promise<{ dispatched: string[]; skipped: string[]; eventId: string }> {

    const event: HapticEvent = {
      id:         randomUUID(),
      pattern,
      intensity:  options.intensity  ?? "moderate",
      targets:    options.targets    ?? ["ui_feedback"],
      durationMs: options.durationMs ?? HapticResonanceService.defaultDuration(pattern),
      venueId:    options.venueId,
      zoneId:     options.zoneId,
      guestId:    options.guestId,
      metadata:   options.metadata,
      ts:         new Date().toISOString(),
    };

    const result = await AdapterRegistry.routeHaptic(event);
    logger.info({ pattern, dispatched: result.dispatched.length }, "haptic dispatched");
    return { ...result, eventId: event.id };
  }

  static async triggerXpBurst(venueId?: string, guestId?: string) {
    return HapticResonanceService.trigger("xp_burst", {
      intensity: "strong",
      targets:   ["ui_feedback", "all_devices"],
      venueId,
      guestId,
    });
  }

  static async triggerLevelUp(venueId?: string, guestId?: string) {
    return HapticResonanceService.trigger("level_up", {
      intensity: "full",
      targets:   ["ui_feedback", "all_devices"],
      venueId,
      guestId,
    });
  }

  static async triggerVipEntrance(venueId: string, zoneId?: string) {
    return HapticResonanceService.trigger("vip_entrance", {
      intensity: "strong",
      targets:   ["ui_feedback", "floor_system", "ambient_speakers"],
      venueId,
      zoneId,
    });
  }

  static async triggerCraftReveal(craftType: string, venueId?: string) {
    return HapticResonanceService.trigger("craft_reveal", {
      intensity: "moderate",
      targets:   ["ui_feedback"],
      venueId,
      metadata:  { craftType },
    });
  }

  static getCapabilities() {
    return {
      adapters:        AdapterRegistry.getCapabilities(),
      deploymentTier:  AdapterRegistry.getDeploymentTier(),
    };
  }

  private static defaultDuration(pattern: HapticPattern): number {
    const durations: Partial<Record<HapticPattern, number>> = {
      confirmation: 200,
      success:      400,
      alert:        600,
      ambient:      2000,
      xp_burst:     300,
      level_up:     800,
      vip_entrance: 500,
      craft_reveal: 600,
      transition:   400,
      error:        400,
    };
    return durations[pattern] ?? 300;
  }
}
