/**
 * HelpCard — Visual help card for employee training steps.
 * Shows an icon, context label, key facts, and a screen-tip.
 */

import { motion }    from "framer-motion";
import { LucideIcon, Eye, Lightbulb } from "lucide-react";

const T = {
  card:   "rgba(255,255,255,0.03)",
  border: "rgba(201,168,76,0.12)",
  gold:   "#c9a84c",
  muted:  "rgba(240,232,212,0.45)",
  light:  "rgba(240,232,212,0.78)",
};

interface HelpCardProps {
  icon:       LucideIcon;
  iconColor:  string;
  label:      string;
  facts:      string[];
  screenTip?: string;
  warning?:   string;
}

export default function HelpCard({ icon: Icon, iconColor, label, facts, screenTip, warning }: HelpCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 10, padding: "14px 16px", marginBottom: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: `${iconColor}15`, border: `1px solid ${iconColor}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={13} color={iconColor} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, color: iconColor, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          {label}
        </span>
      </div>

      {/* Facts */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: screenTip || warning ? 10 : 0 }}>
        {facts.map((fact, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ width: 3, height: 3, borderRadius: "50%", background: iconColor, flexShrink: 0, marginTop: 6 }} />
            <span style={{ fontSize: 10.5, color: T.light, lineHeight: 1.55 }}>{fact}</span>
          </div>
        ))}
      </div>

      {/* Screen tip */}
      {screenTip && (
        <div style={{
          display: "flex", gap: 7, alignItems: "flex-start",
          background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)",
          borderRadius: 6, padding: "8px 10px", marginBottom: warning ? 8 : 0,
        }}>
          <Eye size={10} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 10, color: "#60a5fa", lineHeight: 1.55 }}>
            <strong>On screen:</strong> {screenTip}
          </span>
        </div>
      )}

      {/* Warning */}
      {warning && (
        <div style={{
          display: "flex", gap: 7, alignItems: "flex-start",
          background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: 6, padding: "8px 10px",
        }}>
          <Lightbulb size={10} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 10, color: "#f59e0b", lineHeight: 1.55 }}>
            <strong>Note:</strong> {warning}
          </span>
        </div>
      )}
    </motion.div>
  );
}
