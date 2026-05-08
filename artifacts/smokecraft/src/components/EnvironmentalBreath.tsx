/**
 * EnvironmentalBreath — Ambient intelligence pulse layer (customer-facing).
 *
 * Renders behind all content (z-index 1, pointer-events none).
 * Produces a barely-perceptible living rhythm — environmental breathing,
 * intelligence pulses, and ambient synchronization movement.
 *
 * Opacity range: 0–6% max. Must NOT distract from the guest experience.
 */

import { motion } from "framer-motion";
import { useOrchestrator } from "@/contexts/OrchestratorContext";

const GOLD   = "#D48B00";
const CREAM  = "#F5F2ED";

// Floating intelligence nodes — represent the engine signals
const NODES = [
  { id: "pred",  x: "12%",  y: "22%",  delay: 0.0, label: "Predictive" },
  { id: "tel",   x: "84%",  y: "18%",  delay: 0.6, label: "Telemetry" },
  { id: "rec",   x: "72%",  y: "78%",  delay: 1.1, label: "Recommend" },
  { id: "env",   x: "18%",  y: "74%",  delay: 1.7, label: "Environment" },
  { id: "ven",   x: "50%",  y: "8%",   delay: 0.9, label: "Venue DNA" },
] as const;

export default function EnvironmentalBreath() {
  const { profile } = useOrchestrator();

  // Atmosphere intensity drives breath speed — faster when engaged
  const breathDuration = profile
    ? 5 - (profile.atmosphereIntensity / 100) * 2.5
    : 4.5;

  return (
    <div
      aria-hidden
      style={{
        position:      "fixed",
        inset:         0,
        zIndex:        1,
        pointerEvents: "none",
        overflow:      "hidden",
      }}
    >
      {/* Central ambient glow — breathes in sync with session energy */}
      <motion.div
        animate={{ opacity: [0.025, 0.055, 0.025], scale: [1, 1.08, 1] }}
        transition={{ duration: breathDuration, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:     "absolute",
          top:          "40%",
          left:         "50%",
          transform:    "translate(-50%, -50%)",
          width:        "60vw",
          height:       "60vw",
          borderRadius: "50%",
          background:   `radial-gradient(circle, ${GOLD}18 0%, ${GOLD}08 40%, transparent 70%)`,
          willChange:   "transform, opacity",
        }}
      />

      {/* Top ambient glow strip — ax-glow-top equivalent */}
      <motion.div
        animate={{ opacity: [0.03, 0.06, 0.03] }}
        transition={{ duration: breathDuration * 1.3, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        style={{
          position:   "absolute",
          top:        0,
          left:       "50%",
          transform:  "translateX(-50%)",
          width:      "80%",
          height:     120,
          background: `radial-gradient(ellipse at top, ${GOLD}22 0%, transparent 70%)`,
          willChange: "opacity",
        }}
      />

      {/* Intelligence pulse nodes */}
      {NODES.map((node) => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.05, 0.02, 0.06, 0],
            scale:   [0.6, 1.0, 0.8, 1.1, 0.6],
          }}
          transition={{
            duration: 8 + node.delay * 2,
            repeat:   Infinity,
            delay:    node.delay,
            ease:     "easeInOut",
          }}
          style={{
            position:     "absolute",
            left:         node.x,
            top:          node.y,
            width:        6,
            height:       6,
            borderRadius: "50%",
            background:   GOLD,
            boxShadow:    `0 0 12px 4px ${GOLD}30`,
            willChange:   "transform, opacity",
          }}
        />
      ))}

      {/* Horizontal scan line — operational heartbeat */}
      <motion.div
        animate={{ y: ["0vh", "100vh"], opacity: [0, 0.04, 0.04, 0] }}
        transition={{
          duration: 12,
          repeat:   Infinity,
          ease:     "linear",
          times:    [0, 0.05, 0.95, 1],
        }}
        style={{
          position:   "absolute",
          left:       0,
          right:      0,
          height:     1,
          background: `linear-gradient(90deg, transparent, ${GOLD}40, transparent)`,
          willChange: "transform, opacity",
        }}
      />

      {/* Edge intelligence rim — subtle border pulse */}
      <motion.div
        animate={{ opacity: [0.02, 0.05, 0.02] }}
        transition={{ duration: breathDuration * 0.9, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        style={{
          position:     "absolute",
          inset:        0,
          border:       `1px solid ${GOLD}20`,
          pointerEvents: "none",
          willChange:   "opacity",
        }}
      />
    </div>
  );
}
