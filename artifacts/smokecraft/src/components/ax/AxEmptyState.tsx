/**
 * AxEmptyState — standard fallback for unauthenticated / no-data / error states.
 * Replaces blank black screens across all admin dashboards.
 *
 * Per the Production Maturity Directive:
 *   "NO broken silent failures."
 *   "EVERY PAGE MUST ANSWER 'What am I controlling?' visually and instantly."
 */

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { AxCard } from "./AxCard";

interface AxEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  body?: string;
  /** Optional CTA button */
  action?: { label: string; onClick: () => void };
  /** Colour accent for the icon (default: muted gold) */
  color?: string;
  children?: ReactNode;
}

export function AxEmptyState({
  icon: Icon,
  title,
  body,
  action,
  color = "rgba(212,139,0,0.5)",
  children,
}: AxEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ display: "flex", justifyContent: "center", padding: "48px 24px" }}
    >
      <AxCard style={{ padding: "40px 48px", textAlign: "center", maxWidth: 420, width: "100%" }}>
        {Icon && (
          <div style={{ marginBottom: 18 }}>
            <Icon size={36} color={color} strokeWidth={1.2} />
          </div>
        )}
        <div style={{
          fontSize: 15, fontWeight: 600,
          color: "rgba(240,232,212,0.88)",
          fontFamily: "'Cormorant Garamond', serif",
          letterSpacing: "0.04em",
          marginBottom: body ? 8 : 0,
        }}>
          {title}
        </div>
        {body && (
          <div style={{
            fontSize: 12, color: "rgba(240,232,212,0.42)",
            lineHeight: 1.65, marginBottom: action || children ? 20 : 0,
          }}>
            {body}
          </div>
        )}
        {children}
        {action && (
          <button
            onClick={action.onClick}
            style={{
              marginTop: children ? 16 : 0,
              background: "rgba(212,139,0,0.14)",
              border: "1px solid rgba(212,139,0,0.35)",
              borderRadius: 8, color: "#D48B00",
              fontSize: 11, fontWeight: 600,
              padding: "8px 20px", cursor: "pointer",
              letterSpacing: "0.06em",
            }}
          >
            {action.label}
          </button>
        )}
      </AxCard>
    </motion.div>
  );
}
