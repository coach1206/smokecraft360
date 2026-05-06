/**
 * AxCard — universal Axiom OS dark glass card.
 * Replaces the inline GlassCard defined in AxiomPay, FinanceReconciliation,
 * PresenceEngine, etc. Single source of truth for material depth surfaces.
 */

import { CSSProperties, ReactNode } from "react";

interface AxCardProps {
  children: ReactNode;
  /** Optional accent glow colour (hex / rgb). Adds radial + box-shadow tint. */
  glow?: string;
  /** Extra inline styles — merged on top of defaults. */
  style?: CSSProperties;
  /** Click handler — adds pointer cursor automatically. */
  onClick?: () => void;
  className?: string;
}

export function AxCard({ children, glow, style, onClick, className }: AxCardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.046)",
        border: "1px solid rgba(201,168,76,0.18)",
        borderRadius: 12,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: glow
          ? `0 0 28px ${glow}22, 0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)`
          : "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {glow && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 50% 0%, ${glow}12 0%, transparent 68%)`,
            pointerEvents: "none",
          }}
        />
      )}
      {children}
    </div>
  );
}
