/**
 * ProvisioningEngine — Tier-to-Feature Provisioning.
 *
 * Maps NOVEE OS subscription tiers to their included feature keys.
 * On tier activation, bulk-provisions all included features.
 * On tier downgrade, revokes features not in the new tier.
 *
 * Tier hierarchy (cumulative — each tier includes all tiers below):
 *
 *   AXIOM CORE (starter)
 *     smokecraft, basic_telemetry, swipe_experience, loyalty_engine,
 *     pos_basic, inventory_basic, guest_profiles
 *
 *   AXIOM PRO (+)
 *     pourcraft, brewcraft, vapecraft, advanced_analytics,
 *     ai_recommendations, sonic_dna_basic, environmental_basic,
 *     multi_session, offline_queue, csv_export
 *
 *   AXIOM XEI (+)
 *     predictive_intelligence, founder_mode, emotional_heatmap,
 *     sonic_dna_full, environmental_ai_full, revenue_brain_v2,
 *     white_label_eligible, cross_venue_identity, behavioral_analysis
 *
 *   AXIOM BLACK (+)
 *     global_mesh, marketplace_access, enterprise_billing,
 *     custom_integrations, dedicated_sla, ai_elite_quota,
 *     franchise_eligible, data_intelligence_export
 */

import { EntitlementEngine } from "./EntitlementEngine";
import { RevenueOrchestrationEngine } from "./RevenueOrchestrationEngine";
import { logger } from "../../lib/logger";

export type AxiomTier = "CORE" | "PRO" | "XEI" | "BLACK";

const TIER_FEATURES: Record<AxiomTier, string[]> = {
  CORE: [
    "smokecraft",
    "basic_telemetry",
    "swipe_experience",
    "loyalty_engine",
    "pos_basic",
    "inventory_basic",
    "guest_profiles",
  ],
  PRO: [
    "pourcraft",
    "brewcraft",
    "vapecraft",
    "advanced_analytics",
    "ai_recommendations",
    "sonic_dna_basic",
    "environmental_basic",
    "multi_session",
    "offline_queue",
    "csv_export",
  ],
  XEI: [
    "predictive_intelligence",
    "founder_mode",
    "emotional_heatmap",
    "sonic_dna_full",
    "environmental_ai_full",
    "revenue_brain_v2",
    "white_label_eligible",
    "cross_venue_identity",
    "behavioral_analysis",
  ],
  BLACK: [
    "global_mesh",
    "marketplace_access",
    "enterprise_billing",
    "custom_integrations",
    "dedicated_sla",
    "ai_elite_quota",
    "franchise_eligible",
    "data_intelligence_export",
  ],
};

const TIER_ORDER: AxiomTier[] = ["CORE", "PRO", "XEI", "BLACK"];

export class ProvisioningEngine {

  /** All feature keys included in a tier (cumulative — includes lower tiers) */
  static featuresForTier(tier: AxiomTier): string[] {
    const idx = TIER_ORDER.indexOf(tier);
    return TIER_ORDER.slice(0, idx + 1).flatMap(t => TIER_FEATURES[t]);
  }

  /** Provision all features for a tier. Called on plan activation / upgrade. */
  static async provisionTier(venueId: string, tier: AxiomTier): Promise<{
    tier:              AxiomTier;
    featuresGranted:   string[];
    count:             number;
  }> {
    const features = ProvisioningEngine.featuresForTier(tier);
    await EntitlementEngine.bulkEnable(venueId, features, "tier");

    // Record revenue event
    await RevenueOrchestrationEngine.recordEvent({
      venueId,
      revenueType: `tier_provision_${tier.toLowerCase()}`,
      amountCents: 0,
      metadata:    { tier, featuresGranted: features },
    }).catch(() => {});

    logger.info({ venueId, tier, count: features.length }, "tier provisioned");
    return { tier, featuresGranted: features, count: features.length };
  }

  /** Revoke features from the previous tier that are NOT in the new tier. */
  static async deprovisionTier(venueId: string, fromTier: AxiomTier, toTier: AxiomTier): Promise<{
    revoked: string[];
    retained: string[];
  }> {
    const fromFeatures = ProvisioningEngine.featuresForTier(fromTier);
    const toFeatures   = new Set(ProvisioningEngine.featuresForTier(toTier));

    const toRevoke  = fromFeatures.filter(f => !toFeatures.has(f));
    const retained  = fromFeatures.filter(f =>  toFeatures.has(f));

    if (toRevoke.length > 0) {
      await EntitlementEngine.bulkDisable(venueId, toRevoke);
    }

    logger.info({ venueId, fromTier, toTier, revoked: toRevoke.length }, "tier deprovisioned");
    return { revoked: toRevoke, retained };
  }

  /** Check if a venue has a specific feature key (from tier provisioning). */
  static async checkFeature(venueId: string, featureKey: string): Promise<boolean> {
    return EntitlementEngine.checkFeature(venueId, featureKey);
  }

  static getTierMap(): Record<AxiomTier, string[]> {
    return Object.fromEntries(
      TIER_ORDER.map(t => [t, ProvisioningEngine.featuresForTier(t)])
    ) as Record<AxiomTier, string[]>;
  }

  static getTierFeatures(tier: AxiomTier): string[] {
    return TIER_FEATURES[tier] ?? [];
  }
}
