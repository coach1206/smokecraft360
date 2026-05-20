/**
 * GlobalEmberFixture — persistent smoldering cigar ember at bottom-right.
 *
 * Fixed-position fixture that remains visible at low opacity across every
 * guest stage. Pulses on a 4–6 s breathing cycle. Emits short-lived micro-
 * spark particles upward. Communicates private-lounge atmosphere.
 *
 * Mounted in SubPageProviders — never unmounted during the guest journey.
 */

import { motion } from "framer-motion";

const AMBER = "#C8860A";
const DEEP  = "#7C2800";

export default function GlobalEmberFixture() {
  return (
    <div
      style={{
        position:      "fixed",
        bottom:        30,
        right:         52,
        zIndex:        3,
        pointerEvents: "none",
        width:         14,
        height:        14,
      }}
    >
      {/* ── Ambient heat pool beneath the ember ── */}
      <motion.div
        animate={{ opacity: [0.10, 0.22, 0.10], scale: [1, 1.08, 1] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:  "absolute",
          bottom:    -32,
          left:      "50%",
          transform: "translateX(-50%)",
          width:     88,
          height:    54,
          background:`radial-gradient(ellipse, ${AMBER}55 0%, ${AMBER}18 48%, transparent 72%)`,
          filter:    "blur(14px)",
          willChange:"opacity, transform",
        }}
      />

      {/* ── Inner core — bright white-hot center ── */}
      <motion.div
        animate={{
          opacity: [0.82, 1.0, 0.88, 1.0, 0.82],
          boxShadow: [
            `0 0 6px 2px ${AMBER}44, 0 0 18px 6px ${AMBER}18`,
            `0 0 16px 6px rgba(212,175,55,0.72), 0 0 40px 16px ${AMBER}28`,
            `0 0 10px 3px ${AMBER}55, 0 0 24px 9px ${AMBER}20`,
            `0 0 16px 6px rgba(212,175,55,0.72), 0 0 40px 16px ${AMBER}28`,
            `0 0 6px 2px ${AMBER}44, 0 0 18px 6px ${AMBER}18`,
          ],
        }}
        transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:     "absolute",
          bottom:       4,
          left:         "50%",
          transform:    "translateX(-50%)",
          width:        11,
          height:       6,
          borderRadius: "50%",
          background:   `radial-gradient(ellipse, #fffbe8 0%, #FFD070 25%, ${AMBER} 55%, ${DEEP} 88%, transparent 100%)`,
          willChange:   "box-shadow, opacity",
        }}
      />

      {/* ── Micro-sparks ejecting upward ── */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={`gs-spark-${i}`}
          animate={{
            x:       [0, (i === 0 ? -9 : i === 1 ? 7 : -3)],
            y:       [0, -(22 + i * 11)],
            opacity: [0, 0.85, 0],
            scale:   [1.2, 0.28],
          }}
          transition={{
            duration:   0.52 + i * 0.14,
            repeat:     Infinity,
            delay:      i * 1.9 + 0.4,
            ease:       "easeOut",
          }}
          style={{
            position:     "absolute",
            bottom:       7,
            left:         `calc(50% + ${i * 2 - 2}px)`,
            width:        2.5,
            height:       2.5,
            borderRadius: "50%",
            background:   "#fffbe8",
            boxShadow:    `0 0 5px ${AMBER}`,
            willChange:   "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}
