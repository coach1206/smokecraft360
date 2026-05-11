/**
 * EmberHeartbeat — Persistent ambient ember glow.
 * Mounts as an additive fixed overlay in the corner of the screen.
 * Follows the guest through Overview and Enrollment steps.
 * Zero-interruption: pointer-events none, never touches main DOM tree.
 */

import { motion } from "framer-motion";

interface Props {
  /** Accent colour — defaults to Titan Gold */
  color?: string;
  /** Corner: "bottom-left" | "bottom-right" | "top-left" | "top-right" */
  corner?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  /** Size of the inner ember dot in px */
  size?: number;
}

const CORNER_STYLE: Record<NonNullable<Props["corner"]>, React.CSSProperties> = {
  "bottom-left":  { bottom: 22, left: 22 },
  "bottom-right": { bottom: 22, right: 22 },
  "top-left":     { top: 22, left: 22 },
  "top-right":    { top: 22, right: 22 },
};

export default function EmberHeartbeat({
  color  = "#D48B00",
  corner = "bottom-left",
  size   = 8,
}: Props) {
  const pos = CORNER_STYLE[corner];
  const glow = `${color}55`;

  return (
    <div
      style={{
        position:      "fixed",
        ...pos,
        zIndex:        9700,
        pointerEvents: "none",
        display:       "flex",
        alignItems:    "center",
        justifyContent:"center",
        width:  size + 24,
        height: size + 24,
      }}
    >
      {/* Outer pulse ring — slow breath */}
      <motion.div
        animate={{
          scale:   [1, 1.9, 1],
          opacity: [0.28, 0, 0.28],
        }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:     "absolute",
          width:  size + 20,
          height: size + 20,
          borderRadius: "50%",
          border:       `1px solid ${color}`,
          pointerEvents: "none",
        }}
      />

      {/* Mid ring — offset phase */}
      <motion.div
        animate={{
          scale:   [1, 1.5, 1],
          opacity: [0.2, 0, 0.2],
        }}
        transition={{ duration: 3.2, delay: 0.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:      "absolute",
          width:  size + 12,
          height: size + 12,
          borderRadius:  "50%",
          border:        `1px solid ${color}`,
          pointerEvents: "none",
        }}
      />

      {/* Inner ember dot */}
      <motion.div
        animate={{
          boxShadow: [
            `0 0 ${size}px 2px ${glow}`,
            `0 0 ${size * 2.5}px 6px ${glow}`,
            `0 0 ${size}px 2px ${glow}`,
          ],
          scale: [1, 1.12, 1],
        }}
        transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width:        size,
          height:       size,
          borderRadius: "50%",
          background:   `radial-gradient(circle, ${color} 0%, ${color}88 60%, ${color}00 100%)`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
