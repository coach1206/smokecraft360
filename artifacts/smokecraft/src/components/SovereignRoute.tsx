import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useKernelMode } from "@/contexts/KernelModeContext";

interface SovereignRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * SovereignRoute — wraps a route that is only available in "sovereign" mode.
 *
 * When the venue's kernel mode is "essential", the component redirects to
 * `redirectTo` (default: "/") and renders nothing, preventing any content
 * from momentarily appearing before navigation fires.
 *
 * Must be rendered inside KernelModeProvider (i.e. inside SubPageProviders).
 */
export function SovereignRoute({
  children,
  redirectTo = "/",
}: SovereignRouteProps) {
  const { mode, loading } = useKernelMode();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && mode === "essential") {
      navigate(redirectTo);
    }
  }, [mode, loading, navigate, redirectTo]);

  if (loading || mode === "essential") {
    return null;
  }

  return <>{children}</>;
}
