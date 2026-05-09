/**
 * authorityEngine.ts — Axiom OS Authority Engine
 *
 * Maps JWT roles to a four-tier sovereign access model.
 * Tier 0 (Sovereign) has unrestricted access; higher numbers = less access.
 */

export enum AccessLevel {
  SOVEREIGN   = 0,  // super_admin — God Mode
  SHIFT_LEAD  = 1,  // venue_owner, manager — Operational Admin
  MENTOR      = 2,  // staff — Guest Experience Only
  GUEST       = 3,  // patron / unauthenticated — No internal access
}

export type FeatureMask =
  | "revenue_data"
  | "kill_switches"
  | "inventory_override"
  | "guest_intelligence"
  | "swipe_analytics"
  | "authority_panel";

export interface AuthorityProfile {
  userId:      string;
  name:        string;
  role:        string;
  tier:        AccessLevel;
  permissions: FeatureMask[];
}

const ROLE_TO_TIER: Record<string, AccessLevel> = {
  super_admin:  AccessLevel.SOVEREIGN,
  venue_owner:  AccessLevel.SHIFT_LEAD,
  manager:      AccessLevel.SHIFT_LEAD,
  staff:        AccessLevel.MENTOR,
  brand_partner: AccessLevel.MENTOR,
  patron:       AccessLevel.GUEST,
};

const DEFAULT_PERMISSIONS: Record<AccessLevel, FeatureMask[]> = {
  [AccessLevel.SOVEREIGN]:  ["revenue_data","kill_switches","inventory_override","guest_intelligence","swipe_analytics","authority_panel"],
  [AccessLevel.SHIFT_LEAD]: ["revenue_data","inventory_override","guest_intelligence","swipe_analytics"],
  [AccessLevel.MENTOR]:     ["guest_intelligence"],
  [AccessLevel.GUEST]:      [],
};

const TIER_LABELS: Record<AccessLevel, string> = {
  [AccessLevel.SOVEREIGN]:  "SOVEREIGN",
  [AccessLevel.SHIFT_LEAD]: "SHIFT LEAD",
  [AccessLevel.MENTOR]:     "MENTOR",
  [AccessLevel.GUEST]:      "GUEST",
};

export function buildAuthorityProfile(user: { id: string; name: string; role: string } | null): AuthorityProfile {
  const tier = user ? (ROLE_TO_TIER[user.role] ?? AccessLevel.GUEST) : AccessLevel.GUEST;
  return {
    userId:      user?.id ?? "anonymous",
    name:        user?.name ?? "Anonymous",
    role:        user?.role ?? "guest",
    tier,
    permissions: DEFAULT_PERMISSIONS[tier],
  };
}

export function checkAccess(profile: AuthorityProfile, required: AccessLevel): boolean {
  return profile.tier <= required;
}

export function hasFeature(profile: AuthorityProfile, feature: FeatureMask): boolean {
  return profile.permissions.includes(feature);
}

export function getTierLabel(tier: AccessLevel): string {
  return TIER_LABELS[tier];
}

export const GHOST_PATTERN = ["right", "down", "right", "left"] as const;
export type SwipeDir = "up" | "down" | "left" | "right";
