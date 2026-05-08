/**
 * AtmosphereController — Phase 4: Environmental AI Modes UI.
 *
 * A compact floating controller that lets staff switch venue modes.
 * Uses mercury-flow (Spatial Fluid Dynamics) transitions via Framer Motion.
 * Displays the active mode with its config values as subtle telemetry bars.
 *
 * Mount inside the Staff Cockpit or anywhere a venue mode switch is needed.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAtmosphereMode } from "@/hooks/useAtmosphereMode";

const MODES = [
  { id: "lounge",         label: "Lounge",         color: "#D48B00" },
  { id: "vip",           label: "VIP",             color: "#C4A96D" },
  { id: "peak_hour",     label: "Peak Hour",       color: "#E8A020" },
  { id: "relaxed_luxury",label: "Relaxed Luxury",  color: "#8A7560" },
  { id: "social",        label: "Social",          color: "#7EC8A0" },
  { id: "exploration",   label: "Exploration",     color: "#4A8FA8" },
  { id: "investor_shadow",label: "Investor Shadow", color: "#D4AF37" },
];

interface Props {
  venueId: string;
  compact?: boolean;
}

export default function AtmosphereController({ venueId, compact = false }: Props) {
  const { mode, config, transitionMs, activateMode, loading } = useAtmosphereMode(venueId);
  const [expanded, setExpanded] = useState(!compact);

  const handleSelect = async (newMode: string) => {
    await activateMode(venueId, newMode, "staff_controller");
  };

  return (
    <div style={{
      background:     "rgba(10,8,6,0.88)",
      backdropFilter: "blur(24px) saturate(0.8)",
      border:         "1px solid rgba(212,139,0,0.18)",
      borderRadius:   "14px",
      overflow:       "hidden",
      width:          expanded ? 280 : 52,
      transition:     `width ${transitionMs}ms cubic-bezier(0.23,1,0.32,1)`,
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          padding:    "12px 14px",
          display:    "flex",
          alignItems: "center",
          gap:        "10px",
          cursor:     "pointer",
        }}
      >
        <motion.div
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          style={{ color: "#D48B00", fontSize: "14px", flexShrink: 0 }}
        >
          ◈
        </motion.div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.3 }}
              style={{ flex: 1, minWidth: 0 }}
            >
              <div style={{
                fontSize:      "9px",
                letterSpacing: "0.22em",
                color:         "#D48B00",
                textTransform: "uppercase",
                fontFamily:    "'Cormorant Garamond', serif",
              }}>
                Atmosphere
              </div>
              <div style={{
                fontSize:   "13px",
                fontWeight: 600,
                color:      "#F5F2ED",
                fontFamily: "'Cormorant Garamond', serif",
                whiteSpace: "nowrap",
                overflow:   "hidden",
                textOverflow: "ellipsis",
              }}>
                {config?.label ?? mode}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {loading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{ width: 8, height: 8, borderRadius: "50%", border: "1.5px solid #D48B00", borderTopColor: "transparent", flexShrink: 0 }}
          />
        )}
      </div>

      {/* Mode grid */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: transitionMs / 1000, ease: [0.23, 1, 0.32, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 10px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {MODES.map(m => {
                const active = mode === m.id;
                return (
                  <motion.button
                    key={m.id}
                    onClick={() => handleSelect(m.id)}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display:       "flex",
                      alignItems:    "center",
                      gap:           "10px",
                      padding:       "8px 10px",
                      borderRadius:  "8px",
                      border:        active ? `1px solid ${m.color}55` : "1px solid transparent",
                      background:    active ? `${m.color}18` : "transparent",
                      cursor:        "pointer",
                      fontFamily:    "'Cormorant Garamond', serif",
                      textAlign:     "left",
                      width:         "100%",
                      transition:    "all 0.3s ease",
                    }}
                  >
                    <div style={{
                      width:        7,
                      height:       7,
                      borderRadius: "50%",
                      background:   active ? m.color : "#3A3530",
                      boxShadow:    active ? `0 0 8px ${m.color}88` : "none",
                      flexShrink:   0,
                      transition:   "all 0.4s ease",
                    }} />
                    <span style={{
                      fontSize:  "12px",
                      color:     active ? m.color : "#6B5E4E",
                      fontWeight: active ? 600 : 400,
                      transition: "color 0.3s ease",
                    }}>
                      {m.label}
                    </span>
                    {active && (
                      <motion.div
                        layoutId="mode-indicator"
                        style={{ marginLeft: "auto", fontSize: "8px", color: m.color }}
                      >
                        ●
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Telemetry bars */}
            {config && (
              <div style={{
                borderTop: "1px solid rgba(255,255,255,0.05)",
                padding:   "10px 14px 12px",
                display:   "flex",
                flexDirection: "column",
                gap:       "6px",
              }}>
                {[
                  { label: "Particles",  value: config.particleDensity },
                  { label: "Warmth",     value: config.lightingWarmth  },
                  { label: "Damping",    value: config.motionDamping   },
                ].map(bar => (
                  <div key={bar.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                      <span style={{ fontSize: "8px", color: "#6B5E4E", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'Cormorant Garamond', serif" }}>
                        {bar.label}
                      </span>
                      <span style={{ fontSize: "8px", color: "#8A7560", fontFamily: "'Cormorant Garamond', serif" }}>
                        {bar.value}
                      </span>
                    </div>
                    <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1 }}>
                      <motion.div
                        animate={{ width: `${bar.value}%` }}
                        transition={{ duration: transitionMs / 1000, ease: [0.23, 1, 0.32, 1] }}
                        style={{ height: "100%", background: "#D48B00", borderRadius: 1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
