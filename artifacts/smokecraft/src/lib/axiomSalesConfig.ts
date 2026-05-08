// ============================================================
// AXIOM OS — SALES + LICENSING CONFIG ENGINE
// XEI + EEIS COMMERCIAL INFRASTRUCTURE
// ============================================================

// ── Tier definitions ────────────────────────────────────────────────────────

export type TierId = "CORE" | "PRO" | "XEI" | "BLACK";

export interface AxiomTier {
  id:              TierId;
  displayName:     string;
  monthlyPrice:    number;
  annualPrice:     number;
  setupFee:        number;
  allowedFeatures: string[];
  hardwareSupport: boolean;
  maxDevices:      number;
  supportLevel:    "standard" | "priority" | "white_glove" | "enterprise";
}

export const AXIOM_TIERS: Record<TierId, AxiomTier> = {
  CORE: {
    id:           "CORE",
    displayName:  "AXIOM CORE",
    monthlyPrice: 499,
    annualPrice:  4990,
    setupFee:     1500,
    allowedFeatures: [
      "smokecraft_360",
      "basic_telemetry",
      "mentor_ai_basic",
      "single_device",
      "basic_dna",
      "eeis_core",
    ],
    hardwareSupport: false,
    maxDevices:      1,
    supportLevel:    "standard",
  },

  PRO: {
    id:           "PRO",
    displayName:  "AXIOM PRO",
    monthlyPrice: 1499,
    annualPrice:  14990,
    setupFee:     3500,
    allowedFeatures: [
      "smokecraft_360",
      "pourcraft_360",
      "brewcraft_360",
      "vapecraft_360",
      "environmental_ai",
      "group_experience",
      "multi_device",
      "advanced_telemetry",
      "staff_cockpit",
    ],
    hardwareSupport: true,
    maxDevices:      10,
    supportLevel:    "priority",
  },

  XEI: {
    id:           "XEI",
    displayName:  "AXIOM XEI",
    monthlyPrice: 5000,
    annualPrice:  50000,
    setupFee:     10000,
    allowedFeatures: [
      "predictive_intelligence",
      "founder_intelligence",
      "experience_replay",
      "sonic_dna",
      "venue_evolution",
      "behavioral_analytics",
      "cross_device_sync",
      "advanced_ai",
    ],
    hardwareSupport: true,
    maxDevices:      50,
    supportLevel:    "white_glove",
  },

  BLACK: {
    id:           "BLACK",
    displayName:  "AXIOM BLACK",
    monthlyPrice: 15000,
    annualPrice:  150000,
    setupFee:     50000,
    allowedFeatures: [
      "global_orchestration",
      "white_label",
      "franchise_sync",
      "marketplace_access",
      "investor_mode",
      "enterprise_ai",
      "multi_location",
      "founder_god_view",
    ],
    hardwareSupport: true,
    maxDevices:      999,
    supportLevel:    "enterprise",
  },
};

// ── À la carte modules ──────────────────────────────────────────────────────

export type ModuleCategory = "analytics" | "environment" | "ai" | "behavior" | "enterprise";

export interface AxiomModule {
  key:          string;
  name:         string;
  monthlyPrice: number;
  category:     ModuleCategory;
}

export const AXIOM_MODULES: AxiomModule[] = [
  { key: "founder_intelligence", name: "Founder Intelligence Pack", monthlyPrice: 999,  category: "analytics"   },
  { key: "sonic_dna",            name: "Sonic DNA Pack",             monthlyPrice: 499,  category: "environment" },
  { key: "environmental_ai",     name: "Environmental AI",           monthlyPrice: 699,  category: "ai"          },
  { key: "experience_replay",    name: "Experience Replay",          monthlyPrice: 399,  category: "behavior"    },
  { key: "investor_demo_mode",   name: "Investor Demo Mode",         monthlyPrice: 799,  category: "enterprise"  },
];

// ── Hardware leasing ────────────────────────────────────────────────────────

export const HARDWARE_PRICING = {
  tabletLease:      { monthly: 125,  replacementFee: 450  },
  kioskLease:       { monthly: 350,  replacementFee: 2500 },
  lightingHub:      { monthly: 175 },
  audioController:  { monthly: 225 },
  smartHumidor:     { monthly: 300 },
} as const;

// ── Software-only deployment ────────────────────────────────────────────────

export const SOFTWARE_ONLY = {
  activationFee:   1200,
  monthlyBase:     299,
  maxDevices:      5,
  includesSupport: false,
} as const;

// ── Dynamic Pricing Engine ──────────────────────────────────────────────────
// Client-side pricing math only; actual mutations go through the server API.

export class DynamicPricingEngine {
  /** Returns the discounted monthly price for a tier after a promotion. */
  static applyPromotion(tier: TierId, percentOff: number): number {
    const current = AXIOM_TIERS[tier].monthlyPrice;
    return current - current * percentOff;
  }

  /** Calculates annual savings vs. paying monthly for 12 months. */
  static annualSavings(tier: TierId): number {
    const t = AXIOM_TIERS[tier];
    return t.monthlyPrice * 12 - t.annualPrice;
  }
}

// ── Feature Entitlement Engine ──────────────────────────────────────────────
// Client-side mirror of the server EntitlementEngine for UI gating.

export class FeatureEntitlementEngine {
  static getEnabledFeatures(subscriptionTier: TierId, purchasedModules: string[]): string[] {
    return [
      ...AXIOM_TIERS[subscriptionTier].allowedFeatures,
      ...purchasedModules,
    ];
  }

  static hasAccess(tier: TierId, feature: string): boolean {
    return AXIOM_TIERS[tier].allowedFeatures.includes(feature);
  }
}

// ── Auto Provisioning (client-side simulation) ──────────────────────────────

export class AutoProvisioningService {
  static simulateProvision(params: {
    tenantId:          string;
    subscriptionTier:  TierId;
    modules:           string[];
  }): { tenantId: string; activatedFeatures: string[]; status: string } {
    return {
      tenantId:          params.tenantId,
      activatedFeatures: FeatureEntitlementEngine.getEnabledFeatures(
        params.subscriptionTier,
        params.modules,
      ),
      status: "provisioned",
    };
  }
}

// ── Revenue Summary Engine ──────────────────────────────────────────────────

export class RevenueSummaryEngine {
  static calculateMRR(activeVenues: Array<{ monthlyRevenue: number }>): number {
    return activeVenues.reduce((total, v) => total + v.monthlyRevenue, 0);
  }
}

// ── Venue owner view builder ────────────────────────────────────────────────

export function buildVenueView(tier: TierId, modules: string[]) {
  return {
    visibleFeatures: FeatureEntitlementEngine.getEnabledFeatures(tier, modules),
    hiddenModules:   AXIOM_MODULES.filter((m) => !modules.includes(m.key)),
  };
}
