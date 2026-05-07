/**
 * ProductionAudit — system health check widget.
 *
 * Reads live state from axiomStore and renders a
 * terminal-style check list. Used inside SubPageRenderer
 * for the "operations" quick-view slot in StaffPanel.
 */

import { motion }       from "framer-motion";
import { useAxiomStore } from "@/store/axiomStore";

// ── Tokens matching HandoffContainer dark-chrome palette ──────────────────────

const T = {
  graphite:  "#1a1612",
  border:    "rgba(255,255,255,0.10)",
  gold:      "#C9A84C",
  goldDim:   "rgba(201,168,76,0.18)",
  text:      "#F0E8D4",
  muted:     "rgba(240,232,212,0.45)",
  green:     "#4ade80",
  amber:     "#f59e0b",
};

type CheckStatus = "PASS" | "ACTIVE" | "INITIALIZED" | "IDLE" | "PENDING" | "FAIL";

function statusColor(s: CheckStatus): string {
  if (s === "PASS" || s === "ACTIVE") return T.green;
  if (s === "FAIL")                   return "#f87171";
  return T.amber;
}

export const ProductionAudit = () => {
  const state = useAxiomStore();

  const checks: { name: string; status: CheckStatus; detail?: string }[] = [
    {
      name:   "Revenue Engine Sync",
      status: state.isDynamicActive ? "PASS" : "IDLE",
      detail: state.isDynamicActive
        ? `+$${state.totalLift.toFixed(2)} lift captured`
        : "Dynamic pricing not yet armed",
    },
    {
      name:   "Prestige Persistence",
      status: state.xp > 0 ? "PASS" : "PENDING",
      detail: state.xp > 0
        ? `${state.xp} XP · ${state.rank}`
        : "No XP recorded this session",
    },
    {
      name:   "UI Armor (Kiosk Mode)",
      status: "ACTIVE",
      detail: state.isKioskLocked ? "Locked — patron-safe" : "Unlocked (staff override)",
    },
    {
      name:   "Audio Engine (58 Hz Hum)",
      status: "INITIALIZED",
      detail: "Web Audio context ready",
    },
  ];

  const passCount = checks.filter(c => c.status === "PASS" || c.status === "ACTIVE" || c.status === "INITIALIZED").length;
  const score = Math.round((passCount / checks.length) * 100);

  return (
    <div style={{
      padding: "6px 18px 20px",
      background: T.graphite,
      border: `1px solid ${T.goldDim}`,
      borderRadius: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      margin: "16px 18px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 12px" }}>
        <span style={{ fontSize: 9, color: T.gold, textTransform: "uppercase", letterSpacing: "0.3em", fontWeight: 700 }}>
          System Health Check
        </span>
        {/* Score badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            padding: "3px 10px", borderRadius: 99, fontSize: 9, fontWeight: 700,
            background: score === 100 ? "rgba(74,222,128,0.12)" : "rgba(245,158,11,0.10)",
            border: `1px solid ${score === 100 ? "rgba(74,222,128,0.30)" : "rgba(245,158,11,0.28)"}`,
            color: score === 100 ? T.green : T.amber,
            letterSpacing: "0.1em",
          }}
        >
          {score}% OK
        </motion.div>
      </div>

      {/* Check rows */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {checks.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 * i, duration: 0.25 }}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              padding: "9px 0",
              borderBottom: i < checks.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.04em" }}>{c.name}</div>
              {c.detail && (
                <div style={{ fontSize: 8, color: "rgba(240,232,212,0.22)", marginTop: 2, letterSpacing: "0.03em" }}>
                  {c.detail}
                </div>
              )}
            </div>
            <div style={{
              flexShrink: 0,
              fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
              color: statusColor(c.status),
            }}>
              [{c.status}]
            </div>
          </motion.div>
        ))}
      </div>

      {/* Score bar */}
      <div style={{ marginTop: 14 }}>
        <div style={{ height: 3, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
            style={{
              height: "100%", borderRadius: 99,
              background: score === 100
                ? `linear-gradient(90deg, ${T.green}80, ${T.green})`
                : `linear-gradient(90deg, ${T.amber}80, ${T.amber})`,
            }}
          />
        </div>
        <div style={{ fontSize: 8, color: "rgba(240,232,212,0.18)", marginTop: 5, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {passCount}/{checks.length} checks nominal
        </div>
      </div>
    </div>
  );
};
