/**
 * AxBadge — unified status chip for Axiom OS.
 * Variant-based; no custom colours needed at call sites.
 */

import { ReactNode } from "react";

type BadgeVariant =
  | "gold"
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "purple"
  | "muted"
  | "ghost";

const VARIANT_MAP: Record<BadgeVariant, { fg: string; bg: string; border: string }> = {
  gold:   { fg: "#c9a84c", bg: "rgba(201,168,76,0.14)",  border: "rgba(201,168,76,0.38)" },
  green:  { fg: "#34d399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.35)" },
  amber:  { fg: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.35)" },
  red:    { fg: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.35)"  },
  blue:   { fg: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.35)" },
  purple: { fg: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.35)" },
  muted:  { fg: "rgba(240,232,212,0.48)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)" },
  ghost:  { fg: "rgba(240,232,212,0.32)", bg: "transparent", border: "rgba(255,255,255,0.08)" },
};

interface AxBadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  /** Dot indicator on the left */
  dot?: boolean;
  /** Override font size (default 10px) */
  size?: number;
}

export function AxBadge({ children, variant = "muted", dot, size = 10 }: AxBadgeProps) {
  const { fg, bg, border } = VARIANT_MAP[variant];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: size, fontWeight: 700, color: fg,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 5, padding: "2px 7px",
      textTransform: "uppercase", letterSpacing: "0.1em",
      whiteSpace: "nowrap",
    }}>
      {dot && (
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: fg, flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
}

/** Convenience: map a status string → appropriate badge variant */
export function statusVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (["active", "live", "open", "paid", "complete", "delivered", "online", "ready", "confirmed"].some(k => s.includes(k))) return "green";
  if (["pending", "authorized", "preparing", "claimed", "processing", "standby"].some(k => s.includes(k))) return "amber";
  if (["critical", "failed", "error", "voided", "cancelled", "cancelled", "offline", "rejected"].some(k => s.includes(k))) return "red";
  if (["refunded", "partial"].some(k => s.includes(k))) return "purple";
  if (["info", "manual"].some(k => s.includes(k))) return "blue";
  if (["closed", "resolved", "fulfilled", "dismissed"].some(k => s.includes(k))) return "muted";
  return "muted";
}
