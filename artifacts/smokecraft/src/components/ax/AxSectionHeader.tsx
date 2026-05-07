/**
 * AxSectionHeader — labeled section header with optional subtitle + divider.
 * Used as a consistent section delineator across all Axiom OS dashboards.
 */

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface AxSectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Right-aligned content (e.g. a button or badge) */
  action?: ReactNode;
  /** Show a gold gradient divider below (default: false) */
  divider?: boolean;
  style?: React.CSSProperties;
}

export function AxSectionHeader({
  title, subtitle, icon: Icon, action, divider, style,
}: AxSectionHeaderProps) {
  return (
    <div style={{ marginBottom: divider ? 0 : 16, ...style }}>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 10,
        marginBottom: subtitle ? 2 : divider ? 10 : 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {Icon && <Icon size={13} color="rgba(212,139,0,0.7)" />}
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: "rgba(26,26,27,0.50)",
            textTransform: "uppercase", letterSpacing: "0.13em",
          }}>
            {title}
          </span>
        </div>
        {action && <div>{action}</div>}
      </div>
      {subtitle && (
        <div style={{
          fontSize: 11, color: "rgba(26,26,27,0.35)",
          marginBottom: divider ? 10 : 0,
          paddingLeft: Icon ? 20 : 0,
        }}>
          {subtitle}
        </div>
      )}
      {divider && (
        <div style={{
          height: 1,
          background: "linear-gradient(90deg, rgba(212,139,0,0.3) 0%, rgba(212,139,0,0.05) 60%, transparent 100%)",
          marginTop: 8,
        }} />
      )}
    </div>
  );
}
