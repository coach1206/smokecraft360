/**
 * AdapterRegistry — Phase 2: Spatial Haptics + Sonic DNA.
 *
 * Discovers and routes haptic/acoustic events to available hardware adapters.
 * Adapters register themselves; the registry selects the best available chain.
 *
 * Deployment tiers:
 *   1 — Tablet-only (UI physics + web vibration + audio)
 *   2 — Enhanced audio venue (+ directional speakers + smart lighting)
 *   3 — Full intelligent sensory venue (+ haptic floors + scent + wearables)
 */

import type { HapticEvent, AcousticEvent, AdapterCapability, HapticTarget } from "./HapticEvent";

export interface HapticAdapter {
  capability: AdapterCapability;
  emitHaptic(event: HapticEvent): Promise<void>;
  emitAcoustic?(event: AcousticEvent): Promise<void>;
}

class AdapterRegistryImpl {
  private adapters: Map<string, HapticAdapter> = new Map();

  register(adapter: HapticAdapter) {
    this.adapters.set(adapter.capability.name, adapter);
  }

  unregister(name: string) {
    this.adapters.delete(name);
  }

  getCapabilities(): AdapterCapability[] {
    return Array.from(this.adapters.values()).map(a => a.capability);
  }

  getDeploymentTier(): 1 | 2 | 3 {
    const tiers = Array.from(this.adapters.values())
      .filter(a => a.capability.available)
      .map(a => a.capability.deploymentTier);
    if (tiers.includes(3)) return 3;
    if (tiers.includes(2)) return 2;
    return 1;
  }

  private getAdaptersForTarget(target: HapticTarget): HapticAdapter[] {
    return Array.from(this.adapters.values()).filter(
      a => a.capability.available && a.capability.supports.includes(target),
    );
  }

  async routeHaptic(event: HapticEvent): Promise<{ dispatched: string[]; skipped: string[] }> {
    const dispatched: string[] = [];
    const skipped:    string[] = [];

    const candidateNames = new Set<string>();
    for (const target of event.targets) {
      for (const adapter of this.getAdaptersForTarget(target)) {
        candidateNames.add(adapter.capability.name);
      }
    }

    if (candidateNames.size === 0) {
      candidateNames.add("UIPhysicsAdapter");
    }

    await Promise.all(
      Array.from(candidateNames).map(async name => {
        const adapter = this.adapters.get(name);
        if (!adapter) { skipped.push(name); return; }
        try {
          await adapter.emitHaptic(event);
          dispatched.push(name);
        } catch {
          skipped.push(name);
        }
      }),
    );

    return { dispatched, skipped };
  }

  async routeAcoustic(event: AcousticEvent): Promise<{ dispatched: string[] }> {
    const dispatched: string[] = [];
    for (const adapter of this.adapters.values()) {
      if (adapter.capability.available && adapter.emitAcoustic) {
        try {
          await adapter.emitAcoustic(event);
          dispatched.push(adapter.capability.name);
        } catch { /* non-fatal */ }
      }
    }
    return { dispatched };
  }
}

export const AdapterRegistry = new AdapterRegistryImpl();
