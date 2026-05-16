/**
 * SovereignGate — reusable Sovereign-mode gate component.
 *
 * Reads useKernelMode() internally so callers don't need to thread mode
 * through props.  Renders the appropriate SovereignLockOverlay when the
 * venue is in Essential mode; otherwise renders children unchanged.
 *
 * Variants
 * ────────
 * "fullpage" (default)
 *   Replaces the entire viewport with the full-screen lock overlay.
 *   Use on pages / routes that are 100 % sovereign-only.
 *
 * "inline"
 *   Replaces the component's own content area with a centred lock block.
 *   Use inside tabs, cards, or sections that are sovereign-only.
 *
 * "modal"
 *   Keeps children mounted; floats a dismissible modal dialog on top when
 *   isOpen=true.  Use when you want the locked tile/button to remain
 *   visible but block deeper access via a prominent upgrade prompt.
 *
 * Usage examples
 * ─────────────
 * // Full-page gate:
 * <SovereignGate featureName="Governance" description="…">
 *   <GovernancePage />
 * </SovereignGate>
 *
 * // Inline section gate:
 * <SovereignGate variant="inline" featureName="Intelligence Systems" description="…">
 *   <AIConfigPanel />
 * </SovereignGate>
 *
 * // Modal trigger (CommandCenter tile pattern):
 * <SovereignGate variant="modal" featureName="…" isOpen={open} onClose={() => setOpen(false)}>
 *   {null}
 * </SovereignGate>
 */

import type { ReactNode } from "react";
import { SovereignLockOverlay } from "@/components/SovereignLockOverlay";
import { useKernelMode }       from "@/contexts/KernelModeContext";

export interface SovereignGateProps {
  featureName:  string;
  description?: string;
  children:     ReactNode;

  variant?: "fullpage" | "inline" | "modal";

  onBack?:  () => void;
  isOpen?:  boolean;
  onClose?: () => void;
}

export function SovereignGate({
  featureName,
  description,
  children,
  variant  = "fullpage",
  onBack,
  isOpen,
  onClose,
}: SovereignGateProps) {
  const { mode, loading } = useKernelMode();

  if (variant === "modal") {
    return (
      <>
        {children}
        {mode === "essential" && (
          <SovereignLockOverlay
            variant="modal"
            featureName={featureName}
            description={description}
            isOpen={isOpen ?? false}
            onClose={onClose}
          />
        )}
      </>
    );
  }

  if (loading) return null;

  if (mode === "essential") {
    return (
      <SovereignLockOverlay
        variant={variant}
        featureName={featureName}
        description={description}
        onBack={onBack}
      />
    );
  }

  return <>{children}</>;
}
