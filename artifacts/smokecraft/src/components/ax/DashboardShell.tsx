/**
 * DashboardShell — reusable sub-page wrapper for all Command Hub tiles.
 * Provides: consistent header (back button + title + accent bar),
 * ambient gold particles, and a glass-morphism scrollable content area.
 */

import type { ReactNode } from "react";
import { motion }         from "framer-motion";
import { ArrowLeft }      from "lucide-react";
import { useLocation }    from "wouter";

interface DashboardShellProps {
  title:     string;
  subtitle?: string;
  accent?:   string;
  backTo?:   string;
  icon?:     ReactNode;
  actions?:  ReactNode;
  children:  ReactNode;
}

const SHELL_PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id:  i,
  x:   Math.random() * 100,
  y:   Math.random() * 100,
  r:   0.7 + Math.random() * 1.6,
  dur: 11 + Math.random() * 14,
  del: Math.random() * 10,
  op:  0.04 + Math.random() * 0.09,
}));

export function DashboardShell({
  title, subtitle, accent = "#D48B00", backTo = "/dashboard", icon, actions, children,
}: DashboardShellProps) {
  const [, navigate] = useLocation();

  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "column",
      overflow: "hidden", background: "#F5F2ED", color: "#1A1A1B",
      position: "relative",
    }}>
      {/* Ambient top glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(ellipse 80% 45% at 50% 0%, ${accent}0B 0%, transparent 65%)`,
      }} />

      {/* Floating gold particles */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        {SHELL_PARTICLES.map(p => (
          <motion.div
            key={p.id}
            style={{
              position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
              width: p.r * 2, height: p.r * 2, borderRadius: "50%",
              background: accent, opacity: p.op,
            }}
            animate={{ y: [0, -24, 8, -16, 0], opacity: [p.op, p.op * 2.4, p.op * 0.3, p.op * 1.8, p.op] }}
            transition={{ duration: p.dur, delay: p.del, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: "relative", zIndex: 10, flexShrink: 0,
        display: "flex", alignItems: "center", gap: 14,
        padding: "13px 22px",
        borderBottom: "1px solid rgba(212,139,0,0.10)",
        background: "linear-gradient(180deg, #EFEBE0 0%, #EFEBE0EE 100%)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 1px 0 rgba(212,139,0,0.06), 0 4px 24px rgba(26,26,27,0.14)",
      }}>
        {/* Back button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(backTo)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: "#2A2A2A", border: "1px solid rgba(212,139,0,0.18)",
            color: "#6B5E4E", cursor: "pointer",
            boxShadow: "0 2px 8px rgba(26,26,27,0.08)",
          }}
        >
          <ArrowLeft size={20} />
        </motion.button>

        {/* Title block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: accent, display: "flex", alignItems: "center", gap: 8 }}>
            {icon}
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: "#6B5E4E", marginTop: 1 }}>{subtitle}</div>
          )}
        </div>

        {/* Optional right-side actions */}
        {actions && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{actions}</div>}

        {/* Accent rule bar */}
        <div style={{
          width: 3, height: 30, borderRadius: 99, flexShrink: 0,
          background: `linear-gradient(180deg, ${accent}, ${accent}44)`,
          boxShadow: `0 0 10px ${accent}55`,
        }} />
      </div>

      {/* ── Content area ────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 1, flex: 1, overflowY: "auto", padding: "20px 22px" }}>
        {children}
      </div>
    </div>
  );
}
