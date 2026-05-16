import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useKernelMode } from "@/contexts/KernelModeContext";

interface SovereignRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  featureName?: string;
}

/**
 * SovereignRoute — wraps a route that is only available in "sovereign" mode.
 *
 * When the venue's kernel mode is "essential", the component redirects to
 * `redirectTo` (default: "/upgrade-required") and renders nothing, preventing
 * any content from momentarily appearing before navigation fires.
 *
 * Pass `featureName` to surface the locked feature's name on the upgrade page.
 *
 * Must be rendered inside KernelModeProvider (i.e. inside SubPageProviders).
 */
export function SovereignRoute({
  children,
  redirectTo = "/upgrade-required",
  featureName,
}: SovereignRouteProps) {
  const { mode, loading } = useKernelMode();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && mode === "essential") {
      const dest = featureName
        ? `${redirectTo}?feature=${encodeURIComponent(featureName)}`
        : redirectTo;
      navigate(dest);
    }
  }, [mode, loading, navigate, redirectTo, featureName]);

  if (loading || mode === "essential") {
    return null;
  }

  return <>{children}</>;
}
