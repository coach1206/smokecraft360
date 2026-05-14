/**
 * PermissionGate — NOVEE OS Feature Masking
 *
 * Renders children only when the current authority profile grants access.
 * When mask=true (default), unauthorized content is invisible.
 * When mask=false, it renders dimmed and non-interactive.
 */

import type { ReactNode } from "react";
import { useSuperAdminSafe } from "@/contexts/SuperAdminContext";
import { checkAccess, hasFeature, type FeatureMask, AccessLevel } from "@/lib/authorityEngine";

interface PermissionGateProps {
  children:      ReactNode;
  requiredTier?: AccessLevel;
  feature?:      FeatureMask;
  mask?:         boolean;
}

export function PermissionGate({
  children,
  requiredTier,
  feature,
  mask = true,
}: PermissionGateProps) {
  const ctx = useSuperAdminSafe();

  if (!ctx) return <>{children}</>;

  const { authority, featureOverrides } = ctx;

  const tierOk    = requiredTier === undefined || checkAccess(authority, requiredTier);
  const featureOk = feature === undefined
    ? true
    : (featureOverrides[feature] !== undefined ? featureOverrides[feature] : hasFeature(authority, feature));

  const granted = tierOk && featureOk;

  if (!granted) {
    if (mask) return null;
    return (
      <div style={{ opacity: 0.15, filter: "grayscale(1)", pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
