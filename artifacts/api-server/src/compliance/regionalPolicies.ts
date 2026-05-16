/**
 * regionalPolicies — regional compliance rule sets.
 *
 * Maps venue regions to applicable regulations (GDPR, CCPA, PIPEDA, etc.)
 * and provides decision helpers for data handling.
 */

import { logger } from "../lib/logger";

export type Region = "EU" | "US_CA" | "US_OTHER" | "CA" | "UK" | "AU" | "DEFAULT";

export interface RegionalPolicy {
  region:              Region;
  regulations:         string[];
  requiresConsent:     boolean;
  consentTypes:        string[];
  maxRetentionDays:    number;
  requiresExplainability: boolean;
  rightToErasure:      boolean;
  rightToPortability:  boolean;
  crossBorderRestrict: boolean;
  minAgeYears:         number;
}

export const REGIONAL_POLICIES: Record<Region, RegionalPolicy> = {
  EU: {
    region: "EU", regulations: ["GDPR"],
    requiresConsent: true, consentTypes: ["data_collection","ai_profiling","marketing","analytics"],
    maxRetentionDays: 730, requiresExplainability: true,
    rightToErasure: true, rightToPortability: true, crossBorderRestrict: true, minAgeYears: 16,
  },
  US_CA: {
    region: "US_CA", regulations: ["CCPA","CPRA"],
    requiresConsent: true, consentTypes: ["data_collection","marketing","third_party_sharing"],
    maxRetentionDays: 1095, requiresExplainability: false,
    rightToErasure: true, rightToPortability: true, crossBorderRestrict: false, minAgeYears: 16,
  },
  UK: {
    region: "UK", regulations: ["UK-GDPR"],
    requiresConsent: true, consentTypes: ["data_collection","ai_profiling","marketing"],
    maxRetentionDays: 730, requiresExplainability: true,
    rightToErasure: true, rightToPortability: true, crossBorderRestrict: true, minAgeYears: 13,
  },
  CA: {
    region: "CA", regulations: ["PIPEDA","Law25"],
    requiresConsent: true, consentTypes: ["data_collection","marketing"],
    maxRetentionDays: 1095, requiresExplainability: false,
    rightToErasure: false, rightToPortability: false, crossBorderRestrict: false, minAgeYears: 13,
  },
  AU: {
    region: "AU", regulations: ["Privacy Act"],
    requiresConsent: true, consentTypes: ["data_collection","marketing"],
    maxRetentionDays: 1825, requiresExplainability: false,
    rightToErasure: false, rightToPortability: false, crossBorderRestrict: false, minAgeYears: 15,
  },
  US_OTHER: {
    region: "US_OTHER", regulations: ["HIPAA-adjacent","State laws"],
    requiresConsent: false, consentTypes: ["marketing"],
    maxRetentionDays: 2555, requiresExplainability: false,
    rightToErasure: false, rightToPortability: false, crossBorderRestrict: false, minAgeYears: 13,
  },
  DEFAULT: {
    region: "DEFAULT", regulations: [],
    requiresConsent: false, consentTypes: [],
    maxRetentionDays: 3650, requiresExplainability: false,
    rightToErasure: false, rightToPortability: false, crossBorderRestrict: false, minAgeYears: 18,
  },
};

// Venue → region mapping (runtime configurable)
const venueRegions = new Map<string, Region>();

export function setVenueRegion(venueId: string, region: Region): void {
  venueRegions.set(venueId, region);
  logger.info({ venueId, region }, "regionalPolicies: venue region set");
}

export function getVenuePolicy(venueId: string): RegionalPolicy {
  const region = venueRegions.get(venueId) ?? "DEFAULT";
  return REGIONAL_POLICIES[region];
}

export function isConsentRequired(venueId: string, consentType: string): boolean {
  const policy = getVenuePolicy(venueId);
  return policy.requiresConsent && policy.consentTypes.includes(consentType);
}

export function getMaxRetention(venueId: string): number {
  return getVenuePolicy(venueId).maxRetentionDays;
}

export function requiresExplainability(venueId: string): boolean {
  return getVenuePolicy(venueId).requiresExplainability;
}
