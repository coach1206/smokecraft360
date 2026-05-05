/**
 * Feature catalog and package definitions — single source of truth.
 *
 * Features are code-defined so deployments stay in sync with the DB.
 * Packages bundle features; venue_entitlements stores the per-venue assignment.
 */

export interface Feature {
  id:          string;
  name:        string;
  description: string;
  category:    "experience" | "operations" | "intelligence" | "monetization" | "platform";
}

export const FEATURE_CATALOG: Feature[] = [
  // ── Experience modules ──────────────────────────────────────────────────────
  { id: "SMOKECRAFT",       name: "SmokeCraft",          category: "experience",     description: "Cigar pairing kiosk experience with AI recommendations" },
  { id: "POURCRAFT",        name: "PourCraft",           category: "experience",     description: "Spirits & whiskey pairing flow" },
  { id: "BREWCRAFT",        name: "BrewCraft",           category: "experience",     description: "Beer & craft ale pairing experience" },
  { id: "VAPECRAFT",        name: "VapeCraft",           category: "experience",     description: "Vape & e-liquid flavor flow" },
  { id: "CRAFT_ENGINE",     name: "Craft Engine",        category: "experience",     description: "Full Sensory Craft Engine — canvas physics, Web Audio & AI crossfade" },
  // ── Operations ─────────────────────────────────────────────────────────────
  { id: "INVENTORY",        name: "Inventory",           category: "operations",     description: "Stock control, manual adjustments & low-stock alerts" },
  { id: "LOYALTY",          name: "Loyalty & Rewards",   category: "operations",     description: "Point accumulation, reward redemption & tier progression" },
  { id: "CAMPAIGNS",        name: "Campaigns",           category: "operations",     description: "Promotional campaign creation, budgets & attribution" },
  { id: "RESERVATIONS",     name: "Reservations",        category: "operations",     description: "Table & experience reservation management" },
  { id: "EXPORTS",          name: "Data Exports",        category: "operations",     description: "CSV & PDF export for orders, inventory & analytics" },
  { id: "SIGNATURE_CIGARS", name: "Signature Cigars",    category: "operations",     description: "Custom cigar design submission & production tracking" },
  // ── Intelligence ───────────────────────────────────────────────────────────
  { id: "AI_PAIRING",       name: "AI Pairing",          category: "intelligence",   description: "AI-powered product & pairing recommendations engine" },
  { id: "ANALYTICS",        name: "Basic Analytics",     category: "intelligence",   description: "Revenue charts, order history & hourly trends" },
  { id: "ADVANCED_ANALYTICS",name:"Advanced Analytics",  category: "intelligence",   description: "AI revenue brain, behavioral insights & conversion funnel" },
  { id: "DEMAND_PROOF",     name: "Demand Proof",        category: "intelligence",   description: "Real-time demand intelligence & missed-sales tracking" },
  { id: "NETWORK_INSIGHTS", name: "Network Insights",    category: "intelligence",   description: "Anonymous cross-venue benchmarks & competitive positioning" },
  // ── Monetization ───────────────────────────────────────────────────────────
  { id: "DYNAMIC_PRICING",  name: "Dynamic Pricing",     category: "monetization",   description: "Time-based & demand-driven price optimization" },
  { id: "LOUNGE_LEAGUE",    name: "Lounge League",       category: "monetization",   description: "Gamified venue competition with leaderboard & badges" },
  { id: "COMPETITIONS",     name: "Competitions",        category: "monetization",   description: "Craft competitions with judging & prize management" },
  // ── Platform ───────────────────────────────────────────────────────────────
  { id: "LIVE_KPI",         name: "Live KPI System",     category: "platform",       description: "Animated real-time KPI counters across Command Hub" },
  { id: "IP_VAULT",         name: "IP Vault",            category: "platform",       description: "Brand protection, NDA management & IP asset registry" },
  { id: "VOICE_COMMANDS",   name: "Voice Commands",      category: "platform",       description: "Hands-free voice navigation & ordering interface" },
];

export const FEATURE_MAP = new Map(FEATURE_CATALOG.map(f => [f.id, f]));

// ── Package catalog ─────────────────────────────────────────────────────────

export interface Package {
  id:          string;
  name:        string;
  description: string;
  features:    string[];
  color:       string;
}

export const PACKAGE_CATALOG: Package[] = [
  {
    id:          "starter",
    name:        "Starter",
    description: "Launch a beautiful kiosk with core experiences and inventory control.",
    color:       "#5b8def",
    features:    ["SMOKECRAFT", "POURCRAFT", "INVENTORY", "ANALYTICS"],
  },
  {
    id:          "control",
    name:        "Control",
    description: "Run your floor with campaigns, loyalty and multi-craft experiences.",
    color:       "#34d399",
    features:    ["SMOKECRAFT", "POURCRAFT", "BREWCRAFT", "VAPECRAFT", "CRAFT_ENGINE",
                  "INVENTORY", "ANALYTICS", "LOYALTY", "CAMPAIGNS", "RESERVATIONS"],
  },
  {
    id:          "intelligence",
    name:        "Intelligence",
    description: "Add AI pairing, demand proof and advanced analytics to close every sale.",
    color:       "#a78bfa",
    features:    ["SMOKECRAFT", "POURCRAFT", "BREWCRAFT", "VAPECRAFT", "CRAFT_ENGINE",
                  "INVENTORY", "ANALYTICS", "ADVANCED_ANALYTICS", "LOYALTY", "CAMPAIGNS",
                  "RESERVATIONS", "AI_PAIRING", "DEMAND_PROOF"],
  },
  {
    id:          "revenue",
    name:        "Revenue",
    description: "Network benchmarks, dynamic pricing, exports and signature cigars.",
    color:       "#f59e0b",
    features:    ["SMOKECRAFT", "POURCRAFT", "BREWCRAFT", "VAPECRAFT", "CRAFT_ENGINE",
                  "INVENTORY", "ANALYTICS", "ADVANCED_ANALYTICS", "LOYALTY", "CAMPAIGNS",
                  "RESERVATIONS", "AI_PAIRING", "DEMAND_PROOF", "NETWORK_INSIGHTS",
                  "DYNAMIC_PRICING", "EXPORTS", "SIGNATURE_CIGARS", "LIVE_KPI",
                  "LOUNGE_LEAGUE", "COMPETITIONS"],
  },
  {
    id:          "enterprise",
    name:        "Enterprise",
    description: "Every feature unlocked. Full platform access with IP Vault and voice.",
    color:       "#d4af37",
    features:    FEATURE_CATALOG.map(f => f.id),
  },
];

export const PACKAGE_MAP = new Map(PACKAGE_CATALOG.map(p => [p.id, p]));

/**
 * Compute the effective feature set for a venue given its package and overrides.
 * Returns a Set of feature IDs.
 */
export function resolveFeatures(
  packageId: string | null | undefined,
  overrides: Array<{ id: string; enabled: boolean }>,
): Set<string> {
  const base = packageId ? (PACKAGE_MAP.get(packageId)?.features ?? []) : [];
  const effective = new Set<string>(base);
  for (const override of overrides) {
    if (override.enabled) effective.add(override.id);
    else                  effective.delete(override.id);
  }
  return effective;
}
